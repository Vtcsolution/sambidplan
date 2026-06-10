// backend/routes/aiRoutes.js
import express from 'express';
import {
  summarizeOpportunity, analyzeBid, generateFullProposalAI,
  askQuestion, analyzeCompetition, assessRisk,
  generateCapabilityStatementAI, analyzeRFP, rfpUploadMiddleware,
  goNoGoWorkflow, marketResearch, getIncumbentIntelligence,
  sourcesSought, analyzeAttachment,
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireAICredits } from '../middleware/aiCreditMiddleware.js';

const router = express.Router();
router.use(protect);

router.post('/summarize/:opportunityId',   requireAICredits('summarize'),            summarizeOpportunity);
router.post('/bid-analysis/:opportunityId',requireAICredits('bid_analysis'),         analyzeBid);
router.post('/full-proposal/:opportunityId',requireAICredits('full_proposal'),       generateFullProposalAI);
router.post('/ask/:opportunityId',         requireAICredits('ask_question'),         askQuestion);
router.post('/competitive/:opportunityId', requireAICredits('competitive_analysis'), analyzeCompetition);
router.post('/risk/:opportunityId',        requireAICredits('risk_assessment'),      assessRisk);
router.post('/capability-statement',       requireAICredits('capability_statement'), generateCapabilityStatementAI);
router.post('/analyze-rfp',                rfpUploadMiddleware, requireAICredits('rfp_analyzer'), analyzeRFP);
router.post('/go-no-go',                   requireAICredits('go_no_go'),             goNoGoWorkflow);
router.post('/market-research',            requireAICredits('market_research'),      marketResearch);
router.get('/incumbent/:opportunityId',    requireAICredits('incumbent'),            getIncumbentIntelligence);
router.post('/sources-sought',             requireAICredits('sources_sought'),       sourcesSought);
router.post('/analyze-attachment',         requireAICredits('analyze_attachment'),   analyzeAttachment);

export default router;
