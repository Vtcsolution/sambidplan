// backend/controllers/adminController.js
import nodemailer from 'nodemailer';
import PlanRequest from '../models/PlanRequest.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import Ticket from '../models/Ticket.js';
import Suggestion from '../models/Suggestion.js';
import ContactInquiry from '../models/ContactInquiry.js';
import CreditPurchase from '../models/CreditPurchase.js';
import Plan from '../models/Plan.js';
import AdminSetting from '../models/admin/AdminSetting.js';
import { applyGroupedToEnv, writeEnvFile } from '../services/settingsService.js';
import { resetAIClient } from '../services/geminiService.js';
import { resetEmailTransporter, sendPaymentInstructionsEmail, sendPlanActivatedEmail } from '../services/emailService.js';
import { resetStripeClient } from '../services/stripeService.js';
import { resetPayPalToken } from '../services/paypalService.js';
import AdminNotification from '../models/admin/AdminNotification.js';
import SavedOpportunity from '../models/SavedOpportunity.js';
import Opportunity from '../models/Opportunity.js';
import UserOpportunity from '../models/UserOpportunity.js';
import SamCompany from '../models/SamCompany.js';
import { triggerManualFetch, triggerManualBulk, triggerTestFetch, fetchStats, bulkStats, distributeToUser } from '../services/schedulerService.js';
import { runBulkTest } from '../services/samBulkService.js';
import { syncSamEntities, fetchAndSaveCompany, entitySyncStats } from '../services/samEntityService.js';
import { quotaState, limiterState } from '../services/samRateLimiter.js';
import { syncUsaSpendingCompanies, usaSpendingSyncStats } from '../services/usaSpendingCompanyService.js';
import { syncFpdsCompanies, fpdsSyncStats } from '../services/fpdsService.js';
import { syncSbaCompanies, sbaSyncStats } from '../services/sbaService.js';
import { getSourceBreakdown } from '../services/companyMergeService.js';


