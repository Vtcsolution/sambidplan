import mongoose from 'mongoose';

const creditUsageLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: '' },
  userEmail: { type: String, default: '' },
  businessName: { type: String, default: '' },
  feature: { type: String, required: true },
  featureLabel: { type: String, default: '' },
  creditsUsed: { type: Number, required: true },
  model: { type: String, default: '' },
  opportunityTitle: { type: String, default: '' },
  opportunityId: { type: String, default: '' },
  plan: { type: String, default: '' },
  creditsRemaining: { type: Number, default: 0 },
}, { timestamps: true });

creditUsageLogSchema.index({ user: 1, createdAt: -1 });
creditUsageLogSchema.index({ businessName: 1, createdAt: -1 });
creditUsageLogSchema.index({ createdAt: -1 });
creditUsageLogSchema.index({ feature: 1 });

export default mongoose.model('CreditUsageLog', creditUsageLogSchema);
