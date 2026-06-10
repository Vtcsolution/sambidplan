// backend/controllers/trackingController.js
// Public tracking endpoints — no auth required.
// Called by email clients (pixel load = open, link click = click).

import Prospect from '../models/Prospect.js';

// 1x1 transparent PNG — returned immediately for open tracking
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export const trackOpen = async (req, res) => {
  const { trackingId } = req.params;

  // Return pixel immediately — don't keep the email client waiting
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.send(PIXEL);

  if (!trackingId) return;

  try {
    const now = new Date();
    // Set openedAt only on first open
    await Prospect.updateOne(
      { emailHistory: { $elemMatch: { trackingId, openedAt: { $exists: false } } } },
      { $set: { 'emailHistory.$.openedAt': now } }
    );
    // Always increment count
    await Prospect.updateOne(
      { 'emailHistory.trackingId': trackingId },
      { $inc: { 'emailHistory.$.openCount': 1 } }
    );
  } catch (err) {
    console.error('[track-open]', err.message);
  }
};

export const trackClick = async (req, res) => {
  const { trackingId } = req.params;
  const destination = req.query.url
    ? decodeURIComponent(req.query.url)
    : (process.env.FRONTEND_URL || 'https://sambid.co');

  // Redirect immediately
  res.redirect(302, destination);

  if (!trackingId) return;

  try {
    const now = new Date();
    // Set clickedAt only on first click
    await Prospect.updateOne(
      { emailHistory: { $elemMatch: { trackingId, clickedAt: { $exists: false } } } },
      { $set: { 'emailHistory.$.clickedAt': now } }
    );
    // Always increment count
    await Prospect.updateOne(
      { 'emailHistory.trackingId': trackingId },
      { $inc: { 'emailHistory.$.clickCount': 1 } }
    );
  } catch (err) {
    console.error('[track-click]', err.message);
  }
};
