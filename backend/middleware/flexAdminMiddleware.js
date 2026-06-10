// Accepts EITHER a dedicated adminToken (new system) OR a user token with role=admin (old system)
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

// Accepts ANY valid token — admin token OR regular user token.
// Use on routes that both admins and regular users need to access.
export const protectAny = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'admin') {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin || !admin.isActive) {
        return res.status(401).json({ success: false, message: 'Admin account not found or disabled.' });
      }
      req.admin = admin;
      req.user  = { _id: admin._id, email: admin.email, name: admin.name, role: 'admin', plan: 'enterprise' };
      return next();
    }

    // Regular user token
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
};

export const flexAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── New admin token (type: 'admin') ──────────────────────────────────
    if (decoded.type === 'admin') {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin || !admin.isActive) {
        return res.status(401).json({ success: false, message: 'Admin account not found or disabled.' });
      }
      // Expose as req.user so existing controllers work without changes
      req.admin = admin;
      req.user  = {
        _id:   admin._id,
        email: admin.email,
        name:  admin.name,
        role:  'admin',
        plan:  'enterprise',
      };
      return next();
    }

    // ── Old user token with role=admin ────────────────────────────────────
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required.' });

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
};
