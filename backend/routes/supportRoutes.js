import express from 'express';
import {
  getSupportStats,
  requestSupportWithdrawal,
  adminGetAllSupportStats,
  adminGetSupportWithdrawals,
  adminProcessWithdrawal,
} from '../controllers/supportController.js';
import { protectAdmin, superAdminOnly } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

// Support member routes (any admin/support can access own stats)
router.get('/stats',    protectAdmin, getSupportStats);
router.post('/withdraw', protectAdmin, requestSupportWithdrawal);

// Admin-only: view all support member activities
router.get('/admin/all',             protectAdmin, superAdminOnly, adminGetAllSupportStats);
router.get('/admin/withdrawals',     protectAdmin, superAdminOnly, adminGetSupportWithdrawals);
router.put('/admin/withdrawals/:id', protectAdmin, superAdminOnly, adminProcessWithdrawal);

export default router;
