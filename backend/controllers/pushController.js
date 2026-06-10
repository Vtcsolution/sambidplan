// backend/controllers/pushController.js
import PushSubscription from '../models/PushSubscription.js';
import { sendPushToUser, vapidPublicKey } from '../services/pushService.js';

// @route  GET /api/push/vapid-public-key
export const getVapidPublicKey = (req, res) => {
  const key = vapidPublicKey();
  if (!key) return res.status(503).json({ success: false, message: 'Push notifications not configured' });
  res.json({ success: true, publicKey: key });
};

// @route  POST /api/push/subscribe
export const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object' });
    }

    // Upsert: update if endpoint already exists for another user, create if new
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys, userAgent: req.headers['user-agent'] || '' },
      { upsert: true, new: true }
    );

    console.log(`🔔 Push subscription saved for ${req.user.email}`);

    // Send a welcome notification
    await sendPushToUser(
      req.user._id,
      'Sambid Notify Alerts Active 🔔',
      'You\'ll now get instant alerts when new contracts match your NAICS codes.',
      { url: '/opportunities' }
    );

    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  DELETE /api/push/unsubscribe
export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, user: req.user._id });
    } else {
      // Remove all subscriptions for this user
      await PushSubscription.deleteMany({ user: req.user._id });
    }
    console.log(`🔕 Push subscription removed for ${req.user.email}`);
    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  GET /api/push/status
export const getStatus = async (req, res) => {
  try {
    const count = await PushSubscription.countDocuments({ user: req.user._id });
    res.json({ success: true, subscribed: count > 0, deviceCount: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route  POST /api/push/test   (send a test push to self)
export const sendTest = async (req, res) => {
  try {
    const sent = await sendPushToUser(
      req.user._id,
      '🧪 Test Notification',
      'Push notifications are working correctly on your device!',
      { url: '/dashboard' }
    );
    if (sent === 0) {
      return res.json({ success: false, message: 'No active subscriptions found. Please enable notifications first.' });
    }
    res.json({ success: true, message: `Test notification sent to ${sent} device(s)` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
