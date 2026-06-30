import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';

const jwtSecret          = () => process.env.JWT_SECRET;
const workspaceJwtSecret = () => crypto.createHmac('sha256', process.env.JWT_SECRET).update('workspace').digest('hex');

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  // ── 1. Try regular user JWT ──────────────────────────────────────────────
  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret());
  } catch {
    // Not a regular token — try workspace JWT below
    decoded = null;
  }

  if (decoded?.id) {
    try {
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
      return next();
    } catch (err) {
      console.error('protect DB error:', err.message);
      return res.status(500).json({ success: false, message: 'Server error during authentication' });
    }
  }

  // ── 2. Try workspace JWT ─────────────────────────────────────────────────
  let wsDecoded;
  try {
    wsDecoded = jwt.verify(token, workspaceJwtSecret());
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }

  if (wsDecoded?.ownerId) {
    try {
      req.user = await User.findById(wsDecoded.ownerId).select('-password');
      if (!req.user) return res.status(401).json({ success: false, message: 'Company owner not found' });
      req.isWorkspaceUser  = true;
      req.workspaceSession = wsDecoded;
      return next();
    } catch (err) {
      console.error('protect workspace DB error:', err.message);
      return res.status(500).json({ success: false, message: 'Server error during authentication' });
    }
  }

  return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
};

// Admin middleware - checks if user has admin role
export const isAdmin = async (req, res, next) => {
  // Make sure user exists and has admin role
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  
  if (req.user.role === 'admin') {
    console.log(`✅ Admin access granted: ${req.user.email}`);
    next();
  } else {
    console.log(`❌ Admin access denied: ${req.user.email} (role: ${req.user.role})`);
    res.status(403).json({ 
      success: false, 
      message: 'Admin access required. This area is restricted to administrators only.',
      userRole: req.user.role
    });
  }
};

// Alias for compatibility
export const adminOnly = isAdmin;

// Auto-expire plans and enforce active subscription on every request.
// Call this after protect() on any paid-feature route.
export const enforcePlanExpiry = async (req, res, next) => {
  if (!req.user || req.user.role === 'admin') return next();

  const now = new Date();
  let changed = false;

  // Trial expired → free
  if (req.user.plan === 'trial' && now > new Date(req.user.trialEndDate)) {
    req.user.plan        = 'free';
    req.user.isTrialActive = false;
    changed = true;
  }

  // Paid plan expired → free
  if (
    ['starter', 'pro', 'enterprise'].includes(req.user.plan) &&
    req.user.planExpiresAt &&
    now > new Date(req.user.planExpiresAt)
  ) {
    req.user.plan        = 'free';
    req.user.planExpiresAt = null;
    changed = true;
  }

  if (changed) {
    await User.findByIdAndUpdate(req.user._id, {
      plan:           req.user.plan,
      isTrialActive:  req.user.isTrialActive ?? false,
      planExpiresAt:  req.user.planExpiresAt ?? null,
    });
    console.log(`⏰ Plan auto-expired for ${req.user.email} → ${req.user.plan}`);
  }

  next();
};

// Check user plan
export const checkPlan = (requiredPlan) => {
  return (req, res, next) => {
    const planLevel = { free: 0, trial: 0, starter: 1, pro: 2, enterprise: 3 };
    const userLevel = planLevel[req.user?.plan] || 0;
    const requiredLevel = planLevel[requiredPlan] || 0;
    
    if (userLevel >= requiredLevel) {
      next();
    } else {
      res.status(403).json({ 
        success: false, 
        message: `This feature requires ${requiredPlan} plan or higher. Please upgrade.`,
        requiredPlan: requiredPlan,
        currentPlan: req.user?.plan || 'free'
      });
    }
  };
};

// Check if user has specific role(s)
export const hasRole = (roles) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    if (allowedRoles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ 
        success: false, 
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        currentRole: req.user.role
      });
    }
  };
};