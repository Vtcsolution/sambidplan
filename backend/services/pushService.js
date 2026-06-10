// backend/services/pushService.js
// Wraps web-push to send notifications to individual users or all subscribers.
import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

// Configure VAPID once on module load (lazy — env vars are loaded by then)
let _configured = false;
const configure = () => {
  if (_configured) return;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('⚠️ VAPID keys not set — push notifications disabled');
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:zia@sambid.co',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  _configured = true;
};

// Build the notification payload
const buildPayload = (title, body, data = {}) =>
  JSON.stringify({
    title,
    body,
    icon:  '/icon-192.png',
    badge: '/icon-72.png',
    data:  { url: '/dashboard', ...data }
  });

// Send to one subscription object; remove stale subscriptions automatically
const sendToSubscription = async (sub, payload) => {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      payload
    );
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired/unregistered — clean up
      await PushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
      console.log(`🗑️ Removed stale push subscription: ${sub.endpoint.slice(-20)}`);
    } else {
      console.error('Push send error:', err.message);
    }
    return false;
  }
};

// Send push notification to all subscriptions of a specific user
export const sendPushToUser = async (userId, title, body, data = {}) => {
  configure();
  if (!_configured) return 0;

  const subs = await PushSubscription.find({ user: userId }).lean();
  if (!subs.length) return 0;

  const payload  = buildPayload(title, body, data);
  const results  = await Promise.all(subs.map(s => sendToSubscription(s, payload)));
  const sent     = results.filter(Boolean).length;
  if (sent > 0) console.log(`🔔 Push sent to user ${userId}: "${title}" (${sent}/${subs.length} devices)`);
  return sent;
};

// Broadcast to all subscribers (used for admin announcements)
export const sendPushBroadcast = async (title, body, data = {}) => {
  configure();
  if (!_configured) return 0;

  const subs    = await PushSubscription.find({}).lean();
  const payload = buildPayload(title, body, data);
  const results = await Promise.all(subs.map(s => sendToSubscription(s, payload)));
  const sent    = results.filter(Boolean).length;
  console.log(`📢 Push broadcast: "${title}" sent to ${sent}/${subs.length} subscribers`);
  return sent;
};

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || '';
