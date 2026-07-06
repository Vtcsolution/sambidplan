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
  deepAnalyzeWithDocuments,
} from '../services/geminiService.js';
import { buildCompanyProfile } from '../services/companyIntelService.js';
import multer from 'multer';
import axios from 'axios';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const pdfParse = _require('pdf-parse/lib/pdf-parse');

// In-memory storage for RFP uploads (parsed immediately, not saved to disk)
const rfpUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
export const rfpUploadMiddleware = rfpUpload.single('rfp');

// ── Shared PDF fetcher — used by ALL AI features that need document content ───
// Checks DB cache first (24h TTL). On cache miss, fetches from SAM.gov and
// saves the result so every subsequent call uses the cache — no repeated hits.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const fetchOpportunityDocuments = async (resourceLinks, opportunityId = null) => {
  const samApiKey = process.env.SAM_API_KEY;
  const links = (resourceLinks || []).filter(r => r.url);

  // ── Check DB cache ───────────────────────────────────────────────────────────
  if (opportunityId) {
    try {
      const cached = await Opportunity.findById(opportunityId).select('docCache').lean();
      if (
        cached?.docCache?.text &&
        cached.docCache.docsRead > 0 &&
        cached.docCache.fetchedAt &&
        Date.now() - new Date(cached.docCache.fetchedAt).getTime() < CACHE_TTL_MS
      ) {
        console.log(`📦 PDF cache hit for ${opportunityId} (${cached.docCache.docsRead}/${cached.docCache.totalDocs} docs)`);
        return {
          combinedText: cached.docCache.text,
          fetchedCount: cached.docCache.docsRead,
          totalDocs: cached.docCache.totalDocs,
          fromCache: true,
        };
      }
    } catch { /* cache read failure is non-fatal — fall through to live fetch */ }
  }

  if (!links.length) return { combinedText: '', fetchedCount: 0, totalDocs: 0 };

  // ── Live fetch from SAM.gov ──────────────────────────────────────────────────
  const fetchOne = async (link, idx) => {
    try {
      let fetchUrl = link.url;
      if (samApiKey && fetchUrl.includes('sam.gov') && !fetchUrl.includes('api_key=')) {
        fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + `api_key=${samApiKey}`;
      }

      const fileRes = await axios.get(fetchUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60s per file — large SAM.gov PDFs (5MB+) need more time
        maxRedirects: 5,
        headers: {
          Accept: 'application/pdf,application/octet-stream,*/*',
          'User-Agent': 'Mozilla/5.0 (compatible; FedNotify/1.0)',
        },
      });

      const contentType = fileRes.headers['content-type'] || '';
      const isBinary = contentType.includes('pdf') || contentType.includes('octet-stream')
        || fetchUrl.toLowerCase().includes('.pdf')
        || link.name?.toLowerCase().endsWith('.pdf');

      const parsePdf = (buf) => Promise.race([
        pdfParse(buf),
        new Promise((_, rej) => setTimeout(() => rej(new Error('pdf-parse timeout')), 25000)), // 25s for large PDFs
      ]);

      let text;
      if (isBinary) {
        const parsed = await parsePdf(Buffer.from(fileRes.data));
        text = parsed.text;
      } else if (contentType.includes('text') || contentType.includes('html') || contentType.includes('json')) {
        text = Buffer.from(fileRes.data).toString('utf8').replace(/<[^>]+>/g, ' ').trim();
      } else {
        try {
          const parsed = await parsePdf(Buffer.from(fileRes.data));
          text = parsed.text;
        } catch {
          text = Buffer.from(fileRes.data).toString('utf8');
        }
      }

      const clean = text?.replace(/\s{3,}/g, '\n').trim();
      if (!clean || clean.length < 80) return null;

      const label = link.name && link.name.toLowerCase() !== 'download' ? link.name : `Document ${idx + 1}`;
      return `\n${'─'.repeat(60)}\nFILE ${idx + 1}: ${label}\n${'─'.repeat(60)}\n${clean}`;
    } catch {
      return null;
    }
  };

  const results = await Promise.race([
    Promise.all(links.map((link, i) => fetchOne(link, i))),
    new Promise(r => setTimeout(() => r(new Array(links.length).fill(null)), 180000)), // 3-min cap for all files
  ]);

  const successful = results.filter(Boolean);
  const combinedText = successful.join('\n\n');
  const fetchedCount = successful.length;

  // ── Save to DB cache if we read anything ────────────────────────────────────
  if (opportunityId && fetchedCount > 0) {
    Opportunity.findByIdAndUpdate(opportunityId, {
      docCache: {
        text: combinedText,
        fetchedAt: new Date(),
        docsRead: fetchedCount,
        totalDocs: links.length,
      },
    }).catch(() => {}); // fire-and-forget, non-fatal
  }

  return { combinedText, fetchedCount, totalDocs: links.length };
};

