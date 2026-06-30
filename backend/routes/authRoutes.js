// routes/authRoutes.js
import express from 'express';
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  exportUserData,
  deleteAccount
} from '../controllers/authController.js';
import {
  setup2FA,
  enable2FA,
  disable2FA,
  verifyLogin2FA,
  getBackupCodes,
} from '../controllers/twoFactorController.js';
import { protect } from '../middleware/authMiddleware.js';
import loginLimiter, { sensitiveAuthLimiter } from '../middleware/loginLimiter.js';
import { passwordLengthGuard } from '../middleware/securityMiddleware.js';

const router = express.Router();

router.post('/register', loginLimiter, passwordLengthGuard, registerUser);
router.post('/login',    loginLimiter, passwordLengthGuard, loginUser);

// 2FA routes
router.post('/2fa/setup',        protect, setup2FA);
router.post('/2fa/enable',       protect, enable2FA);
router.post('/2fa/disable',      protect, disable2FA);
router.post('/2fa/verify-login', sensitiveAuthLimiter, verifyLogin2FA);
router.get( '/2fa/backup-codes', protect, getBackupCodes);
router.post('/forgot-password',       sensitiveAuthLimiter, forgotPassword);
router.post('/verify-reset-otp',      sensitiveAuthLimiter, verifyResetOtp);
router.post('/reset-password/:token', sensitiveAuthLimiter, passwordLengthGuard, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', protect, resendVerificationEmail);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);
router.get('/export-data', protect, exportUserData);
router.delete('/account', protect, deleteAccount);

// Teaming partner finder — search other users by NAICS/certifications (Enterprise)
router.get('/teaming-partners', protect, async (req, res) => {
  try {
    if (req.user.plan !== 'enterprise') {
      return res.status(403).json({ success: false, message: 'Enterprise plan required.' });
    }
    const { naics, certifications } = req.query;
    const query = { _id: { $ne: req.user._id }, plan: { $in: ['starter', 'pro', 'enterprise'] } };
    if (naics) query.naicsCodes = { $in: naics.split(',').map(n => n.trim()) };

    const users = await (await import('../models/User.js')).default
      .find(query)
      .select('name businessName businessType naicsCodes')
      .limit(30);

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Certification CRUD
router.get('/certifications', protect, async (req, res) => {
  const { default: UC } = await import('../models/UserCertification.js');
  const certs = await UC.find({ user: req.user._id }).sort({ expiryDate: 1 });
  res.json({ success: true, data: certs });
});
router.post('/certifications', protect, async (req, res) => {
  const { default: UC } = await import('../models/UserCertification.js');
  const cert = await UC.create({ user: req.user._id, ...req.body });
  res.status(201).json({ success: true, data: cert });
});
router.delete('/certifications/:id', protect, async (req, res) => {
  const { default: UC } = await import('../models/UserCertification.js');
  await UC.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true });
});

export default router;