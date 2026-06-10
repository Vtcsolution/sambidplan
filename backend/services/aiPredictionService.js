// backend/services/aiPredictionService.js
//
// Deep AI predictions using OpenAI GPT-4o-mini.
// Signals used per prediction:
//   • User NAICS codes, business type, business name
//   • Opportunity: title, description (full 800 chars), agency, NAICS,
//     set-aside, value, deadline, PSC code
//   • User's saved opportunities (preference signal — what they like)
//   • Federal fiscal year context (budget cycle awareness)
//   • Agency award frequency for user's NAICS (competition signal)
//   • Urgency score based on deadline proximity
//
// Output per opportunity:
//   winProbability, fitScore, confidenceLevel, urgencyScore,
//   recommendation, topReasons, risks, bidStrategy,
//   nextAction, teamingAdvice, uniqueAdvantage
//
// Market insights output:
//   marketOutlook, hotAgencies, trendingSectors, setAsideOpportunity,
//   weeklyAdvice, budgetYearInsight, competitionLevel,
//   bestMonthsToSubmit, avgContractValue, totalOpportunities

import { chat } from './geminiService.js';
import UserOpportunity from '../models/UserOpportunity.js';
import Opportunity from '../models/Opportunity.js';
import SavedOpportunity from '../models/SavedOpportunity.js';

// ─── Robust JSON extractor / repairer ────────────────────────────────────────
// Handles: truncated responses (max_tokens), smart quotes, trailing commas,
// unescaped newlines inside strings — all common GPT output issues.
const repairAndParseJSON = (raw, expectArray = true) => {
  const open  = expectArray ? '[' : '{';
  const close = expectArray ? ']' : '}';

  const start = raw.indexOf(open);
  if (start === -1) throw new Error(`No ${open} found in AI response`);

  // Walk forward tracking bracket depth to find the matching close
  let depth = 0;
  let end   = -1;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === open)  depth++;
    if (ch === close) { depth--; if (depth === 0) { end = i; break; } }
  }

  // Truncated response: strip the dangling last element and close manually
  let block = end !== -1 ? raw.slice(start, end + 1) : raw.slice(start);
  if (end === -1) {
    const lastComma = block.lastIndexOf(',');
    block = (lastComma > 0 ? block.slice(0, lastComma) : block) + close;
  }

  // Fix common AI character issues
  block = block
    .replace(/‘|’/g, "'")  // smart single quotes
    .replace(/“|”/g, '"')  // smart double quotes
    .replace(/—|–/g, '-'); // em/en dashes

  // Remove trailing commas before } or ]
  block = block.replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(block);
  } catch {
    // Fix literal newlines / tabs inside JSON strings as last resort
    const fixed = block.replace(/"(?:[^"\\]|\\.)*"/g, m =>
      m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
    );
    return JSON.parse(fixed);
  }
};

// ─── Cache ────────────────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

const getCached = (id) => {
  const e = cache.get(String(id));
  if (!e || Date.now() > e.expiresAt) { cache.delete(String(id)); return null; }
  return e.data;
};
const setCache = (id, data) =>
  cache.set(String(id), { data, expiresAt: Date.now() + CACHE_TTL_MS });

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Federal fiscal year runs Oct 1 – Sep 30
const getFiscalYearContext = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const fy = month >= 10 ? now.getFullYear() + 1 : now.getFullYear();
  const phase =
    month >= 10 ? 'Q1 (October–December) — new budgets just released, high spending' :
    month <= 3  ? 'Q2 (January–March) — steady mid-year spending' :
    month <= 6  ? 'Q3 (April–June) — agencies accelerating spend' :
                  'Q4 (July–September) — fiscal year-end rush, agencies spending remaining budgets aggressively';
  return `FY${fy} ${phase}`;
};

const urgencyScore = (dueDate) => {
  if (!dueDate) return 3;
  const days = Math.ceil((new Date(dueDate) - Date.now()) / 86400000);
  if (days <= 0)  return 0;
  if (days <= 7)  return 9;
  if (days <= 14) return 7;
  if (days <= 30) return 5;
  if (days <= 60) return 3;
  return 1;
};

