import CreditPurchase, { CREDIT_PACKAGES } from '../models/CreditPurchase.js';
import User from '../models/User.js';
import { createPayPalOrder, capturePayPalPayment } from '../services/paypalService.js';
import AdminNotification from '../models/admin/AdminNotification.js';

// ── Create a PayPal order for a credit pack ───────────────────────────────────
export const createTopupOrder = async (req, res) => {
  try {
    const { packageId } = req.body;
    const pack = CREDIT_PACKAGES[packageId];
    if (!pack) return res.status(400).json({ success: false, message: 'Invalid package.' });

    const result = await createPayPalOrder(pack.price, 'USD', {
      userId:    req.user._id.toString(),
      userEmail: req.user.email,
      type:      'credit_topup',
      packageId,
    });

    res.json({ success: true, orderId: result.orderId });
  } catch (err) {
    console.error('createTopupOrder error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to create PayPal order.' });
  }
};

// ── Capture payment and create pending purchase request ───────────────────────
export const captureTopupPayment = async (req, res) => {
  try {
    const { orderId, packageId, feature } = req.body;
    const pack = CREDIT_PACKAGES[packageId];
    if (!pack) return res.status(400).json({ success: false, message: 'Invalid package.' });

    // Duplicate guard
    const existing = await CreditPurchase.findOne({ paypalOrderId: orderId });
    if (existing) return res.status(409).json({ success: false, message: 'This payment has already been submitted.' });

    const result = await capturePayPalPayment(orderId);
    if (!result?.captureId) throw new Error('PayPal capture failed.');

    const purchase = await CreditPurchase.create({
      user:            req.user._id,
      feature:         feature || 'general',
      packageId,
      credits:         pack.credits,
      price:           pack.price,
      status:          'pending',
      paypalOrderId:   orderId,
      paypalCaptureId: result.captureId,
    });

    // Notify admin
    try {
      await AdminNotification.create({
        type:    'credit_topup_request',
        title:   'Credit Top-Up Request',
        message: `${req.user.name || req.user.email} paid $${pack.price} for ${pack.credits} AI credits (${pack.label}).`,
        data: {
          userId:     req.user._id,
          userEmail:  req.user.email,
          purchaseId: purchase._id,
          packageId,
          credits:    pack.credits,
          price:      pack.price,
        },
      });
    } catch {}

    res.json({
      success:  true,
      message:  'Payment received. Awaiting admin approval — credits will be added to your account shortly.',
      purchase: { _id: purchase._id, status: 'pending', credits: pack.credits, price: pack.price },
    });
  } catch (err) {
    console.error('captureTopupPayment error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Payment capture failed.' });
  }
};

// ── User: list their own requests ─────────────────────────────────────────────
export const getMyTopupRequests = async (req, res) => {
  try {
    const requests = await CreditPurchase.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: list all requests ──────────────────────────────────────────────────
export const adminListTopupRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};
    const requests = await CreditPurchase.find(filter)
      .populate('user', 'name email plan bonusAICredits monthlyAIGenerationsUsed')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await CreditPurchase.countDocuments(filter);
    res.json({ success: true, data: requests, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: approve a request ──────────────────────────────────────────────────
export const adminApproveTopup = async (req, res) => {
  try {
    const purchase = await CreditPurchase.findById(req.params.id).populate('user', 'name email');
    if (!purchase) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (purchase.status !== 'pending') return res.status(400).json({ success: false, message: 'Request is not pending.' });

    purchase.status     = 'approved';
    purchase.approvedAt = new Date();
    purchase.adminNote  = req.body.note || '';
    await purchase.save();

    // Add bonus credits to user
    await User.findByIdAndUpdate(purchase.user._id, {
      $inc: { bonusAICredits: purchase.credits },
    });

    res.json({
      success:  true,
      message:  `Approved. ${purchase.credits} bonus credits added to ${purchase.user.email}.`,
      purchase,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: reject a request ───────────────────────────────────────────────────
export const adminRejectTopup = async (req, res) => {
  try {
    const purchase = await CreditPurchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (purchase.status !== 'pending') return res.status(400).json({ success: false, message: 'Request is not pending.' });

    purchase.status     = 'rejected';
    purchase.rejectedAt = new Date();
    purchase.adminNote  = req.body.note || '';
    await purchase.save();

    res.json({ success: true, message: 'Request rejected.', purchase });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
