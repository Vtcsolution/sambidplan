// backend/controllers/aiController.js
import Opportunity from '../models/Opportunity.js';
import User from '../models/User.js';
import {
  summarizeRFP,
  bidNoBidAnalysis,
  generateFullProposal,
  answerRFPQuestion,
  competitiveAnalysis,
  riskAssessment,
  generateCapabilityStatement,
  analyzeRFPDocument,
  generateGoNoGoAnalysis,
  generateMarketResearchReport,
  generateSourcesSoughtResponse,
} from '../services/geminiService.js';
import multer from 'multer';
import axios from 'axios';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const pdfParse = _require('pdf-parse/lib/pdf-parse');

// In-memory storage for RFP uploads (parsed immediately, not saved to disk)
const rfpUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
export const rfpUploadMiddleware = rfpUpload.single('rfp');

const checkProPlan = (user) => {
  if (!['pro', 'enterprise'].includes(user.plan)) {
    throw new Error('Pro plan required for AI features. Please upgrade.');
  }
};

// @desc    AI: Analyze RFP document (text paste or PDF upload)
// @route   POST /api/ai/analyze-rfp
export const analyzeRFP = async (req, res) => {
  try {
    checkProPlan(req.user);

    let rfpText = req.body.rfpText || '';

    // If a file was uploaded, extract text from it
    if (req.file) {
      const mime = req.file.mimetype;
      if (mime === 'application/pdf' || req.file.originalname?.toLowerCase().endsWith('.pdf')) {
        const parsed = await pdfParse(req.file.buffer);
        rfpText = parsed.text;
      } else {
        // Plain text / doc
        rfpText = req.file.buffer.toString('utf8');
      }
    }

    if (!rfpText || rfpText.trim().length < 100) {
      return res.status(400).json({ success: false, message: 'Please provide RFP text (minimum 100 characters).' });
    }

    // Trim to 80k chars so AI doesn't time out on massive documents
    const trimmed = rfpText.length > 80000 ? rfpText.slice(0, 80000) + '\n\n[Document truncated at 80,000 characters]' : rfpText;

    const analysis = await analyzeRFPDocument(trimmed, req.user.naicsCodes?.join(', '));
    res.json({ success: true, data: { analysis } });
  } catch (error) {
    if (error.message.includes('Pro plan')) return res.status(403).json({ success: false, message: error.message });
    console.error('RFP analysis error:', error);
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
};

// @desc    AI: Go/No-Go workflow
// @route   POST /api/ai/go-no-go
export const goNoGoWorkflow = async (req, res) => {
  try {
    checkProPlan(req.user);
    const { opportunityTitle, agency, naicsCode, setAside, estimatedValue, dueDate, competitorCount, pastPerformanceMatch, teamCapacity, notes } = req.body;
    const result = await generateGoNoGoAnalysis({ opportunityTitle, agency, naicsCode, setAside, estimatedValue, dueDate, competitorCount, pastPerformanceMatch, teamCapacity, notes, userNaics: req.user.naicsCodes, businessName: req.user.businessName });
    res.json({ success: true, data: { analysis: result } });
  } catch (error) {
    if (error.message.includes('Pro plan')) return res.status(403).json({ success: false, message: error.message });
    console.error('Go/No-Go error:', error);
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
};

// @desc    Incumbent & Competitor Intelligence for an opportunity
// @route   GET /api/ai/incumbent/:opportunityId
export const getIncumbentIntelligence = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.opportunityId);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Opportunity not found' });

    if (!['pro', 'enterprise'].includes(req.user.plan)) {
      return res.status(403).json({ success: false, message: 'Pro plan required for Incumbent Intelligence.' });
    }

    const naicsCode = opportunity.naicsCode;
    if (!naicsCode) return res.json({ success: true, data: { awards: [], summary: 'No NAICS code on this opportunity.' } });

    // Fetch recent awards from USAspending for this NAICS + agency
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          award_type_codes: ['A', 'B', 'C', 'D'],
          naics_codes: [naicsCode],
          time_period: [{ start_date: new Date(Date.now() - 3 * 365 * 86400000).toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) }],
          agencies: opportunity.agencyCode ? [{ type: 'awarding', tier: 'toptier', name: opportunity.agency }] : undefined,
        },
        fields: ['Award ID', 'Description', 'Award Amount', 'Awarding Agency', 'Recipient Name', 'Start Date', 'End Date', 'naics_code'],
        page: 1, limit: 10, sort: 'Award Amount', order: 'desc',
      }),
    });

    const data = await response.json();
    const awards = (data.results || []).map(a => ({
      recipient:     a['Recipient Name'],
      amount:        a['Award Amount'],
      agency:        a['Awarding Agency'],
      startDate:     a['Start Date'],
      endDate:       a['End Date'],
      description:   a['Description'],
    }));

    res.json({ success: true, data: { awards, naicsCode, opportunityTitle: opportunity.title } });
  } catch (error) {
    console.error('Incumbent intelligence error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch incumbent data.' });
  }
};

