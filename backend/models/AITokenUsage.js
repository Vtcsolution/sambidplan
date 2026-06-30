import mongoose from 'mongoose';

const aiTokenUsageSchema = new mongoose.Schema({
  provider: { type: String, enum: ['anthropic', 'openai', 'gemini'], required: true },
  model: { type: String, required: true },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  feature: { type: String, default: '' },
}, { timestamps: true });

aiTokenUsageSchema.index({ provider: 1, createdAt: -1 });
aiTokenUsageSchema.index({ createdAt: -1 });

export default mongoose.model('AITokenUsage', aiTokenUsageSchema);