const buildUserSummary = (user, savedTitles) =>
  `Company Name: ${user.businessName || user.name || 'Unknown'}
Business Type: ${user.businessType?.replace('_', ' ') || 'Unknown'}
NAICS Codes: ${user.naicsCodes?.join(', ') || 'Not configured'}
Plan: ${user.plan}
Previously Saved (user interests): ${savedTitles.length > 0 ? savedTitles.slice(0, 5).join('; ') : 'None yet'}`;

// Agency posting frequency for competition assessment
const buildCompetitionContext = (allForNaics) => {
  const agencyCount = {};
  allForNaics.forEach(o => {
    if (o.agency) agencyCount[o.agency] = (agencyCount[o.agency] || 0) + 1;
  });
  const sorted = Object.entries(agencyCount).sort((a,b) => b[1]-a[1]);
  const high = sorted.filter(([,c]) => c >= 10).map(([a]) => a).slice(0,3);
  const low  = sorted.filter(([,c]) => c <= 2).map(([a]) => a).slice(0,3);
  return { highVolume: high, lowVolume: low };
};

// ─── Non-AI fallback: basic scoring without OpenAI ───────────────────────────
const buildBasicPredictions = (opportunities, competitionCtx) => {
  return opportunities.map(opp => {
    const days = opp.dueDate ? Math.ceil((new Date(opp.dueDate) - Date.now()) / 86400000) : 60;
    const isLowComp = competitionCtx.lowVolume.includes(opp.agency);
    const isHighComp = competitionCtx.highVolume.includes(opp.agency);
    const hasSetAside = opp.setAside && opp.setAside !== 'None' && opp.setAside !== 'Full and Open';
    const winProb = Math.min(75, Math.max(15,
      30 + (hasSetAside ? 15 : 0) + (isLowComp ? 12 : 0) - (isHighComp ? 10 : 0)
    ));
    return {
      opportunityId:  String(opp._id),
      title:          opp.title,
      agency:         opp.agency,
      naicsCode:      opp.naicsCode,
      setAside:       opp.setAside,
      estimatedValue: opp.estimatedValue,
      dueDate:        opp.dueDate,
      url:            opp.url,
      urgencyScore:   urgencyScore(opp.dueDate),
      winProbability: winProb,
      fitScore:       hasSetAside ? 7 : 6,
      confidenceLevel: 'Medium',
      urgencyLevel:   days <= 3 ? 'Critical' : days <= 7 ? 'High' : days <= 30 ? 'Medium' : 'Low',
      recommendation: winProb >= 50 ? 'GO' : 'CONDITIONAL',
      topReasons:     [
        'NAICS code matches your profile',
        hasSetAside ? `Set-aside: ${opp.setAside}` : 'Open competition — review eligibility',
      ],
      risks:          [isHighComp ? 'High-competition agency — many bidders expected' : 'Verify solicitation requirements before bidding'],
      bidStrategy:    'Review the full solicitation and tailor your technical approach.',
      nextAction:     'Download the solicitation from SAM.gov and check deadline.',
      teamingAdvice:  'Solo bid',
      uniqueAdvantage: 'Your NAICS expertise aligns with this contract scope.',
    };
  });
};

