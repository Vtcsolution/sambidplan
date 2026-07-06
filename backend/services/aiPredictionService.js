// backend/services/aiPredictionService.js
//
// Deep AI predictions using GPT-4.1 (OpenAI).
// Signals used per prediction:
//   • User NAICS codes, business type, business name, certifications
//   • Company UEI / CAGE code
//   • Past performance: manual records + live USASpending.gov awards by UEI/name
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

import axios from 'axios';
import { openaiChat } from './geminiService.js';
import UserOpportunity from '../models/UserOpportunity.js';
import Opportunity from '../models/Opportunity.js';
import SavedOpportunity from '../models/SavedOpportunity.js';
import PastPerformance from '../models/PastPerformance.js';
import Company from '../models/Company.js';

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

const buildUserSummary = (user, savedTitles, company = null) => {
  const certs = company?.certifications?.map(c => c.name || c.type).join(', ') || 'None on file';
  const uei   = company?.uei  || user.uei  || 'Not registered';
  const cage  = company?.cage || user.cage || 'Not on file';
  return `Company Name: ${company?.name || user.businessName || user.name || 'Unknown'}
Business Type: ${user.businessType?.replace('_', ' ') || 'Unknown'}
NAICS Codes: ${user.naicsCodes?.join(', ') || 'Not configured'}
UEI: ${uei} | CAGE: ${cage}
Certifications: ${certs}
Plan: ${user.plan}
Previously Saved (user interests): ${savedTitles.length > 0 ? savedTitles.slice(0, 5).join('; ') : 'None yet'}`;
};

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

// ─── USASpending live past award lookup ───────────────────────────────────────
// Queries USASpending.gov for this specific company's awarded federal contracts.
// Uses UEI first (exact match), falls back to business name search.
const fetchUSASpendingPastAwards = async (uei, businessName) => {
  try {
    const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 86400000).toISOString().slice(0, 10);
    const today        = new Date().toISOString().slice(0, 10);

    const filters = {
      award_type_codes: ['A', 'B', 'C', 'D'],
      time_period: [{ start_date: fiveYearsAgo, end_date: today }],
    };

    if (uei) {
      filters.recipient_ueis = [uei.toUpperCase()];
    } else if (businessName) {
      filters.recipient_search_text = [businessName];
    } else {
      return [];
    }

    const res = await axios.post(
      'https://api.usaspending.gov/api/v2/search/spending_by_award/',
      {
        filters,
        fields: [
          'Award ID', 'Award Amount', 'Awarding Agency', 'naics_code',
          'Description', 'Start Date', 'End Date', 'Recipient Name',
          'Place of Performance State Code',
        ],
        limit: 20,
        sort: 'Award Amount',
        order: 'desc',
      },
      { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );

    return (res.data?.results || []).map(a => ({
      agency:      a['Awarding Agency']                   || '—',
      amount:      Number(a['Award Amount'] || 0),
      naicsCode:   a['naics_code']                        || '',
      description: (a['Description'] || '').substring(0, 120),
      startDate:   a['Start Date']                        || '',
      endDate:     a['End Date']                          || '',
      state:       a['Place of Performance State Code']   || '',
    }));
  } catch (err) {
    // Non-fatal — predictions still run without this signal
    console.warn('USASpending past awards fetch failed:', err.message);
    return [];
  }
};

// ─── Build past performance context for AI ────────────────────────────────────
// Combines manual PastPerformance records + live USASpending awards into
// a compact text block that fits inside the AI prompt.
const buildPastPerformanceContext = (manualRecords, usaAwards) => {
  const lines = [];

  if (manualRecords.length > 0) {
    lines.push('--- MANUALLY ENTERED PAST PERFORMANCE ---');
    manualRecords.slice(0, 6).forEach((r, i) => {
      const val   = r.finalValue || r.originalValue || 0;
      const end   = r.endDate ? new Date(r.endDate).getFullYear() : '?';
      const rating = r.cparsRating && r.cparsRating !== 'Not Rated' ? ` | CPARS: ${r.cparsRating}` : '';
      lines.push(
        `[${i + 1}] ${r.projectTitle} — ${r.agencyName}` +
        ` | $${val.toLocaleString()} | NAICS: ${r.naicsCode || '—'} | ${r.role} | Ended ${end}${rating}`
      );
      if (r.scopeSummary) lines.push(`    Scope: ${r.scopeSummary.substring(0, 150)}`);
    });
  }

  if (usaAwards.length > 0) {
    lines.push('--- USASpending.gov VERIFIED FEDERAL AWARDS (last 5 years) ---');
    usaAwards.slice(0, 10).forEach((a, i) => {
      lines.push(
        `[${i + 1}] ${a.agency} | $${a.amount.toLocaleString()} | NAICS: ${a.naicsCode || '—'}` +
        ` | ${a.startDate?.slice(0, 7) || '?'} – ${a.endDate?.slice(0, 7) || '?'}` +
        (a.description ? ` | ${a.description}` : '')
      );
    });
  }

  if (lines.length === 0) return 'No past performance data on file.';
  return lines.join('\n');
};

