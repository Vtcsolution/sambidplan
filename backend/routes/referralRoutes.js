import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getReferralStats,
  requestWithdrawal,
  applyReferralBalance,
  activateWithBalance,
} from '../controllers/referralController.js';

const router = express.Router();

router.use(protect);

router.get('/stats',                getReferralStats);
router.post('/withdraw',            requestWithdrawal);
router.post('/apply-balance',       applyReferralBalance);
router.post('/activate-with-balance', activateWithBalance);

export default router;
