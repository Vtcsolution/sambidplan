import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const signAdminToken = (id) =>
  jwt.sign({ id, type: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });

// @desc    Admin login
// @route   POST /api/admin-auth/login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin || !admin.isActive)
      return res.status(401).json({ success: false, message: 'Invalid credentials or account disabled.' });

    const match = await admin.matchPassword(password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    // Update last login
    admin.lastLoginAt = new Date();
    admin.lastLoginIP = req.ip || req.connection?.remoteAddress || '';
    await admin.save();

    const token = signAdminToken(admin._id);

    console.log(`🔐 Admin login: ${admin.email} (${admin.role})`);

    res.json({
      success: true,
      token,
      admin: {
        id:    admin._id,
        name:  admin.name,
        email: admin.email,
        role:  admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get current admin profile
// @route   GET /api/admin-auth/profile
export const getAdminProfile = async (req, res) => {
  res.json({ success: true, admin: req.admin });
};

// @desc    Change admin password
// @route   PUT /api/admin-auth/change-password
export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id).select('+password');
    const match = await admin.matchPassword(currentPassword);
    if (!match) return res.status(401).json({ success: false, message: 'Current password incorrect.' });
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create a new admin (super_admin only)
// @route   POST /api/admin-auth/create
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Admin with this email already exists.' });

    const admin = await Admin.create({
      name, email, password,
      role: role || 'admin',
      permissions: permissions || {},
      createdBy: req.admin._id,
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created.',
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    List all admins (super_admin only)
// @route   GET /api/admin-auth/list
export const listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update an admin (super_admin only)
// @route   PUT /api/admin-auth/:id
export const updateAdmin = async (req, res) => {
  try {
    const { name, email, role, permissions, isActive, password } = req.body;
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });

    // Prevent super_admin from demoting themselves
    if (admin._id.toString() === req.admin._id.toString() && role && role !== 'super_admin') {
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
    }

    if (name)        admin.name        = name;
    if (email)       admin.email       = email.toLowerCase();
    if (role)        admin.role        = role;
    if (permissions) admin.permissions = { ...admin.permissions, ...permissions };
    if (isActive !== undefined) admin.isActive = isActive;
    if (password && password.length >= 8) admin.password = password;

    await admin.save();
    res.json({
      success: true,
      message: 'Admin updated.',
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, isActive: admin.isActive, permissions: admin.permissions },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete an admin (super_admin only)
// @route   DELETE /api/admin-auth/:id
export const deleteAdmin = async (req, res) => {
  try {
    if (req.params.id === req.admin._id.toString())
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });

    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });

    res.json({ success: true, message: `Admin ${admin.email} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Seed first super_admin (only if no admin exists)
// @route   POST /api/admin-auth/seed
export const seedFirstAdmin = async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    if (count > 0)
      return res.status(400).json({ success: false, message: 'Admin already exists. Use login instead.' });

    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'name, email, and password are required.' });

    const admin = await Admin.create({ name, email, password, role: 'super_admin' });
    const token = signAdminToken(admin._id);

    res.status(201).json({
      success: true,
      message: 'Super admin created! Save this token — use it to log in at /admin/login.',
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
