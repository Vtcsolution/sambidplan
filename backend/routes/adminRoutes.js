// backend/routes/adminRoutes.js
import express from 'express';
import { flexAdmin } from '../middleware/flexAdminMiddleware.js';
import { superAdminOnly } from '../middleware/adminAuthMiddleware.js';
import {
  // Plan Request Controllers
  getDashboardAnalytics,
  getPlanRequests,
  createPlanRequest,
  getUserPlanRequests,
  approvePlanRequest,
  markRequestAsPaid,
  rejectPlanRequest,
  sendPlanPaymentInstructions,
  getAdminStats,
  triggerSAMFetch,
  triggerBulkFetch,
  triggerSAMFetchTest,
  triggerBulkFetchTest,
  getHybridOpportunities,
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
  getAnnualInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  // User Management
  getAllUsers,
  getUserById,
  updateUserPlan,
  updateUserRole,
  deleteUser,
  grantCredits,
  unlockUser,
  testEmail,
  // Dashboard
  getRecentActivity,
  // Referral management
  getAllReferrals,
  getAllWithdrawals,
  processWithdrawal,
  // SAM Company Directory
  getSamCompanies,
  getSamSyncStats,
  triggerCompanySync,
  fetchOneCompany,
  // Multi-source
  getCompanySourceStats,
  syncUsaSpendingSource,
  syncFpdsSource,
  syncSbaSource,
  clearAllCompanies,
  getPendingCounts,
} from '../controllers/adminController.js';
import { reconcileReferralCommissions } from '../controllers/referralController.js';
import {
  getCreditUsageLogs, getCreditUsageSummary,
  getUserCreditHistory, sendCreditReport,
  resetUserCredits, addBonusCredits,
} from '../controllers/adminCreditController.js';
import { getAIKeyStatus } from '../controllers/adminAIKeysController.js';

const router = express.Router();

// All routes require either adminToken or user+admin role
router.use(flexAdmin);

// Dashboard & Stats
router.get('/stats',                  getAdminStats);
router.get('/analytics',              getDashboardAnalytics);
router.get('/pending-counts',         getPendingCounts);
router.post('/trigger-fetch',         triggerSAMFetch);
router.post('/trigger-bulk',          triggerBulkFetch);
router.post('/trigger-fetch-test',    triggerSAMFetchTest);
router.post('/trigger-bulk-test',     triggerBulkFetchTest);
router.get('/hybrid-opportunities',   getHybridOpportunities);
router.get('/recent-activity',        getRecentActivity);

// Settings — super_admin only (API keys, SMTP, payment gateways are system-level)
router.get('/settings', getSettings);
router.put('/settings', superAdminOnly, updateSettings);

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
router.post('/plan-requests/:id/send-instructions', sendPlanPaymentInstructions);

// Invoice Management
router.get('/invoices', getAllInvoices);
router.get('/annual-invoices', getAnnualInvoices);
router.get('/invoices/:id', getInvoiceById);
router.put('/invoices/:id/status', updateInvoiceStatus);
router.post('/email/test', testEmail);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/plan', updateUserPlan);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/grant-credits', grantCredits);
router.put('/users/:id/unlock', unlockUser);
router.delete('/users/:id', deleteUser);

// Referral management
router.get('/referrals',               getAllReferrals);
router.get('/withdrawals',             getAllWithdrawals);
router.put('/withdrawals/:id',         processWithdrawal);
router.post('/referrals/reconcile',    async (req, res) => {
  const result = await reconcileReferralCommissions();
  res.json({ success: true, ...result });
});

// SAM Company Directory — clear is BLOCKED for everyone (protected data)
router.get('/companies',                    getSamCompanies);
router.get('/companies/stats',              getSamSyncStats);
router.get('/companies/source-stats',       getCompanySourceStats);
router.post('/companies/sync',              triggerCompanySync);
router.post('/companies/fetch-one',         fetchOneCompany);
router.post('/companies/sync-usaspending',  syncUsaSpendingSource);
router.post('/companies/sync-fpds',         syncFpdsSource);
router.post('/companies/sync-sba',          syncSbaSource);
router.post('/companies/clear',             clearAllCompanies);

// AI Keys & Provider Status
router.get('/ai-keys/status',        getAIKeyStatus);

// AI Credit Usage
router.get('/credits/logs',                 getCreditUsageLogs);
router.get('/credits/summary',              getCreditUsageSummary);
router.get('/credits/user/:userId',         getUserCreditHistory);
router.post('/credits/send-report',         sendCreditReport);
router.post('/credits/reset/:userId',       resetUserCredits);
router.post('/credits/add-bonus/:userId',   addBonusCredits);

export default router;