// backend/controllers/aiController.js
import Opportunity from '../models/Opportunity.js';
import User from '../models/User.js';
import {
  summarizeRFP,
  bidNoBidAnalysis,
  generateFullProposal,
  answerRFPQuestion,
  competitiveAnalysis,
  riskAssessment
} from '../services/geminiService.js';

// Check if user has Pro plan
const checkProPlan = (user) => {
  if (user.plan !== 'pro' && user.plan !== 'enterprise') {
    throw new Error('Pro plan required for AI features. Please upgrade to Pro.');
  }
  return true;
};

// @desc    AI: Summarize RFP
// @route   POST /api/ai/summarize/:opportunityId
export const summarizeOpportunity = async (req, res) => {
  try {
    checkProPlan(req.user);
    
    const opportunity = await Opportunity.findById(req.params.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }
    
    const summary = await summarizeRFP(opportunity);
    
    res.json({ 
      success: true, 
      data: { 
        summary,
        aiProvider: 'Google Gemini (Free)'
      } 
    });
  } catch (error) {
    if (error.message.includes('Pro plan')) {
      res.status(403).json({ success: false, message: error.message });
    } else {
      console.error('Summarize error:', error);
      res.status(500).json({ success: false, message: 'AI service temporarily unavailable. Please try again.' });
    }
  }
};

// @desc    AI: Bid/No-Bid Analysis
// @route   POST /api/ai/bid-analysis/:opportunityId
export const analyzeBid = async (req, res) => {
  try {
    checkProPlan(req.user);
    
    const opportunity = await Opportunity.findById(req.params.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }
    
    const analysis = await bidNoBidAnalysis(opportunity, req.user);
    
    res.json({ 
      success: true, 
      data: { 
        analysis,
        aiProvider: 'Google Gemini (Free)'
      } 
    });
  } catch (error) {
    if (error.message.includes('Pro plan')) {
      res.status(403).json({ success: false, message: error.message });
    } else {
      console.error('Bid analysis error:', error);
      res.status(500).json({ success: false, message: 'AI service temporarily unavailable. Please try again.' });
    }
  }
};

// @desc    AI: Generate Full Proposal
// @route   POST /api/ai/full-proposal/:opportunityId
export const generateFullProposalAI = async (req, res) => {
  try {
    checkProPlan(req.user);
    
    const opportunity = await Opportunity.findById(req.params.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }
    
    const proposal = await generateFullProposal(opportunity, req.user);
    
    res.json({ 
      success: true, 
      data: { 
        proposal,
        aiProvider: 'Google Gemini (Free)'
      } 
    });
  } catch (error) {
    if (error.message.includes('Pro plan')) {
      res.status(403).json({ success: false, message: error.message });
    } else {
      console.error('Proposal generation error:', error);
      res.status(500).json({ success: false, message: 'AI service temporarily unavailable. Please try again.' });
    }
  }
};

// @desc    AI: Ask Question about RFP
// @route   POST /api/ai/ask/:opportunityId
export const askQuestion = async (req, res) => {
  try {
    checkProPlan(req.user);
    
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }
    
    const opportunity = await Opportunity.findById(req.params.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }
    
    const answer = await answerRFPQuestion(opportunity, question);
    
    res.json({ 
      success: true, 
      data: { 
        question, 
        answer,
        aiProvider: 'Google Gemini (Free)'
      } 
    });
  } catch (error) {
    if (error.message.includes('Pro plan')) {
      res.status(403).json({ success: false, message: error.message });
    } else {
      console.error('Q&A error:', error);
      res.status(500).json({ success: false, message: 'AI service temporarily unavailable. Please try again.' });
    }
  }
};

// @desc    AI: Competitive Analysis
// @route   POST /api/ai/competitive/:opportunityId
export const analyzeCompetition = async (req, res) => {
  try {
    checkProPlan(req.user);
    
    const opportunity = await Opportunity.findById(req.params.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }
    
    const analysis = await competitiveAnalysis(opportunity, req.user);
    
    res.json({ 
      success: true, 
      data: { 
        analysis,
        aiProvider: 'Google Gemini (Free)'
      } 
    });
  } catch (error) {
    if (error.message.includes('Pro plan')) {
      res.status(403).json({ success: false, message: error.message });
    } else {
      console.error('Competitive analysis error:', error);
      res.status(500).json({ success: false, message: 'AI service temporarily unavailable. Please try again.' });
    }
  }
};

// @desc    AI: Risk Assessment
// @route   POST /api/ai/risk/:opportunityId
export const assessRisk = async (req, res) => {
  try {
    checkProPlan(req.user);
    
    const opportunity = await Opportunity.findById(req.params.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }
    
    const assessment = await riskAssessment(opportunity);
    
    res.json({ 
      success: true, 
      data: { 
        assessment,
        aiProvider: 'Google Gemini (Free)'
      } 
    });
  } catch (error) {
    if (error.message.includes('Pro plan')) {
      res.status(403).json({ success: false, message: error.message });
    } else {
      console.error('Risk assessment error:', error);
      res.status(500).json({ success: false, message: 'AI service temporarily unavailable. Please try again.' });
    }
  }
};