// ─── Core: deep opportunity predictions ──────────────────────────────────────
const predictOpportunities = async (user, opportunities, savedTitles, competitionCtx) => {
  if (!opportunities.length) return [];

  const fyCtx = getFiscalYearContext();

  const oppList = opportunities.map((o, i) => {
    const days = o.dueDate ? Math.ceil((new Date(o.dueDate) - Date.now()) / 86400000) : null;
    return `[${i + 1}]
Title: ${o.title}
Agency: ${o.agency}
NAICS: ${o.naicsCode} | PSC: ${o.pscCode || 'N/A'} | Set-Aside: ${o.setAside || 'Full & Open — anyone can bid'}
Contract Value: ${o.estimatedValue ? '$' + Number(o.estimatedValue).toLocaleString() : 'Not disclosed'}
Deadline: ${o.dueDate ? new Date(o.dueDate).toLocaleDateString() + (days !== null ? ` (${days} days from today)` : '') : 'Open-ended'}
Place of Performance: ${o.placeOfPerformance?.state || 'Not specified'}
Agency Volume: ${competitionCtx.highVolume.includes(o.agency) ? 'HIGH — this agency posts many contracts (competitive)' : competitionCtx.lowVolume.includes(o.agency) ? 'LOW — fewer competitors likely' : 'Moderate'}
Description: ${(o.description || '').substring(0, 800)}`;
  }).join('\n\n─────────────────────────────\n\n');

  const systemPrompt = `You are an expert federal contracting strategist. Analyze contract opportunities for small businesses.
CRITICAL: Return ONLY a valid JSON array. No markdown, no text outside the JSON. Keep all string values under 120 characters. Do not use double quotes inside string values.`;

  const userPrompt = `ANALYZE THESE OPPORTUNITIES FOR THIS CONTRACTOR:

=== CONTRACTOR PROFILE ===
${buildUserSummary(user, savedTitles)}
Fiscal Year Context: ${fyCtx}

=== OPPORTUNITIES ===
${oppList}

Return a JSON array. Each element must have EXACTLY these keys (all strings under 120 chars, no quotes inside strings):
{
  "index": <1-based integer>,
  "winProbability": <0-100 integer — realistic, avg 30% for well-qualified small biz>,
  "fitScore": <1-10 integer>,
  "confidenceLevel": "High" or "Medium" or "Low",
  "urgencyLevel": "Critical" or "High" or "Medium" or "Low",
  "recommendation": "STRONG GO" or "GO" or "CONDITIONAL" or "PASS",
  "topReasons": [<2 short strings, no quotes inside>],
  "risks": [<1-2 short strings, no quotes inside>],
  "bidStrategy": "<one sentence, max 100 chars>",
  "nextAction": "<one sentence, max 100 chars>",
  "teamingAdvice": "Solo bid" or "<one sentence>",
  "uniqueAdvantage": "<one sentence, max 100 chars>"
}

Scoring rules: NAICS exact match raises probability. Set-aside eligibility match raises probability. High-volume agency lowers probability. Q4 FY = more competition.`;

  // Try preferred model, fall back to gpt-4o if mini is unavailable
  let raw;
  try {
    raw = await chat(systemPrompt, userPrompt, 'gpt-4o-mini', 4096);
  } catch (e) {
    if (e.status === 404 || e.message?.includes('model')) {
      raw = await chat(systemPrompt, userPrompt, 'gpt-4o', 4096);
    } else {
      throw e;
    }
  }

  const parsed = repairAndParseJSON(raw, true);

  return parsed.map(p => {
    const opp = opportunities[p.index - 1];
    if (!opp) return null;
    return {
      opportunityId:   String(opp._id),
      title:           opp.title,
      agency:          opp.agency,
      naicsCode:       opp.naicsCode,
      setAside:        opp.setAside,
      estimatedValue:  opp.estimatedValue,
      dueDate:         opp.dueDate,
      url:             opp.url,
      urgencyScore:    urgencyScore(opp.dueDate),
      winProbability:  Math.min(100, Math.max(0, p.winProbability ?? 40)),
      fitScore:        Math.min(10,  Math.max(1,  p.fitScore      ?? 5)),
      confidenceLevel: p.confidenceLevel  || 'Medium',
      urgencyLevel:    p.urgencyLevel     || 'Medium',
      recommendation:  p.recommendation  || 'GO',
      topReasons:      Array.isArray(p.topReasons) ? p.topReasons : [],
      risks:           Array.isArray(p.risks)      ? p.risks      : [],
      bidStrategy:     p.bidStrategy     || '',
      nextAction:      p.nextAction      || '',
      teamingAdvice:   p.teamingAdvice   || 'Solo bid',
      uniqueAdvantage: p.uniqueAdvantage || '',
    };
  }).filter(Boolean);
};

