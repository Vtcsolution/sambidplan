import express from 'express';
import {
  getOpportunities,
  getOpportunityById,
  refreshOpportunities,
  generateProposal,
  updateUserProfile,
  getUserProfile,
  getWinningBidsAnalysis
} from '../controllers/opportunityController.js';
import { protect, checkPlan } from '../middleware/authMiddleware.js';
import { checkApiLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Protected routes
router.use(protect);

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// Opportunities routes
router.get('/', getOpportunities);
router.get('/analysis/winning-bids', getWinningBidsAnalysis);
router.get('/:id', getOpportunityById);
router.post('/refresh', protect, checkApiLimit, refreshOpportunities);
router.post('/:id/proposal-outline', checkPlan('pro'), generateProposal);

export default router;