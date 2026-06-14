import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please add a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  plan: {
    type: String,
    enum: ['trial', 'free', 'starter', 'pro', 'enterprise', 'expired'],
    default: 'trial'
  },
  planExpiresAt: {
    type: Date,
    default: null
  },
  // Trial tracking
  trialStartDate: {
    type: Date,
    default: Date.now
  },
  trialEndDate: {
    type: Date,
    default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  isTrialActive: {
    type: Boolean,
    default: true
  },
  // Email verification
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    default: null,
    select: false,
  },
  emailVerificationExpires: {
    type: Date,
    default: null,
    select: false,
  },

  // Monthly match tracking (starter/pro/enterprise)
  monthlyMatchesUsed: {
    type: Number,
    default: 0
  },
  lastMonthlyReset: {
    type: Date,
    default: Date.now
  },
  // Daily match tracking (trial/free — 3 per day)
  dailyMatchesUsed: {
    type: Number,
    default: 0
  },
  lastDailyReset: {
    type: Date,
    default: Date.now
  },
  // Monthly AI usage tracking
  monthlyAIGenerationsUsed: {
    type: Number,
    default: 0
  },
  lastAIReset: {
    type: Date,
    default: Date.now
  },
  // Purchased bonus AI credits (admin-approved top-ups, not reset monthly)
  bonusAICredits: {
    type: Number,
    default: 0
  },
  lastTrialReminderSent: {
  type: Date,
  default: null
},
lastDigestSent: {
  type: Date,
  default: null
},
emailAlertsEnabled: {
  type: Boolean,
  default: true
},
alertFrequency: {
  type: String,
  enum: ['realtime', 'daily', 'weekly'],
  default: 'daily'  // Free users get weekly, Pro users get daily, Enterprise get realtime
},
  // Business info
  businessName: {
    type: String,
    default: ''
  },
  businessType: {
    type: String,
    enum: ['sole_proprietor', 'llc', 'corporation', 'nonprofit', 'other'],
    default: 'other'
  },
  naicsCodes: [{
    type: String
  }],
  // Email preferences
  emailAlertsEnabled: {
    type: Boolean,
    default: true
  },
  alertFrequency: {
    type: String,
    enum: ['realtime', 'daily', 'weekly'],
    default: 'daily'
  },

  dailyFetchesUsed: {
  type: Number,
  default: 0
},
lastFetchReset: {
  type: Date,
  default: Date.now
},
  // Password reset
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  // Onboarding
  onboardingCompleted: {
    type: Boolean,
    default: false
  },

  // ── Referral system ───────────────────────────────────────────────────────
  referralCode: {
    type: String,
    unique: true,
    sparse: true,   // null rows are excluded from uniqueness
    default: null,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Available balance (can be spent on plans or withdrawn)
  referralBalance: { type: Number, default: 0 },
  // Lifetime earnings (never decreases)
  totalReferralEarnings: { type: Number, default: 0 },
  // How many of this user's referrals have purchased a paid plan
  paidReferralCount: { type: Number, default: 0 },

  // ── Support member referral ───────────────────────────────────────────────
  supportReferredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },

  // ── Two-Factor Authentication ─────────────────────────────────────────────
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret:  { type: String, default: null, select: false },
  twoFactorBackupCodes: { type: [String], default: [], select: false },
  // Temp token issued after password-verified login when 2FA is enabled
  twoFactorTempToken: { type: String, default: null, select: false },
  twoFactorTempExpires: { type: Date, default: null, select: false },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

// Auto-generate a unique referral code on first save
userSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    // 8-char alphanumeric code derived from ObjectId suffix + random
    const base = this._id.toString().slice(-4).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.referralCode = `${base}${rand}`;
  }
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if trial is still active
userSchema.methods.isTrialValid = function() {
  if (!this.isTrialActive) return false;
  return new Date() < this.trialEndDate;
};

// Get days left in trial
userSchema.methods.getTrialDaysLeft = function() {
  if (!this.isTrialActive) return 0;
  const diff = this.trialEndDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
// Add to userSchema methods
userSchema.methods.isPlanActive = function() {
  if (this.plan === 'free') return true;
  if (!this.planExpiresAt) return true;
  return new Date() < this.planExpiresAt;
};

userSchema.methods.getDaysLeft = function() {
  if (this.plan === 'free') return null;
  if (!this.planExpiresAt) return null;
  const diff = this.planExpiresAt - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

userSchema.methods.getRemainingRequests = async function() {
  const dailyLimit = this.plan === 'pro' ? 1000 : this.plan === 'starter' ? 100 : 10;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let usage = await UsageTracking.findOne({
    user: this._id,
    date: { $gte: today }
  });
  
  if (!usage) {
    usage = await UsageTracking.create({
      user: this._id,
      date: today,
      remainingRequests: dailyLimit
    });
  }
  
  return {
    used: usage.apiRequests,
    remaining: dailyLimit - usage.apiRequests,
    total: dailyLimit,
    resetAt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
  };
};
const User = mongoose.model('User', userSchema);
export default User;