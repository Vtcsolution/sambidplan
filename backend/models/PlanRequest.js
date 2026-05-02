import mongoose from 'mongoose';

const planRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  requestedPlan: {
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['payoneer', 'bank_transfer', 'credit_card'],
    default: 'payoneer'
  },
  paymentReference: {
    type: String,
    default: ''
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  adminNotes: {
    type: String,
    default: ''
  },
  approvedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

planRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const PlanRequest = mongoose.model('PlanRequest', planRequestSchema);
export default PlanRequest;