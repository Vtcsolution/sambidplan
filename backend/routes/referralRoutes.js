import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getReferralStats,
  requestWithdrawal,
  applyReferralBalance,
  activateWithBalance,
  validateCoupon,
} from '../controllers/referralController.js';

const router = express.Router();

// Public — no auth needed to validate a coupon code
router.post('/validate-coupon', validateCoupon);
router.get('/validate-coupon',  validateCoupon);

router.use(protect);

router.get('/stats',                  getReferralStats);
router.post('/withdraw',              requestWithdrawal);
router.post('/apply-balance',         applyReferralBalance);
router.post('/activate-with-balance', activateWithBalance);

export default router;
