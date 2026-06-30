import ManagedService    from '../models/ManagedService.js';
import ManagedBid        from '../models/ManagedBid.js';
import CommissionInvoice from '../models/CommissionInvoice.js';
import ManagedProject    from '../models/ManagedProject.js';
import ProjectMilestone  from '../models/ProjectMilestone.js';
import Company           from '../models/Company.js';
import AdminNotification from '../models/admin/AdminNotification.js';
import { createCheckoutSessionForCommissionInvoice, confirmStripePayment } from '../services/stripeService.js';

// ── Apply for managed service ─────────────────────────────────────────────────
export const applyManagedService = async (req, res) => {
  try {
    const existing = await ManagedService.findOne({ owner: req.user._id });
    if (existing) return res.json({ success: true, data: existing, message: 'Already applied.' });

    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Create a company profile first.' });

    const ms = await ManagedService.create({ company: company._id, owner: req.user._id });

    // Alert admin — this was previously silent, so applications could sit unseen
    AdminNotification.create({
      title: 'New Managed Service Application',
      message: `${req.user.name || req.user.email} (${company.name}) applied for the managed bidding service. Review and activate from the Managed Service panel.`,
      type: 'alert',
      actionRequired: true,
      actionUrl: '/admin/managed-service',
      priority: 'high',
      createdBy: req.user._id,
    }).catch(() => {});

    res.status(201).json({ success: true, data: ms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get my managed service + bids + invoices ──────────────────────────────────
export const getMyManagedService = async (req, res) => {
  try {
    const ms = await ManagedService.findOne({ owner: req.user._id }).populate('company', 'name');
    if (!ms) return res.json({ success: true, data: null });

    const [bids, invoices] = await Promise.all([
      ManagedBid.find({ managedService: ms._id }).sort({ createdAt: -1 }),
      CommissionInvoice.find({ managedService: ms._id }).sort({ createdAt: -1 }),
    ]);

    res.json({ success: true, data: ms, bids, invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get my projects (read-only) ──────────────────────────────────────────────
export const getMyProjects = async (req, res) => {
  try {
    const ms = await ManagedService.findOne({ owner: req.user._id });
    if (!ms) return res.json({ success: true, data: [] });

    const projects = await ManagedProject.find({ managedService: ms._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get single project detail (read-only) ────────────────────────────────────
export const getMyProjectDetail = async (req, res) => {
  try {
    const ms = await ManagedService.findOne({ owner: req.user._id });
    if (!ms) return res.status(404).json({ success: false, message: 'No managed service found.' });

    const project = await ManagedProject.findOne({ _id: req.params.id, managedService: ms._id }).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const milestones = await ProjectMilestone.find({ managedProject: project._id }).sort({ order: 1 }).lean();

    res.json({ success: true, data: project, milestones });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Pay a commission/monthly-fee invoice via Stripe Checkout ─────────────────
export const payInvoiceWithStripe = async (req, res) => {
  try {
    const invoice = await CommissionInvoice.findOne({ _id: req.params.invoiceId, owner: req.user._id });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'This invoice is already paid.' });

    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const description = invoice.type === 'monthly_fee'
      ? `Monthly service fee — ${invoice.invoiceNumber}`
      : `Commission — ${invoice.invoiceNumber}${invoice.notes ? ` (${invoice.notes})` : ''}`;

    const session = await createCheckoutSessionForCommissionInvoice({
      invoiceId:  invoice._id,
      email:      req.user.email,
      description,
      amount:     invoice.amount,
      successUrl: `${frontendUrl}/company/managed-service?invoice_paid=1&invoiceId=${invoice._id}`,
      cancelUrl:  `${frontendUrl}/company/managed-service?invoice_cancelled=1`,
    });

    if (!session.success) {
      return res.status(400).json({ success: false, message: session.error || 'Stripe checkout failed.' });
    }

    invoice.metadata = new Map([['stripeSessionId', session.sessionId]]);
    await invoice.save();

    res.json({ success: true, data: { url: session.url, isSimulated: session.isSimulated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Confirm Stripe payment for an invoice (trusts the Checkout redirect) ─────
export const confirmInvoiceStripePayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const invoice = await CommissionInvoice.findOne({ _id: req.params.invoiceId, owner: req.user._id });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    if (invoice.status === 'paid') return res.json({ success: true, message: 'Already paid.', data: invoice });

    if (paymentIntentId && !paymentIntentId.startsWith('sim_')) {
      const result = await confirmStripePayment(paymentIntentId);
      if (!result.success) return res.status(400).json({ success: false, message: 'Payment not successful.' });
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.paymentMethod = 'stripe';
    await invoice.save();

    if (invoice.bid) {
      const bidDoc = await ManagedBid.findById(invoice.bid);
      if (bidDoc) {
        const allPaid = await CommissionInvoice.find({ bid: bidDoc._id, status: { $ne: 'cancelled' } });
        const stillUnpaid = allPaid.some(i => i.status !== 'paid');
        if (!stillUnpaid) { bidDoc.commissionPaid = true; bidDoc.paidAt = new Date(); await bidDoc.save(); }
      }
    }

    await AdminNotification.create({
      title: '💰 Managed Service Invoice Paid',
      message: `${req.user.name || req.user.email} paid invoice ${invoice.invoiceNumber} (${invoice.amount}) via Stripe.`,
      type: 'payment',
      priority: 'medium',
    }).catch(() => {});

    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