// ─── Fallback: pure-data insights when AI is unavailable ─────────────────────
const buildFallbackInsights = (allForNaics) => {
  const agencyFreq = {};
  allForNaics.forEach(o => { if (o.agency) agencyFreq[o.agency] = (agencyFreq[o.agency] || 0) + 1; });
  const sorted = Object.entries(agencyFreq).sort((a, b) => b[1] - a[1]);
  const avgValue = allForNaics.reduce((s, o) => s + (o.estimatedValue || 0), 0) / (allForNaics.length || 1);
  return {
    marketOutlook: 'Neutral',
    outlookReason: 'Market data loaded — AI narrative unavailable (check OpenAI API key/credits).',
    hotAgencies: sorted.slice(0, 4).map(([a]) => a),
    hiddenGemAgencies: sorted.slice(-2).map(([a]) => a),
    trendingSectors: [],
    setAsideOpportunity: 'Configure AI to get set-aside strategy recommendations.',
    budgetYearInsight: getFiscalYearContext(),
    weeklyAdvice: 'AI analysis is temporarily unavailable. Review the active contracts in your NAICS codes and focus on agencies with the highest posting frequency shown above.',
    competitionLevel: 'Moderate',
    competitionDetail: 'AI competition analysis unavailable.',
    bestMonthsToSubmit: [],
    avgContractValue: Math.round(avgValue),
    totalOpportunities: allForNaics.length,
    topWinningStrategy: 'Enable AI analysis by ensuring a valid OpenAI API key is configured in admin settings.',
  };
};

// ─── Deep market intelligence ─────────────────────────────────────────────────
const generateMarketInsights = async (user, allForNaics, savedTitles) => {
  const agencyFreq   = {};
  const setAsideFreq = {};
  const valueByMonth = {};

  allForNaics.forEach(o => {
    if (o.agency)   agencyFreq[o.agency]   = (agencyFreq[o.agency]   || 0) + 1;
    if (o.setAside) setAsideFreq[o.setAside] = (setAsideFreq[o.setAside] || 0) + 1;
    if (o.postedDate) {
      const m = new Date(o.postedDate).getMonth();
      valueByMonth[m] = (valueByMonth[m] || 0) + (o.estimatedValue || 0);
    }
  });

  const topAgencies  = Object.entries(agencyFreq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([a,c])=>`${a} (${c} contracts)`);
  const topSetAsides = Object.entries(setAsideFreq).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([s])=>s);
  const avgValue     = allForNaics.reduce((s,o)=>s+(o.estimatedValue||0),0) / (allForNaics.length||1);
  const bestMonths   = Object.entries(valueByMonth).sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([m])=>['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]);

  const systemPrompt = `You are a federal market intelligence analyst. Return ONLY valid JSON, no markdown, no text outside JSON. Keep all string values under 150 chars. No quotes inside string values.`;

  const userPrompt = `PROVIDE DEEP MARKET INTELLIGENCE FOR THIS CONTRACTOR:

=== CONTRACTOR ===
${buildUserSummary(user, savedTitles)}
Federal Fiscal Year Context: ${getFiscalYearContext()}

=== REAL MARKET DATA (last 90 days, their NAICS codes) ===
Active contracts in database: ${allForNaics.length}
Top agencies posting: ${topAgencies.join(', ') || 'Various'}
Set-aside distribution: ${topSetAsides.join(', ') || 'Mostly Full & Open'}
Average contract value: $${Math.round(avgValue).toLocaleString()}
Historically active months (by $ volume): ${bestMonths.join(', ') || 'Data insufficient'}

Return a single JSON object:
{
  "marketOutlook": "Positive" | "Neutral" | "Cautious",
  "outlookReason": "<one sentence explaining the outlook for this specific NAICS/business type>",
  "hotAgencies": ["<top 4 agencies actively posting in their NAICS>"],
  "hiddenGemAgencies": ["<1-2 lower-competition agencies also active in their NAICS>"],
  "trendingSectors": ["<2-3 specific work types trending in their NAICS codes>"],
  "setAsideOpportunity": "<specific set-aside strategy for this business type and NAICS — name the exact set-aside program>",
  "budgetYearInsight": "<1-2 sentences on how the current FY phase affects contract availability and decisions for their NAICS>",
  "weeklyAdvice": "<3-4 sentences of deep strategic advice specifically for this contractor — mention their NAICS, business type, and the current market. Be specific, not generic.>",
  "competitionLevel": "Low" | "Moderate" | "High",
  "competitionDetail": "<one sentence explaining why competition is at this level>",
  "bestMonthsToSubmit": ["<month names when this NAICS sees highest activity>"],
  "avgContractValue": <computed from data>,
  "totalOpportunities": <total in database>,
  "topWinningStrategy": "<the single most impactful thing this contractor can do to increase win rate>"
}`;

  let raw;
  try {
    raw = await chat(systemPrompt, userPrompt, 'gpt-4o-mini', 2048);
  } catch (e) {
    if (e.status === 404 || e.message?.includes('model')) {
      raw = await chat(systemPrompt, userPrompt, 'gpt-4o', 2048);
    } else {
      throw e;
    }
  }
  const insights = repairAndParseJSON(raw, false);
  insights.avgContractValue   = Math.round(avgValue);
  insights.totalOpportunities = allForNaics.length;
  return insights;
};

