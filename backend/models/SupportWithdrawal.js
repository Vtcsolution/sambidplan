import mongoose from 'mongoose';
const { Schema } = mongoose;

export const SUPPORT_MIN_WITHDRAWAL = 100; // $100 minimum

const supportWithdrawalSchema = new Schema({
  supportMember: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  amount:        { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'rejected'],
    default: 'pending',
  },
  method: {
    type: String,
    enum: ['bank_transfer', 'paypal', 'check'],
    required: true,
  },
  accountDetails:    { type: Object, default: {} },
  adminNote:         { type: String, default: '' },
  paymentId:         { type: String, default: '' },   // transaction ref / PayPal ID etc.
  proofScreenshotUrl:{ type: String, default: '' },   // URL pasted by admin as payment proof
  processedAt:       { type: Date, default: null },
  processedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true });

supportWithdrawalSchema.index({ supportMember: 1, status: 1 });

export default mongoose.model('SupportWithdrawal', supportWithdrawalSchema);
