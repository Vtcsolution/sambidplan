import mongoose from 'mongoose';

const deadlineAlertSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  // 'upcoming' = first notice (within user's alertDays window)
  // '1day'     = countdown alerts (up to 5, every 5h when <24h remain)
  // 'final'    = last-hour alerts (up to 3, every 20min when <60min remain)
  alertType:   { type: String, enum: ['upcoming', '1day', 'final'], required: true },
  alertIndex:  { type: Number, default: 1 }, // 1day: 1–5, final: 1–3
  sentAt:      { type: Date, default: Date.now },
  dueDate:     { type: Date },
});

// Unique per user+opportunity+type+index so we never double-send a step
deadlineAlertSchema.index(
  { user: 1, opportunity: 1, alertType: 1, alertIndex: 1 },
  { unique: true }
);
deadlineAlertSchema.index({ sentAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 }); // auto-purge after 30d

export default mongoose.model('DeadlineAlert', deadlineAlertSchema);
