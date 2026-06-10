// backend/models/PushSubscription.js
// Stores browser push subscription objects per user.
// One user can have multiple devices/browsers.
import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Raw PushSubscription object from browser: { endpoint, keys: { p256dh, auth } }
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth:   { type: String, required: true }
  },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

pushSubscriptionSchema.index({ user: 1 });

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
export default PushSubscription;
