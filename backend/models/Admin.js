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
}, { timestamps: true });

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model('Admin', adminSchema);