// ─── Non-AI fallback: basic scoring without AI ──────────────────────────────
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
const predictOpportunities = async (user, opportunities, savedTitles, competitionCtx, pastPerformanceCtx = '', company = null) => {
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
${buildUserSummary(user, savedTitles, company)}
Fiscal Year Context: ${fyCtx}

=== PAST PERFORMANCE & VERIFIED FEDERAL AWARDS ===
${pastPerformanceCtx}

=== OPPORTUNITIES TO ANALYZE ===
${oppList}

Return a JSON array. Each element must have EXACTLY these keys (all strings under 120 chars, no quotes inside strings):
{
  "index": <1-based integer>,
  "winProbability": <0-100 integer — base 30% for qualified small biz; raise if past performance matches agency or NAICS; lower if no relevant past work>,
  "fitScore": <1-10 integer>,
  "confidenceLevel": "High" or "Medium" or "Low",
  "urgencyLevel": "Critical" or "High" or "Medium" or "Low",
  "recommendation": "STRONG GO" or "GO" or "CONDITIONAL" or "PASS",
  "topReasons": [<2 short strings — cite specific past performance when relevant, no quotes inside>],
  "risks": [<1-2 short strings, no quotes inside>],
  "bidStrategy": "<one sentence referencing past relevant wins if applicable, max 100 chars>",
  "nextAction": "<one sentence, max 100 chars>",
  "teamingAdvice": "Solo bid" or "<one sentence>",
  "uniqueAdvantage": "<one sentence citing past performance or certifications if relevant, max 100 chars>"
}

Scoring rules:
- NAICS exact match in past performance → +15% win probability
- Same agency won before → +20% win probability
- CPARS Exceptional/Very Good rating in relevant work → +10%
- High-volume agency (many bidders) → -10%
- No relevant past performance → confidence = Low
- Q4 FY = more competition → slight downward pressure
- Set-aside eligibility match → +10–15%`;

  const raw = await openaiChat(systemPrompt, userPrompt, 4096);

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
    outlookReason: 'Market data loaded — AI narrative temporarily unavailable.',
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
    topWinningStrategy: 'Review the highest-posting agencies in your NAICS and apply to set-aside opportunities matching your certifications.',
  };
};

// ─── Deep market intelligence ─────────────────────────────────────────────────
const generateMarketInsights = async (user, allForNaics, savedTitles, pastPerformanceCtx = '', company = null) => {
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

=== CONTRACTOR PROFILE ===
${buildUserSummary(user, savedTitles, company)}
Federal Fiscal Year Context: ${getFiscalYearContext()}

=== PAST PERFORMANCE & VERIFIED FEDERAL AWARDS ===
${pastPerformanceCtx}

=== LIVE MARKET DATA (active contracts in your NAICS) ===
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
  "topWinningStrategy": "<the single most impactful winning strategy — reference their specific past performance agencies or certifications if relevant>"
}`;

  const raw = await openaiChat(systemPrompt, userPrompt, 2048);
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

  // 3. Company profile — UEI, CAGE, certifications
  const company = await Company.findOne({ owner: user._id }).lean().catch(() => null);
  const uei  = company?.uei  || '';
  const cage = company?.cage || '';
  const bizName = company?.name || user.businessName || '';

  // 4. Past performance — manual records + live USASpending awards in parallel
  const [manualPP, usaAwards] = await Promise.all([
    PastPerformance.find({ user: user._id })
      .sort({ endDate: -1 })
      .limit(10)
      .lean()
      .catch(() => []),
    fetchUSASpendingPastAwards(uei, bizName),
  ]);
  const pastPerformanceCtx = buildPastPerformanceContext(manualPP, usaAwards);
  console.log(`📋 Past performance: ${manualPP.length} manual records, ${usaAwards.length} USASpending awards`);

  // 5. Broader market pool for insights
  const allForNaics = await Opportunity.find({
    naicsCode: { $in: user.naicsCodes || [] },
    dueDate: { $gt: new Date() },
  }).select('title agency naicsCode setAside estimatedValue postedDate placeOfPerformance').limit(500).lean();

  const competitionCtx = buildCompetitionContext(allForNaics);

  // 6. Run predictions + market insights in parallel — each isolated so one failure doesn't kill both
  const [predictions, marketInsights] = await Promise.all([
    opportunities.length > 0
      ? predictOpportunities(user, opportunities.slice(0, 5), savedTitles, competitionCtx, pastPerformanceCtx, company)
          .catch(e => {
            console.error('predictOpportunities AI error:', e.status || '', e.message);
            return buildBasicPredictions(opportunities.slice(0, 5), competitionCtx);
          })
      : Promise.resolve([]),
    generateMarketInsights(user, allForNaics, savedTitles, pastPerformanceCtx, company)
      .catch(e => {
        console.error('generateMarketInsights error:', e.status || '', e.message);
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
      naicsCodes:        user.naicsCodes,
      businessName:      company?.name || user.businessName || user.name,
      businessType:      user.businessType,
      uei:               uei || null,
      cage:              cage || null,
      certifications:    company?.certifications || [],
      manualPPCount:     manualPP.length,
      usaSpendingCount:  usaAwards.length,
      totalAwardValue:   usaAwards.reduce((s, a) => s + a.amount, 0),
    },
  };

  setCache(userId, result);
  return result;
};

export const invalidatePredictionCache = (userId) => cache.delete(String(userId));
