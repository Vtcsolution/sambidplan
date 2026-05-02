// backend/controllers/adminPlanController.js
import Plan from '../models/Plan.js';
import AdminNotification from '../models/admin/AdminNotification.js';

// @desc    Get all plans
// @route   GET /api/admin/plans
export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ order: 1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Get all plans error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single plan by ID
// @route   GET /api/admin/plans/:id
export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('Get plan by ID error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new plan
// @route   POST /api/admin/plans
export const createPlan = async (req, res) => {
  try {
    const { name, displayName, description, priceMonthly, priceYearly, features, limits, order } = req.body;
    
    // Check if plan with same name exists
    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ success: false, message: 'Plan with this name already exists' });
    }
    
    const plan = new Plan({
      name,
      displayName,
      description,
      priceMonthly,
      priceYearly,
      features: features || [],
      limits: {
        maxSavedOpportunities: limits?.maxSavedOpportunities || 10,
        maxAlerts: limits?.maxAlerts || 5,
        aiProposals: limits?.aiProposals || false,
        prioritySupport: limits?.prioritySupport || false,
        apiAccess: limits?.apiAccess || false
      },
      order: order || 0,
      isActive: true
    });
    
    await plan.save();
    
    // Create notification
    await AdminNotification.create({
      title: 'New Plan Created',
      message: `${displayName} plan has been created`,
      type: 'system',
      actionRequired: false,
      priority: 'medium',
      createdBy: req.user._id
    });
    
    console.log(`✅ Admin created new plan: ${displayName}`);
    
    res.status(201).json({ success: true, data: plan, message: 'Plan created successfully' });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update plan
// @route   PUT /api/admin/plans/:id
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, description, priceMonthly, priceYearly, features, limits, order, isActive } = req.body;
    
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    // Update fields
    if (displayName) plan.displayName = displayName;
    if (description) plan.description = description;
    if (priceMonthly !== undefined) plan.priceMonthly = priceMonthly;
    if (priceYearly !== undefined) plan.priceYearly = priceYearly;
    if (features) plan.features = features;
    if (limits) {
      plan.limits = {
        ...plan.limits,
        ...limits
      };
    }
    if (order !== undefined) plan.order = order;
    if (isActive !== undefined) plan.isActive = isActive;
    
    await plan.save();
    
    // Create notification
    await AdminNotification.create({
      title: 'Plan Updated',
      message: `${plan.displayName} plan has been updated`,
      type: 'system',
      actionRequired: false,
      priority: 'low',
      createdBy: req.user._id
    });
    
    console.log(`✅ Admin updated plan: ${plan.displayName}`);
    
    res.json({ success: true, data: plan, message: 'Plan updated successfully' });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete plan
// @route   DELETE /api/admin/plans/:id
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    // Prevent deletion of default plans (optional)
    if (plan.name === 'free' || plan.name === 'starter' || plan.name === 'pro') {
      return res.status(400).json({ success: false, message: 'Cannot delete default plans' });
    }
    
    await plan.deleteOne();
    
    // Create notification
    await AdminNotification.create({
      title: 'Plan Deleted',
      message: `${plan.displayName} plan has been deleted`,
      type: 'system',
      actionRequired: false,
      priority: 'low',
      createdBy: req.user._id
    });
    
    console.log(`🗑️ Admin deleted plan: ${plan.displayName}`);
    
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle plan active status
// @route   PATCH /api/admin/plans/:id/toggle
export const togglePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    plan.isActive = !plan.isActive;
    await plan.save();
    
    console.log(`✅ Plan ${plan.displayName} status toggled to ${plan.isActive ? 'active' : 'inactive'}`);
    
    res.json({ 
      success: true, 
      data: plan, 
      message: `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('Toggle plan status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};