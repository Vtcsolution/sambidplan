import mongoose from 'mongoose';

let _counter = 0;

const commissionInvoiceSchema = new mongoose.Schema({
  invoiceNumber:  { type: String, unique: true },
  managedService: { type: mongoose.Schema.Types.ObjectId, ref: 'ManagedService', required: true },
  bid:            { type: mongoose.Schema.Types.ObjectId, ref: 'ManagedBid', default: null },
  milestone:      { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectMilestone', default: null },
  company:        { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  owner:          { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },

  type:   { type: String, enum: ['monthly_fee', 'commission'], default: 'commission' },
  status: { type: String, enum: ['pending', 'sent', 'paid', 'overdue', 'cancelled'], default: 'pending' },

  contractValue:  { type: Number, default: 0 },
  commissionRate: { type: Number, default: 0 },
  amount:         { type: Number, required: true },
  dueDate:        { type: Date },

  paidAt:        { type: Date },
  paymentMethod: { type: String, default: '' },
  notes:         { type: String, default: '' },
  metadata:      { type: Map, of: String, default: undefined },
}, { timestamps: true });

// Auto-generate invoice number before save
commissionInvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('CommissionInvoice').countDocuments();
    const year  = new Date().getFullYear();
    this.invoiceNumber = `CMI-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

commissionInvoiceSchema.index({ owner: 1, status: 1 });
commissionInvoiceSchema.index({ managedService: 1 });

export default mongoose.model('CommissionInvoice', commissionInvoiceSchema);
