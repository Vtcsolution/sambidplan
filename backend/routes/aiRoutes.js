// backend/routes/aiRoutes.js
import express from 'express';
import {
  summarizeOpportunity,
  analyzeBid,
  generateFullProposalAI,
  askQuestion,
  analyzeCompetition,
  assessRisk
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All AI routes require authentication
router.use(protect);

// AI feature routes
router.post('/summarize/:opportunityId', summarizeOpportunity);
router.post('/bid-analysis/:opportunityId', analyzeBid);
router.post('/full-proposal/:opportunityId', generateFullProposalAI);
router.post('/ask/:opportunityId', askQuestion);
router.post('/competitive/:opportunityId', analyzeCompetition);
router.post('/risk/:opportunityId', assessRisk);

export default router;