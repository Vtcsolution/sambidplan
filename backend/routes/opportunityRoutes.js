// backend/routes/opportunityRoutes.js
import express from 'express';
import {
  getOpportunities,
  getOpportunityById,
  refreshOpportunities,
  generateProposal,
  updateUserProfile,
  getUserProfile,
  debugCheckOpportunities,
  getWinningBidsAnalysis,
  refreshUserFeed
} from '../controllers/opportunityController.js';
import { protect, checkPlan, enforcePlanExpiry } from '../middleware/authMiddleware.js';
import { flexAdmin, protectAny } from '../middleware/flexAdminMiddleware.js';
import { checkApiLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Admin-specific opportunity routes (flexAdmin — before protect middleware)
router.post('/refresh', flexAdmin, checkApiLimit, refreshOpportunities);

// All other routes require user authentication (admin token also accepted via protectAny)
router.use(protectAny);
router.use(enforcePlanExpiry);

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// Feed refresh (user-accessible — clears stale feed and refills based on current plan)
router.post('/refresh-my-feed', refreshUserFeed);

// Opportunities routes
router.get('/', getOpportunities);
router.get('/analysis/winning-bids', getWinningBidsAnalysis);
router.get('/:id', getOpportunityById);
router.get('/debug/check', debugCheckOpportunities);


// Proposal generation (Pro plan only)
router.post('/:id/proposal-outline', checkPlan('pro'), generateProposal);

export default router;