// backend/controllers/authController.js
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import AdminNotification from '../models/admin/AdminNotification.js';
import Referral from '../models/Referral.js';
import Admin from '../models/Admin.js';
import SupportReferral from '../models/SupportReferral.js';
import SavedOpportunity from '../models/SavedOpportunity.js';
import Alert from '../models/Alert.js';
import AlertNotification from '../models/AlertNotification.js';
import UserOpportunity from '../models/UserOpportunity.js';
import UserNotification from '../models/UserNotification.js';
import UserCertification from '../models/UserCertification.js';
import PushSubscription from '../models/PushSubscription.js';
import PastPerformance from '../models/PastPerformance.js';
import Suggestion from '../models/Suggestion.js';
import Ticket from '../models/Ticket.js';
import Invoice from '../models/Invoice.js';
import PlanRequest from '../models/PlanRequest.js';
import CreditPurchase from '../models/CreditPurchase.js';
import Withdrawal from '../models/Withdrawal.js';
import { sendEmailVerificationEmail, sendAdminUserActionAlert } from '../services/emailService.js';
import { createUserNotification } from '../services/notificationService.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, businessName, naicsCodes, businessType, referralCode, supportRef } = req.body;

    console.log('📝 Registration attempt:', { name, email, businessName });

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address (e.g. you@gmail.com).'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log(`❌ User already exists: ${email}`);
      return res.status(400).json({
        success: false,
        message: 'User already exists. Please login instead.'
      });
    }

    // Resolve user referral code → referrer user
    let referredByUser = null;
    if (referralCode) {
      referredByUser = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });
      if (!referredByUser) {
        console.log(`⚠️  Referral code "${referralCode}" not found — ignoring`);
      }
    }

    // Resolve support member referral code
    let supportMember = null;
    if (supportRef) {
      supportMember = await Admin.findOne({ referralCode: supportRef.trim().toUpperCase(), role: 'support', isActive: true });
      if (!supportMember) {
        console.log(`⚠️  Support ref "${supportRef}" not found — ignoring`);
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      businessName: businessName || '',
      naicsCodes: naicsCodes || [],
      businessType: businessType || 'other',
      referredBy: referredByUser?._id || null,
      supportReferredBy: supportMember?._id || null,
    });

    // Track user referral relationship
    if (referredByUser) {
      await Referral.create({ referrer: referredByUser._id, referee: user._id });
      console.log(`🔗 Referral tracked: ${referredByUser.email} → ${user.email}`);
    }

    // Track support referral relationship
    if (supportMember) {
      await SupportReferral.create({ supportMember: supportMember._id, user: user._id });
      console.log(`🔗 Support referral tracked: ${supportMember.email} → ${user.email}`);
    }
    
    console.log(`✅ User created: ${email}`);

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${rawToken}`;
    try {
      await sendEmailVerificationEmail(user, verifyUrl);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
    }

    // Create notification for admin
    try {
      const refLabel = supportMember
        ? ` via support referral (${supportMember.name})`
        : referredByUser
          ? ` via user referral`
          : '';
      await AdminNotification.create({
        title: 'New User Registered',
        message: `${user.name || user.email} created a new account${refLabel}`,
        type: 'user_signup',
        actionRequired: false,
        priority: 'medium',
        metadata: {
          userId: user._id,
          userEmail: user.email,
          userPlan: user.plan,
          businessName: user.businessName || 'Not provided',
          ...(supportMember && { supportMemberId: supportMember._id, supportMemberName: supportMember.name }),
        }
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError.message);
    }

    // Welcome in-app notification for new user (fire-and-forget)
    createUserNotification(
      user._id,
      'account_created',
      'Welcome to Sambid Notify! 🎉',
      `Hi ${user.name || 'there'}, your account is ready. Start by setting up your contract alerts.`,
      '/dashboard'
    );

    // Email admin about new registration (fire-and-forget)
    sendAdminUserActionAlert({
      action: 'registered',
      userName: user.name,
      userEmail: user.email,
      details: {
        'Business Name': user.businessName || '—',
        'Plan':          user.plan,
        'Referred By':   referredByUser ? referredByUser.email : '—',
      },
    }).catch(() => {});
    
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists. Please use a different email.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Registration failed. Please try again.' 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`🔐 Login attempt: ${email}`);

    // Check if user exists
    const user = await User.findOne({ email }).select('+password +twoFactorEnabled');

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // If 2FA is enabled, issue a short-lived temp token instead of a full JWT
    if (user.twoFactorEnabled) {
      const rawTemp = crypto.randomBytes(32).toString('hex');
      const hashedTemp = crypto.createHash('sha256').update(rawTemp).digest('hex');
      await User.findByIdAndUpdate(user._id, {
        twoFactorTempToken:   hashedTemp,
        twoFactorTempExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      });
      console.log(`🔑 2FA required for: ${email}`);
      return res.json({ success: true, requiresTwoFactor: true, tempToken: rawTemp });
    }

    // Generate token
    const token = generateToken(user._id);

    console.log(`✅ User logged in: ${email}`);

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName || '',
        plan: user.plan,
        role: user.role || 'user',
        token: token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send 6-digit OTP to email for password reset
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success — don't reveal whether email exists
    if (!user) {
      return res.json({ success: true, message: 'If that email is registered, a code has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPasswordToken   = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateBeforeSave: false });

    try {
      const { sendPasswordResetOtpEmail } = await import('../services/emailService.js');
      await sendPasswordResetOtpEmail(user, otp);
    } catch (emailErr) {
      console.error('Failed to send OTP email:', emailErr.message);
      user.resetPasswordToken   = null;
      user.resetPasswordExpires = null;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Failed to send code. Try again later.' });
    }

    console.log(`📧 Password reset OTP sent to ${email}`);
    res.json({ success: true, message: 'A 6-digit code has been sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify OTP and return a secure reset token
// @route   POST /api/auth/verify-reset-otp
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and code are required' });

    const hashed = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    const user = await User.findOne({
      email:                email.toLowerCase(),
      resetPasswordToken:   hashed,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code. Please try again.' });
    }

    // OTP verified — replace with a secure one-time reset token (10 min window)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordToken   = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, resetToken: rawToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password using token from email link
// @route   POST /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Hash the incoming token and compare to DB
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken:   hashed,
      resetPasswordExpires: { $gt: new Date() }   // not expired
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }

    // Set new password (pre-save hook will hash it)
    user.password             = password;
    user.resetPasswordToken   = null;
    user.resetPasswordExpires = null;
    await user.save();

    console.log(`✅ Password reset for ${user.email}`);
    res.json({ success: true, message: 'Password reset successful! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      businessName, naicsCodes, businessType,
      emailAlertsEnabled, alertFrequency, onboardingCompleted, name
    } = req.body;

    const user = await User.findById(req.user._id);

    if (name        !== undefined) user.name        = name;
    if (businessName !== undefined) user.businessName = businessName;
    if (businessType !== undefined) user.businessType = businessType;
    if (naicsCodes   !== undefined) user.naicsCodes   = naicsCodes;
    if (emailAlertsEnabled !== undefined) user.emailAlertsEnabled = emailAlertsEnabled;
    if (alertFrequency     !== undefined) user.alertFrequency     = alertFrequency;
    if (onboardingCompleted !== undefined) user.onboardingCompleted = onboardingCompleted;

    await user.save();

    if (name) {
      // Return updated name so frontend can sync localStorage
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change password (requires current password)
// @route   POST /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    console.log(`✅ Password changed for ${user.email}`);
    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
export const verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Verification link is invalid or has expired.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save({ validateBeforeSave: false });

    console.log(`✅ Email verified: ${user.email}`);

    // Notify admin (fire-and-forget)
    sendAdminUserActionAlert({
      action: 'email_verified',
      userName: user.name,
      userEmail: user.email,
      details: { 'Plan': user.plan },
    }).catch(() => {});

    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
export const resendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+emailVerificationToken +emailVerificationExpires');

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${rawToken}`;

    res.json({ success: true, message: 'Verification email sent! Please check your inbox.' });

    // Fire after responding
    sendEmailVerificationEmail(user, verifyUrl)
      .catch(err => console.error('Resend verification email failed:', err.message));
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export all of the user's data as JSON (data portability)
// @route   GET /api/auth/export-data
export const exportUserData = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      profile, savedOpportunities, alerts, certifications,
      pastPerformance, tickets, suggestions, invoices,
      planRequests, creditPurchases, withdrawals, referrals,
    ] = await Promise.all([
      User.findById(userId).select(
        '-password -twoFactorSecret -twoFactorBackupCodes -twoFactorTempToken -twoFactorTempExpires -resetPasswordToken -emailVerificationToken'
      ),
      SavedOpportunity.find({ user: userId }).populate('opportunity', 'title agency sourceId'),
      Alert.find({ user: userId }),
      UserCertification.find({ user: userId }),
      PastPerformance.find({ user: userId }),
      Ticket.find({ user: userId }).select('-messages.attachments.data'),
      Suggestion.find({ user: userId }),
      Invoice.find({ user: userId }),
      PlanRequest.find({ user: userId }),
      CreditPurchase.find({ user: userId }),
      Withdrawal.find({ user: userId }),
      Referral.find({ referrer: userId }),
    ]);

    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      data: {
        profile, savedOpportunities, alerts, certifications,
        pastPerformance, tickets, suggestions, invoices,
        planRequests, creditPurchases, withdrawals, referrals,
      },
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Permanently delete the authenticated user's account and personal data
// @route   DELETE /api/auth/account
export const deleteAccount = async (req, res) => {
  try {
    const { password, confirmation, token } = req.body;

    if (confirmation !== 'DELETE') {
      return res.status(400).json({ success: false, message: 'Please type DELETE to confirm.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    const user = await User.findById(req.user._id).select('+password +twoFactorSecret +twoFactorBackupCodes');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const passwordOk = await user.matchPassword(password);
    if (!passwordOk) return res.status(401).json({ success: false, message: 'Incorrect password.' });

    if (user.twoFactorEnabled) {
      const cleanToken = (token || '').replace(/\s/g, '');
      if (!cleanToken) {
        return res.status(400).json({ success: false, message: 'Authenticator code is required.' });
      }
      const totpValid = speakeasy.totp.verify({
        secret:   user.twoFactorSecret || '',
        encoding: 'base32',
        token:    cleanToken,
        window:   1,
      });
      const backupValid = (user.twoFactorBackupCodes || []).includes(cleanToken.toUpperCase());
      if (!totpValid && !backupValid) {
        return res.status(400).json({ success: false, message: 'Invalid authenticator code or backup code.' });
      }
    }

    const userId = user._id;
    const userEmail = user.email;
    const userName = user.name;

    // Remove personal/usage data tied to this account.
    // Financial/audit records (invoices, plan requests, tickets, suggestions,
    // credit purchases, withdrawals, referrals) are kept for accounting history.
    await Promise.all([
      SavedOpportunity.deleteMany({ user: userId }),
      Alert.deleteMany({ user: userId }),
      AlertNotification.deleteMany({ user: userId }),
      UserOpportunity.deleteMany({ user: userId }),
      UserNotification.deleteMany({ user: userId }),
      UserCertification.deleteMany({ user: userId }),
      PushSubscription.deleteMany({ user: userId }),
      PastPerformance.deleteMany({ user: userId }),
    ]);

    await User.findByIdAndDelete(userId);

    console.log(`🗑️ Account deleted: ${userEmail}`);

    sendAdminUserActionAlert({
      action: 'account_deleted',
      userName,
      userEmail,
      details: {},
    }).catch(() => {});

    res.json({ success: true, message: 'Your account and personal data have been permanently deleted.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};