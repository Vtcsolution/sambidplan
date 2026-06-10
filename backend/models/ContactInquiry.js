import mongoose from 'mongoose';

const contactInquirySchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, trim: true, lowercase: true },
  company:      { type: String, trim: true, default: '' },
  phone:        { type: String, trim: true, default: '' },
  employees:    { type: String, default: '' },
  planInterest: { type: String, default: 'enterprise' },
  message:      { type: String, trim: true, default: '' },
  aiAnalysis:   { type: String, default: '' },
  status:       { type: String, enum: ['new', 'in_progress', 'resolved', 'closed'], default: 'new' },
  adminNotes:   { type: String, default: '' },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Payment tracking — must be confirmed before plan activation
  paymentConfirmed:  { type: Boolean, default: false },
  paymentReference:  { type: String, default: '' },   // manual ref, Stripe charge ID, PayPal txn, etc.
  paymentAmount:     { type: Number, default: 0 },
  paymentMethod:     { type: String, default: '' },   // 'stripe_link' | 'manual' | 'paypal' | etc.
  paymentDate:       { type: Date,   default: null },

  // Stripe Checkout payment link
  stripeSessionId:   { type: String, default: null },
  paymentLinkUrl:    { type: String, default: null },
  paymentLinkSentAt: { type: Date,   default: null },
}, { timestamps: true });

export default mongoose.model('ContactInquiry', contactInquirySchema);
