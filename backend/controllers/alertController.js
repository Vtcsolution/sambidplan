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

// @desc    Get user's alert notifications
// @route   GET /api/alerts/notifications
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await getUserAlertNotifications(req.user._id, parseInt(limit), parseInt(page));
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/alerts/notifications/:id/read
export const markRead = async (req, res) => {
  try {
    await markNotificationAsRead(req.params.id, req.user._id);
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
    await markAllNotificationsAsRead(req.user._id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get unread notification count
// @route   GET /api/alerts/notifications/unread/count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await getUnreadNotificationCount(req.user._id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};