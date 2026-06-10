import mongoose from 'mongoose';

// Commission rates per plan (percentage of invoice amount)
export const COMMISSION_RATES = {
  starter:    0.20,   // 20%
  pro:        0.20,   // 20%
  enterprise: 0.15,   // 15%
};

export const calcCommission = (plan, amount) => {
  const rate = COMMISSION_RATES[plan] || 0.20;
  return Math.round(amount * rate * 100) / 100;
};

const referralSchema = new mongoose.Schema({
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referee:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // 'registered' = signed up, 'converted' = purchased a paid plan, 'rewarded' = commission credited
  status: { type: String, enum: ['registered', 'converted', 'rewarded'], default: 'registered' },

  commissionAmount: { type: Number, default: 0 },
  commissionRate:   { type: Number, default: 0 },

  planPurchased:  { type: String, default: null },
  invoiceId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  rewardedAt:     { type: Date, default: null },
}, { timestamps: true });

referralSchema.index({ referrer: 1, status: 1 });

export default mongoose.model('Referral', referralSchema);
