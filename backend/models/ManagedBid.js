import mongoose from 'mongoose';

const managedBidSchema = new mongoose.Schema({
  managedService:     { type: mongoose.Schema.Types.ObjectId, ref: 'ManagedService', required: true },
  company:            { type: mongoose.Schema.Types.ObjectId, ref: 'Company',        required: true },
  owner:              { type: mongoose.Schema.Types.ObjectId, ref: 'User',           required: true },
  opportunity:        { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity',    default: null },

  contractTitle:      { type: String, required: true, trim: true },
  solicitationNumber: { type: String, trim: true, default: '' },
  agency:             { type: String, trim: true, default: '' },
  naicsCode:          { type: String, trim: true, default: '' },
  setAside:           { type: String, trim: true, default: '' },
  estimatedValue:     { type: Number, default: 0 },
  deadline:           { type: Date },

  status: {
    type: String,
    enum: ['identified', 'in_progress', 'submitted', 'won', 'lost', 'cancelled'],
    default: 'identified',
  },

  // Filled when status = 'won'
  wonValue:           { type: Number, default: 0 },
  commissionRate:     { type: Number, default: 0 },   // % used at time of win
  commissionAmount:   { type: Number, default: 0 },   // total $ commission owed across the contract life
  commissionInvoiced: { type: Number, default: 0 },   // running total already invoiced (milestone-based billing)
  commissionPaid:     { type: Boolean, default: false }, // true once commissionInvoiced >= commissionAmount and all paid
  paidAt:             { type: Date },

  proposalUrl: { type: String, default: '' },
  documents: [{
    name:       { type: String, required: true },
    url:        { type: String, required: true },
    type:       { type: String, enum: ['proposal', 'capability_statement', 'past_performance', 'contract', 'other'], default: 'other' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  notes:       { type: String, default: '' },
}, { timestamps: true });

managedBidSchema.index({ managedService: 1, status: 1 });
managedBidSchema.index({ owner: 1 });

export default mongoose.model('ManagedBid', managedBidSchema);
