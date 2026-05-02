import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      console.log(`🔐 Auth: User ${req.user.email} (role: ${req.user.role}) accessed ${req.method} ${req.path}`);
      
      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
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