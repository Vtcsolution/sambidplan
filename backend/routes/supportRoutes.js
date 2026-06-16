import express from 'express';
import {
  getSupportStats,
  requestSupportWithdrawal,
  adminGetAllSupportStats,
  adminGetSupportWithdrawals,
  adminProcessWithdrawal,
} from '../controllers/supportController.js';
import { protectAdmin, adminOrSuperAdmin } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

// Support member routes — any logged-in admin/support member can access their own stats
router.get('/stats',     protectAdmin, getSupportStats);
router.post('/withdraw', protectAdmin, requestSupportWithdrawal);

// Admin routes — admin or super_admin can view and process support team data
router.get('/admin/all',             protectAdmin, adminOrSuperAdmin, adminGetAllSupportStats);
router.get('/admin/withdrawals',     protectAdmin, adminOrSuperAdmin, adminGetSupportWithdrawals);
router.put('/admin/withdrawals/:id', protectAdmin, adminOrSuperAdmin, adminProcessWithdrawal);

export default router;
