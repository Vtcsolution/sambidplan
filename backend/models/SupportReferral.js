import mongoose from 'mongoose';
const { Schema } = mongoose;

export const SUPPORT_DISCOUNT_RATE = 0.20;  // 20% off for referred user
export const FIRST_PURCHASE_RATE   = 0.15;  // 15% one-time on first purchase (any plan)
export const RECURRING_RATE        = 0.075; // 7.5% recurring on Pro/Enterprise renewals
export const PRO_ENTERPRISE_TARGET = 100;   // unlock threshold
export const PRO_ENTERPRISE_PLANS  = ['pro', 'enterprise'];

// backward-compat alias
export const SUPPORT_COMMISSION_RATE = FIRST_PURCHASE_RATE;

const recurringEntrySchema = new Schema({
  invoiceId:  { type: Schema.Types.ObjectId, ref: 'Invoice' },
  plan:       { type: String },
  paidAmount: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  earnedAt:   { type: Date, default: Date.now },
}, { _id: false });

const supportReferralSchema = new Schema({
  supportMember: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  user:          { type: Schema.Types.ObjectId, ref: 'User',  required: true },

  status: {
    type: String,
    enum: ['registered', 'first_purchased', 'rewarded'],
    default: 'registered',
  },

  // One-time 15% on first purchase
  firstCommission:     { type: Number, default: 0 },
  firstPurchasePlan:   { type: String, default: null },
  firstPurchaseAmount: { type: Number, default: 0 },
  firstPurchasedAt:    { type: Date,   default: null },
  // true if first plan was pro or enterprise — counts toward the 100-target
  countsTowardTarget:  { type: Boolean, default: false },

  // Recurring 7.5% entries (only after target unlocked, pro/enterprise renewals only)
  recurringCommissions: { type: [recurringEntrySchema], default: [] },
  totalRecurringEarned: { type: Number, default: 0 },

  // Legacy / display fields kept for backward compat
  discountAmount:   { type: Number, default: 0 },
  commissionAmount: { type: Number, default: 0 }, // = firstCommission + totalRecurringEarned
  planPurchased:    { type: String, default: null },
  originalAmount:   { type: Number, default: 0 },
  paidAmount:       { type: Number, default: 0 },
  invoiceId:        { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
  rewardedAt:       { type: Date, default: null },
}, { timestamps: true });

supportReferralSchema.index({ supportMember: 1 });
supportReferralSchema.index({ user: 1 });
supportReferralSchema.index({ supportMember: 1, countsTowardTarget: 1 });

export default mongoose.model('SupportReferral', supportReferralSchema);