export const getPlanRequests = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20, billingCycle } = req.query;

    const query = {};
    if (status !== 'all') query.status = status;
    if (billingCycle) query.billingCycle = billingCycle;

    // Support members only see requests from users they referred
    if (req.admin?.role === 'support') {
      const referredUsers = await User.find({ supportReferredBy: req.admin._id }).select('_id');
      query.user = { $in: referredUsers.map(u => u._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await PlanRequest.find(query)
      .populate({
        path: 'user',
        select: 'name email businessName naicsCodes plan supportReferredBy',
        populate: { path: 'supportReferredBy', select: 'name email referralCode' },
      })
      .populate('invoiceId', 'invoiceNumber amount status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PlanRequest.countDocuments(query);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get plan requests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new plan request (from user)
// @route   POST /api/admin/plan-requests
export const createPlanRequest = async (req, res) => {
  try {
    const { requestedPlan, billingCycle = 'monthly', paymentMethod = 'payoneer', notes } = req.body;
    
    // Check if user already has a pending request
    const existingRequest = await PlanRequest.findOne({
      user: req.user._id,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending plan request. Please wait for admin approval.'
      });
    }
    
    const planRequest = new PlanRequest({
      user: req.user._id,
      userEmail: req.user.email,
      userName: req.user.name,
      requestedPlan,
      billingCycle,
      paymentMethod,
      notes,
      status: 'pending'
    });
    
    await planRequest.save();
    
    // Create notification for admin
    await AdminNotification.create({
      title: 'New Plan Request',
      message: `${req.user.name || req.user.email} requested ${requestedPlan} plan`,
      type: 'plan_request',
      actionRequired: true,
      actionUrl: '/admin/plan-requests',
      priority: 'high',
      createdBy: req.user._id
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('📋 NEW PLAN REQUEST');
    console.log('='.repeat(70));
    console.log(`🆔 Request ID: ${planRequest._id}`);
    console.log(`👤 User: ${req.user.email}`);
    console.log(`📋 Plan: ${requestedPlan} (${billingCycle})`);
    console.log('='.repeat(70) + '\n');
    
    res.status(201).json({
      success: true,
      data: planRequest,
      message: 'Plan request submitted successfully. Admin will contact you shortly.'
    });
  } catch (error) {
    console.error('Create plan request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's own plan requests
// @route   GET /api/admin/my-requests
export const getUserPlanRequests = async (req, res) => {
  try {
    const requests = await PlanRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get user plan requests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    User submits payment proof for an approved plan request
// @route   POST /api/payment/plan-requests/:id/submit-proof
export const submitPaymentProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { userPaymentRef, userPaymentNote } = req.body;

    if (!userPaymentRef?.trim()) {
      return res.status(400).json({ success: false, message: 'Payment reference is required.' });
    }

    const planRequest = await PlanRequest.findById(id);
    if (!planRequest) {
      return res.status(404).json({ success: false, message: 'Plan request not found.' });
    }

    const reqUserId = req.user._id.toString();
    const ownerId  = planRequest.user?.toString();
    if (ownerId !== reqUserId) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (planRequest.status !== 'approved') {
      return res.status(400).json({ success: false, message: `Cannot submit proof for a ${planRequest.status} request.` });
    }

    planRequest.userPaymentRef  = userPaymentRef.trim();
    planRequest.userPaymentNote = (userPaymentNote || '').trim();
    planRequest.paymentProofAt  = new Date();
    await planRequest.save();

    await AdminNotification.create({
      title: 'Payment Proof Submitted',
      message: `${planRequest.userName || planRequest.userEmail} submitted payment proof for ${planRequest.requestedPlan} plan. Ref: ${userPaymentRef.trim()}`,
      type: 'payment',
      actionRequired: true,
      actionUrl: '/admin/annual-requests',
      priority: 'high',
    });

    console.log(`💰 Payment proof submitted by ${planRequest.userEmail}: ${userPaymentRef.trim()}`);

    res.json({ success: true, message: 'Payment proof submitted. Admin will verify and activate your plan shortly.' });
  } catch (error) {
    console.error('submitPaymentProof error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve plan request and create invoice
// @route   POST /api/admin/plan-requests/:id/approve
export const approvePlanRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    
    const planRequest = await PlanRequest.findById(id).populate('user');
    
    if (!planRequest) {
      return res.status(404).json({ success: false, message: 'Plan request not found' });
    }
    
    if (planRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request already ${planRequest.status}` });
    }
    
    // Resolve user ID safely (populate may return null if user was deleted)
    const userId = planRequest.user?._id || planRequest.user;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User account not found. Cannot approve this request.' });
    }

    // Create invoice for the user
    const plan = await Plan.findOne({ name: planRequest.requestedPlan });

    // Fallback prices if plan somehow missing from DB
    const FALLBACK_PRICES = { free: { monthly: 0, yearly: 0 }, starter: { monthly: 29, yearly: 278 }, pro: { monthly: 79, yearly: 758 }, enterprise: { monthly: 499, yearly: 4788 } };
    const prices = plan || FALLBACK_PRICES[planRequest.requestedPlan] || { monthly: 0, yearly: 0 };
    const amount = planRequest.billingCycle === 'yearly' ? (prices.priceYearly ?? prices.yearly) : (prices.priceMonthly ?? prices.monthly);

    // Map credit_card → manual for Invoice enum compatibility
    const invoicePaymentMethod = planRequest.paymentMethod === 'credit_card' ? 'manual' : (planRequest.paymentMethod || 'manual');

    const invoice = new Invoice({
      user: userId,
      plan: planRequest.requestedPlan,
      billingCycle: planRequest.billingCycle || 'yearly',
      amount,
      currency: 'USD',
      status: 'pending',
      paymentMethod: invoicePaymentMethod,
    });
    
    await invoice.save();
    
    // Update plan request
    planRequest.status = 'approved';
    planRequest.adminNotes = adminNotes || '';
    planRequest.approvedAt = new Date();
    planRequest.invoiceId = invoice._id;
    await planRequest.save();
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ PLAN REQUEST APPROVED');
    console.log('='.repeat(70));
    console.log(`🆔 Request ID: ${planRequest._id}`);
    console.log(`👤 User: ${planRequest.userEmail}`);
    console.log(`📋 Plan: ${planRequest.requestedPlan} (${planRequest.billingCycle})`);
    console.log(`📄 Invoice Number: ${invoice.invoiceNumber}`);
    console.log(`💰 Amount: $${amount} USD`);
    console.log('='.repeat(70) + '\n');
    
    res.json({
      success: true,
      data: { planRequest, invoice },
      message: `Plan request approved. Invoice #${invoice.invoiceNumber} created.`
    });
  } catch (error) {
    console.error('Approve plan request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllInvoices = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const invoices = await Invoice.find(query)
      .populate('user', 'name email businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Invoice.countDocuments(query);
    
    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all invoices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get yearly invoices (online payments) for the Annual Requests dashboard
// @route   GET /api/admin/annual-invoices
export const getAnnualInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;

    const query = { billingCycle: 'yearly' };
    if (status && status !== 'all') query.status = status;

    // Support members only see invoices from users they referred
    if (req.admin?.role === 'support') {
      const referredUsers = await User.find({ supportReferredBy: req.admin._id }).select('_id');
      query.user = { $in: referredUsers.map(u => u._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const invoices = await Invoice.find(query)
      .populate('user', 'name email businessName plan supportReferredBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(query);

    res.json({
      success: true,
      data: invoices,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get annual invoices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get invoice by ID
// @route   GET /api/admin/invoices/:id
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('user', 'name email businessName plan');
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Get invoice by ID error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Test email configuration
// @route   POST /api/admin/email/test
export const testEmail = async (req, res) => {
  try {
    const { email, type = 'noreply' } = req.body;

    const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465');
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || process.env.EMAIL_HOST || 'smtp.hostinger.com',
      port,
      secure: (process.env.SMTP_SECURE || 'true') === 'true' || port === 465,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    });

    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const FROM_MAP = {
      noreply: `"Sambid" <${process.env.EMAIL_NOREPLY || smtpUser}>`,
      support: `"Sambid Support" <${process.env.EMAIL_SUPPORT || smtpUser}>`,
      billing: `"Sambid Billing" <${process.env.EMAIL_BILLING || smtpUser}>`,
    };
    const LABEL_MAP = { noreply: 'System / No-Reply', support: 'Support', billing: 'Billing' };

    const from  = FROM_MAP[type]  || FROM_MAP.noreply;
    const label = LABEL_MAP[type] || type;

    await transporter.sendMail({
      from,
      to: email,
      subject: `[Sambid] Test email — ${label} sender`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:24px;text-align:center;color:white;">
            <h1 style="margin:0;font-size:22px;">Sambid</h1>
            <p style="margin:6px 0 0;opacity:.85;font-size:13px;">Federal Contract Intelligence</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin-top:16px;padding:28px;">
            <h2 style="color:#1f2937;margin-top:0;">SMTP Test Successful</h2>
            <p style="color:#4b5563;line-height:1.6;">
              This test email was sent from the <strong>${label}</strong> sender address via your Hostinger SMTP configuration.
            </p>
            <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px;">
              <tr><td style="padding:8px;color:#6b7280;width:40%;">From address</td><td style="padding:8px;color:#111827;font-family:monospace;">${from}</td></tr>
              <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">SMTP host</td><td style="padding:8px;color:#111827;font-family:monospace;">${process.env.SMTP_HOST || 'smtp.hostinger.com'}</td></tr>
              <tr><td style="padding:8px;color:#6b7280;">Port</td><td style="padding:8px;color:#111827;font-family:monospace;">${port}</td></tr>
              <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Secure (TLS)</td><td style="padding:8px;color:#111827;font-family:monospace;">${process.env.SMTP_SECURE || 'true'}</td></tr>
            </table>
          </div>
          <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">Sent from Sambid Admin Panel</p>
        </div>
      `,
    });

    res.json({ success: true, message: `Test email sent from ${label} (${from})` });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update invoice status (paid, cancelled, refunded)
// @route   PUT /api/admin/invoices/:id/status
export const updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const validStatuses = ['pending', 'paid', 'cancelled', 'refunded', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    const invoice = await Invoice.findById(id).populate('user');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    const oldStatus = invoice.status;
    invoice.status = status;
    
    if (status === 'paid' && !invoice.paidAt) {
      invoice.paidAt = new Date();
      
      // Upgrade user plan if invoice is paid
      const user = await User.findById(invoice.user._id);
      user.plan = invoice.plan;
      const duration = invoice.billingCycle === 'yearly' ? 365 : 30;
      user.planExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      await user.save();
      
      // Create notification for user upgrade
      await AdminNotification.create({
        title: 'Plan Upgraded',
        message: `Your plan has been upgraded to ${invoice.plan} successfully!`,
        type: 'payment',
        actionRequired: false,
        priority: 'high',
        createdBy: req.user._id,
        metadata: {
          userId: user._id,
          oldPlan: oldStatus,
          newPlan: invoice.plan
        }
      });
    }
    
    if (notes) {
      invoice.metadata = invoice.metadata || new Map();
      invoice.metadata.set('adminNotes', notes);
    }
    
    await invoice.save();
    
    console.log(`✅ Invoice ${invoice.invoiceNumber} status updated from ${oldStatus} to ${status}`);
    
    res.json({
      success: true,
      message: `Invoice status updated to ${status}`,
      data: invoice
    });
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== USER MANAGEMENT ====================

// @desc    Get all users
// @route   GET /api/admin/users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Calculate days left for each user
    const usersWithExpiry = users.map(user => {
      const userObj = user.toObject();
      if (userObj.planExpiresAt) {
        const diff = new Date(userObj.planExpiresAt) - new Date();
        userObj.daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      } else {
        userObj.daysLeft = null;
      }
      return userObj;
    });
    
    res.json({ success: true, data: usersWithExpiry });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user by ID with complete profile data
// @route   GET /api/admin/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch related data in parallel
    const [invoices, savedCount, planRequests] = await Promise.all([
      Invoice.find({ user: user._id }).sort({ createdAt: -1 }).limit(10),
      SavedOpportunity.countDocuments({ user: user._id }),
      PlanRequest.find({ user: user._id }).sort({ createdAt: -1 }).limit(5),
    ]);

    const totalSpend = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        invoices,
        savedCount,
        planRequests,
        totalSpend,
      },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user plan
// @route   PUT /api/admin/users/:id/plan
export const updateUserPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, expiresAt, notes } = req.body;
    
    const validPlans = ['free', 'starter', 'pro', 'enterprise', 'trial', 'expired'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const oldPlan = user.plan;
    user.plan = plan;
    
    if (expiresAt) {
      user.planExpiresAt = new Date(expiresAt);
    } else if (plan === 'free') {
      user.planExpiresAt = null;
    } else if (plan === 'starter' || plan === 'pro' || plan === 'enterprise') {
      user.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    
    await user.save();

    // Immediately repopulate feed when upgrading to a paid plan
    if (['starter', 'pro', 'enterprise'].includes(plan)) {
      try {
        await distributeToUser(user);
        console.log(`✅ Feed immediately repopulated for ${user.email} after admin plan update`);
      } catch (e) {
        console.error('Feed repopulation error (non-fatal):', e.message);
      }
    }

    // Create notification
    await AdminNotification.create({
      title: 'Plan Updated by Admin',
      message: `Your plan has been updated from ${oldPlan} to ${plan}`,
      type: 'system',
      actionRequired: false,
      priority: 'medium',
      createdBy: req.user._id,
      metadata: { userId: user._id, oldPlan, newPlan: plan }
    });
    
    console.log(`✅ Admin updated user ${user.email} plan from ${oldPlan} to ${plan}`);
    
    res.json({ success: true, message: `User plan updated to ${plan}`, data: user });
  } catch (error) {
    console.error('Update user plan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.role = role;
    await user.save();
    
    console.log(`✅ Admin updated user ${user.email} role to ${role}`);
    
    res.json({ success: true, message: `User role updated to ${role}` });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log(`🗑️ Admin deleted user ${user.email}`);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Grant bonus AI credits to a user
// @route   PUT /api/admin/users/:id/grant-credits
export const grantCredits = async (req, res) => {
  try {
    const { credits, reason } = req.body;
    const amount = parseInt(credits);
    if (!amount || amount < 1 || amount > 10000) {
      return res.status(400).json({ success: false, message: 'Credits must be between 1 and 10,000.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.bonusAICredits = (user.bonusAICredits || 0) + amount;
    await user.save();

    // Notify user
    try {
      const { default: UserNotification } = await import('../models/UserNotification.js');
      await UserNotification.create({
        user: user._id,
        type: 'general',
        title: `${amount} AI Credits Granted`,
        message: `You received ${amount} bonus AI credits${reason ? `: ${reason}` : ''}. These don't expire with your monthly reset.`,
        link: '/opportunities',
      });
    } catch {}

    console.log(`🎁 Admin granted ${amount} credits to ${user._id}${reason ? ` (${reason})` : ''}`);
    res.json({
      success: true,
      message: `Granted ${amount} bonus AI credits to ${user.name || user.email}.`,
      data: { bonusCredits: user.bonusAICredits, totalRemaining: (user.bonusAICredits || 0) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unlock/activate plan for a user (with optional credits)
// @route   PUT /api/admin/users/:id/unlock
export const unlockUser = async (req, res) => {
  try {
    const { plan, durationDays, credits, reason } = req.body;
    const validPlans = ['trial', 'free', 'starter', 'pro', 'enterprise'];
    if (plan && !validPlans.includes(plan)) {
      return res.status(400).json({ success: false, message: `Invalid plan. Must be one of: ${validPlans.join(', ')}` });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const oldPlan = user.plan;
    const changes = [];

    // Update plan
    if (plan) {
      user.plan = plan;
      changes.push(`Plan: ${oldPlan} → ${plan}`);

      // Set expiry
      const days = parseInt(durationDays) || 30;
      user.planExpiresAt = new Date(Date.now() + days * 86400000);
      changes.push(`Expires: ${user.planExpiresAt.toLocaleDateString()}`);

      // Reset trial flags if needed
      if (plan !== 'trial') {
        user.isTrialActive = false;
      }
      if (plan === 'trial') {
        user.isTrialActive = true;
        user.trialStartDate = new Date();
        user.trialEndDate = new Date(Date.now() + days * 86400000);
      }

      // Reset monthly usage counters
      user.monthlyMatchesUsed = 0;
      user.dailyMatchesUsed = 0;
      user.monthlyAIGenerationsUsed = 0;
    }

    // Grant bonus credits
    const bonusCredits = parseInt(credits) || 0;
    if (bonusCredits > 0) {
      user.bonusAICredits = (user.bonusAICredits || 0) + bonusCredits;
      changes.push(`+${bonusCredits} bonus AI credits`);
    }

    await user.save();

    // Distribute opportunities for new plan
    if (plan && ['starter', 'pro', 'enterprise'].includes(plan)) {
      try {
        const { distributeToUser } = await import('../services/schedulerService.js');
        await distributeToUser(user);
      } catch {}
    }

    // Notify user
    try {
      const { default: UserNotification } = await import('../models/UserNotification.js');
      await UserNotification.create({
        user: user._id,
        type: 'plan_activated',
        title: plan ? `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Activated` : 'Account Updated',
        message: changes.join(' | ') + (reason ? ` — ${reason}` : ''),
        link: '/dashboard',
      });
    } catch {}

    // Send email
    try {
      const { sendPlanActivatedEmail } = await import('../services/emailService.js');
      await sendPlanActivatedEmail(user, plan || user.plan);
    } catch {}

    console.log(`🔓 Admin unlocked user ${user._id}: ${changes.join(', ')}`);
    res.json({ success: true, message: `User unlocked: ${changes.join(' | ')}`, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== RECENT ACTIVITY ====================

// @desc    Get recent activity (user signups, plan purchases, payments)
// @route   GET /api/admin/recent-activity
export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Get recent user signups
    const recentUsers = await User.find()
      .select('name email createdAt plan')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Get recent invoices
    const recentInvoices = await Invoice.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Get recent plan requests
    const recentRequests = await PlanRequest.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Combine and sort activities
    const activities = [];
    
    recentUsers.forEach(user => {
      activities.push({
        type: 'user_signup',
        title: 'New User Signup',
        message: `${user.name || user.email} created an account`,
        user: { name: user.name, email: user.email },
        plan: user.plan,
        createdAt: user.createdAt,
        priority: 'medium'
      });
    });
    
    recentInvoices.forEach(invoice => {
      activities.push({
        type: 'payment',
        title: invoice.status === 'paid' ? 'Payment Received' : 'Invoice Created',
        message: `${invoice.user?.name || invoice.user?.email} ${invoice.status === 'paid' ? 'paid' : 'requested'} ${invoice.plan} plan ($${invoice.amount})`,
        user: invoice.user,
        amount: invoice.amount,
        plan: invoice.plan,
        status: invoice.status,
        createdAt: invoice.createdAt,
        priority: invoice.status === 'paid' ? 'high' : 'medium'
      });
    });
    
    recentRequests.forEach(request => {
      activities.push({
        type: 'plan_request',
        title: 'Plan Request',
        message: `${request.userName || request.userEmail} requested ${request.requestedPlan} plan`,
        user: { name: request.userName, email: request.userEmail },
        plan: request.requestedPlan,
        status: request.status,
        createdAt: request.createdAt,
        priority: request.status === 'pending' ? 'high' : 'low'
      });
    });
    
    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      data: activities.slice(0, parseInt(limit)),
      total: activities.length
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== CREATE NOTIFICATION FOR USER ACTIONS ====================

// Helper function to create notification on user actions
export const createUserActionNotification = async (userId, action, metadata = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    
    let title = '';
    let message = '';
    let type = 'info';
    let priority = 'medium';
    
    switch (action) {
      case 'login':
        title = 'User Login';
        message = `${user.name || user.email} logged in`;
        type = 'user_signup';
        priority = 'low';
        break;
      case 'register':
        title = 'New User Registered';
        message = `${user.name || user.email} created a new account`;
        type = 'user_signup';
        priority = 'high';
        break;
      case 'plan_purchased':
        title = 'Plan Purchased';
        message = `${user.name || user.email} purchased ${metadata.plan} plan`;
        type = 'payment';
        priority = 'high';
        break;
      default:
        return;
    }
    
    await AdminNotification.create({
      title,
      message,
      type,
      actionRequired: false,
      priority,
      metadata: { userId, ...metadata }
    });
    
    console.log(`📢 Notification created: ${title}`);
  } catch (error) {
    console.error('Create notification error:', error);
  }
};
// @desc    Mark invoice as paid and upgrade user
// @route   POST /api/admin/plan-requests/:id/mark-paid
export const markRequestAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentReference } = req.body;
    
    const planRequest = await PlanRequest.findById(id).populate('user');
    
    if (!planRequest) {
      return res.status(404).json({ success: false, message: 'Plan request not found' });
    }
    
    if (planRequest.status !== 'approved') {
      return res.status(400).json({ success: false, message: `Request status is ${planRequest.status}, not approved` });
    }
    
    // Update invoice
    const invoice = await Invoice.findById(planRequest.invoiceId);
    if (invoice) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      invoice.paymentReference = paymentReference || '';
      await invoice.save();
    }
    
    // Upgrade user plan
    const resolvedUserId = planRequest.user?._id || planRequest.user;
    const user = await User.findById(resolvedUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found. Cannot activate plan.' });
    }
    const oldPlan = user.plan;
    user.plan = planRequest.requestedPlan;
    user.isTrialActive = false;
    user.dailyMatchesUsed = 0;

    const duration = planRequest.billingCycle === 'yearly' ? 365 : 30;
    user.planExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    await user.save();
    
    // Update plan request
    planRequest.status = 'completed';
    planRequest.completedAt = new Date();
    planRequest.paymentReference = paymentReference || '';
    await planRequest.save();
    
    // Create notification for completion
    await AdminNotification.create({
      title: 'Plan Upgrade Completed',
      message: `${user.name || user.email} upgraded to ${planRequest.requestedPlan} plan`,
      type: 'payment',
      actionRequired: false,
      priority: 'medium',
      createdBy: req.user._id
    });
    
    // Send activation email to user
    try {
      await sendPlanActivatedEmail({
        name:        user.name || user.email,
        email:       user.email,
        planName:    planRequest.requestedPlan,
        planExpires: user.planExpiresAt,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      });
    } catch (emailErr) {
      console.error('Activation email failed (non-fatal):', emailErr.message);
    }

    // Immediately repopulate feed with plan-appropriate opportunities
    try {
      await distributeToUser(user);
      console.log(`✅ Feed immediately repopulated for ${user.email} after plan activation`);
    } catch (e) {
      console.error('Feed repopulation error (non-fatal):', e.message);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 USER PLAN UPGRADED');
    console.log('='.repeat(70));
    console.log(`👤 User: ${user.email}`);
    console.log(`📋 Plan: ${planRequest.requestedPlan} (${planRequest.billingCycle})`);
    console.log(`💰 Amount: $${invoice?.amount || 'N/A'}`);
    console.log(`📄 Invoice: ${invoice?.invoiceNumber || 'N/A'}`);
    console.log('='.repeat(70) + '\n');

    res.json({
      success: true,
      message: `User ${user.email} upgraded to ${planRequest.requestedPlan} plan successfully.`
    });
  } catch (error) {
    console.error('Mark request as paid error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject plan request
// @route   POST /api/admin/plan-requests/:id/reject
export const rejectPlanRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    
    const planRequest = await PlanRequest.findById(id);
    
    if (!planRequest) {
      return res.status(404).json({ success: false, message: 'Plan request not found' });
    }
    
    planRequest.status = 'rejected';
    planRequest.adminNotes = adminNotes || 'Request rejected by admin';
    await planRequest.save();
    
    console.log(`❌ Plan request rejected for ${planRequest.userEmail}`);
    
    res.json({
      success: true,
      message: 'Plan request rejected.'
    });
  } catch (error) {
    console.error('Reject plan request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send payment instructions email to user for annual plan request
// @route   POST /api/admin/plan-requests/:id/send-instructions
export const sendPlanPaymentInstructions = async (req, res) => {
  try {
    const { id } = req.params;
    const { method, accountInfo, reference, customMessage } = req.body;

    if (!method || !accountInfo) {
      return res.status(400).json({ success: false, message: 'Payment method and account info are required.' });
    }

    const planRequest = await PlanRequest.findById(id).populate('user');
    if (!planRequest) {
      return res.status(404).json({ success: false, message: 'Plan request not found.' });
    }

    const userName  = planRequest.user?.name  || planRequest.userName  || 'there';
    const userEmail = planRequest.userEmail   || planRequest.user?.email;
    if (!userEmail) {
      return res.status(400).json({ success: false, message: 'No email address found for this request.' });
    }

    const plan = await Plan.findOne({ name: planRequest.requestedPlan });
    const FALLBACK_PRICES = { starter: { monthly: 29, yearly: 278 }, pro: { monthly: 79, yearly: 758 }, enterprise: { monthly: 499, yearly: 4788 } };
    const prices = plan || FALLBACK_PRICES[planRequest.requestedPlan] || { monthly: 0, yearly: 0 };
    const amount = planRequest.billingCycle === 'yearly' ? (prices.priceYearly ?? prices.yearly) : (prices.priceMonthly ?? prices.monthly);

    // Auto-approve the request if it is still pending (creates invoice so user sees the right status)
    if (planRequest.status === 'pending') {
      const userId = planRequest.user?._id || planRequest.user;
      const invoicePaymentMethod = planRequest.paymentMethod === 'credit_card' ? 'manual' : (planRequest.paymentMethod || 'manual');
      const invoice = new Invoice({
        user: userId,
        plan: planRequest.requestedPlan,
        billingCycle: planRequest.billingCycle || 'yearly',
        amount,
        currency: 'USD',
        status: 'pending',
        paymentMethod: invoicePaymentMethod,
      });
      await invoice.save();
      planRequest.status = 'approved';
      planRequest.approvedAt = new Date();
      planRequest.invoiceId = invoice._id;
      console.log(`✅ Auto-approved plan request ${planRequest._id} on instructions send`);
    }

    planRequest.instructionsSentAt = new Date();
    await planRequest.save();

    const ref = reference || planRequest._id.toString().slice(-8).toUpperCase();

    res.json({ success: true, message: `Payment instructions sent to ${userEmail}.` });

    // Fire after responding — never block on SMTP
    sendPaymentInstructionsEmail({
      to:            userEmail,
      userName,
      planName:      planRequest.requestedPlan,
      billingCycle:  planRequest.billingCycle || 'yearly',
      amount,
      method,
      accountInfo,
      reference:     ref,
      customMessage: customMessage || '',
    }).catch(err => console.error(`Payment instructions email failed (${userEmail}):`, err.message));
    console.log(`📧 Payment instructions queued for ${userEmail}`);
  } catch (error) {
    console.error('sendPlanPaymentInstructions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get monthly analytics for dashboard charts
// @route   GET /api/admin/analytics
export const getDashboardAnalytics = async (req, res) => {
  try {
    const months = Number(req.query.months) || 12;
    const now = new Date();
    const series = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = start.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      const [newUsers, revenue, paidInvoices, aiCredits] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: start, $lt: end } }),
        Invoice.aggregate([
          { $match: { status: 'paid', paidAt: { $gte: start, $lt: end } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        Invoice.countDocuments({ status: 'paid', paidAt: { $gte: start, $lt: end } }),
        (async () => {
          try {
            const CreditUsageLog = (await import('../models/CreditUsageLog.js')).default;
            const agg = await CreditUsageLog.aggregate([
              { $match: { createdAt: { $gte: start, $lt: end } } },
              { $group: { _id: null, total: { $sum: '$creditsUsed' }, calls: { $sum: 1 } } },
            ]);
            return { credits: agg[0]?.total || 0, calls: agg[0]?.calls || 0 };
          } catch { return { credits: 0, calls: 0 }; }
        })(),
      ]);

      series.push({
        month: label,
        newUsers,
        revenue: revenue[0]?.total || 0,
        invoices: paidInvoices,
        aiCredits: aiCredits.credits,
        aiCalls: aiCredits.calls,
      });
    }

    // Cumulative user count at end of each month
    let cumUsers = await User.countDocuments({ createdAt: { $lt: new Date(now.getFullYear(), now.getMonth() - months + 1, 1) } });
    for (const s of series) {
      cumUsers += s.newUsers;
      s.totalUsers = cumUsers;
    }

    // Plan distribution right now
    const [trial, free, starter, pro, enterprise] = await Promise.all([
      User.countDocuments({ plan: 'trial' }),
      User.countDocuments({ plan: 'free' }),
      User.countDocuments({ plan: 'starter' }),
      User.countDocuments({ plan: 'pro' }),
      User.countDocuments({ plan: 'enterprise' }),
    ]);

    res.json({
      success: true,
      data: {
        series,
        planDistribution: { trial, free, starter, pro, enterprise },
        totals: {
          users: series.reduce((s, m) => s + m.newUsers, 0),
          revenue: series.reduce((s, m) => s + m.revenue, 0),
          aiCredits: series.reduce((s, m) => s + m.aiCredits, 0),
          aiCalls: series.reduce((s, m) => s + m.aiCalls, 0),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get dashboard stats for admin
// @route   GET /api/admin/stats
export const getAdminStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // ── Plan requests ──────────────────────────────────────────────────────────
    const [pendingRequests, approvedRequests, completedRequests] = await Promise.all([
      PlanRequest.countDocuments({ status: 'pending' }),
      PlanRequest.countDocuments({ status: 'approved' }),
      PlanRequest.countDocuments({ status: 'completed' }),
    ]);

    // ── User counts ────────────────────────────────────────────────────────────
    const [totalUsers, proUsers, enterpriseUsers, starterUsers, freeUsers, trialUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ plan: 'pro' }),
      User.countDocuments({ plan: 'enterprise' }),
      User.countDocuments({ plan: 'starter' }),
      User.countDocuments({ plan: 'free' }),
      User.countDocuments({ plan: 'trial' }),
    ]);

    // ── Revenue ────────────────────────────────────────────────────────────────
    const paidInvoices30d = await Invoice.find({ status: 'paid', paidAt: { $gte: thirtyDaysAgo } });
    const allPaidInvoices  = await Invoice.find({ status: 'paid' });
    const monthlyRevenue   = paidInvoices30d.reduce((s, i) => s + (i.amount || 0), 0);
    const totalRevenue     = allPaidInvoices.reduce((s, i)  => s + (i.amount || 0), 0);

    // ── Saved Opportunities ────────────────────────────────────────────────────
    const [totalSavedLifetime, dailySaved] = await Promise.all([
      SavedOpportunity.countDocuments(),
      SavedOpportunity.countDocuments({ savedAt: { $gte: todayStart } }),
    ]);

    // ── Opportunity store stats ────────────────────────────────────────────────
    const [masterOpportunityCount, userOpportunityCount, todayFetchedCount] = await Promise.all([
      Opportunity.countDocuments(),
      UserOpportunity.countDocuments(),
      Opportunity.countDocuments({ lastFetched: { $gte: todayStart } }),
    ]);

    // ── Recent invoices (for table) ────────────────────────────────────────────
    const recentInvoices = await Invoice.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        // Plan requests
        pendingRequests, approvedRequests, completedRequests,
        // Users
        totalUsers, proUsers, enterpriseUsers, starterUsers, freeUsers, trialUsers,
        // Revenue
        monthlyRevenue, totalRevenue,
        // Saved opportunities
        totalSavedLifetime, dailySaved,
        // Opportunity store
        masterOpportunityCount, userOpportunityCount, todayFetchedCount,
        // SAM.gov API fetch status (in-memory)
        samFetch: {
          lastFetchAt:          fetchStats.lastMasterFetchAt,
          lastFetchCount:       fetchStats.lastMasterFetchCount,
          lastDistributionAt:   fetchStats.lastDistributionAt,
          lastDistributionCount:fetchStats.lastDistributionCount,
          totalFetchRuns:       fetchStats.totalFetchRuns,
          isFetching:           fetchStats.isFetching,
        },
        // Nightly bulk download status (in-memory)
        bulkFetch: {
          lastRunAt:    bulkStats.lastRunAt,
          lastRunCount: bulkStats.lastRunCount,
          lastRunPages: bulkStats.lastRunPages,
          isRunning:    bulkStats.isRunning,
        },
        // Invoices table
        recentInvoices,
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Manually trigger SAM.gov API master fetch + distribution
// @route   POST /api/admin/trigger-fetch
export const triggerSAMFetch = async (req, res) => {
  try {
    if (fetchStats.isFetching) {
      return res.json({ success: false, message: 'API fetch already in progress. Please wait.' });
    }
    console.log(`🔧 Admin ${req.user.email} triggered manual API fetch`);
    triggerManualFetch().catch(err => console.error('Manual API fetch error:', err.message));
    res.json({ success: true, message: 'SAM.gov API fetch started. Stats will update shortly.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Manually trigger nightly bulk download
// @route   POST /api/admin/trigger-bulk
export const triggerBulkFetch = async (req, res) => {
  try {
    if (bulkStats.isRunning) {
      return res.json({ success: false, message: 'Bulk download already in progress. Please wait.' });
    }
    console.log(`🔧 Admin ${req.user.email} triggered manual bulk download`);
    triggerManualBulk().catch(err => console.error('Manual bulk error:', err.message));
    res.json({ success: true, message: 'Bulk download started. This may take a few minutes.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Test API fetch — exactly 10 records at given offset (1 API call)
// @route   POST /api/admin/trigger-fetch-test
export const triggerSAMFetchTest = async (req, res) => {
  try {
    if (fetchStats.isFetching) {
      return res.json({ success: false, message: 'A full fetch is already running. Wait for it to finish.' });
    }
    const offset = parseInt(req.body?.offset ?? 0) || 0;
    console.log(`🧪 Admin ${req.user.email} triggered TEST API fetch (10 records, offset ${offset})`);
    const result = await triggerTestFetch(offset);
    res.json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Test bulk fetch — exactly 10 records at given offset (1 API call)
// @route   POST /api/admin/trigger-bulk-test
export const triggerBulkFetchTest = async (req, res) => {
  try {
    const offset = parseInt(req.body?.offset ?? 0) || 0;
    console.log(`🧪 Admin ${req.user.email} triggered TEST bulk fetch (10 records, offset ${offset})`);
    const result = await runBulkTest(offset);
    res.json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all opportunities with fetchSource breakdown for admin hybrid view
// @route   GET /api/admin/hybrid-opportunities
export const getHybridOpportunities = async (req, res) => {
  try {
    const { page = 1, limit = 20, fetchSource, search, naicsCode } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (fetchSource && fetchSource !== 'all') filter.fetchSource = fetchSource;
    if (naicsCode) filter.naicsCode = naicsCode;
    if (search) {
      filter.$or = [
        { title:   { $regex: search, $options: 'i' } },
        { agency:  { $regex: search, $options: 'i' } },
        { naicsCode: { $regex: search, $options: 'i' } },
      ];
    }

    const [opportunities, total, apiCount, bulkCount, totalCount] = await Promise.all([
      Opportunity.find(filter).sort({ lastFetched: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Opportunity.countDocuments(filter),
      Opportunity.countDocuments({ fetchSource: 'api' }),
      Opportunity.countDocuments({ fetchSource: 'bulk' }),
      Opportunity.countDocuments(),
    ]);

    // Today's new fetches
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const [todayApi, todayBulk] = await Promise.all([
      Opportunity.countDocuments({ fetchSource: 'api',  lastFetched: { $gte: todayStart } }),
      Opportunity.countDocuments({ fetchSource: 'bulk', lastFetched: { $gte: todayStart } }),
    ]);

    res.json({
      success: true,
      data: opportunities,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
      breakdown: {
        totalUnique: totalCount,
        fromApi:     apiCount,
        fromBulk:    bulkCount,
        todayApi,
        todayBulk,
        // Live scheduler status
        apiFetch: {
          isFetching:   fetchStats.isFetching,
          lastRunAt:    fetchStats.lastMasterFetchAt,
          lastRunCount: fetchStats.lastMasterFetchCount,
          totalRuns:    fetchStats.totalFetchRuns,
        },
        bulkFetch: {
          isRunning:    bulkStats.isRunning,
          lastRunAt:    bulkStats.lastRunAt,
          lastRunCount: bulkStats.lastRunCount,
          lastRunPages: bulkStats.lastRunPages,
        },
      },
    });
  } catch (error) {
    console.error('Hybrid opportunities error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== SETTINGS CONTROLLERS ====================

// @desc    Get all settings
// @route   GET /api/admin/settings
export const getSettings = async (req, res) => {
  try {
    const rows = await AdminSetting.find().sort({ group: 1, key: 1 });

    const grouped = { general: {}, email: {}, payment: {}, api: {}, limits: {}, notifications: {} };
    rows.forEach(s => {
      if (grouped[s.group] !== undefined) grouped[s.group][s.key] = s.value;
    });

    // Fall back to process.env for any group that has no DB records yet
    const { ENV_MAP } = await import('../services/settingsService.js');
    for (const [settingKey, envKey] of Object.entries(ENV_MAP)) {
      const [group, key] = settingKey.split('.');
      if (grouped[group] !== undefined && grouped[group][key] === undefined) {
        const val = process.env[envKey];
        if (val !== undefined && String(val).trim() !== '') {
          grouped[group][key] = val;
        }
      }
    }

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update settings
// @route   PUT /api/admin/settings
export const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const updatedSettings = [];
    
    // Process each group
    for (const [group, settings] of Object.entries(updates)) {
      for (const [key, value] of Object.entries(settings)) {
        const setting = await AdminSetting.findOneAndUpdate(
          { key, group },
          { 
            key,
            value,
            group,
            updatedBy: req.user._id
          },
          { upsert: true, new: true }
        );
        updatedSettings.push(setting);
      }
    }
    
    console.log(`✅ Updated ${updatedSettings.length} settings`);

    // Apply to process.env immediately so services pick up new values
    applyGroupedToEnv(updates);

    // Write back to .env file so changes survive server restart
    writeEnvFile(updates);

    // Reset cached service clients so they re-initialize with new keys
    resetAIClient();
    resetEmailTransporter();
    resetStripeClient();
    resetPayPalToken();

    res.json({
      success: true,
      message: 'Settings saved — DB, .env file, and all services updated.',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== NOTIFICATION CONTROLLERS ====================

// @desc    Get all notifications
// @route   GET /api/admin/notifications
// Notification types that support users are allowed to see
const SUPPORT_NOTIFICATION_TYPES = ['ticket_created', 'ticket_reply', 'suggestion', 'referral_signup', 'withdrawal_request'];

export const getNotifications = async (req, res) => {
  try {
    const { limit = 50, page = 1, type, read } = req.query;
    const adminId   = req.user._id;
    const adminRole = req.admin?.role;

    const query = {};

    // Support role: restrict to types relevant to their work only
    if (adminRole === 'support') {
      query.type = { $in: SUPPORT_NOTIFICATION_TYPES };
    } else if (type && type !== 'all') {
      query.type = type;
    }

    // Per-admin read filter: check readBy array, not global read flag
    if (read !== undefined) {
      if (read === 'true') {
        query['readBy.user'] = adminId;
      } else {
        query['readBy.user'] = { $ne: adminId };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await AdminNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');

    const total = await AdminNotification.countDocuments(query);

    // Override `read` field with per-admin status so frontend works correctly
    const adminIdStr = adminId.toString();
    const data = notifications.map(n => {
      const obj = n.toObject();
      obj.read = n.readBy.some(r => r.user?.toString() === adminIdStr);
      return obj;
    });

    // Also return the unread count so page badge stays in sync with sidebar
    const unreadQuery = { ...query, 'readBy.user': { $ne: adminId } };
    const unreadCount = await AdminNotification.countDocuments(unreadQuery);

    res.json({
      success: true,
      data,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new notification
// @route   POST /api/admin/notifications
export const createNotification = async (req, res) => {
  try {
    const { title, message, type, actionRequired, actionUrl, priority, metadata } = req.body;
    
    const notification = new AdminNotification({
      title,
      message,
      type: type || 'info',
      actionRequired: actionRequired || false,
      actionUrl: actionUrl || '',
      priority: priority || 'medium',
      metadata: metadata || {},
      createdBy: req.user._id
    });
    
    await notification.save();
    
    console.log(`📢 New notification created: ${title}`);
    
    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/admin/notifications/:id/read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await AdminNotification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    // Per-admin tracking: only add to readBy if not already there
    const alreadyRead = notification.readBy.some(r => r.user && r.user.toString() === req.user._id.toString());

    if (!alreadyRead) {
      notification.readBy.push({ user: req.user._id, readAt: new Date() });
      await notification.save();
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete notification
// @route   DELETE /api/admin/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await AdminNotification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    console.log(`🗑️ Notification deleted: ${notification.title}`);
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send broadcast email to users
// @route   POST /api/admin/notifications/broadcast
export const sendBroadcastEmail = async (req, res) => {
  try {
    const { subject, message, recipientType, customEmails } = req.body;
    
    // Build recipient query based on type
    let recipientQuery = {};
    if (recipientType === 'free') recipientQuery = { plan: 'free' };
    else if (recipientType === 'starter') recipientQuery = { plan: 'starter' };
    else if (recipientType === 'pro') recipientQuery = { plan: 'pro' };
    else if (recipientType === 'enterprise') recipientQuery = { plan: 'enterprise' };
    else if (recipientType === 'all') recipientQuery = {};
    
    // Get recipients
    let recipients = [];
    if (customEmails && customEmails.trim()) {
      const emails = customEmails.split(',').map(e => e.trim());
      recipients = await User.find({ email: { $in: emails } });
    } else {
      recipients = await User.find(recipientQuery);
    }
    
    console.log(`📧 Sending broadcast email to ${recipients.length} users`);
    
    // Create notification record
    const notification = new AdminNotification({
      title: subject,
      message,
      type: 'system',
      createdBy: req.user._id,
      metadata: {
        broadcast: true,
        recipientCount: recipients.length,
        recipientType
      }
    });
    await notification.save();
    
    console.log('\n' + '='.repeat(70));
    console.log('📧 BROADCAST EMAIL');
    console.log('='.repeat(70));
    console.log(`Subject: ${subject}`);
    console.log(`Recipients: ${recipients.length}`);
    console.log(`Message: ${message.substring(0, 200)}...`);
    console.log('='.repeat(70) + '\n');
    
    res.json({
      success: true,
      message: `Broadcast email sent to ${recipients.length} users`,
      data: {
        recipientCount: recipients.length,
        notificationId: notification._id
      }
    });
  } catch (error) {
    console.error('Send broadcast email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get unread notifications count
// @route   GET /api/admin/notifications/unread/count
export const getUnreadNotificationsCount = async (req, res) => {
  try {
    const adminRole = req.admin?.role;
    const countQuery = { 'readBy.user': { $ne: req.user._id } };

    // Support role: only count types relevant to them
    if (adminRole === 'support') {
      countQuery.type = { $in: SUPPORT_NOTIFICATION_TYPES };
    }

    const count = await AdminNotification.countDocuments(countQuery);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== REFERRAL ADMIN CONTROLLERS ====================

import Referral from '../models/Referral.js';
import Withdrawal from '../models/Withdrawal.js';

// @desc    Get all referrals
// @route   GET /api/admin/referrals
export const getAllReferrals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status && status !== 'all' ? { status } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [referrals, total] = await Promise.all([
      Referral.find(query)
        .populate('referrer', 'name email plan referralBalance paidReferralCount totalReferralEarnings')
        .populate('referee',  'name email plan createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Referral.countDocuments(query),
    ]);

    const totalCommission = await Referral.aggregate([
      { $match: { status: 'rewarded' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]);

    res.json({
      success: true,
      data: referrals,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
      totalCommissionPaid: totalCommission[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all withdrawal requests
// @route   GET /api/admin/withdrawals
export const getAllWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status && status !== 'all' ? { status } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .populate('user', 'name email plan referralBalance totalReferralEarnings paidReferralCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Withdrawal.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: withdrawals,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Approve or reject a withdrawal
// @route   PUT /api/admin/withdrawals/:id
export const processWithdrawal = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
    if (withdrawal.status !== 'pending' && status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Withdrawal already processed.' });
    }

    // If rejected — refund the balance that was frozen on request
    if (status === 'rejected') {
      await User.findByIdAndUpdate(withdrawal.user._id, {
        $inc: { referralBalance: withdrawal.amount },
      });
    }

    withdrawal.status      = status;
    withdrawal.adminNote   = adminNote || '';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.admin?._id || req.user._id;
    await withdrawal.save();

    res.json({ success: true, message: `Withdrawal ${status}.`, data: withdrawal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SAM Company Directory ────────────────────────────────────────────────────

// GET /api/admin/companies
export const getSamCompanies = async (req, res) => {
  try {
    const {
      page     = 1,
      limit    = 50,
      search   = '',
      naics    = '',
      state    = '',
      priority = '',
      source   = '',
      sortBy   = 'legalBusinessName',
      sortDir  = 'asc',
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      query.$or = [
        { legalBusinessName: re },
        { dbaName:           re },
        { ueiSAM:            re },
        { cageCode:          re },
        { contactEmail:      re },
        { 'physicalAddress.city': re },
      ];
    }

    if (naics && naics.trim()) {
      query['naicsCodes.code'] = naics.trim();
    }

    if (state && state.trim()) {
      query['physicalAddress.stateOrProvinceCode'] = state.trim().toUpperCase();
    }

    if (priority && ['high', 'medium', 'low'].includes(priority)) {
      query.priority = priority;
    }

    if (source && source.trim()) {
      query['sources.name'] = source.trim().toLowerCase();
    }

    const skip   = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortDir === 'desc' ? -1 : 1 };

    const [companies, total] = await Promise.all([
      SamCompany.find(query).sort(sortObj).skip(skip).limit(parseInt(limit)).lean(),
      SamCompany.countDocuments(query),
    ]);

    res.json({
      success: true,
      data:    companies,
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('getSamCompanies error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/companies/stats
export const getSamSyncStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalCompanies, newToday] = await Promise.all([
      SamCompany.countDocuments(),
      SamCompany.countDocuments({ firstSeenAt: { $gte: todayStart } }),
    ]);

    const quota = quotaState();
    const anySourceSyncing = entitySyncStats.isSyncing || usaSpendingSyncStats.isSyncing
      || fpdsSyncStats.isSyncing || sbaSyncStats.isSyncing;

    res.json({
      success: true,
      data: {
        totalCompanies,
        newToday,
        lastSyncAt:        entitySyncStats.lastSyncAt || usaSpendingSyncStats.lastSyncAt,
        lastSyncDuration:  entitySyncStats.lastSyncDuration,
        isSyncing:         anySourceSyncing,
        // SAM.gov-specific progress fields
        samIsSyncing:      entitySyncStats.isSyncing,
        currentPage:       entitySyncStats.currentPage,
        totalPages:        entitySyncStats.totalPages,
        savedSoFar:        entitySyncStats.savedSoFar + (usaSpendingSyncStats.isSyncing ? usaSpendingSyncStats.savedCount : 0),
        status:            entitySyncStats.status,
        rateLimitedUntil:  entitySyncStats.rateLimitedUntil,
        lastError:         entitySyncStats.lastError,
        quota: {
          used:      quota.used,
          remaining: quota.remaining,
          limit:     quota.limit,
          exhausted: quota.exhausted,
          resetsAt:  quota.exhausted ? 'midnight UTC' : null,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/companies/sync  — triggers SAM.gov sync (auto-calc pages from quota); falls back to USASpending
export const triggerCompanySync = async (req, res) => {
  if (entitySyncStats.isSyncing) {
    return res.json({ success: false, message: 'SAM.gov sync already in progress' });
  }

  const quota = quotaState();
  if (quota.exhausted) {
    if (usaSpendingSyncStats.isSyncing) {
      return res.json({ success: false, message: 'SAM.gov quota exhausted and USASpending sync is already running' });
    }
    res.json({
      success: true,
      message: 'SAM.gov daily quota exhausted — syncing from USASpending.gov instead (free, no quota)',
      source: 'usaspending',
    });
    syncUsaSpendingCompanies(100).catch(err => console.error('Background USASpending sync error:', err));
    return;
  }

  // Auto-calculate maxPages from remaining quota (keep 20 requests as buffer for other API calls)
  const maxByQuota = Math.max(1, quota.remaining - 20);
  const maxPages   = Math.min(parseInt(req.body?.maxPages) || 500, maxByQuota);

  res.json({
    success: true,
    message: `SAM.gov sync started — fetching up to ${maxPages} pages (~${maxPages * 100} companies with full contact details)`,
  });

  // Run SAM.gov sync; after it finishes, run USASpending to enrich with contract data
  syncSamEntities(maxPages)
    .then(() => {
      if (!usaSpendingSyncStats.isSyncing) {
        console.log('\n📊 SAM.gov sync done — starting USASpending to add contract data…');
        return syncUsaSpendingCompanies(100);
      }
    })
    .catch(err => console.error('Sync chain error:', err));
};

// POST /api/admin/companies/clear  — BLOCKED: government-sourced data is protected
export const clearAllCompanies = async (req, res) => {
  try {
    return res.status(403).json({
      success: false,
      message: 'Company data from SAM.gov, USASpending, FPDS, and SBA is protected and cannot be deleted. This data is a core platform asset.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/companies/fetch-one  — fetch & upsert a single company by UEI
export const fetchOneCompany = async (req, res) => {
  try {
    const { ueiSAM } = req.body;
    if (!ueiSAM || !ueiSAM.trim()) {
      return res.status(400).json({ success: false, message: 'ueiSAM is required' });
    }
    const result = await fetchAndSaveCompany(ueiSAM.trim());
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Multi-source Company Controllers ────────────────────────────────────────

// GET /api/admin/companies/source-stats
export const getCompanySourceStats = async (req, res) => {
  try {
    const breakdown = await getSourceBreakdown();
    res.json({
      success: true,
      data: {
        breakdown,
        sources: {
          usaspending: {
            isSyncing:  usaSpendingSyncStats.isSyncing,
            lastSyncAt: usaSpendingSyncStats.lastSyncAt,
            savedCount: usaSpendingSyncStats.savedCount,
            newCount:   usaSpendingSyncStats.newCount,
            lastError:  usaSpendingSyncStats.lastError,
            currentPage: usaSpendingSyncStats.currentPage,
          },
          fpds: {
            isSyncing:  fpdsSyncStats.isSyncing,
            lastSyncAt: fpdsSyncStats.lastSyncAt,
            savedCount: fpdsSyncStats.savedCount,
            newCount:   fpdsSyncStats.newCount,
            lastError:  fpdsSyncStats.lastError,
            currentPage: fpdsSyncStats.currentPage,
          },
          sba: {
            isSyncing:  sbaSyncStats.isSyncing,
            lastSyncAt: sbaSyncStats.lastSyncAt,
            savedCount: sbaSyncStats.savedCount,
            newCount:   sbaSyncStats.newCount,
            lastError:  sbaSyncStats.lastError,
            currentPage: sbaSyncStats.currentPage,
          },
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/companies/sync-usaspending
export const syncUsaSpendingSource = async (req, res) => {
  if (usaSpendingSyncStats.isSyncing) {
    return res.json({ success: false, message: 'USASpending sync already in progress' });
  }
  const maxPages = parseInt(req.body?.maxPages) || 50;
  res.json({ success: true, message: `USASpending sync started (up to ${maxPages} pages)` });
  syncUsaSpendingCompanies(maxPages).catch(err => console.error('USASpending bg sync error:', err));
};

// POST /api/admin/companies/sync-fpds
export const syncFpdsSource = async (req, res) => {
  if (fpdsSyncStats.isSyncing) {
    return res.json({ success: false, message: 'FPDS sync already in progress' });
  }
  const maxPages = parseInt(req.body?.maxPages) || 30;
  res.json({ success: true, message: `FPDS sync started (up to ${maxPages} pages)` });
  syncFpdsCompanies(maxPages).catch(err => console.error('FPDS bg sync error:', err));
};

// POST /api/admin/companies/sync-sba
export const syncSbaSource = async (req, res) => {
  if (sbaSyncStats.isSyncing) {
    return res.json({ success: false, message: 'SBA sync already in progress' });
  }
  const maxPages = parseInt(req.body?.maxPages) || 30;
  res.json({ success: true, message: `SBA sync started (up to ${maxPages} pages)` });
  syncSbaCompanies(maxPages).catch(err => console.error('SBA bg sync error:', err));
};

// GET /api/admin/pending-counts
// Returns badge counts for sidebar items — all in one round-trip
export const getPendingCounts = async (req, res) => {
  try {
    const adminId   = req.user._id;
    const adminRole = req.admin?.role;
    const isSupport = adminRole === 'support';

    // Notification query: per-admin unread, role-filtered for support
    const notifQuery = { 'readBy.user': { $ne: adminId } };
    if (isSupport) {
      notifQuery.type = { $in: SUPPORT_NOTIFICATION_TYPES };
    }

    // Count notifications + items the role can see
    const notificationsP = AdminNotification.countDocuments(notifQuery);
    const ticketsP       = Ticket.countDocuments({ status: { $in: ['open', 'in_progress'] } });
    const suggestionsP   = Suggestion.countDocuments({ status: 'pending' });
    const contactP       = ContactInquiry.countDocuments({ status: 'new' });
    const annualP        = PlanRequest.countDocuments({ status: 'pending', billingCycle: 'yearly' });

    // Support users can't see plan-requests or credit-requests
    const planP   = isSupport ? Promise.resolve(0) : PlanRequest.countDocuments({ status: 'pending', billingCycle: 'monthly' });
    const creditP = isSupport ? Promise.resolve(0) : CreditPurchase.countDocuments({ status: 'pending' });

    const [notifications, tickets, suggestions, contactInquiries, annualRequests, planRequests, creditRequests] =
      await Promise.all([notificationsP, ticketsP, suggestionsP, contactP, annualP, planP, creditP]);

    res.json({
      success: true,
      data: { planRequests, annualRequests, creditRequests, contactInquiries, tickets, suggestions, notifications },
    });
  } catch (err) {
    console.error('getPendingCounts error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};