// backend/controllers/twoFactorController.js
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import User from '../models/User.js';

const APP_NAME = 'Sambid Notify';

// POST /api/auth/2fa/setup
// Generates a new TOTP secret + QR code for the authenticated user.
// Does NOT enable 2FA yet — user must verify a valid code first.
export const setup2FA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name:   `${APP_NAME} (${req.user.email})`,
      issuer: APP_NAME,
      length: 20,
    });

    // Store pending secret (not yet activated)
    await User.findByIdAndUpdate(req.user._id, {
      twoFactorSecret: secret.base32,
    });

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrDataUrl,
      },
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ success: false, message: 'Failed to set up 2FA.' });
  }
};

// POST /api/auth/2fa/enable
// Verifies OTP code, then enables 2FA and returns backup codes.
export const enable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'OTP token required.' });

    const user = await User.findById(req.user._id).select('+twoFactorSecret +twoFactorBackupCodes');
    if (!user?.twoFactorSecret) {
      return res.status(400).json({ success: false, message: 'Run /2fa/setup first.' });
    }

    const valid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token:    token.replace(/\s/g, ''),
      window:   1,
    });

    if (!valid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code. Please try again.' });
    }

    // Generate 8 backup codes
    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());

    user.twoFactorEnabled     = true;
    user.twoFactorBackupCodes = backupCodes;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, data: { backupCodes } });
  } catch (err) {
    console.error('2FA enable error:', err);
    res.status(500).json({ success: false, message: 'Failed to enable 2FA.' });
  }
};

// POST /api/auth/2fa/disable
// Requires current OTP (or backup code) + password to disable 2FA.
export const disable2FA = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'OTP token and password are required.' });
    }

    const user = await User.findById(req.user._id).select('+password +twoFactorSecret +twoFactorBackupCodes');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const passwordOk = await user.matchPassword(password);
    if (!passwordOk) return res.status(401).json({ success: false, message: 'Incorrect password.' });

    const cleanToken = token.replace(/\s/g, '');
    const totpValid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret || '',
      encoding: 'base32',
      token:    cleanToken,
      window:   1,
    });

    const backupValid = (user.twoFactorBackupCodes || []).includes(cleanToken.toUpperCase());

    if (!totpValid && !backupValid) {
      return res.status(400).json({ success: false, message: 'Invalid OTP or backup code.' });
    }

    // Consume backup code if used
    let updatedCodes = user.twoFactorBackupCodes || [];
    if (backupValid) updatedCodes = updatedCodes.filter(c => c !== cleanToken.toUpperCase());

    await User.findByIdAndUpdate(req.user._id, {
      twoFactorEnabled:     false,
      twoFactorSecret:      null,
      twoFactorBackupCodes: [],
      twoFactorTempToken:   null,
      twoFactorTempExpires: null,
    });

    res.json({ success: true, message: '2FA has been disabled.' });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA.' });
  }
};

// POST /api/auth/2fa/verify-login
// Called during login when 2FA is enabled.
// Body: { tempToken, otp }
export const verifyLogin2FA = async (req, res) => {
  try {
    const { tempToken, otp } = req.body;
    if (!tempToken || !otp) {
      return res.status(400).json({ success: false, message: 'tempToken and otp are required.' });
    }

    const hashedTemp = crypto.createHash('sha256').update(tempToken).digest('hex');
    const user = await User.findOne({
      twoFactorTempToken:   hashedTemp,
      twoFactorTempExpires: { $gt: new Date() },
    }).select('+twoFactorSecret +twoFactorBackupCodes');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    const cleanOtp = otp.replace(/\s/g, '');
    const totpValid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token:    cleanOtp,
      window:   1,
    });

    const backupValid = (user.twoFactorBackupCodes || []).includes(cleanOtp.toUpperCase());

    if (!totpValid && !backupValid) {
      return res.status(401).json({ success: false, message: 'Invalid authenticator code. Please try again.' });
    }

    // Consume backup code if used
    if (backupValid) {
      await User.findByIdAndUpdate(user._id, {
        $pull: { twoFactorBackupCodes: cleanOtp.toUpperCase() },
      });
    }

    // Clear temp token
    await User.findByIdAndUpdate(user._id, {
      twoFactorTempToken:   null,
      twoFactorTempExpires: null,
    });

    // Issue real JWT
    const jwt = (await import('jsonwebtoken')).default;
    const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    });

    res.json({
      success: true,
      token:   authToken,
      data: {
        _id:          user._id,
        name:         user.name,
        email:        user.email,
        plan:         user.plan,
        role:         user.role,
        businessName: user.businessName,
        naicsCodes:   user.naicsCodes,
      },
    });
  } catch (err) {
    console.error('2FA login verify error:', err);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};

// GET /api/auth/2fa/backup-codes  — view remaining backup codes (requires 2FA enabled)
export const getBackupCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFactorBackupCodes');
    if (!user?.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled.' });
    }
    res.json({ success: true, data: { backupCodes: user.twoFactorBackupCodes || [] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
