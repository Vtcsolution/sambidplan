import mongoose from 'mongoose';

const userCertificationSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:       { type: String, required: true }, // 'SAM Registration', '8(a)', 'WOSB', 'HUBZone', etc.
  expiryDate: { type: Date, required: true },
  notes:      { type: String, default: '' },
  // Track which reminder emails have been sent
  remindersSent: { type: mongoose.Schema.Types.Mixed, default: {} }, // { d90: true, d60: true, d30: true }
}, { timestamps: true });

userCertificationSchema.index({ user: 1 });

export default mongoose.model('UserCertification', userCertificationSchema);
