// backend/models/Invoice.js
import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    unique: true
  },
  payoneerInvoiceId: {
    type: String
  },
  plan: {
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'expired', 'cancelled', 'refunded'],
    default: 'pending'
  },
  invoiceUrl: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['payoneer', 'bank_transfer', 'manual', 'stripe', 'paypal'],  // ← ADDED 'stripe' and 'paypal'
    default: 'payoneer'
  },
  paidAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000)
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Generate invoice number before saving
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;