// ─── Public API ───────────────────────────────────────────────────────────────
export const getUserPredictions = async (user, forceRefresh = false) => {
  const userId = String(user._id);

  if (!forceRefresh) {
    const cached = getCached(userId);
    if (cached) return { ...cached, fromCache: true };
  }

  // 1. Top opportunities — enterprise reads master store directly (bypasses empty personal feed)
  let opportunities;
  if (user.plan === 'enterprise') {
    const masterQuery = {
      dueDate: { $gt: new Date() },
      ...(user.naicsCodes?.length ? { naicsCode: { $in: user.naicsCodes } } : {}),
    };
    opportunities = await Opportunity.find(masterQuery)
      .sort({ dueDate: 1 })
      .limit(12)
      .lean();
  } else {
    const userOpps = await UserOpportunity.find({ user: user._id })
      .sort({ matchScore: -1 })
      .limit(12)
      .populate('opportunity')
      .lean();
    opportunities = userOpps
      .map(uo => uo.opportunity)
      .filter(o => o && (!o.dueDate || new Date(o.dueDate) > Date.now()));
  }

  // 2. User's saved opportunities — preference signal for AI
  const saved = await SavedOpportunity.find({ user: user._id })
    .populate('opportunity', 'title agency naicsCode')
    .sort({ savedAt: -1 })
    .limit(10)
    .lean();

  const savedTitles = saved
    .map(s => s.opportunity?.title)
    .filter(Boolean);

  // 3. Broader market pool for insights — use future due dates (same lens as enterprise opportunities page)
  const allForNaics = await Opportunity.find({
    naicsCode: { $in: user.naicsCodes || [] },
    dueDate: { $gt: new Date() },
  }).select('title agency naicsCode setAside estimatedValue postedDate placeOfPerformance').limit(500).lean();

  const competitionCtx = buildCompetitionContext(allForNaics);

  // 4. Run predictions + market insights in parallel — each isolated so one failure doesn't kill both
  const [predictions, marketInsights] = await Promise.all([
    opportunities.length > 0
      ? predictOpportunities(user, opportunities.slice(0, 5), savedTitles, competitionCtx)
          .catch(e => {
            console.error('predictOpportunities AI error:', e.status || '', e.message);
            return buildBasicPredictions(opportunities.slice(0, 5), competitionCtx);
          })
      : Promise.resolve([]),
    generateMarketInsights(user, allForNaics, savedTitles)
      .catch(e => {
        console.error('generateMarketInsights error:', e.status || '', e.message);
        // Return data-only fallback so the page still renders
        return buildFallbackInsights(allForNaics);
      }),
  ]);

  // 5. Smart ranking: STRONG GO first, then urgency × win probability blend
  const rankOrder = { 'STRONG GO': 0, 'GO': 1, 'CONDITIONAL': 2, 'PASS': 3 };
  predictions.sort((a, b) => {
    const rankDiff = (rankOrder[a.recommendation] ?? 4) - (rankOrder[b.recommendation] ?? 4);
    if (rankDiff !== 0) return rankDiff;
    // Blend urgency (40%) + win probability (60%)
    const scoreA = a.urgencyScore * 0.4 + a.winProbability * 0.6;
    const scoreB = b.urgencyScore * 0.4 + b.winProbability * 0.6;
    return scoreB - scoreA;
  });

  const result = {
    predictions,
    marketInsights,
    generatedAt: new Date().toISOString(),
    fromCache:   false,
    userProfile: {
      naicsCodes:   user.naicsCodes,
      businessName: user.businessName || user.name,
      businessType: user.businessType,
    },
  };

  setCache(userId, result);
  return result;
};

export const invalidatePredictionCache = (userId) => cache.delete(String(userId));
