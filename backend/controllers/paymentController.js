// backend/controllers/paymentController.js
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import AdminNotification from '../models/admin/AdminNotification.js';
import { createStripePaymentIntent, confirmStripePayment } from '../services/stripeService.js';
import { createPayPalOrder, capturePayPalPayment } from '../services/paypalService.js';

// Initialize default plans if none exist
const initializePlansIfEmpty = async () => {
  const count = await Plan.countDocuments();
  if (count === 0) {
    console.log('📋 No plans found, creating default plans...');
    const defaultPlans = [
      {
        name: 'free',
        displayName: 'Free',
        description: 'Perfect for getting started',
        priceMonthly: 0,
        priceYearly: 0,
        features: [
          { name: '5 Alerts per month', included: true },
          { name: 'Basic contract search', included: true },
          { name: 'Email notifications', included: true },
          { name: 'Save up to 10 opportunities', included: true },
          { name: 'Basic match scoring', included: true },
          { name: 'Priority support', included: false },
          { name: 'Advanced AI matching', included: false },
          { name: 'AI proposal generation', included: false },
          { name: 'API access', included: false }
        ],
        limits: {
          maxSavedOpportunities: 10,
          maxAlerts: 5,
          aiProposals: false,
          prioritySupport: false,
          apiAccess: false
        },
        isActive: true,
        order: 1
      },
      {
        name: 'starter',
        displayName: 'Starter',
        description: 'For growing contractors',
        priceMonthly: 29,
        priceYearly: 290,
        features: [
          { name: '50 Alerts per month', included: true },
          { name: 'Advanced contract search', included: true },
          { name: 'Email + SMS notifications', included: true },
          { name: 'Save up to 100 opportunities', included: true },
          { name: 'Advanced AI matching', included: true },
          { name: 'Priority email support', included: true },
          { name: 'Competitive analysis', included: true },
          { name: 'AI proposal generation', included: false },
          { name: 'API access', included: false }
        ],
        limits: {
          maxSavedOpportunities: 100,
          maxAlerts: 50,
          aiProposals: false,
          prioritySupport: true,
          apiAccess: false
        },
        isActive: true,
        order: 2
      },
      {
        name: 'pro',
        displayName: 'Pro',
        description: 'For established federal contractors',
        priceMonthly: 79,
        priceYearly: 790,
        features: [
          { name: 'Unlimited alerts', included: true },
          { name: 'Real-time tracking', included: true },
          { name: 'All notification channels', included: true },
          { name: 'Unlimited saved opportunities', included: true },
          { name: 'Premium AI matching', included: true },
          { name: '24/7 Priority support', included: true },
          { name: 'Full competitive analysis', included: true },
          { name: 'AI proposal generation', included: true },
          { name: 'Full API access', included: true },
          { name: 'Dedicated account manager', included: true }
        ],
        limits: {
          maxSavedOpportunities: -1,
          maxAlerts: -1,
          aiProposals: true,
          prioritySupport: true,
          apiAccess: true
        },
        isActive: true,
        order: 3
      },
      {
        name: 'enterprise',
        displayName: 'Enterprise',
        description: 'For large organizations',
        priceMonthly: 499,
        priceYearly: 4990,
        features: [
          { name: 'Unlimited alerts', included: true },
          { name: 'Real-time tracking', included: true },
          { name: 'All notification channels', included: true },
          { name: 'Unlimited saved opportunities', included: true },
          { name: 'Premium AI matching', included: true },
          { name: 'AI proposal generation', included: true },
          { name: '24/7 Priority support', included: true },
          { name: 'Full API access', included: true },
          { name: 'Dedicated account manager', included: true },
          { name: 'Custom integration', included: true }
        ],
        limits: {
          maxSavedOpportunities: -1,
          maxAlerts: -1,
          aiProposals: true,
          prioritySupport: true,
          apiAccess: true
        },
        isActive: true,
        order: 4
      }
    ];
    await Plan.insertMany(defaultPlans);
    console.log('✅ Default plans created successfully');
  }
};

// @desc    Get all available plans
// @route   GET /api/payment/plans
export const getPlans = async (req, res) => {
  try {
    await initializePlansIfEmpty();
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
    
    const amount = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    
    const existingInvoice = await Invoice.findOne({
      user: user._id,
      status: 'pending',
      plan: planName
    });
    
    if (existingInvoice) {
      return res.json({
        success: true,
        data: existingInvoice,
        message: 'Existing invoice found. Please complete payment.'
      });
    }
    
    const invoice = new Invoice({
      user: user._id,
      plan: planName,
      billingCycle,
      amount,
      currency: 'USD',
      status: 'pending'
    });
    
    await invoice.save();
    console.log(`✅ Invoice created: ${invoice.invoiceNumber}`);
    
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
      }
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
    const { planName, billingCycle = 'monthly' } = req.body;
    const user = await User.findById(req.user._id);
    
    console.log(`📝 Creating PayPal order for user: ${user.email}, plan: ${planName}`);
    
    if (!planName) {
      return res.status(400).json({ success: false, message: 'Plan name is required' });
    }
    
    const plan = await Plan.findOne({ name: planName });
    if (!plan) {
      return res.status(404).json({ success: false, message: `Plan "${planName}" not found` });
    }
    
    const amount = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    
    const invoice = new Invoice({
      user: user._id,
      plan: planName,
      billingCycle,
      amount,
      currency: 'USD',
      status: 'pending',
      paymentMethod: 'paypal'
    });
    
    await invoice.save();
    console.log(`✅ Invoice created: ${invoice.invoiceNumber}`);
    
    const result = await createPayPalOrder(amount, 'USD', {
      userId: user._id.toString(),
      userEmail: user.email,
      planName: planName,
      billingCycle: billingCycle
    });
    
    res.json({
      success: true,
      orderId: result.orderId,
      approvalUrl: result.approvalUrl,
      invoiceId: invoice._id,
      isSimulated: result.isSimulated
    });
    
  } catch (error) {
    console.error('PayPal payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Capture PayPal payment
// @route   POST /api/payment/paypal/capture
export const capturePayPalPaymentHandler = async (req, res) => {
  try {
    const { orderId, invoiceId } = req.body;
    
    console.log(`📝 Capturing PayPal order: ${orderId}`);
    
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    const result = await capturePayPalPayment(orderId);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }
    
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
    }
    
    res.json({
      success: true,
      message: `Payment captured and user upgraded to ${invoice.plan} plan!`,
      invoice: invoice
    });
    
  } catch (error) {
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
    user.planExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    await user.save();
    
    console.log(`✅ User ${user.email} upgraded from ${oldPlan} to ${invoice.plan}`);
    
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