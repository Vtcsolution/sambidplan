// backend/controllers/alertController.js
import {
  getUserAlerts,
  createOrUpdateAlert,
  deleteAlert,
  toggleAlertStatus,
  getUserAlertNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount
} from '../services/alertService.js';
import UserNotification from '../models/UserNotification.js';
import AlertNotification from '../models/AlertNotification.js';

// ── Normalise AlertNotification → consistent shape for the dropdown ───────────
const normaliseAlertNotif = (n) => ({
  _id:        `alert_${n._id}`,
  type:       'contract_match',
  title:      n.opportunity?.title ? `New match: ${n.opportunity.title.slice(0, 60)}` : 'New contract match',
  message:    n.matchReasons?.slice(0, 2).join(' · ') || `Score ${n.matchScore}%`,
  read:       !!n.isRead,
  createdAt:  n.createdAt,
  link:       n.opportunity?._id ? `/opportunity/${n.opportunity._id}` : '/alerts',
});

// ── Normalise UserNotification → same shape ───────────────────────────────────
const normaliseUserNotif = (n) => ({
  _id:       `user_${n._id}`,
  type:      n.type,
  title:     n.title,
  message:   n.message,
  read:      !!n.read,
  createdAt: n.createdAt,
  link:      n.link || '',
});

// @desc    Get user's alerts
// @route   GET /api/alerts
export const getAlerts = async (req, res) => {
  try {
    const alerts = await getUserAlerts(req.user._id);
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or update alert
// @route   POST /api/alerts
export const saveAlert = async (req, res) => {
  try {
    const alert = await createOrUpdateAlert(req.body, req.user._id);
    res.json({ success: true, data: alert, message: 'Alert saved successfully' });
  } catch (error) {
    console.error('Save alert error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
export const removeAlert = async (req, res) => {
  try {
    await deleteAlert(req.params.id, req.user._id);
    res.json({ success: true, message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle alert status
// @route   PATCH /api/alerts/:id/toggle
export const toggleAlert = async (req, res) => {
  try {
    const alert = await toggleAlertStatus(req.params.id, req.user._id);
    res.json({ success: true, data: alert, message: `Alert ${alert.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('Toggle alert error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get merged notifications (contract matches + user events)
// @route   GET /api/alerts/notifications
export const getNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50');

    // Fetch both sources in parallel
    const [alertResult, userNotifs] = await Promise.all([
      getUserAlertNotifications(req.user._id, limit, 1),
      UserNotification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit),
    ]);

    const merged = [
      ...alertResult.notifications.map(normaliseAlertNotif),
      ...userNotifs.map(normaliseUserNotif),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);

    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark a single notification as read
// @route   PUT /api/alerts/notifications/:id/read
export const markRead = async (req, res) => {
  try {
    const rawId = req.params.id;

    if (rawId.startsWith('user_')) {
      const realId = rawId.replace('user_', '');
      await UserNotification.findOneAndUpdate({ _id: realId, user: req.user._id }, { read: true });
    } else if (rawId.startsWith('alert_')) {
      const realId = rawId.replace('alert_', '');
      await markNotificationAsRead(realId, req.user._id);
    } else {
      // Legacy plain ID — try both
      await Promise.allSettled([
        UserNotification.findOneAndUpdate({ _id: rawId, user: req.user._id }, { read: true }),
        markNotificationAsRead(rawId, req.user._id),
      ]);
    }
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/alerts/notifications/read-all
export const markAllRead = async (req, res) => {
  try {
    await Promise.all([
      markAllNotificationsAsRead(req.user._id),
      UserNotification.updateMany({ user: req.user._id, read: false }, { read: true }),
    ]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get combined unread count
// @route   GET /api/alerts/notifications/unread/count
export const getUnreadCount = async (req, res) => {
  try {
    const [alertCount, userCount] = await Promise.all([
      getUnreadNotificationCount(req.user._id),
      UserNotification.countDocuments({ user: req.user._id, read: false }),
    ]);
    res.json({ success: true, data: { count: alertCount + userCount } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