// Fetch real SOW text when description is a SAM.gov API URL, save to DB for future calls
const resolveDescription = async (opp) => {
  const desc = opp.description || '';
  if (!desc.startsWith('https://api.sam.gov')) return desc;

  const samApiKey = process.env.SAM_API_KEY;
  if (!samApiKey) return '';

  try {
    const url = desc.includes('api_key=') ? desc : `${desc}${desc.includes('?') ? '&' : '?'}api_key=${samApiKey}`;
    const r = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FedNotify/1.0)' },
    });
    const text = String(r.data || '').replace(/<[^>]+>/g, ' ').replace(/\s{3,}/g, '\n').trim();
    if (text.length > 100) {
      Opportunity.findByIdAndUpdate(opp._id, { description: text }).catch(() => {});
      return text;
    }
  } catch (e) {
    console.warn('resolveDescription fetch failed:', e.message);
  }
  return '';
};

// Async version of formatOpportunityContext — resolves description URL first
const buildOpportunityContext = async (opp) => {
  const resolved = await resolveDescription(opp);
  const oppWithDesc = resolved ? { ...opp, description: resolved } : opp;
  return formatOpportunityContext(oppWithDesc);
};

const checkProPlan = (user) => {
  if (!['pro', 'enterprise'].includes(user.plan)) {
    throw new Error('Pro plan required for AI features. Please upgrade.');
  }
};

// Translate raw AI API errors into user-friendly messages
const aiErrorMessage = (error) => {
  const msg = error.message || '';
  if (msg.includes('credit balance is too low') || msg.includes('insufficient_quota') || msg.includes('exceeded your current quota'))
    return 'AI service quota exhausted. Please contact the administrator to add OpenAI API credits (platform.openai.com → Billing).';
  if (msg.includes('Incorrect API key') || msg.includes('invalid_api_key'))
    return 'AI service configuration error — invalid API key. Please contact the administrator.';
  if (msg.includes('OPENAI_API_KEY not set'))
    return 'AI service is not configured. The administrator needs to add the OpenAI API key to the server .env file.';
  if (msg.includes('rate limit') || msg.includes('429'))
    return 'AI service rate limit reached. Please wait a moment and try again.';
  if (msg.includes('timeout') || msg.includes('timed out'))
    return 'AI analysis timed out (document too large). Please try again.';
  if (msg.includes('Pro plan'))
    return msg;
  return 'AI service temporarily unavailable. Please try again.';
};

// ── Fetch real competitive intelligence from USASpending ─────────────────────
const fetchCompetitiveIntel = async (opportunity) => {
  try {
    const naicsCode = opportunity.naicsCode;
    if (!naicsCode || naicsCode === '000000') return { awards: [], summary: 'No NAICS code available.' };

    const threeYearsAgo = new Date(Date.now() - 3 * 365 * 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          award_type_codes: ['A', 'B', 'C', 'D'],
          naics_codes: [naicsCode],
          time_period: [{ start_date: threeYearsAgo, end_date: today }],
        },
        fields: ['Award ID', 'Description', 'Award Amount', 'Awarding Agency', 'Recipient Name', 'Start Date', 'End Date', 'naics_code', 'Place of Performance State Code', 'Place of Performance City Name'],
        page: 1, limit: 25, sort: 'Award Amount', order: 'desc',
      }),
    });

    if (!response.ok) return { awards: [], summary: 'USASpending API unavailable.' };
    const data = await response.json();

    const awards = (data.results || []).map(a => ({
      recipient:  a['Recipient Name'] || 'Unknown',
      amount:     a['Award Amount'] || 0,
      agency:     a['Awarding Agency'] || '',
      startDate:  a['Start Date'] || '',
      endDate:    a['End Date'] || '',
      description: a['Description'] || '',
      location:   [a['Place of Performance City Name'], a['Place of Performance State Code']].filter(Boolean).join(', '),
    }));

    // Aggregate: top winners by total award value
    const winnerMap = {};
    awards.forEach(a => {
      if (!winnerMap[a.recipient]) winnerMap[a.recipient] = { count: 0, totalValue: 0, agencies: new Set() };
      winnerMap[a.recipient].count++;
      winnerMap[a.recipient].totalValue += a.amount;
      if (a.agency) winnerMap[a.recipient].agencies.add(a.agency);
    });

    const topWinners = Object.entries(winnerMap)
      .map(([name, d]) => ({ name, contracts: d.count, totalValue: d.totalValue, agencies: [...d.agencies] }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    return { awards, topWinners, totalAwards: data.page_metadata?.total || awards.length };
  } catch (err) {
    console.error('fetchCompetitiveIntel error:', err.message);
    return { awards: [], topWinners: [], totalAwards: 0 };
  }
};

