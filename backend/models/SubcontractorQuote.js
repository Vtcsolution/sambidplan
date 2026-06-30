import mongoose from 'mongoose';

const subcontractorQuoteSchema = new mongoose.Schema({
  managedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'ManagedProject', required: true },

  // Vendor info
  vendorName:    { type: String, required: true, trim: true },
  vendorEmail:   { type: String, required: true, trim: true },
  vendorPhone:   { type: String, trim: true, default: '' },
  vendorCompany: { type: String, trim: true, default: '' },
  vendorLocation: {
    city:    { type: String, default: '' },
    state:   { type: String, default: '' },
    country: { type: String, default: '' },
  },

  // Quote details
  quoteAmount:      { type: Number, required: true },
  currency:         { type: String, default: 'USD' },
  deliveryTimeline: { type: Number },
  proposedApproach: { type: String, default: '' },
  costBreakdown: [{
    item:   { type: String },
    amount: { type: Number },
  }],

  // Status
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'accepted', 'rejected', 'withdrawn'],
    default: 'submitted',
  },

  validUntil: { type: Date },
  attachments: [{
    name: { type: String },
    url:  { type: String },
  }],
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

subcontractorQuoteSchema.index({ managedProject: 1, status: 1 });
subcontractorQuoteSchema.index({ vendorEmail: 1 });

export default mongoose.model('SubcontractorQuote', subcontractorQuoteSchema);
