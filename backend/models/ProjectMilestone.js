import mongoose from 'mongoose';

const projectMilestoneSchema = new mongoose.Schema({
  managedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'ManagedProject', required: true },

  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  order:       { type: Number, required: true },

  dueDate:       { type: Date },
  completedDate: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'submitted', 'approved', 'revision_needed'],
    default: 'pending',
  },

  // Payment tracking — what the SUBCONTRACTOR/vendor is paid for this milestone
  paymentAmount:     { type: Number, default: 0 },
  paymentPercentage: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'processing', 'paid'],
    default: 'unpaid',
  },
  paymentDate:      { type: Date },
  paymentReference: { type: String, default: '' },

  // Government payment tracking — what the GOVERNMENT paid for this milestone (drives commission billing)
  govPaymentAmount:     { type: Number, default: 0 },
  govPaymentReceived:   { type: Boolean, default: false },
  govPaymentReceivedAt: { type: Date },

  // Commission owed to the platform for this milestone, billed once gov payment is recorded
  commissionAmount:  { type: Number, default: 0 },
  commissionInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'CommissionInvoice', default: null },

  // Deliverables
  deliverables: [{
    name:        { type: String },
    description: { type: String, default: '' },
    submitted:   { type: Boolean, default: false },
    approvedAt:  { type: Date },
  }],

  milestoneProgress: { type: Number, default: 0, min: 0, max: 100 },
}, { timestamps: true });

projectMilestoneSchema.index({ managedProject: 1, order: 1 });

export default mongoose.model('ProjectMilestone', projectMilestoneSchema);
