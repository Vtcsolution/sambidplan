import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { flexAdmin } from '../middleware/flexAdminMiddleware.js';
import {
  createTopupOrder,
  captureTopupPayment,
  getMyTopupRequests,
  adminListTopupRequests,
  adminApproveTopup,
  adminRejectTopup,
} from '../controllers/creditTopupController.js';

const router = express.Router();

// User routes
router.post('/create-order', protect, createTopupOrder);
router.post('/capture',      protect, captureTopupPayment);
router.get('/my-requests',   protect, getMyTopupRequests);

// Admin routes
router.get('/admin/list',          flexAdmin, adminListTopupRequests);
router.put('/admin/:id/approve',   flexAdmin, adminApproveTopup);
router.put('/admin/:id/reject',    flexAdmin, adminRejectTopup);

export default router;
