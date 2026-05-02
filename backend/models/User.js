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
  // Daily match tracking
  dailyMatchesUsed: {
    type: Number,
    default: 0
  },
  lastMatchReset: {
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
  createdAt: {
    type: Date,
    default: Date.now
  }
  
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
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