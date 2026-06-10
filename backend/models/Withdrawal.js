import mongoose from 'mongoose';

export const MIN_PAID_REFERRALS = 5;      // must have 5 paid referrals before withdrawing
export const MIN_WITHDRAWAL_AMOUNT = 100; // minimum $100 withdrawal
export const MIN_BALANCE_TO_USE    = 100; // minimum balance to apply toward any purchase

const withdrawalSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending',
  },

  method: {
    type: String,
    enum: ['bank_transfer', 'paypal', 'check'],
    required: true,
  },

  accountDetails: {
    accountName:   { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    bankName:      { type: String, default: '' },
    routingNumber: { type: String, default: '' },
    paypalEmail:   { type: String, default: '' },
  },

  adminNote:   { type: String, default: '' },
  processedAt: { type: Date, default: null },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true });

withdrawalSchema.index({ user: 1, status: 1 });

export default mongoose.model('Withdrawal', withdrawalSchema);
