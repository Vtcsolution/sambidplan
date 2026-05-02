// backend/routes/alertRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getAlerts,
  saveAlert,
  removeAlert,
  toggleAlert,
  getNotifications,
  markRead,
  markAllRead,
  getUnreadCount
} from '../controllers/alertController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Alert management
router.get('/', getAlerts);
router.post('/', saveAlert);
router.delete('/:id', removeAlert);
router.patch('/:id/toggle', toggleAlert);

// Alert notifications
router.get('/notifications', getNotifications);
router.get('/notifications/unread/count', getUnreadCount);
router.put('/notifications/:id/read', markRead);
router.put('/notifications/read-all', markAllRead);

export default router;