import mongoose from 'mongoose';

const userNotificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:    {
    type: String,
    enum: ['ticket_reply', 'ticket_created', 'account_created', 'plan_purchased', 'plan_activated', 'general', 'managed_bid_won', 'managed_bid_update', 'managed_service_update', 'commission_invoice'],
    default: 'general',
  },
  title:   { type: String, required: true },
  message: { type: String, default: '' },
  link:    { type: String, default: '' },
  read:    { type: Boolean, default: false, index: true },
}, { timestamps: true });

userNotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model('UserNotification', userNotificationSchema);
