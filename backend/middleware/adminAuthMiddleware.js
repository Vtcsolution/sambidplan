import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

// Verify admin-specific JWT (stored as adminToken on the frontend)
export const protectAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Admin token required.' });
  }

  try {
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure this is an admin-type token, not a user token
    if (decoded.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Invalid admin token.' });
    }

    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Admin account not found or disabled.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Admin token invalid or expired.' });
  }
};

// Super admin only
export const superAdminOnly = (req, res, next) => {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super admin access required.' });
  }
  next();
};

// Admin or super_admin (excludes support role)
export const adminOrSuperAdmin = (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.admin?.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};