// Format opportunity's full data for AI prompts
const formatOpportunityContext = (opp) => {
  const lines = [];
  lines.push(`Title: ${opp.title}`);
  lines.push(`Solicitation #: ${opp.sourceId || 'N/A'}`);
  lines.push(`Agency: ${opp.agency}`);
  if (opp.department) lines.push(`Department: ${opp.department}`);
  if (opp.subTier) lines.push(`Sub-Tier: ${opp.subTier}`);
  if (opp.majorCommand) lines.push(`Major Command: ${opp.majorCommand}`);
  if (opp.subCommand1) lines.push(`Sub Command 1: ${opp.subCommand1}`);
  if (opp.subCommand2) lines.push(`Sub Command 2: ${opp.subCommand2}`);
  if (opp.subCommand3) lines.push(`Sub Command 3: ${opp.subCommand3}`);
  if (opp.office) lines.push(`Contracting Office: ${opp.office}`);
  if (opp.relatedNotice) lines.push(`Related Notice: ${opp.relatedNotice}`);
  if (opp.archiveType) lines.push(`Inactive Policy: ${opp.archiveType}`);
  if (opp.noticeType) lines.push(`Notice Type: ${opp.noticeType}`);
  lines.push(`NAICS Code: ${opp.naicsCode}${opp.naicsDescription ? ' — ' + opp.naicsDescription : ''}`);
  if (opp.pscCode) lines.push(`PSC Code: ${opp.pscCode}${opp.pscDescription ? ' — ' + opp.pscDescription : ''}`);
  lines.push(`Estimated/Award Value: $${opp.estimatedValue?.toLocaleString() || 'Not specified'}`);
  lines.push(`Set-Aside: ${opp.setAside || 'Full and Open Competition'}`);
  lines.push(`Posted Date: ${opp.postedDate ? new Date(opp.postedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}`);
  lines.push(`Response Due Date: ${opp.dueDate ? new Date(opp.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}`);
  if (opp.modifiedDate) lines.push(`Last Modified: ${new Date(opp.modifiedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  if (opp.archiveDate) lines.push(`Archive Date: ${new Date(opp.archiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  if (opp.performancePeriod?.startDate) lines.push(`Performance Start: ${new Date(opp.performancePeriod.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  if (opp.performancePeriod?.endDate) lines.push(`Performance End: ${new Date(opp.performancePeriod.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);

  const pop = opp.placeOfPerformance;
  if (pop?.city || pop?.state) lines.push(`Place of Performance: ${[pop.city, pop.state, pop.zipCode, pop.country].filter(Boolean).join(', ')}${pop.congressionalDistrict ? ' (CD: ' + pop.congressionalDistrict + ')' : ''}`);

  if (opp.award?.awardee?.name) {
    lines.push(`\nAWARD DETAILS:`);
    lines.push(`  Awardee: ${opp.award.awardee.name}`);
    if (opp.award.awardee.uei) lines.push(`  UEI: ${opp.award.awardee.uei}`);
    if (opp.award.awardee.cageCode) lines.push(`  CAGE Code: ${opp.award.awardee.cageCode}`);
    if (opp.award.date) lines.push(`  Award Date: ${new Date(opp.award.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    if (opp.award.amount) lines.push(`  Award Amount: $${opp.award.amount.toLocaleString()}`);
    const loc = opp.award.awardee.location;
    if (loc?.city) lines.push(`  Awardee Location: ${[loc.streetAddress, loc.city, loc.state, loc.zipCode, loc.country].filter(Boolean).join(', ')}`);
  }

  const contacts = opp.pointOfContacts?.length ? opp.pointOfContacts : (opp.contactInfo?.name ? [opp.contactInfo] : []);
  if (contacts.length) {
    lines.push(`\nPOINT OF CONTACT:`);
    contacts.forEach(c => {
      lines.push(`  ${c.fullName || c.name || 'N/A'}${c.title ? ' (' + c.title + ')' : ''} — ${c.email || ''} ${c.phone || ''}`);
    });
  }

  const desc = opp.description || '';
  const descText = desc.startsWith('https://api.sam.gov')
    ? '[Description not yet loaded — see attached documents for full scope]'
    : (desc || 'No description available');
  lines.push(`\nFULL DESCRIPTION / STATEMENT OF WORK:\n${descText.substring(0, 8000)}`);
  return lines.join('\n');
};

// Format competitive intel for AI prompts
const formatCompetitiveContext = (intel) => {
  if (!intel.awards?.length) return 'No historical award data available from USASpending for this NAICS code.';

  const lines = [];
  lines.push(`HISTORICAL AWARD DATA FROM USASPENDING.GOV (Last 3 Years, Same NAICS Code)`);
  lines.push(`Total Awards Found: ${intel.totalAwards}`);
  lines.push('');

  if (intel.topWinners?.length) {
    lines.push('TOP WINNING COMPANIES (by total award value):');
    intel.topWinners.forEach((w, i) => {
      lines.push(`  ${i + 1}. ${w.name} — ${w.contracts} contract(s), $${w.totalValue.toLocaleString()} total — Agencies: ${w.agencies.join(', ')}`);
    });
    lines.push('');
  }

  lines.push('RECENT INDIVIDUAL AWARDS:');
  intel.awards.slice(0, 15).forEach((a, i) => {
    lines.push(`  ${i + 1}. ${a.recipient} — $${a.amount.toLocaleString()} — ${a.agency} — ${a.startDate || 'N/A'} to ${a.endDate || 'N/A'}${a.location ? ' — ' + a.location : ''}`);
    if (a.description) lines.push(`     Desc: ${a.description.substring(0, 150)}`);
  });

  return lines.join('\n');
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
        const parsed = await Promise.race([
          pdfParse(req.file.buffer),
          new Promise((_, rej) => setTimeout(() => rej(new Error('pdf-parse timeout')), 15000)),
        ]);
        rfpText = parsed.text;
      } else {
        rfpText = req.file.buffer.toString('utf8');
      }
    }

    if (!rfpText || rfpText.trim().length < 100) {
      return res.status(400).json({ success: false, message: 'Please provide RFP text (minimum 100 characters).' });
    }

    const trimmed = rfpText.length > 80000 ? rfpText.slice(0, 80000) + '\n\n[Document truncated at 80,000 characters]' : rfpText;

    // Fetch company profile for personalized fit assessment (non-fatal)
    let companyProfileText = '';
    try {
      const cp = await buildCompanyProfile(req.user);
      companyProfileText = cp.profileText || '';
    } catch { /* non-fatal */ }

    const analysis = await analyzeRFPDocument(trimmed, req.user.naicsCodes?.join(', '), companyProfileText);
    res.json({ success: true, data: { analysis } });
  } catch (error) {
    const status = error.message?.includes('Pro plan') ? 403 : 500;
    console.error('RFP analysis error:', error.message);
    res.status(status).json({ success: false, message: aiErrorMessage(error) });
  }
};

// @desc    AI: Go/No-Go workflow — fetches PDFs + real competitor data + company profile
// @route   POST /api/ai/go-no-go
export const goNoGoWorkflow = async (req, res) => {
  try {
    checkProPlan(req.user);
    const { opportunityId, teamCapacity, notes } = req.body;

    let oppContext = '';
    let compContext = '';
    let companyProfileText = '';
    let opportunity = null;
    let combinedDocText = '';
    let fetchedCount = 0;
    let totalDocs = 0;

    if (opportunityId) {
      opportunity = await Opportunity.findById(opportunityId).lean();
      if (!opportunity) return res.status(404).json({ success: false, message: 'Opportunity not found.' });

      // Step 1: Resolve description URL → real SOW text (same as deep analysis)
      const resolvedDesc = await resolveDescription(opportunity);
      if (resolvedDesc) opportunity.description = resolvedDesc;

      // Step 2: Fetch PDFs using the shared fetcher (with DB cache)
      const docResult = await fetchOpportunityDocuments(opportunity.resourceLinks, opportunity._id.toString());
      fetchedCount = docResult.fetchedCount;
      totalDocs = docResult.totalDocs;
      combinedDocText = docResult.combinedText;
      console.log(`🔍 Go/No-Go: ${fetchedCount}/${totalDocs} docs read for "${opportunity.title?.substring(0, 50)}"${docResult.fromCache ? ' [cache]' : ''}`);

      // Step 3: Fetch competitive intel + company profile in parallel
      const [oCtx, intel, cp] = await Promise.all([
        Promise.resolve(formatOpportunityContext(opportunity)),
        fetchCompetitiveIntel(opportunity),
        buildCompanyProfile(req.user),
      ]);

      oppContext = oCtx;
      compContext = formatCompetitiveContext(intel);
      companyProfileText = cp.profileText;

      // Always include SOW text as extra context — even when PDFs exist (description has unique info)
      const descForDocs = resolvedDesc || (opportunity.description && !opportunity.description.startsWith('https://') ? opportunity.description : '');
      if (descForDocs && descForDocs.length > 100) {
        const descBlock = `${'─'.repeat(60)}\nSAM.GOV FULL DESCRIPTION / SOW\n${'─'.repeat(60)}\n${descForDocs}`;
        combinedDocText = combinedDocText ? `${descBlock}\n\n${combinedDocText}` : descBlock;
      }
    }

    const result = await generateGoNoGoAnalysis({
      opportunity,
      oppContext,
      compContext,
      companyProfile: companyProfileText,
      teamCapacity: teamCapacity || 'Fully Available',
      notes: notes || '',
      userNaics: req.user.naicsCodes,
      businessName: req.user.businessName,
      docsText: combinedDocText,
      docCount: fetchedCount,
    });

    res.json({
      success: true,
      data: {
        analysis: result,
        docsAnalyzed: fetchedCount,
        totalDocs,
      },
    });
  } catch (error) {
    const status = error.message?.includes('Pro plan') ? 403 : 500;
    console.error('Go/No-Go error:', error.message);
    res.status(status).json({ success: false, message: aiErrorMessage(error) });
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

    let companyProfileText = '';
    try {
      const cp = await buildCompanyProfile(req.user);
      companyProfileText = cp.profileText || '';
    } catch { /* non-fatal */ }

    const report = await generateMarketResearchReport({
      naicsCodes:     req.user.naicsCodes,
      businessName:   req.user.businessName,
      companyProfile: companyProfileText,
    });
    res.json({ success: true, data: { report } });
  } catch (error) {
    console.error('Market research error:', error.message);
    res.status(500).json({ success: false, message: aiErrorMessage(error) });
  }
};

// @desc    AI: Generate Capability Statement
// @route   POST /api/ai/capability-statement
export const generateCapabilityStatementAI = async (req, res) => {
  try {
    checkProPlan(req.user);
    const user = req.user;
    const { certifications, coreCompetencies, pastPerformance, differentiators, targetAgency, contactInfo } = req.body;

    // Fetch full company profile (UEI, CAGE, SAM data, past performance, USASpending awards)
    let companyProfileText = '';
    try {
      const cp = await buildCompanyProfile(user);
      companyProfileText = cp.profileText || '';
    } catch { /* non-fatal */ }

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
      companyProfile:   companyProfileText,
    });

    res.json({ success: true, data: { statement } });
  } catch (error) {
    const status = error.message?.includes('Pro plan') ? 403 : 500;
    console.error('Capability statement error:', error.message);
    res.status(status).json({ success: false, message: aiErrorMessage(error) });
  }
};

// @desc    AI: Summarize RFP
// @route   POST /api/ai/summarize/:opportunityId
export const summarizeOpportunity = async (req, res) => {
  try {
    checkProPlan(req.user);

    const opportunity = await Opportunity.findById(req.params.opportunityId).lean();
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const resolvedDesc = await resolveDescription(opportunity);
    if (resolvedDesc) opportunity.description = resolvedDesc;

    const [oppContext, companyProfile, docResult] = await Promise.all([
      Promise.resolve(formatOpportunityContext(opportunity)),
      buildCompanyProfile(req.user).catch(() => ({ profileText: '' })),
      fetchOpportunityDocuments(opportunity.resourceLinks, opportunity._id.toString()),
    ]);

    // Merge description + PDFs so summarizer has full text
    let fullText = oppContext;
    const descText = resolvedDesc || (opportunity.description && !opportunity.description.startsWith('https://') ? opportunity.description : '');
    if (descText && descText.length > 100 && docResult.combinedText) {
      fullText += `\n\n${'─'.repeat(60)}\nATTACHED DOCUMENTS (${docResult.fetchedCount} files)\n${'─'.repeat(60)}\n${docResult.combinedText.substring(0, 40000)}`;
    }

    const summary = await summarizeRFP(opportunity, fullText, companyProfile.profileText);
    res.json({ success: true, data: { summary, docsAnalyzed: docResult.fetchedCount } });
  } catch (error) {
    const status = error.message?.includes('Pro plan') ? 403 : 500;
    console.error('Summarize error:', error.message);
    res.status(status).json({ success: false, message: aiErrorMessage(error) });
  }
};

// @desc    AI: Bid/No-Bid Analysis
// @route   POST /api/ai/bid-analysis/:opportunityId
export const analyzeBid = async (req, res) => {
  try {
    checkProPlan(req.user);

    const opportunity = await Opportunity.findById(req.params.opportunityId).lean();
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const resolvedDesc = await resolveDescription(opportunity);
    if (resolvedDesc) opportunity.description = resolvedDesc;

    const [oppContext, intel, companyProfile, docResult] = await Promise.all([
      Promise.resolve(formatOpportunityContext(opportunity)),
      fetchCompetitiveIntel(opportunity),
      buildCompanyProfile(req.user).catch(() => ({ profileText: '' })),
      fetchOpportunityDocuments(opportunity.resourceLinks, opportunity._id.toString()),
    ]);

    // Merge PDFs into opportunity context so bid analysis reads the full SOW
    let fullOppContext = oppContext;
    if (docResult.combinedText) {
      fullOppContext += `\n\n${'─'.repeat(60)}\nATTACHED SOLICITATION DOCUMENTS (${docResult.fetchedCount} files)\n${'─'.repeat(60)}\n${docResult.combinedText.substring(0, 50000)}`;
    }

    const compContext = formatCompetitiveContext(intel);
    const analysis = await bidNoBidAnalysis(opportunity, req.user, fullOppContext, compContext, companyProfile.profileText);

    res.json({ success: true, data: { analysis, docsAnalyzed: docResult.fetchedCount } });
  } catch (error) {
    const status = error.message?.includes('Pro plan') ? 403 : 500;
    console.error('Bid analysis error:', error.message);
    res.status(status).json({ success: false, message: aiErrorMessage(error) });
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

    // Step 1: Resolve description URL → real SOW text
    const resolvedDesc = await resolveDescription(opportunity);
    if (resolvedDesc) opportunity.description = resolvedDesc;

    // Step 2: Fetch all attached RFP PDFs (SOW, PWS, amendments) — same as Go/No-Go
    const docResult = await fetchOpportunityDocuments(opportunity.resourceLinks, opportunity._id.toString());
    console.log(`📄 Proposal builder: ${docResult.fetchedCount}/${docResult.totalDocs} docs fetched${docResult.fromCache ? ' [cache]' : ''}`);

    // Step 3: Build all context in parallel
    const [oppContext, intel, companyProfile] = await Promise.all([
      Promise.resolve(formatOpportunityContext(opportunity)),
      fetchCompetitiveIntel(opportunity),
      buildCompanyProfile(req.user),
    ]);

    // Step 4: Merge SAM.gov description into document text so AI has both
    const descText = resolvedDesc || (opportunity.description && !opportunity.description.startsWith('https://') ? opportunity.description : '');
    let docsText = docResult.combinedText || '';
    if (descText && descText.length > 100) {
      const descBlock = `${'─'.repeat(60)}\nSAM.GOV FULL DESCRIPTION / SOW\n${'─'.repeat(60)}\n${descText}`;
      docsText = docsText ? `${descBlock}\n\n${docsText}` : descBlock;
    }

    const compContext = formatCompetitiveContext(intel);
    const proposal = await generateFullProposal(
      opportunity,
      req.user,
      oppContext,
      compContext,
      companyProfile.profileText,
      docsText,
      docResult.fetchedCount,
    );

    res.json({
      success: true,
      data: {
        proposal,
        docsAnalyzed: docResult.fetchedCount,
        totalDocs: docResult.totalDocs,
      },
    });
  } catch (error) {
    const status = error.message?.includes('Pro plan') ? 403 : 500;
    console.error('Proposal generation error:', error.message);
    res.status(status).json({ success: false, message: aiErrorMessage(error) });
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

    const opportunity = await Opportunity.findById(req.params.opportunityId).lean();
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    // Resolve description + fetch cached PDFs + company profile in parallel
    const [resolvedDesc, docResult, companyProfile] = await Promise.all([
      resolveDescription(opportunity),
      fetchOpportunityDocuments(opportunity.resourceLinks, opportunity._id.toString()),
      buildCompanyProfile(req.user).catch(() => ({ profileText: '' })),
    ]);
    if (resolvedDesc) opportunity.description = resolvedDesc;

    const oppContext = formatOpportunityContext(opportunity);
    const answer = await answerRFPQuestion(
      opportunity, question, oppContext,
      companyProfile.profileText || '',
      docResult.combinedText || '',
    );

    res.json({ success: true, data: { question, answer } });
  } catch (error) {
    const status = error.message?.includes('Pro plan') ? 403 : 500;
    console.error('Q&A error:', error.message);
    res.status(status).json({ success: false, message: aiErrorMessage(error) });
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

    const [oppContext, intel, companyProfile] = await Promise.all([
      buildOpportunityContext(opportunity),
      fetchCompetitiveIntel(opportunity),
      buildCompanyProfile(req.user),
    ]);
    const compContext = formatCompetitiveContext(intel);
    const analysis = await competitiveAnalysis(opportunity, req.user, oppContext, compContext, companyProfile.profileText);

    res.json({ success: true, data: { analysis } });
  } catch (error) {
    const status = error.message?.includes('Pro plan') ? 403 : 500;
    console.error('Competitive analysis error:', error.message);
    res.status(status).json({ success: false, message: aiErrorMessage(error) });
  }
};

// @desc    AI: Risk Assessment
// @route   POST /api/ai/risk/:opportunityId
export const assessRisk = async (req, res) => {
  try {
    checkProPlan(req.user);

    const opportunity = await Opportunity.findById(req.params.opportunityId).lean();
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const resolvedDesc = await resolveDescription(opportunity);
    if (resolvedDesc) opportunity.description = resolvedDesc;

    const [oppContext, intel, companyProfile, docResult] = await Promise.all([
      Promise.resolve(formatOpportunityContext(opportunity)),
      fetchCompetitiveIntel(opportunity),
      buildCompanyProfile(req.user).catch(() => ({ profileText: '' })),
      fetchOpportunityDocuments(opportunity.resourceLinks, opportunity._id.toString()),
    ]);

    // Merge PDFs into opportunity context so risk assessment reads the full SOW
    let fullOppContext = oppContext;
    if (docResult.combinedText) {
      fullOppContext += `\n\n${'─'.repeat(60)}\nATTACHED SOLICITATION DOCUMENTS (${docResult.fetchedCount} files)\n${'─'.repeat(60)}\n${docResult.combinedText.substring(0, 50000)}`;
    }

    const compContext = formatCompetitiveContext(intel);
    const assessment = await riskAssessment(opportunity, fullOppContext, compContext, companyProfile.profileText);

    res.json({ success: true, data: { assessment, docsAnalyzed: docResult.fetchedCount } });
  } catch (error) {
    const status = error.message?.includes('Pro plan') ? 403 : 500;
    console.error('Risk assessment error:', error.message);
    res.status(status).json({ success: false, message: aiErrorMessage(error) });
  }
};

// @desc    AI: Sources Sought / RFI Response Generator
// @route   POST /api/ai/sources-sought
export const sourcesSought = async (req, res) => {
  try {
    checkProPlan(req.user);

    // Fetch full company profile (UEI, CAGE, SAM data, past performance, USASpending awards)
    let companyProfileText = '';
    try {
      const cp = await buildCompanyProfile(req.user);
      companyProfileText = cp.profileText || '';
    } catch { /* non-fatal */ }

    const data = {
      ...req.body,
      businessName:     req.user.businessName,
      businessType:     req.user.businessType,
      naicsCodes:       req.user.naicsCodes,
      certifications:   req.user.certifications?.map(c => c.name || c).join(', '),
      companyProfile:   companyProfileText,
    };
    const response = await generateSourcesSoughtResponse(data);
    res.json({ success: true, data: { response } });
  } catch (error) {
    const status = error.message?.includes('Pro plan') ? 403 : 500;
    console.error('Sources Sought error:', error.message);
    res.status(status).json({ success: false, message: aiErrorMessage(error) });
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
      const parsed = await Promise.race([
        pdfParse(Buffer.from(fileRes.data)),
        new Promise((_, rej) => setTimeout(() => rej(new Error('pdf-parse timeout')), 10000)),
      ]);
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

// @desc    Deep multi-document AI analysis — fetches ALL SAM.gov attachments + full opportunity
//          context, combines into one analysis. Far more accurate than single-doc or metadata-only.
// @route   POST /api/ai/deep-summarize/:opportunityId
export const deepSummarize = async (req, res) => {
  try {
    checkProPlan(req.user);
    const opp = await Opportunity.findById(req.params.opportunityId).lean();
    if (!opp) return res.status(404).json({ success: false, message: 'Opportunity not found.' });

    // Resolve description URL → real SOW text (uses 1 SAM.gov API call, saves to DB)
    const resolvedDesc = await resolveDescription(opp);
    if (resolvedDesc) opp.description = resolvedDesc;

    // Build full opportunity context (includes title, agency, description/SOW, contacts, dates, etc.)
    const oppContext = formatOpportunityContext(opp);

    // Fetch all attached PDFs using the shared fetcher (with DB cache)
    const { combinedText: combinedDocText, fetchedCount, totalDocs, fromCache } = await fetchOpportunityDocuments(opp.resourceLinks, opp._id.toString());
    console.log(`🔍 Deep-summarize: ${fetchedCount}/${totalDocs} docs read for "${opp.title?.substring(0, 50)}"${fromCache ? ' [cache]' : ''}`);

    // Always include full SOW text as extra context when available — PDFs may have drawings only
    const extraDesc = resolvedDesc && resolvedDesc.length > 100
      ? `\n\n${'─'.repeat(60)}\nSAM.GOV FULL DESCRIPTION / SOW\n${'─'.repeat(60)}\n${resolvedDesc}`
      : (!resolvedDesc && opp.description && opp.description.length > 500 && !opp.description.startsWith('https://'))
        ? `\n\n${'─'.repeat(60)}\nSAM.GOV FULL DESCRIPTION / SOW\n${'─'.repeat(60)}\n${opp.description}`
        : '';

    // Fetch company profile + competitive intel in parallel (both non-fatal)
    const [companyProfile, intel] = await Promise.all([
      buildCompanyProfile(req.user).catch(() => ({ profileText: '' })),
      fetchCompetitiveIntel(opp).catch(() => ({ awards: [], topWinners: [], totalAwards: 0 })),
    ]);
    const compContext = formatCompetitiveContext(intel);

    const analysis = await deepAnalyzeWithDocuments(
      oppContext + extraDesc,
      combinedDocText,
      req.user.naicsCodes?.join(', '),
      fetchedCount,
      companyProfile.profileText || '',
      compContext,
    );

    const message = fetchedCount === 0
      ? `SAM.gov PDFs require direct login to download. Analysis is based on the full opportunity description and all metadata stored in our database.`
      : fetchedCount < totalDocs
        ? `Read ${fetchedCount} of ${totalDocs} documents. ${totalDocs - fetchedCount} could not be fetched (may require SAM.gov login).`
        : `Successfully read all ${fetchedCount} solicitation document${fetchedCount !== 1 ? 's' : ''}.`;

    res.json({ success: true, data: { analysis, docsAnalyzed: fetchedCount, totalDocs, message } });
  } catch (error) {
    if (error.message?.includes('Pro plan')) return res.status(403).json({ success: false, message: error.message });
    console.error('Deep-summarize error:', error.message);
    res.status(500).json({ success: false, message: 'AI analysis failed: ' + error.message });
  }
};