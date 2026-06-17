// backend/controllers/paymentController.js
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import Plan, { initializePlans } from '../models/Plan.js';
import AdminNotification from '../models/admin/AdminNotification.js';
import Stripe from 'stripe';
import { createStripePaymentIntent, confirmStripePayment } from '../services/stripeService.js';
import { createPayPalOrder, capturePayPalPayment, verifyPayPalOrder } from '../services/paypalService.js';
import {
  createCheckoutSession,
  getCheckoutSession,
  createSandboxMock,
  IS_SANDBOX,
  verifyWebhookSignature,
} from '../services/payoneerService.js';
import { distributeToUser } from '../services/schedulerService.js';
import { sendAdminPaymentAlert, sendPaymentConfirmationEmail } from '../services/emailService.js';
import { creditReferralCommission } from './referralController.js';
import { creditSupportCommission } from './supportController.js';
import { SUPPORT_DISCOUNT_RATE } from '../models/SupportReferral.js';
import Admin from '../models/Admin.js';
import { createUserNotification } from '../services/notificationService.js';
import { MIN_BALANCE_TO_USE } from '../models/Withdrawal.js';


// @desc    Get all available plans
// @route   GET /api/payment/plans
export const getPlans = async (req, res) => {
  try {
    await initializePlans(); // ensures correct prices & features on first call
    const plans = await Plan.find({ isActive: true }).sort('order');
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create invoice for plan upgrade
// @route   POST /api/payment/create-invoice
export const createInvoice = async (req, res) => {
  try {
    const { planName, billingCycle = 'monthly' } = req.body;
    const user = await User.findById(req.user._id);
    
    console.log(`📝 Creating invoice for user: ${user.email}, plan: ${planName}`);
    
    const validPlans = ['starter', 'pro', 'enterprise'];
    if (!validPlans.includes(planName)) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }
    
    const plan = await Plan.findOne({ name: planName });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    let amount = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;

    // Apply 20% support referral discount if user was referred by a support member
    let supportDiscount = 0;
    const freshUser = await User.findById(user._id).select('supportReferredBy');
    if (freshUser.supportReferredBy) {
      supportDiscount = Math.round(amount * SUPPORT_DISCOUNT_RATE * 100) / 100;
      amount = Math.round((amount - supportDiscount) * 100) / 100;
      console.log(`🎁 Support referral discount $${supportDiscount} applied for ${user.email}`);
    }

    const existingInvoice = await Invoice.findOne({
      user: user._id,
      status: 'pending',
      plan: planName
    });

    if (existingInvoice) {
      return res.json({
        success: true,
        data: existingInvoice,
        supportDiscount: existingInvoice.supportDiscount || 0,
        message: 'Existing invoice found. Please complete payment.'
      });
    }

    const invoice = new Invoice({
      user: user._id,
      plan: planName,
      billingCycle,
      amount,
      currency: 'USD',
      status: 'pending',
      ...(supportDiscount > 0 && { supportDiscount, supportMember: freshUser.supportReferredBy }),
    });

    await invoice.save();
    console.log(`✅ Invoice created: ${invoice.invoiceNumber}${supportDiscount > 0 ? ` (support discount: $${supportDiscount})` : ''}`);
    
    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created! Please complete payment.'
    });
    
  } catch (error) {
    console.error('❌ Invoice creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Stripe payment intent
// @route   POST /api/payment/stripe/create-intent
export const createStripePayment = async (req, res) => {
  try {
    const { planName, billingCycle = 'monthly' } = req.body;
    const user = await User.findById(req.user._id);
    
    console.log(`📝 Stripe payment for user: ${user.email}, plan: ${planName}`);
    
    const plan = await Plan.findOne({ name: planName });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    const amount = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    
    const result = await createStripePaymentIntent(amount, 'usd', {
      userId: user._id.toString(),
      userEmail: user.email,
      planName: planName,
      billingCycle: billingCycle
    });
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }
    
    const invoice = new Invoice({
      user: user._id,
      plan: planName,
      billingCycle,
      amount,
      currency: 'USD',
      status: 'pending',
      paymentMethod: 'stripe',
      metadata: new Map([['stripePaymentIntentId', result.paymentIntentId]])
    });
    
    await invoice.save();
    
    res.json({
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      invoiceId: invoice._id,
      isSimulated: result.isSimulated
    });
  } catch (error) {
    console.error('Stripe payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Confirm Stripe payment
// @route   POST /api/payment/stripe/confirm
export const confirmStripePaymentHandler = async (req, res) => {
  try {
    const { paymentIntentId, invoiceId } = req.body;
    
    console.log(`📝 Confirming Stripe payment: ${paymentIntentId}`);
    
    const result = await confirmStripePayment(paymentIntentId);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Payment not successful' });
    }
    
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      await invoice.save();
      
      const user = await User.findById(invoice.user);
      const oldPlan = user.plan;
      user.plan = invoice.plan;
      const duration = invoice.billingCycle === 'yearly' ? 365 : 30;
      user.planExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      await user.save();
      
      console.log(`✅ User ${user.email} upgraded from ${oldPlan} to ${invoice.plan}`);

      // Credit referral commission to whoever referred this user (fire-and-forget)
      creditReferralCommission(user._id, invoice._id, invoice.plan, invoice.amount)
        .catch(e => console.error('Referral commission (stripe):', e.message));
      creditSupportCommission(user._id, invoice._id, invoice.plan, invoice.amount)
        .catch(e => console.error('Support commission (stripe):', e.message));

      // Create notification for admin about successful payment
      const plan = await Plan.findOne({ name: invoice.plan });
      if (plan) {
        try {
          await AdminNotification.create({
            title: '💰 New Payment Received',
            message: `${user.email} purchased ${plan.displayName} plan for $${invoice.amount}`,
            type: 'payment',
            actionRequired: false,
            priority: 'high',
            metadata: {
              userId: user._id,
              userEmail: user.email,
              plan: plan.displayName,
              amount: invoice.amount,
              billingCycle: invoice.billingCycle,
              invoiceId: invoice._id
            }
          });
          console.log(`📢 Notification created: Payment received from ${user.email}`);
        } catch (notifError) {
          console.error('Failed to create notification:', notifError);
        }

        // Admin email + user confirmation email (fire-and-forget)
        sendAdminPaymentAlert({
          userEmail: user.email, userName: user.name,
          planName: invoice.plan, amount: invoice.amount,
          billingCycle: invoice.billingCycle, paymentMethod: 'stripe',
          invoiceNumber: invoice.invoiceNumber,
        }).catch(e => console.error('Admin payment email failed (stripe):', e.message));

        sendPaymentConfirmationEmail({
          name: user.name, email: user.email,
          planName: invoice.plan, amount: invoice.amount,
          billingCycle: invoice.billingCycle, paymentMethod: 'stripe',
          invoiceNumber: invoice.invoiceNumber,
        }).catch(e => console.error('User payment confirmation email failed (stripe):', e.message));
      }

      // In-app notification for user
      createUserNotification(
        user._id,
        'plan_purchased',
        `${invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1)} plan activated!`,
        `Your payment of $${invoice.amount} was successful. Enjoy your upgraded access.`,
        '/dashboard'
      );
    }

    res.json({
      success: true,
      message: 'Payment confirmed and plan upgraded!',
      invoice: invoice
    });
  } catch (error) {
    console.error('Stripe confirm error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create PayPal order
// @route   POST /api/payment/paypal/create-order
export const createPayPalPayment = async (req, res) => {
  try {
    const { planName, billingCycle = 'monthly', referralBalanceToApply = 0, couponCode } = req.body;
    const user = await User.findById(req.user._id);

    console.log(`📝 Creating PayPal order for user: ${user.email}, plan: ${planName}`);

    if (!planName) {
      return res.status(400).json({ success: false, message: 'Plan name is required' });
    }

    const plan = await Plan.findOne({ name: planName });
    if (!plan) {
      return res.status(404).json({ success: false, message: `Plan "${planName}" not found` });
    }

    let fullAmount = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;

    // Apply 20% support referral discount if user was referred by a support member
    let supportDiscount = 0;
    const freshUser = await User.findById(user._id).select('supportReferredBy');
    if (freshUser.supportReferredBy) {
      supportDiscount = Math.round(fullAmount * SUPPORT_DISCOUNT_RATE * 100) / 100;
      fullAmount      = Math.round((fullAmount - supportDiscount) * 100) / 100;
      console.log(`🎁 Support referral discount $${supportDiscount} applied for ${user.email}`);
    }

    // Apply 10% coupon code discount — check User referral codes then Support Admin codes
    let couponDiscount = 0;
    let couponReferrerId = null;
    if (couponCode && !freshUser.supportReferredBy) {
      const code = couponCode.trim().toUpperCase();
      let referrer = await User.findOne({ referralCode: code }).select('_id name');
      if (!referrer) {
        referrer = await Admin.findOne({ referralCode: code, role: 'support', isActive: true }).select('_id name');
      }
      if (referrer && referrer._id.toString() !== user._id.toString()) {
        couponDiscount    = Math.round(fullAmount * 0.10 * 100) / 100;
        fullAmount        = Math.round((fullAmount - couponDiscount) * 100) / 100;
        couponReferrerId  = referrer._id;
        console.log(`🏷️ Coupon ${code} applied: $${couponDiscount} off for ${user.email}`);
      }
    }

    // Validate and compute referral balance reservation (not deducted until capture succeeds)
    let referralReserved = 0;
    if (referralBalanceToApply > 0) {
      if (user.referralBalance < MIN_BALANCE_TO_USE) {
        return res.status(400).json({
          success: false,
          message: `Minimum $${MIN_BALANCE_TO_USE} referral balance required to apply it.`
        });
      }
      referralReserved = Math.round(Math.min(referralBalanceToApply, user.referralBalance, fullAmount) * 100) / 100;
    }
    const chargeAmount = Math.round((fullAmount - referralReserved) * 100) / 100;

    // Reuse an existing pending PayPal invoice for this user+plan to avoid orphans
    const existingInvoice = await Invoice.findOne({
      user: user._id,
      status: 'pending',
      plan: planName,
      paymentMethod: 'paypal',
    });

    let invoice;
    if (existingInvoice) {
      invoice = existingInvoice;
      // Update amount in case plan price changed or discount changed
      invoice.amount = fullAmount;
      invoice.billingCycle = billingCycle;
      if (referralReserved > 0) {
        invoice.metadata = new Map([['referralBalanceReserved', referralReserved.toString()]]);
      }
      await invoice.save();
      console.log(`♻️  Reusing existing pending invoice: ${invoice.invoiceNumber}`);
    } else {
      invoice = new Invoice({
        user: user._id,
        plan: planName,
        billingCycle,
        amount: fullAmount,
        currency: 'USD',
        status: 'pending',
        paymentMethod: 'paypal',
        ...(supportDiscount > 0 && { supportDiscount, supportMember: freshUser.supportReferredBy }),
        ...(couponDiscount > 0 && couponReferrerId && { couponDiscount, couponReferrer: couponReferrerId }),
      });
      if (referralReserved > 0) {
        invoice.metadata = new Map([['referralBalanceReserved', referralReserved.toString()]]);
      }
      try {
        await invoice.save();
        console.log(`✅ Invoice created: ${invoice.invoiceNumber}${referralReserved > 0 ? ` (referral reserved: $${referralReserved})` : ''}`);
      } catch (saveErr) {
        // E11000: old non-partial index rejects a 2nd null paypalOrderId — fall back to reusing
        // any existing pending invoice for this user (across all plans) rather than crashing.
        if (saveErr.code === 11000) {
          console.warn('⚠️  E11000 on invoice save (old index) — falling back to existing pending invoice');
          invoice = await Invoice.findOne({ user: user._id, status: 'pending', paymentMethod: 'paypal' });
          if (!invoice) throw saveErr; // nothing to fall back to — surface the real error
          invoice.plan = planName;
          invoice.billingCycle = billingCycle;
          invoice.amount = fullAmount;
          if (referralReserved > 0) {
            invoice.metadata = new Map([['referralBalanceReserved', referralReserved.toString()]]);
          }
          // Save without triggering the unique index (plan/amount update only, paypalOrderId stays null)
          await Invoice.updateOne({ _id: invoice._id }, {
            $set: { plan: planName, billingCycle, amount: fullAmount }
          });
          console.log(`♻️  Fell back to existing pending invoice: ${invoice.invoiceNumber}`);
        } else {
          throw saveErr;
        }
      }
    }

    let result;
    try {
      result = await createPayPalOrder(chargeAmount, 'USD', {
        userId: user._id.toString(),
        userEmail: user.email,
        planName: planName,
        billingCycle: billingCycle
      });
    } catch (paypalError) {
      // PayPal failed — delete the invoice so it doesn't show as a ghost pending entry
      if (!existingInvoice) {
        await invoice.deleteOne();
        console.warn(`🗑️  Deleted orphan invoice ${invoice.invoiceNumber} after PayPal order failure`);
      }
      throw paypalError;
    }

    res.json({
      success: true,
      orderId: result.orderId,
      approvalUrl: result.approvalUrl,
      invoiceId: invoice._id,
      isSimulated: result.isSimulated
    });

  } catch (error) {
    console.error('❌ PayPal createOrder controller error:', error.message);
    // Pass the actual PayPal/service error to the frontend so it's visible
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create PayPal order',
      hint: 'Check server logs for the full PayPal API response'
    });
  }
};

// @desc    Capture & verify PayPal payment — prevents duplicates, activates plan, distributes opps
// @route   POST /api/payment/paypal/capture
export const capturePayPalPaymentHandler = async (req, res) => {
  const { orderId, invoiceId } = req.body;

  if (!orderId || !invoiceId) {
    return res.status(400).json({ success: false, message: 'orderId and invoiceId are required' });
  }

  console.log(`📝 PayPal capture request — order: ${orderId}, invoice: ${invoiceId}`);

  try {
    // ── 1. Duplicate guard ────────────────────────────────────────────────────
    const duplicate = await Invoice.findOne({ paypalOrderId: orderId });
    if (duplicate) {
      console.warn(`⚠️ Duplicate capture attempt for order ${orderId}`);
      return res.status(409).json({
        success: false,
        message: 'This payment has already been processed. Your plan may already be active.',
        duplicate: true
      });
    }

    // ── 2. Verify order exists & is approvable on PayPal's side ──────────────
    const verification = await verifyPayPalOrder(orderId);
    if (!verification.success) {
      return res.status(400).json({ success: false, message: `PayPal verification failed: ${verification.error}` });
    }
    if (!['APPROVED', 'COMPLETED', 'CREATED'].includes(verification.status)) {
      return res.status(400).json({ success: false, message: `Payment not approved by PayPal (status: ${verification.status})` });
    }

    // ── 3. Find invoice ───────────────────────────────────────────────────────
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    if (invoice.status === 'paid') {
      return res.status(409).json({ success: false, message: 'Invoice already paid.', duplicate: true });
    }

    // ── 4. Capture on PayPal ─────────────────────────────────────────────────
    const result = await capturePayPalPayment(orderId);
    if (!result.success) {
      if (result.alreadyCaptured) {
        return res.status(409).json({ success: false, message: 'Payment already captured.', duplicate: true });
      }
      return res.status(400).json({ success: false, message: result.error || 'PayPal capture failed' });
    }

    // ── 5. Mark invoice paid (store unique order ID) ─────────────────────────
    invoice.status         = 'paid';
    invoice.paidAt         = new Date();
    invoice.paypalOrderId  = orderId;
    invoice.paypalCaptureId = result.captureId;
    invoice.paymentMethod  = 'paypal';
    await invoice.save();

    // ── 6. Upgrade user plan ──────────────────────────────────────────────────
    const user    = await User.findById(invoice.user);
    const oldPlan = user.plan;
    user.plan     = invoice.plan;
    const duration = invoice.billingCycle === 'yearly' ? 365 : 30;
    user.planExpiresAt  = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    user.isTrialActive  = false;
    user.dailyMatchesUsed = 0;         // reset so they immediately get fresh matches
    user.lastMatchReset = new Date();
    await user.save();

    // Deduct reserved referral balance now that capture succeeded
    const referralReserved = parseFloat(invoice.metadata?.get('referralBalanceReserved') || 0);
    if (referralReserved > 0) {
      await User.findByIdAndUpdate(invoice.user, { $inc: { referralBalance: -referralReserved } });
      console.log(`💸 Referral balance deducted: $${referralReserved} for ${user.email}`);
    }

    console.log(`✅ ${user.email} upgraded ${oldPlan} → ${invoice.plan} (PayPal ${orderId})`);

    // Credit referral commission (fire-and-forget)
    creditReferralCommission(user._id, invoice._id, invoice.plan, invoice.amount)
      .catch(e => console.error('Referral commission (paypal):', e.message));
    creditSupportCommission(user._id, invoice._id, invoice.plan, invoice.amount)
      .catch(e => console.error('Support commission (paypal):', e.message));

    // Credit 10% coupon commission to the code owner (User or Support Admin)
    if (invoice.couponReferrer && invoice.couponDiscount > 0) {
      const couponCommission = Math.round(invoice.amount * 0.10 * 100) / 100;
      const userUpdate = await User.findByIdAndUpdate(invoice.couponReferrer, {
        $inc: { referralBalance: couponCommission, totalReferralEarnings: couponCommission },
      });
      if (!userUpdate) {
        // Referrer is a support admin — credit their admin balance
        Admin.findByIdAndUpdate(invoice.couponReferrer, {
          $inc: { referralBalance: couponCommission, totalCommissionEarned: couponCommission },
        }).catch(e => console.error('Coupon commission (admin, paypal):', e.message));
      }
      console.log(`🏷️  Coupon commission $${couponCommission} credited to ${invoice.couponReferrer}`);
    }

    // ── 7. Immediately distribute today's opportunities for the upgraded plan ─
    try {
      await distributeToUser(user);
      console.log(`📤 Opportunity distribution triggered for ${user.email} after plan upgrade`);
    } catch (distErr) {
      console.error('Distribution error after upgrade:', distErr.message);
    }

    // ── 8. Admin notification ─────────────────────────────────────────────────
    const plan = await Plan.findOne({ name: invoice.plan });
    try {
      await AdminNotification.create({
        title: '💰 PayPal Payment Verified & Activated',
        message: `${user.email} purchased ${plan?.displayName || invoice.plan} for $${invoice.amount} — plan activated automatically`,
        type: 'payment',
        actionRequired: false,
        priority: 'high',
        metadata: {
          userId:      user._id,
          userEmail:   user.email,
          plan:        plan?.displayName || invoice.plan,
          amount:      invoice.amount,
          billingCycle: invoice.billingCycle,
          invoiceId:   invoice._id,
          paypalOrderId:   orderId,
          paypalCaptureId: result.captureId,
          verifiedBy:  'PayPal API (automatic)'
        }
      });
    } catch (notifErr) {
      console.error('Admin notification error:', notifErr.message);
    }

    // Admin email + user confirmation email (fire-and-forget)
    sendAdminPaymentAlert({
      userEmail: user.email, userName: user.name,
      planName: invoice.plan, amount: invoice.amount,
      billingCycle: invoice.billingCycle, paymentMethod: 'paypal',
      invoiceNumber: invoice.invoiceNumber,
    }).catch(e => console.error('Admin payment email failed (paypal):', e.message));

    sendPaymentConfirmationEmail({
      name: user.name, email: user.email,
      planName: invoice.plan, amount: invoice.amount,
      billingCycle: invoice.billingCycle, paymentMethod: 'paypal',
      invoiceNumber: invoice.invoiceNumber,
    }).catch(e => console.error('User payment confirmation email failed (paypal):', e.message));

    // In-app notification for user
    createUserNotification(
      user._id,
      'plan_purchased',
      `${invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1)} plan activated!`,
      `Your PayPal payment of $${invoice.amount} was successful. Enjoy your upgraded access.`,
      '/dashboard'
    );

    res.json({
      success:     true,
      message:     `Payment verified and ${invoice.plan} plan activated!`,
      plan:        invoice.plan,
      planExpires: user.planExpiresAt,
      invoice:     { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount, paidAt: invoice.paidAt }
    });

  } catch (error) {
    // Handle MongoDB duplicate key (race condition on paypalOrderId unique index)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Payment already processed.',
        duplicate: true
      });
    }
    console.error('PayPal capture error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's invoices
// @route   GET /api/payment/invoices
export const getUserInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get invoice by ID
// @route   GET /api/payment/invoices/:id
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: Verify payment and upgrade user plan
// @route   POST /api/payment/verify-payment/:invoiceId
export const adminVerifyPayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    console.log(`🔍 Verifying payment for invoice: ${invoiceId}`);
    
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Invoice already paid' });
    }
    
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    await invoice.save();
    
    const user = await User.findById(invoice.user);
    const oldPlan = user.plan;
    user.plan = invoice.plan;

    const duration = invoice.billingCycle === 'yearly' ? 365 : 30;
    user.planExpiresAt    = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    user.isTrialActive    = false;
    user.dailyMatchesUsed = 0;
    user.lastMatchReset   = new Date();
    await user.save();

    console.log(`✅ User ${user.email} upgraded from ${oldPlan} to ${invoice.plan} (admin verify)`);

    // Credit referral commission (fire-and-forget)
    creditReferralCommission(user._id, invoice._id, invoice.plan, invoice.amount)
      .catch(e => console.error('Referral commission (admin verify):', e.message));
    creditSupportCommission(user._id, invoice._id, invoice.plan, invoice.amount)
      .catch(e => console.error('Support commission (admin verify):', e.message));

    // Distribute today's opportunities immediately
    distributeToUser(user)
      .catch(e => console.error('Distribution error (admin verify):', e.message));

    const plan = await Plan.findOne({ name: invoice.plan });
    
    // Create notification for admin about successful payment
    if (plan) {
      try {
        await AdminNotification.create({
          title: '💰 Payment Verified by Admin',
          message: `${user.email} plan upgraded to ${plan.displayName} ($${invoice.amount})`,
          type: 'payment',
          actionRequired: false,
          priority: 'high',
          metadata: {
            userId: user._id,
            userEmail: user.email,
            plan: plan.displayName,
            amount: invoice.amount,
            billingCycle: invoice.billingCycle,
            invoiceId: invoice._id,
            verifiedBy: req.user._id
          }
        });
        console.log(`📢 Notification created: Payment verified for ${user.email}`);
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      // User confirmation email (fire-and-forget)
      sendPaymentConfirmationEmail({
        name: user.name, email: user.email,
        planName: invoice.plan, amount: invoice.amount,
        billingCycle: invoice.billingCycle, paymentMethod: invoice.paymentMethod || 'manual',
        invoiceNumber: invoice.invoiceNumber,
      }).catch(e => console.error('User payment confirmation email failed (admin verify):', e.message));
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 PLAN UPGRADED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log(`👤 User: ${user.email}`);
    console.log(`📋 Plan: ${plan?.displayName || invoice.plan}`);
    console.log(`💰 Amount: $${invoice.amount}`);
    console.log(`📄 Invoice: ${invoice.invoiceNumber}`);
    console.log('='.repeat(70) + '\n');
    
    res.json({ 
      success: true, 
      message: `Payment verified! User upgraded to ${invoice.plan} plan.` 
    });
    
  } catch (error) {
    console.error('❌ Admin verify payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Simulate a successful PayPal capture — DEV ONLY
// @route   POST /api/payment/paypal/simulate-capture
export const simulatePayPalCapture = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Not available in production.' });
  }

  const { invoiceId } = req.body;
  if (!invoiceId) {
    return res.status(400).json({ success: false, message: 'invoiceId is required' });
  }

  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') {
      return res.status(409).json({ success: false, message: 'Invoice already paid.', duplicate: true });
    }

    const fakeOrderId = `SIMULATED-${Date.now()}`;

    invoice.status          = 'paid';
    invoice.paidAt          = new Date();
    invoice.paypalOrderId   = fakeOrderId;
    invoice.paypalCaptureId = `CAPTURE-${Date.now()}`;
    invoice.paymentMethod   = 'paypal';
    await invoice.save();

    const user    = await User.findById(invoice.user);
    const oldPlan = user.plan;
    user.plan     = invoice.plan;
    const duration = invoice.billingCycle === 'yearly' ? 365 : 30;
    user.planExpiresAt  = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    user.isTrialActive  = false;
    user.dailyMatchesUsed = 0;
    user.lastMatchReset = new Date();
    await user.save();

    console.log(`🧪 [DEV] Simulated PayPal capture: ${user.email} upgraded ${oldPlan} → ${invoice.plan}`);

    creditReferralCommission(user._id, invoice._id, invoice.plan, invoice.amount)
      .catch(e => console.error('Referral commission (simulate):', e.message));
    creditSupportCommission(user._id, invoice._id, invoice.plan, invoice.amount)
      .catch(e => console.error('Support commission (simulate):', e.message));

    try {
      const { distributeToUser } = await import('../services/schedulerService.js');
      await distributeToUser(user);
    } catch (distErr) {
      console.error('Distribution error after simulated upgrade:', distErr.message);
    }

    createUserNotification(
      user._id,
      'plan_purchased',
      `${invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1)} plan activated!`,
      `Your simulated PayPal payment of $${invoice.amount} was successful.`,
      '/dashboard'
    );

    res.json({
      success:     true,
      message:     `[DEV] Simulated payment — ${invoice.plan} plan activated!`,
      plan:        invoice.plan,
      planExpires: user.planExpiresAt,
      invoice:     { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount, paidAt: invoice.paidAt },
    });
  } catch (error) {
    console.error('Simulate capture error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Return current user plan + expiry (used for polling after payment)
// @route   GET /api/payment/plan-status
export const getPlanStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success:     true,
      plan:        user.plan,
      planExpires: user.planExpiresAt,
      isActive:    user.isPlanActive ? user.isPlanActive() : true
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Cancel subscription
// @route   POST /api/payment/cancel
export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.plan === 'free') {
      return res.status(400).json({ success: false, message: 'Already on free plan' });
    }

    const oldPlan = user.plan;
    user.plan = 'free';
    user.planExpiresAt = null;
    await user.save();

    console.log(`User ${user.email} cancelled subscription from ${oldPlan} to free`);

    res.json({ success: true, message: 'Subscription cancelled. You are now on the Free plan.' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYONEER HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Create Payoneer checkout session
// @route   POST /api/payment/payoneer/create-session
export const createPayoneerCheckout = async (req, res) => {
  try {
    const { planName, billingCycle = 'monthly' } = req.body;
    const user = await User.findById(req.user._id);

    console.log(`📝 Payoneer checkout for user: ${user.email}, plan: ${planName}`);

    const plan = await Plan.findOne({ name: planName });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const amount = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;

    const invoice = new Invoice({
      user: user._id,
      plan: planName,
      billingCycle,
      amount,
      currency: 'USD',
      status: 'pending',
      paymentMethod: 'payoneer',
    });
    await invoice.save();

    // Try real Payoneer API; fall back to sandbox mock on any error
    let session;
    let isMock = false;
    try {
      session = await createCheckoutSession({
        user,
        plan: planName,
        billingCycle,
        invoiceId: invoice._id,
        amount,
      });
    } catch (payoneerErr) {
      console.warn('⚠️  Payoneer API unavailable — using sandbox mock:', payoneerErr.message);
      session = createSandboxMock(invoice._id, amount, planName, billingCycle);
      isMock = true;
    }

    invoice.payoneerInvoiceId = session.sessionId;
    await invoice.save();

    console.log(`✅ Payoneer session created (${isMock ? 'MOCK' : 'LIVE'}): ${session.sessionId}`);

    res.json({
      success:     true,
      sessionId:   session.sessionId,
      checkoutUrl: session.checkoutUrl,
      invoiceId:   invoice._id,
      isMock,
      expiresAt:   session.expiresAt,
    });
  } catch (error) {
    console.error('❌ Payoneer checkout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Capture Payoneer payment (called after user returns from checkout)
// @route   POST /api/payment/payoneer/capture
export const capturePayoneerReturn = async (req, res) => {
  try {
    const { sessionId, invoiceId, status, isMock } = req.body;

    console.log(`📝 Payoneer capture — session: ${sessionId}, invoice: ${invoiceId}`);

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') {
      return res.status(409).json({ success: false, message: 'Invoice already paid', duplicate: true });
    }

    // Verify payment: accept mock/sandbox status directly; verify live sessions via API
    let paymentSucceeded = false;
    if (isMock || IS_SANDBOX) {
      paymentSucceeded = status === 'success' || status === 'completed';
    } else {
      try {
        const session = await getCheckoutSession(sessionId);
        paymentSucceeded = ['completed', 'paid'].includes(session.status);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Failed to verify Payoneer payment status' });
      }
    }

    if (!paymentSucceeded) {
      return res.status(400).json({ success: false, message: `Payment not completed (status: ${status || 'unknown'})` });
    }

    // Mark invoice paid
    invoice.status          = 'paid';
    invoice.paidAt          = new Date();
    invoice.payoneerInvoiceId = sessionId;
    await invoice.save();

    // Upgrade user plan
    const user    = await User.findById(invoice.user);
    const oldPlan = user.plan;
    user.plan     = invoice.plan;
    const duration = invoice.billingCycle === 'yearly' ? 365 : 30;
    user.planExpiresAt  = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    user.isTrialActive  = false;
    user.dailyMatchesUsed = 0;
    user.lastMatchReset = new Date();
    await user.save();

    console.log(`✅ ${user.email} upgraded ${oldPlan} → ${invoice.plan} (Payoneer ${sessionId})`);

    // Referral commission (fire-and-forget)
    creditReferralCommission(user._id, invoice._id, invoice.plan, invoice.amount)
      .catch(e => console.error('Referral commission (payoneer):', e.message));
    creditSupportCommission(user._id, invoice._id, invoice.plan, invoice.amount)
      .catch(e => console.error('Support commission (payoneer):', e.message));

    // Distribute today's opportunities
    try {
      await distributeToUser(user);
      console.log(`📤 Opportunity distribution triggered for ${user.email} after Payoneer upgrade`);
    } catch (distErr) {
      console.error('Distribution error after Payoneer upgrade:', distErr.message);
    }

    // Admin notification
    const plan = await Plan.findOne({ name: invoice.plan });
    try {
      await AdminNotification.create({
        title:   '💰 Payoneer Payment Verified & Activated',
        message: `${user.email} purchased ${plan?.displayName || invoice.plan} for $${invoice.amount} via Payoneer`,
        type:    'payment',
        actionRequired: false,
        priority: 'high',
        metadata: {
          userId:           user._id,
          userEmail:        user.email,
          plan:             plan?.displayName || invoice.plan,
          amount:           invoice.amount,
          billingCycle:     invoice.billingCycle,
          invoiceId:        invoice._id,
          payoneerSessionId: sessionId,
          verifiedBy:       isMock ? 'Sandbox Mock' : 'Payoneer API (automatic)',
        },
      });
    } catch (notifErr) {
      console.error('Admin notification error (payoneer):', notifErr.message);
    }

    sendAdminPaymentAlert({
      userEmail: user.email, userName: user.name,
      planName: invoice.plan, amount: invoice.amount,
      billingCycle: invoice.billingCycle, paymentMethod: 'payoneer',
      invoiceNumber: invoice.invoiceNumber,
    }).catch(e => console.error('Admin payment email failed (payoneer):', e.message));

    sendPaymentConfirmationEmail({
      name: user.name, email: user.email,
      planName: invoice.plan, amount: invoice.amount,
      billingCycle: invoice.billingCycle, paymentMethod: 'payoneer',
      invoiceNumber: invoice.invoiceNumber,
    }).catch(e => console.error('User payment confirmation email failed (payoneer):', e.message));

    // In-app notification for user
    createUserNotification(
      user._id,
      'plan_purchased',
      `${invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1)} plan activated!`,
      `Your Payoneer payment of $${invoice.amount} was successful. Enjoy your upgraded access.`,
      '/dashboard'
    );

    res.json({
      success:     true,
      message:     `Payment verified and ${invoice.plan} plan activated!`,
      plan:        invoice.plan,
      planExpires: user.planExpiresAt,
      invoice:     { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount, paidAt: invoice.paidAt },
    });

  } catch (error) {
    console.error('❌ Payoneer capture error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Payoneer IPN webhook (called by Payoneer server)
// @route   POST /api/payment/payoneer/webhook  (PUBLIC — no auth)
export const payoneerWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-payoneer-signature'];
    if (!verifyWebhookSignature(JSON.stringify(req.body), signature)) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const { event_type, data } = req.body;
    console.log('Payoneer webhook received:', event_type);

    if (event_type === 'checkout.completed') {
      const invoiceId = data?.client_reference_id;
      const invoice = invoiceId ? await Invoice.findById(invoiceId) : null;
      if (invoice && invoice.status !== 'paid') {
        invoice.status          = 'paid';
        invoice.paidAt          = new Date();
        invoice.payoneerInvoiceId = data.session_id || invoice.payoneerInvoiceId;
        await invoice.save();

        const user = await User.findById(invoice.user);
        if (user) {
          user.plan             = invoice.plan;
          const duration        = invoice.billingCycle === 'yearly' ? 365 : 30;
          user.planExpiresAt    = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
          user.isTrialActive    = false;
          user.dailyMatchesUsed = 0;
          user.lastMatchReset   = new Date();
          await user.save();
          distributeToUser(user).catch(() => {});
          console.log(`✅ Webhook: ${user.email} upgraded to ${invoice.plan} via Payoneer`);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Payoneer webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Stripe webhook — handles checkout.session.completed for enterprise payment links
// @route   POST /api/payment/stripe/webhook  (PUBLIC — raw body required)
export const stripeWebhook = async (req, res) => {
  const sig       = req.headers['stripe-signature'];
  const secret    = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    if (secret && sig) {
      const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
      event = stripeInstance.webhooks.constructEvent(req.body, sig, secret);
    } else {
      // No webhook secret configured — parse body manually (dev/test)
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object;
    const meta     = session.metadata || {};

    if (meta.source === 'inquiry_payment_link' && meta.inquiryId) {
      try {
        const { default: ContactInquiry } = await import('../models/ContactInquiry.js');
        const { distributeToUser: distribute } = await import('../services/schedulerService.js');
        const { sendPlanActivatedEmail } = await import('../services/emailService.js');

        const inquiry = await ContactInquiry.findById(meta.inquiryId);
        if (inquiry && !inquiry.paymentConfirmed) {
          inquiry.paymentConfirmed  = true;
          inquiry.paymentReference  = session.payment_intent || session.id;
          inquiry.paymentMethod     = 'stripe_link';
          inquiry.paymentAmount     = (session.amount_total || 0) / 100;
          inquiry.paymentDate       = new Date();

          // Auto-activate the plan
          const planMap = { enterprise: 'enterprise', custom: 'enterprise', pro: 'pro', starter: 'starter' };
          const planName = planMap[inquiry.planInterest] || 'enterprise';

          let user = inquiry.userId ? await User.findById(inquiry.userId) : null;
          if (!user) user = await User.findOne({ email: inquiry.email });

          if (user) {
            user.plan          = planName;
            const days         = meta.billingCycle === 'yearly' ? 365 : 30;
            user.planExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            user.isTrialActive = false;
            user.dailyMatchesUsed = 0;
            await user.save();

            inquiry.status     = 'resolved';
            inquiry.adminNotes = (inquiry.adminNotes ? inquiry.adminNotes + '\n' : '') +
              `Auto-activated via Stripe checkout on ${new Date().toLocaleDateString()}.`;

            distribute(user).catch(() => {});
            sendPlanActivatedEmail({ name: inquiry.name, email: inquiry.email, planName, planExpires: user.planExpiresAt }).catch(() => {});
            console.log(`✅ Stripe webhook: auto-activated ${planName} for ${inquiry.email}`);
          }

          await inquiry.save();

          await AdminNotification.create({
            title:   `💳 Enterprise Payment Received — ${inquiry.name}`,
            message: `${inquiry.email} paid $${inquiry.paymentAmount} via Stripe checkout link. Plan auto-activated: ${planName}.`,
            type:    'payment',
            actionRequired: false,
            priority: 'high',
            metadata: { inquiryId: inquiry._id, email: inquiry.email, planName },
          });
        }
      } catch (err) {
        console.error('Stripe webhook inquiry processing error:', err.message);
      }
    }
  }

  res.json({ received: true });
};