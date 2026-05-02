// backend/controllers/adminController.js
import PlanRequest from '../models/PlanRequest.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import Plan from '../models/Plan.js';
import AdminSetting from '../models/admin/AdminSetting.js';
import AdminNotification from '../models/admin/AdminNotification.js';


export const getPlanRequests = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const requests = await PlanRequest.find(query)
      .populate('user', 'name email businessName naicsCodes plan')
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
    
    // Create invoice for the user
    const plan = await Plan.findOne({ name: planRequest.requestedPlan });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    const amount = planRequest.billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    
    const invoice = new Invoice({
      user: planRequest.user._id,
      plan: planRequest.requestedPlan,
      billingCycle: planRequest.billingCycle,
      amount,
      currency: 'USD',
      status: 'pending',
      paymentMethod: planRequest.paymentMethod
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
    const { email } = req.body;
    
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    await transporter.sendMail({
      from: `"Sambid" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Test Email from Sambid',
      html: '<h1>Test Email</h1><p>Your email configuration is working correctly!</p>'
    });
    
    res.json({ success: true, message: 'Test email sent successfully' });
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

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
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
    const user = await User.findById(planRequest.user._id);
    const oldPlan = user.plan;
    user.plan = planRequest.requestedPlan;
    
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

// backend/controllers/adminController.js - Update getAdminStats function

// @desc    Get dashboard stats for admin
// @route   GET /api/admin/stats
export const getAdminStats = async (req, res) => {
  try {
    // Get counts from PlanRequest
    const pendingRequests = await PlanRequest.countDocuments({ status: 'pending' });
    const approvedRequests = await PlanRequest.countDocuments({ status: 'approved' });
    const completedRequests = await PlanRequest.countDocuments({ status: 'completed' });
    
    // Get user counts
    const totalUsers = await User.countDocuments();
    const proUsers = await User.countDocuments({ plan: 'pro' });
    const enterpriseUsers = await User.countDocuments({ plan: 'enterprise' });
    const starterUsers = await User.countDocuments({ plan: 'starter' });
    const freeUsers = await User.countDocuments({ plan: 'free' });
    
    // Calculate monthly revenue from invoices (last 30 days - from invoices table)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get all paid invoices in last 30 days
    const paidInvoices = await Invoice.find({
      status: 'paid',
      paidAt: { $gte: thirtyDaysAgo }
    });
    
    const monthlyRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    // Get total revenue all time
    const allPaidInvoices = await Invoice.find({ status: 'paid' });
    const totalRevenue = allPaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    // Get recent invoices for display
    const recentInvoices = await Invoice.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('📊 Admin Stats Summary:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Monthly Revenue: $${monthlyRevenue}`);
    console.log(`   Total Revenue: $${totalRevenue}`);
    console.log(`   Paid Invoices (30 days): ${paidInvoices.length}`);
    
    res.json({
      success: true,
      data: {
        pendingRequests,
        approvedRequests,
        completedRequests,
        totalUsers,
        proUsers,
        enterpriseUsers,
        starterUsers,
        freeUsers,
        monthlyRevenue,
        totalRevenue,
        recentInvoices
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ==================== SETTINGS CONTROLLERS ====================

// @desc    Get all settings
// @route   GET /api/admin/settings
export const getSettings = async (req, res) => {
  try {
    const settings = await AdminSetting.find().sort({ group: 1, key: 1 });
    
    // Group settings by category
    const groupedSettings = {
      general: {},
      email: {},
      payment: {},
      api: {},
      limits: {},
      notifications: {}
    };
    
    settings.forEach(setting => {
      if (groupedSettings[setting.group]) {
        groupedSettings[setting.group][setting.key] = setting.value;
      }
    });
    
    // Set default values if not found
    if (Object.keys(groupedSettings.general).length === 0) {
      groupedSettings.general = {
        siteName: 'Sambid',
        siteUrl: 'https://sambid.co',
        supportEmail: 'support@sambid.co',
        contactEmail: 'contact@sambid.co'
      };
    }
    
    if (Object.keys(groupedSettings.email).length === 0) {
      groupedSettings.email = {
        smtpHost: 'smtp.hostinger.com',
        smtpPort: '465',
        smtpUser: '',
        smtpPass: '',
        fromEmail: 'noreply@sambid.co',
        fromName: 'Sambid'
      };
    }
    
    if (Object.keys(groupedSettings.payment).length === 0) {
      groupedSettings.payment = {
        payoneerApiUrl: 'https://api.sandbox.payoneer.com/v4',
        payoneerClientId: '',
        payoneerClientSecret: '',
        payoneerPartnerId: '',
        currency: 'USD'
      };
    }
    
    if (Object.keys(groupedSettings.api).length === 0) {
      groupedSettings.api = {
        geminiApiKey: '',
        samApiKey: '',
        samApiUrl: 'https://api.sam.gov/opportunities/v2/search'
      };
    }
    
    if (Object.keys(groupedSettings.limits).length === 0) {
      groupedSettings.limits = {
        freePlanMaxSaved: 10,
        freePlanMaxAlerts: 5,
        starterPlanMaxSaved: 100,
        starterPlanMaxAlerts: 50,
        proPlanMaxSaved: -1,
        proPlanMaxAlerts: -1
      };
    }
    
    console.log('📋 Admin settings retrieved');
    
    res.json({
      success: true,
      data: groupedSettings
    });
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
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
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
export const getNotifications = async (req, res) => {
  try {
    const { limit = 50, page = 1, type, read } = req.query;
    
    const query = {};
    if (type && type !== 'all') query.type = type;
    if (read !== undefined) query.read = read === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await AdminNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');
    
    const total = await AdminNotification.countDocuments(query);
    
    console.log(`📋 Retrieved ${notifications.length} notifications`);
    
    res.json({
      success: true,
      data: notifications,
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
    
    // Check if already read by this user
    const alreadyRead = notification.readBy.some(r => r.user && r.user.toString() === req.user._id.toString());
    
    if (!alreadyRead) {
      notification.readBy.push({
        user: req.user._id,
        readAt: new Date()
      });
      
      // If this is the first reader, mark as read
      if (!notification.read) {
        notification.read = true;
      }
      
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
    const count = await AdminNotification.countDocuments({ 
      read: false,
      'readBy.user': { $ne: req.user._id }
    });
    
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};