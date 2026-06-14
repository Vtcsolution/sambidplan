import mongoose from 'mongoose';
const { Schema } = mongoose;

export const SUPPORT_DISCOUNT_RATE   = 0.20; // 20% off for referred user
export const SUPPORT_COMMISSION_RATE = 0.20; // 20% commission to support member

const supportReferralSchema = new Schema({
  supportMember: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  user:          { type: Schema.Types.ObjectId, ref: 'User',  required: true },
  status: {
    type: String,
    enum: ['registered', 'converted', 'rewarded'],
    default: 'registered',
  },
  discountAmount:   { type: Number, default: 0 },
  commissionAmount: { type: Number, default: 0 },
  planPurchased:    { type: String, default: null },
  originalAmount:   { type: Number, default: 0 },
  paidAmount:       { type: Number, default: 0 },
  invoiceId:        { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
  rewardedAt:       { type: Date, default: null },
}, { timestamps: true });

supportReferralSchema.index({ supportMember: 1 });
supportReferralSchema.index({ user: 1 });

export default mongoose.model('SupportReferral', supportReferralSchema);