// @desc    AI: Market research report for user's NAICS
// @route   POST /api/ai/market-research
export const marketResearch = async (req, res) => {
  try {
    if (!['enterprise'].includes(req.user.plan)) {
      return res.status(403).json({ success: false, message: 'Enterprise plan required for Market Research reports.' });
    }
    const report = await generateMarketResearchReport({ naicsCodes: req.user.naicsCodes, businessName: req.user.businessName });
    res.json({ success: true, data: { report } });
  } catch (error) {
    console.error('Market research error:', error);
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
};

// @desc    AI: Generate Capability Statement
// @route   POST /api/ai/capability-statement
export const generateCapabilityStatementAI = async (req, res) => {
  try {
    checkProPlan(req.user);
    const user = req.user;
    const { certifications, coreCompetencies, pastPerformance, differentiators, targetAgency, contactInfo } = req.body;

    const statement = await generateCapabilityStatement({
      businessName:     user.businessName || user.name,
      naicsCodes:       user.naicsCodes,
      businessType:     user.businessType,
      certifications,
      coreCompetencies,
      pastPerformance,
      differentiators,
      targetAgency,
      contactInfo,
    });

    res.json({ success: true, data: { statement } });
  } catch (error) {
    if (error.message.includes('Pro plan')) return res.status(403).json({ success: false, message: error.message });
    console.error('Capability statement error:', error);
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
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
        aiProvider: 'OpenAI GPT-4o'
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

// @desc    AI: Sources Sought / RFI Response Generator
// @route   POST /api/ai/sources-sought
export const sourcesSought = async (req, res) => {
  try {
    checkProPlan(req.user);
    const data = {
      ...req.body,
      businessName:     req.user.businessName,
      businessType:     req.user.businessType,
      naicsCodes:       req.user.naicsCodes,
      certifications:   req.user.certifications?.map(c => c.name || c).join(', '),
    };
    const response = await generateSourcesSoughtResponse(data);
    res.json({ success: true, data: { response } });
  } catch (error) {
    if (error.message.includes('Pro plan')) return res.status(403).json({ success: false, message: error.message });
    console.error('Sources Sought error:', error);
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
};

// @desc    Fetch a SAM.gov attachment URL, parse PDF, return text for AI analysis
// @route   POST /api/ai/analyze-attachment
export const analyzeAttachment = async (req, res) => {
  try {
    checkProPlan(req.user);
    const { attachmentUrl } = req.body;
    if (!attachmentUrl) return res.status(400).json({ success: false, message: 'attachmentUrl is required.' });

    // Fetch the file
    const fileRes = await axios.get(attachmentUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { Accept: 'application/pdf,*/*' },
    });

    const contentType = fileRes.headers['content-type'] || '';
    let rfpText;
    if (contentType.includes('pdf') || attachmentUrl.toLowerCase().endsWith('.pdf')) {
      const parsed = await pdfParse(Buffer.from(fileRes.data));
      rfpText = parsed.text;
    } else {
      rfpText = Buffer.from(fileRes.data).toString('utf8');
    }

    if (!rfpText || rfpText.trim().length < 100) {
      return res.status(422).json({ success: false, message: 'Could not extract readable text from this attachment.' });
    }

    const trimmed = rfpText.length > 80000 ? rfpText.slice(0, 80000) + '\n\n[Truncated]' : rfpText;
    const analysis = await analyzeRFPDocument(trimmed, req.user.naicsCodes?.join(', '));
    res.json({ success: true, data: { analysis } });
  } catch (error) {
    if (error.message.includes('Pro plan')) return res.status(403).json({ success: false, message: error.message });
    console.error('Attachment analysis error:', error.message);
    res.status(500).json({ success: false, message: 'Could not fetch or analyze this attachment. It may require SAM.gov login.' });
  }
};