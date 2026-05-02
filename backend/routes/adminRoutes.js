// backend/routes/adminRoutes.js
import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  // Plan Request Controllers
  getPlanRequests,
  createPlanRequest,
  getUserPlanRequests,
  approvePlanRequest,
  markRequestAsPaid,
  rejectPlanRequest,
  getAdminStats,
  // Settings Controllers
  getSettings,
  updateSettings,
  // Notification Controllers
  getNotifications,
  createNotification,
  markNotificationAsRead,
  deleteNotification,
  sendBroadcastEmail,
  getUnreadNotificationsCount,
  // Invoice Controllers
  getAllInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  // User Management
  getAllUsers,
  getUserById,
  updateUserPlan,
  updateUserRole,
  deleteUser,
  testEmail,
  // Dashboard
  getRecentActivity
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==================== USER ROUTES (Anyone logged in) ====================
router.post('/plan-requests', createPlanRequest);
router.get('/my-requests', getUserPlanRequests);

// ==================== ADMIN ONLY ROUTES ====================
router.use(adminOnly);

// Dashboard & Stats
router.get('/stats', getAdminStats);
router.get('/recent-activity', getRecentActivity);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Notifications
router.get('/notifications', getNotifications);
router.post('/notifications', createNotification);
router.get('/notifications/unread/count', getUnreadNotificationsCount);
router.put('/notifications/:id/read', markNotificationAsRead);
router.delete('/notifications/:id', deleteNotification);
router.post('/notifications/broadcast', sendBroadcastEmail);

// Plan Requests (Admin)
router.get('/plan-requests', getPlanRequests);
router.post('/plan-requests/:id/approve', approvePlanRequest);
router.post('/plan-requests/:id/mark-paid', markRequestAsPaid);
router.post('/plan-requests/:id/reject', rejectPlanRequest);

// Invoice Management
router.get('/invoices', getAllInvoices);
router.get('/invoices/:id', getInvoiceById);
router.put('/invoices/:id/status', updateInvoiceStatus);
router.post('/email/test', testEmail);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/plan', updateUserPlan);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

export default router;