import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'support'],
    default: 'admin',
  },
  permissions: {
    users:        { type: Boolean, default: true },
    payments:     { type: Boolean, default: true },
    content:      { type: Boolean, default: true },
    settings:     { type: Boolean, default: false },
    aiTools:      { type: Boolean, default: true },
    campaigns:    { type: Boolean, default: true },
  },
  isActive:     { type: Boolean, default: true },
  lastLoginAt:  { type: Date, default: null },
  lastLoginIP:  { type: String, default: '' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },

  // Support referral program (role: 'support' only)
  referralCode:          { type: String, unique: true, sparse: true, default: null },
  referralBalance:       { type: Number, default: 0 },
  totalCommissionEarned: { type: Number, default: 0 },
}, { timestamps: true });

adminSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  // Auto-generate referral code for support members
  if (this.role === 'support' && !this.referralCode) {
    const base = this.name.replace(/\s+/g, '').toUpperCase().slice(0, 4);
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.referralCode = `SUP-${base}-${rand}`;
  }
  next();
});

adminSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model('Admin', adminSchema);
