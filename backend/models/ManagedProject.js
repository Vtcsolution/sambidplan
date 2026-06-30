import mongoose from 'mongoose';

const managedProjectSchema = new mongoose.Schema({
  projectNumber: { type: String, unique: true },

  managedService: { type: mongoose.Schema.Types.ObjectId, ref: 'ManagedService', required: true },
  managedBid:     { type: mongoose.Schema.Types.ObjectId, ref: 'ManagedBid', required: true, unique: true },
  company:        { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  owner:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Contract info (copied from won bid)
  title:              { type: String, required: true, trim: true },
  solicitationNumber: { type: String, trim: true, default: '' },
  agency:             { type: String, trim: true, default: '' },
  contractValue:      { type: Number, default: 0 },
  naicsCode:          { type: String, trim: true, default: '' },
  setAside:           { type: String, trim: true, default: '' },

  // Delivery
  deliveryAddress: {
    street:         { type: String, default: '' },
    city:           { type: String, default: '' },
    state:          { type: String, default: '' },
    zip:            { type: String, default: '' },
    country:        { type: String, default: 'United States' },
    pointOfContact: { type: String, default: '' },
    phone:          { type: String, default: '' },
    email:          { type: String, default: '' },
  },
  deliveryDeadline: { type: Date },

  // Government payment tracking
  govPaymentStatus:       { type: String, enum: ['pending', 'received', 'partial'], default: 'pending' },
  govPaymentExpectedDate: { type: Date },
  govPaymentReceivedDate: { type: Date },
  govPaymentAmount:       { type: Number, default: 0 },

  // Status workflow
  status: {
    type: String,
    enum: ['draft', 'rfq_open', 'vendor_selected', 'in_progress', 'delivered', 'payment_pending', 'completed', 'cancelled'],
    default: 'draft',
  },

  // Selected vendor (cached from accepted quote)
  selectedQuote: { type: mongoose.Schema.Types.ObjectId, ref: 'SubcontractorQuote' },
  selectedVendor: {
    name:        { type: String, default: '' },
    email:       { type: String, default: '' },
    company:     { type: String, default: '' },
    quoteAmount: { type: Number, default: 0 },
  },

  // Progress
  overallProgress:    { type: Number, default: 0, min: 0, max: 100 },
  lastProgressUpdate: { type: Date },
  progressNotes: [{
    date:      { type: Date, default: Date.now },
    note:      { type: String },
    progress:  { type: Number },
    updatedBy: { type: String },
  }],

  // Alert tracking
  nextAlertDate: { type: Date },
  alertsSent: [{
    type:   { type: String },
    sentAt: { type: Date, default: Date.now },
  }],

  documents: [{
    name:       { type: String, required: true },
    url:        { type: String, required: true },
    type:       { type: String, enum: ['contract', 'sow', 'delivery_confirmation', 'invoice', 'other'], default: 'other' },
    uploadedAt: { type: Date, default: Date.now },
  }],

  notes: { type: String, default: '' },
}, { timestamps: true });

managedProjectSchema.pre('save', async function (next) {
  if (!this.projectNumber) {
    const count = await mongoose.model('ManagedProject').countDocuments();
    const year = new Date().getFullYear();
    this.projectNumber = `MPR-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

managedProjectSchema.index({ managedService: 1, status: 1 });
managedProjectSchema.index({ owner: 1 });
managedProjectSchema.index({ status: 1, deliveryDeadline: 1 });

export default mongoose.model('ManagedProject', managedProjectSchema);
