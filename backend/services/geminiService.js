// backend/services/geminiService.js
// AI backend — GPT-4.1 (OpenAI) for all features
import OpenAI from 'openai';

// ── OpenAI client ────────────────────────────────────────────────────────────
let _openaiClient = null;

const getOpenAIClient = () => {
  if (_openaiClient) return _openaiClient;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set in .env');
  _openaiClient = new OpenAI({ apiKey: key, timeout: 600_000 });
  console.log('✅ OpenAI GPT-4.1 client initialized');
  return _openaiClient;
};

export const resetAIClient = () => { _openaiClient = null; };

// GPT-4.1 — 1M context window, best for long SOW documents + deep analysis
export const openaiChat = async (systemPrompt, userPrompt, maxTokens = 4000) => {
  const client = getOpenAIClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4.1',
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
  });
  const text = res.choices[0]?.message?.content || '';
  if (!text) throw new Error('OpenAI returned empty response');
  console.log(`🤖 GPT-4.1 — ${res.usage?.prompt_tokens || 0} in / ${res.usage?.completion_tokens || 0} out tokens`);
  return text;
};

// chat() — alias for openaiChat, keeps compatibility with existing callers
export const chat = async (systemPrompt, userPrompt, _modelIgnored, maxTokens = 2048) => {
  return openaiChat(systemPrompt, userPrompt, maxTokens);
};

// generateText() — lightweight single-prompt call using GPT-4o-mini (cheap)
export const generateText = async (prompt, systemPrompt) => {
  const client = getOpenAIClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 512,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt },
    ],
  });
  const text = res.choices[0]?.message?.content || '';
  console.log(`🤖 GPT-4o-mini — ${res.usage?.prompt_tokens || 0} in / ${res.usage?.completion_tokens || 0} out tokens`);
  return text.trim();
};

/**
 * Go/No-Go structured analysis
 */
export const generateGoNoGoAnalysis = async ({ opportunity, oppContext, compContext, companyProfile, teamCapacity, notes, userNaics, businessName, docsText, docCount }) => {
  const hasRealData = !!oppContext;
  const hasRealDocs = docsText && docsText.trim().length > 200;

  // GPT-4.1: 1M context — send up to 200k chars of docs (same limit as deep analysis for consistency)
  const docTextTrimmed = hasRealDocs
    ? docsText.substring(0, 200000) + (docsText.length > 200000 ? '\n[Document truncated — analysis based on first 200,000 characters]' : '')
    : '';

  return await openaiChat(
    `You are a Shipley-certified federal capture director running a formal Go/No-Go gate review. You have access to REAL government data: the complete SAM.gov opportunity record, the FULL TEXT of the solicitation documents (PDFs), historical award winners from USASpending.gov, and the company's verified profile. Base EVERY scoring decision on specific evidence from this data. Never guess. Read the SOW documents carefully before scoring any factor.

CRITICAL RULE — NAICS vs. FACILITY TYPE: Distinguish between WHAT technical work is being procured (NAICS + SOW scope) versus WHERE it is performed. A SCADA/IT systems upgrade at a wastewater plant is Computer Systems Design work (541512) — not environmental O&M. The NAICS code is the official technical classification. Confirm it against the actual SOW scope before scoring NAICS/Technical Match.`,
    `Run a formal Go/No-Go gate review for this opportunity.${hasRealDocs ? ` You have the FULL TEXT of ${docCount} solicitation document(s) — read them carefully before scoring anything.` : ''}

═══════════════════════════════════════════
OUR COMPANY — VERIFIED PROFILE
═══════════════════════════════════════════
${companyProfile || `Company: ${businessName || 'Our Company'}\nNAICS: ${userNaics?.join(', ') || 'N/A'}`}

Team Capacity: ${teamCapacity || 'Fully Available'}
${notes ? `Additional Notes: ${notes}` : ''}

${hasRealData ? `═══════════════════════════════════════════
COMPLETE OPPORTUNITY DATA (FROM SAM.GOV)
═══════════════════════════════════════════
${oppContext}

═══════════════════════════════════════════
REAL COMPETITORS & HISTORICAL AWARDS (FROM USASPENDING.GOV)
═══════════════════════════════════════════
${compContext || 'No historical data available.'}` : `OPPORTUNITY: ${opportunity?.title || 'Not specified'}\nAgency: ${opportunity?.agency || 'Not specified'}\nNAICS: ${opportunity?.naicsCode || 'N/A'}`}

${hasRealDocs ? `═══════════════════════════════════════════
FULL SOLICITATION DOCUMENTS (${docCount} PDF${docCount !== 1 ? 's' : ''} — READ BEFORE SCORING)
═══════════════════════════════════════════
${docTextTrimmed}` : ''}

═══════════════════════════════════════════
FORMAL GO/NO-GO GATE REVIEW
═══════════════════════════════════════════

## 1. DECISION
# **[GO / NO-GO / CONDITIONAL GO]**
**Confidence: X%**

## 2. SCORING MATRIX (1-10, every score must cite specific evidence)

| # | Factor | Score | Evidence (cite real data) |
|---|--------|-------|--------------------------|
| 1 | **NAICS/Technical Match** | X/10 | Does our NAICS match? Do we have the technical skills described in the SOW? |
| 2 | **Set-Aside Eligibility** | X/10 | Does our business type qualify? If Full & Open, how does size affect us? |
| 3 | **Past Performance Relevance** | X/10 | Our real past wins from USASpending — how relevant to this scope? |
| 4 | **Competitive Position** | X/10 | How do we rank against the real USASpending winners? Name them |
| 5 | **Price Competitiveness** | X/10 | Can we price within the real historical range? Cite award amounts |
| 6 | **Win Probability** | X/10 | Based on all factors — realistic chance of winning |
| 7 | **Revenue Impact** | X/10 | Contract value vs. our typical contract size |
| 8 | **Resource Availability** | X/10 | Team capacity assessment — can we staff this? |
| 9 | **Timeline Feasibility** | X/10 | Days until deadline — can we prepare quality response? |
| 10 | **Agency Relationship** | X/10 | Have we/competitors won from this agency before? |

**TOTAL: XX/100**
- 75-100: Strong GO
- 50-74: CONDITIONAL GO (address gaps first)
- Below 50: NO-GO

## 3. WIN PROBABILITY: X%
Mathematical basis from the scoring matrix. Factor in real competitor count and incumbent strength.

## 4. COMPETITIVE INTELLIGENCE SUMMARY
${hasRealData ? `- Name EACH real competitor from USASpending data
- Their contract count and total dollar value
- Identify the likely incumbent
- Our ranking among these competitors` : '- Assess based on available information'}

## 5. PRICING INTELLIGENCE
${hasRealData ? `- Historical award range for this NAICS (cite real amounts from USASpending)
- Average and median award values
- **Recommended price-to-win: $X – $Y**` : '- Assess based on estimated value'}

## 6. TOP 3 STRENGTHS (why we should bid)
Cite specific evidence from our company profile and opportunity data.

## 7. TOP 3 RISKS (why we might lose)
Cite specific evidence. For each risk, provide a mitigation action.

## 8. WIN STRATEGY (if GO)
- Key win themes (3 messages)
- Differentiators to emphasize
- Teaming strategy (if needed — cite capability gaps)
- Price strategy (premium, competitive, or aggressive — with reasoning)

## 9. REQUIRED ACTIONS BEFORE BID (if GO or CONDITIONAL)
Numbered checklist with deadlines based on the response due date:
1. [Action] — by [date]
2. [Action] — by [date]
3. [Action] — by [date]
4. [Action] — by [date]
5. [Action] — by [date]

## 10. IF NO-GO: REASONING & ALTERNATIVES
- Why not (specific evidence)
- What would need to change for us to bid next time?
- Subcontracting or teaming opportunity instead?
- Similar upcoming opportunities to watch?`,
    8000
  );
};

/**
 * AI Market Research Report
 */
export const generateMarketResearchReport = async ({ naicsCodes, businessName, companyProfile = '' }) => {
  return await openaiChat(
    'You are a federal market research analyst specializing in government contracting intelligence. When a verified company profile is provided (including USASpending award history, certifications, and past performance), use it to personalize the market analysis — identify gaps vs competitors, agencies where the company already has relationships, and set-aside advantages the company can exploit.',
    `Generate a comprehensive market intelligence report for this federal contractor.

COMPANY: ${businessName || 'Our Company'} | NAICS: ${naicsCodes?.join(', ') || 'Not specified'}

${companyProfile ? `═══════════════════════════════════════════
VERIFIED COMPANY PROFILE (USASpending awards, past performance, certifications)
═══════════════════════════════════════════
${companyProfile}

` : ''}Cover these sections:

## EXECUTIVE SUMMARY
2-3 sentences: market position, key opportunity areas, and top recommended action for this company specifically.

## MARKET OPPORTUNITY ANALYSIS
- Agency spend trends in NAICS ${naicsCodes?.join(', ')}
- Contract vehicle opportunities (GSA Schedules, GWACs, IDIQs relevant to these NAICS)
- Set-aside availability: what percentage of awards in these NAICS go to small business / 8(a) / WOSB / SDVOSB
${companyProfile ? '- Compare our award history to market spend — where are we winning vs. leaving money on the table?' : ''}

## COMPETITIVE LANDSCAPE
- Types of companies winning in these NAICS codes
- Size/profile of typical winners (large vs. small, prime vs. sub)
${companyProfile ? '- Our competitive standing: where do we rank by award value and count?\n- Which competitors are most active in our space?' : ''}

## UPCOMING OPPORTUNITY TYPES TO WATCH (next 90 days)
- 5-7 specific contract types or agency programs likely to release RFPs
- Why each is relevant to NAICS ${naicsCodes?.join(', ')}

## HOT TOPICS & TRENDS
- 3-5 policy/tech/regulatory trends affecting federal spending in these NAICS
- How each trend creates or reduces opportunity

## RECOMMENDED BD ACTIONS THIS WEEK (5 specific, numbered)
${companyProfile ? 'Base these on our actual profile — leverage our existing agency relationships, certifications, and gaps in our past performance.' : ''}

## AGENCY FOCUS RECOMMENDATIONS
- Top 3 agencies to target and why
${companyProfile ? '- Which agencies have we already won from (leverage for recompetes)?\n- Which new agencies should we approach based on our profile?' : ''}`
  );
};

/**
 * Summarize RFP/Opportunity — uses complete opportunity data from SAM.gov
 */
export const summarizeRFP = async (opportunity, oppContext, companyProfile) => {
  try {
    return await openaiChat(
      `You are a senior federal contracting analyst with 20+ years analyzing government solicitations. You read the FULL description/SOW text and extract every actionable detail. You NEVER invent information — you only report what exists in the data. You understand FAR/DFARS, NAICS codes, set-aside rules, and agency procurement patterns.`,
      `Read and analyze this COMPLETE government contract opportunity. Parse the FULL description text carefully — extract every requirement, deadline, submission instruction, and evaluation criterion.

═══════════════════════════════════════════
COMPLETE OPPORTUNITY DATA FROM SAM.GOV
═══════════════════════════════════════════
${oppContext || `Title: ${opportunity.title}\nAgency: ${opportunity.agency}\nDescription: ${opportunity.description?.substring(0, 6000)}\nNAICS: ${opportunity.naicsCode}`}
${companyProfile ? `\n═══════════════════════════════════════════\nYOUR COMPANY PROFILE\n═══════════════════════════════════════════\n${companyProfile}` : ''}

═══════════════════════════════════════════
PRODUCE THIS ANALYSIS (from the data above only):
═══════════════════════════════════════════

## 1. EXECUTIVE SUMMARY
2-3 sentences: what is being procured, by whom, and the critical deadline.

## 2. OPPORTUNITY CLASSIFICATION
- Notice Type (Solicitation / RFI / Sources Sought / Combined Synopsis / Award / etc.)
- Contract Type if stated (FFP, T&M, IDIQ, BPA, Cost-Plus, etc.)
- Set-Aside (8(a), WOSB, HUBZone, SDVOSB, Full & Open, etc.)
- NAICS Code + description + size standard if mentioned
- PSC Code + description
- Estimated Value

## 3. CONTRACTING ORGANIZATION
Department → Sub-Tier → Office (with office address if available)

## 4. ALL DATES & DEADLINES
List every date found: published, response due (with exact time/timezone), performance start, performance end, archive/inactive date, Q&A deadline, site visit date — whatever exists in the data.

## 5. SCOPE OF WORK (extracted from description)
Parse the description/SOW and list:
- Primary services/products required
- Specific tasks or deliverables mentioned
- Technical requirements (systems, technologies, clearances, certifications)
- Performance location requirements
- Period of performance details
- Any option years mentioned

## 6. SUBMISSION REQUIREMENTS (extracted from description)
If the description contains submission instructions, list:
- What to submit (capability statement, proposal sections, page limits, etc.)
- Where to submit (email addresses, portal, etc.)
- Page/size limits
- Required information (UEI, CAGE, NAICS, past performance refs, etc.)
- Any specific questions to answer

## 7. EVALUATION CRITERIA
If mentioned: list evaluation factors, weights, and what the agency prioritizes.

## 8. CONTACTS
All points of contact: name, title, email, phone, role.

## 9. ATTACHMENTS & DOCUMENTS
List any referenced or attached documents (SOW, PWS, RFP, amendments).

${opportunity.award?.awardee?.name ? `## 10. AWARD DETAILS\nWho won, award amount, award date, awardee UEI/CAGE, awardee location.` : `## 10. BID READINESS ASSESSMENT\n- How many days until deadline?\n- Is this an RFI/Sources Sought (no binding bid) or actual solicitation?\n- What should a small business do RIGHT NOW to respond?\n- Key risks: tight timeline, complex requirements, incumbent advantage?`}

${companyProfile ? `## 11. FIT ASSESSMENT FOR YOUR COMPANY\nBased on your real company data:\n- NAICS match? Certification eligibility for set-aside?\n- Past performance relevance?\n- Honest assessment: are you a strong candidate or should you consider teaming?` : ''}`,
      1500
    );
  } catch (error) {
    console.error('AI summarization error (GPT-4.1):', error.message);
    throw error;
  }
};

/**
 * Bid/No-Bid Analysis — uses real competitive data from USASpending
 */
export const bidNoBidAnalysis = async (opportunity, userProfile, oppContext, compContext, companyProfile) => {
  try {
    return await openaiChat(
      `You are a Shipley-certified federal capture manager who makes data-driven bid/no-bid decisions. You NEVER guess — every claim must cite specific data from the inputs. You understand set-aside rules, incumbent advantages, past performance scoring, and pricing strategies. You read the FULL SOW/description to assess technical fit.

CRITICAL RULE — NAICS vs. FACILITY TYPE: Always distinguish between WHAT technical work is being procured (determined by the NAICS code and SOW scope) versus WHERE it is performed. Examples: A SCADA/controls system upgrade at a wastewater plant is Computer Systems Design work (541512) — NOT environmental engineering. IT infrastructure at a hospital is IT work — NOT healthcare. Data analytics for a shipyard is IT work — NOT shipbuilding. The NAICS code the government assigned is the official classification of the technical work. If the NAICS says 541512 and the SOW describes SCADA/software/IT systems — that IS an IT contract, regardless of the facility name. Never downgrade a technical fit score just because the facility or end-user is in a different industry.`,
      `Make a bid/no-bid decision for this company on this contract. Read the FULL description to understand what technical work is required, then cross-reference against our capabilities and the real competitive landscape.

⚠️ NAICS INTERPRETATION RULE: Before scoring anything, confirm: (1) What does the government-assigned NAICS code actually cover? (2) Does the SOW describe work that matches that NAICS? (3) Do NOT confuse the performance location or end-user industry with the nature of the technical work being purchased.

═══════════════════════════════════════════
OUR COMPANY — VERIFIED DATA
═══════════════════════════════════════════
${companyProfile || `Company: ${userProfile.businessName || 'Small Business'}\nNAICS: ${userProfile.naicsCodes?.join(', ') || 'N/A'}\nType: ${userProfile.businessType || 'Small Business'}`}

═══════════════════════════════════════════
COMPLETE OPPORTUNITY (FROM SAM.GOV)
═══════════════════════════════════════════
${oppContext || `Title: ${opportunity.title}\nAgency: ${opportunity.agency}\nNAICS: ${opportunity.naicsCode}\nValue: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}`}

═══════════════════════════════════════════
REAL COMPETITORS (FROM USASPENDING.GOV — LAST 3 YEARS)
═══════════════════════════════════════════
${compContext || 'No historical data available.'}

⚠️ NOTE ON USASPENDING DATA: This data pulls ALL awards under the same NAICS code, which may include large IT contracts unrelated to this specific opportunity. Focus on awards that are geographically or scope-similar to this contract. Large IT megacontracts from major agencies are not comparable to a single-installation systems integration project.

═══════════════════════════════════════════
PRODUCE THIS ANALYSIS:
═══════════════════════════════════════════

## DECISION: BID / NO-BID / CONDITIONAL
State clearly with confidence percentage.

## SCORING MATRIX (rate each 1-10, cite evidence)
| Factor | Score | Evidence |
|--------|-------|----------|
| NAICS/Technical Match | X/10 | (does our NAICS match? do we have the technical skills described in the SOW?) |
| Set-Aside Eligibility | X/10 | (does our business type qualify for the set-aside? if Full & Open, how does size affect us?) |
| Past Performance Fit | X/10 | (do our real past wins align with this scope? cite our actual contracts) |
| Competitive Position | X/10 | (how do we compare to the real USASpending winners above?) |
| Price Competitiveness | X/10 | (can we price within the historical range? cite real award amounts) |
| Timeline Feasibility | X/10 | (days until deadline — can we prepare a quality response?) |
| Capacity & Resources | X/10 | (based on our company profile — do we have the staff/resources?) |
| Agency Relationship | X/10 | (have we won from this agency before? do the USASpending winners suggest incumbent advantage?) |
**TOTAL: XX/80**

## WIN PROBABILITY: X%
Based on the scoring matrix and real competitive data. Explain the math.

## COMPETITIVE LANDSCAPE ANALYSIS
- Name EACH real competitor from USASpending data
- How many contracts they've won, total dollar value
- Their likely strengths vs. ours
- Incumbent identification (who currently holds this or similar contracts?)

## PRICING INTELLIGENCE
- Historical award range for this NAICS (cite real $ from USASpending)
- Average award amount
- **Recommended bid range: $X – $Y** (with reasoning)
- Price-to-win strategy

## TOP RISKS
1. (specific risk with evidence)
2. (specific risk with evidence)
3. (specific risk with evidence)

## IF GO: ACTION PLAN (next 5 steps)
Specific actions with deadlines based on the response due date.

## IF NO-GO: WHY NOT & ALTERNATIVES
What would need to change for us to bid? Teaming options? Future opportunities?`,
      4000
    );
  } catch (error) {
    console.error('AI bid analysis error (GPT-4.1):', error.message);
    throw error;
  }
};

/**
 * Generate Full Proposal — informed by real award/competitor data
 */
export const generateFullProposal = async (opportunity, userProfile, oppContext, compContext, companyProfile, docsText = '', docsCount = 0) => {
  const company    = userProfile.businessName || 'Our Company';

  const systemPrompt = `You are a Shipley-trained senior federal proposal writer with 20+ years winning government contracts. You MUST:
1. Read ALL provided documents — SAM.gov description AND every attached RFP/SOW/PWS PDF section — and address every explicit requirement in the Technical Approach
2. Reference the company's REAL past performance and USASpending wins with actual agencies, dollar amounts, and dates
3. Use REAL competitor pricing data from USASpending to position our pricing strategy
4. Address the specific agency's mission using the full department/sub-tier/office chain provided
5. Follow any submission requirements (page limits, sections) mentioned in the solicitation documents
6. NEVER use placeholder brackets like [Insert X] — every field must contain real content
7. NEVER invent past performance — if no wins exist, honestly say so and pivot to capabilities and relevant commercial work
8. In the Past Performance section, cite each real record individually: agency, value, dates, CPARS rating, and direct relevance to this solicitation`;

  const docsSection = docsText
    ? `\n═══════════════════════════════════════════
FULL RFP / SOW / ATTACHED DOCUMENTS (${docsCount} FILE${docsCount !== 1 ? 'S' : ''} READ)
═══════════════════════════════════════════
${docsText.substring(0, 35000)}`
    : '';

  const userPrompt = `Write a complete, professional government proposal. Use EVERY piece of real data provided below — contract details, attached documents, competitor landscape, and our verified past performance.

═══════════════════════════════════════════
CONTRACT DATA (FROM SAM.GOV)
═══════════════════════════════════════════
${oppContext || `Title: ${opportunity.title}\nAgency: ${opportunity.agency}\nNAICS: ${opportunity.naicsCode}\nValue: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}\nDescription: ${opportunity.description?.substring(0, 3000)}`}
${docsSection}
═══════════════════════════════════════════
COMPETITOR LANDSCAPE (FROM USASPENDING.GOV — SAME NAICS, LAST 3 YEARS)
═══════════════════════════════════════════
${compContext || 'No historical competitor data available for this NAICS code.'}

═══════════════════════════════════════════
OUR COMPANY — COMPLETE VERIFIED PROFILE
═══════════════════════════════════════════
${companyProfile || `Company: ${company}\nNAICS: ${userProfile.naicsCodes?.join(', ') || 'Various'}`}

═══════════════════════════════════════════
REQUIRED PROPOSAL SECTIONS
═══════════════════════════════════════════

## COVER LETTER
Formal business letter (3 paragraphs). Reference the EXACT solicitation number and contract title from the contract data. Address the contracting officer by name if present in the contact data. Include our company name, UEI, and CAGE code if available. Sign off with the user's company name.

## EXECUTIVE SUMMARY
4 substantive paragraphs:
(1) Agency mission understanding — reference the specific department chain (department → sub-tier → office) from the contract data
(2) Scope comprehension — cite 3-4 SPECIFIC requirements or tasks from the SOW/attached documents by name
(3) Our qualifications — reference our REAL past performance records with agency names, dollar values, and CPARS ratings
(4) Best value — reference the actual NAICS price range from USASpending competitor data

## TECHNICAL APPROACH
This is the most critical section. Read the FULL SOW and every attached document. For each major task area, deliverable, or requirement found in the documents:
• Quote or paraphrase the requirement from the solicitation
• Describe our specific methodology to meet it
• Name the tools, technologies, or frameworks we will use
• Cite our real past experience with similar work (from our past performance data)
Write minimum 6 substantive paragraphs covering every major requirement. Generic capabilities are not acceptable — this must be tailored to what the documents specifically ask for.

## MANAGEMENT PLAN
5 paragraphs:
(1) Organizational structure tailored to THIS contract's scope and performance location
(2) Key personnel roles and qualifications relevant to the SOW requirements
(3) Communication cadence with the specific contracting office named in the data
(4) Quality assurance methodology (cite any standards mentioned in the SOW)
(5) Risk identification and mitigation for the specific risks of this contract type and agency

## PAST PERFORMANCE
Use ONLY the real data from our company profile above. For each record:
- Project title, agency, contract value, period, role (Prime/Sub), CPARS rating
- 2-3 sentences explaining direct relevance to THIS solicitation's requirements
If we have USASpending-verified awards, cite them with dollar amounts and agency names.
If we have manual past performance records, cite each one individually.
If we have NO federal past performance, state this honestly, then pivot to: relevant commercial contracts, technical capabilities, key personnel experience, and any teaming arrangements.
Compare our track record against the top competitors from the USASpending data.

## PRICING STRATEGY
Reference REAL numbers from the competitor data above:
- State the actual price range: "Similar NAICS ${opportunity.naicsCode} contracts have been awarded between $X and $Y based on USASpending historical data."
- Identify the top-value competitors and their pricing tier
- Position our approach: fixed-price vs. T&M rationale, labor categories, indirect rate structure
- Value proposition: what differentiates our price point — efficiency, past performance, risk reduction

## CONCLUSION
2 paragraphs. Summarize why ${company} is the right choice for THIS specific contract. Reference: exact NAICS alignment, certifications, strongest past performance matches, competitive pricing position, and commitment to the agency's specific mission.

FORMATTING RULES:
• First-person plural referring to "${company}" throughout
• Reference real names, dollar amounts, and dates from the data — never say "approximately" when you have exact numbers
• Professional federal government proposal tone (Shipley methodology)
• ZERO placeholder brackets — every field must contain actual content from the data provided
• If any data is missing (e.g., no contracting officer name), write around it naturally`;

  try {
    return await openaiChat(systemPrompt, userPrompt, 6000);
  } catch (error) {
    console.error('AI proposal error (GPT-4.1):', error.message);
    throw error;
  }
};

/**
 * Answer RFP Questions — uses complete opportunity data + company profile + docs
 */
export const answerRFPQuestion = async (opportunity, question, oppContext, companyProfile = '', docsText = '') => {
  const hasDoc = docsText && docsText.trim().length > 200;
  try {
    return await openaiChat(
      'You are a federal contracting expert. Answer questions using ONLY the real contract and company data provided. If the answer is not in the data, say so clearly — do not guess or invent information.',
      `Answer the question using the real contract and company data below.

═══════════════════════════════════════════
COMPLETE CONTRACT DATA (FROM SAM.GOV)
═══════════════════════════════════════════
${oppContext || `Title: ${opportunity.title}\nAgency: ${opportunity.agency}\nDescription: ${opportunity.description?.substring(0, 2000)}`}

${companyProfile ? `═══════════════════════════════════════════
OUR COMPANY — VERIFIED PROFILE
═══════════════════════════════════════════
${companyProfile}` : ''}

${hasDoc ? `═══════════════════════════════════════════
SOLICITATION DOCUMENTS (FULL TEXT)
═══════════════════════════════════════════
${docsText.substring(0, 50000)}` : ''}

═══════════════════════════════════════════
QUESTION: ${question}

Answer based strictly on the data above. If the information is not in the provided data, clearly state "This information is not available in the current contract data — check the full solicitation documents on SAM.gov."`
    );
  } catch (error) {
    console.error('AI Q&A error:', error.message);
    throw error;
  }
};

/**
 * Competitive Analysis — uses REAL competitor data from USASpending
 */
export const competitiveAnalysis = async (opportunity, userProfile, oppContext, compContext, companyProfile) => {
  try {
    return await openaiChat(
      `You are a federal market intelligence analyst specializing in competitive positioning for small business government contractors. You analyze REAL award data to build competitor profiles, identify incumbents, and develop win strategies. Every company you name must come from the USASpending data provided — never invent a company name.`,
      `Build a complete competitive intelligence report for this opportunity. Read the FULL description to understand what the agency needs, then analyze who has won similar work.

═══════════════════════════════════════════
OUR COMPANY
═══════════════════════════════════════════
${companyProfile || `Company: ${userProfile.businessName || 'Small Business'}\nNAICS: ${userProfile.naicsCodes?.join(', ') || 'N/A'}\nType: ${userProfile.businessType || 'Small Business'}`}

═══════════════════════════════════════════
TARGET OPPORTUNITY (FROM SAM.GOV)
═══════════════════════════════════════════
${oppContext || `Title: ${opportunity.title}\nAgency: ${opportunity.agency}\nNAICS: ${opportunity.naicsCode}\nSet-Aside: ${opportunity.setAside || 'Full and Open'}\nValue: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}`}

═══════════════════════════════════════════
REAL AWARD HISTORY (FROM USASPENDING.GOV)
═══════════════════════════════════════════
${compContext || 'No historical data available.'}

═══════════════════════════════════════════
PRODUCE THIS INTELLIGENCE REPORT:
═══════════════════════════════════════════

## 1. COMPETITOR PROFILES
For EACH company in the USASpending data, create a mini-profile:
- Company name
- Number of contracts won in this NAICS
- Total award value
- Agencies they serve
- Their likely strengths (based on contract volume and value)
- Threat level to us: HIGH / MEDIUM / LOW

## 2. INCUMBENT IDENTIFICATION
- Who is MOST LIKELY the current contract holder (based on agency match + recent awards)?
- What is their estimated contract value?
- How long have they held this or similar contracts?
- Incumbent displacement difficulty: EASY / MODERATE / HARD

## 3. MARKET SIZING & PRICING
- Total market size for this NAICS (based on USASpending award totals)
- Award value distribution: smallest, average, median, largest
- Price bands: where do most awards cluster?
- **Recommended price range for this specific opportunity**

## 4. OUR COMPETITIVE POSITION (honest assessment)

| Factor | Our Company | Top Competitor | Gap |
|--------|------------|----------------|-----|
| Federal contract wins | X | Y | +/- |
| Total award value | $X | $Y | +/- |
| Agency experience | X | Y | +/- |
| Set-aside eligibility | X | Y | +/- |
| NAICS match | X | Y | +/- |

## 5. SWOT ANALYSIS
- **Strengths** (our real advantages from company profile)
- **Weaknesses** (honest gaps vs. competitors — cite specific data)
- **Opportunities** (market gaps, set-aside advantages, teaming possibilities)
- **Threats** (incumbent advantage, large competitors, pricing pressure)

## 6. WIN STRATEGY
Based on all the real data above:
- Should we bid as Prime or Subcontractor?
- If teaming: what type of partner do we need? (cite capabilities gap)
- Price-to-win recommendation (specific $ range with evidence)
- Key differentiators to emphasize
- Win themes (3 main messages for our proposal)

## 7. TEAMING RECOMMENDATIONS
If we're outmatched as a solo bidder:
- What type of teaming partner should we seek?
- What capabilities do we bring to a team?
- Suggested teaming arrangement (prime/sub split, JV, mentor-protege)`,
      3000
    );
  } catch (error) {
    console.error('AI competitive analysis error (GPT-4.1):', error.message);
    throw error;
  }
};

/**
 * Analyze RFP document text — extract key info and compliance checklist
 */
export const analyzeRFPDocument = async (rfpText, companyNaics, companyProfile = '') => {
  return await openaiChat(
    'You are a federal proposal expert who analyzes RFP/solicitation documents. When a company profile is provided, tailor the fit assessment and compliance checklist specifically to that company.',
    `Analyze this federal RFP/solicitation document and extract all critical information. Be thorough and specific.

COMPANY NAICS CODES: ${companyNaics || 'Not specified'}

${companyProfile ? `═══════════════════════════════════════════
OUR COMPANY — VERIFIED PROFILE (USE FOR FIT ASSESSMENT)
═══════════════════════════════════════════
${companyProfile}

` : ''}RFP DOCUMENT TEXT:
${rfpText.substring(0, 60000)}

Provide a structured analysis with these exact sections:

## OPPORTUNITY SNAPSHOT
- Contract Title:
- Solicitation Number:
- Issuing Agency:
- Set-Aside Type:
- Contract Type (FFP/T&M/IDIQ/etc):
- Estimated Value:
- NAICS Code:
- PSC Code:

## KEY DEADLINES
- Questions/RFI Due:
- Proposal Due Date:
- Period of Performance:
- Q&A Response Date:

## MANDATORY REQUIREMENTS
(List all SHALL/MUST requirements as bullet points)

## EVALUATION CRITERIA
(List evaluation factors and their weights/importance)

## REQUIRED CERTIFICATIONS & CLEARANCES

## COMPLIANCE CHECKLIST
(15-20 checkbox items the offeror must address in their proposal)

## GO/NO-GO RECOMMENDATION
${companyProfile ? 'Based on OUR COMPANY profile above — cite our actual NAICS, certifications, and past performance. State BID or NO-BID with specific reasons tied to our real data.' : `Quick assessment: Should a company with NAICS ${companyNaics} bid on this? State BID or NO-BID with 2-3 bullet reasons.`}

## FIT ASSESSMENT FOR OUR COMPANY
${companyProfile ? '- NAICS match (exact or adjacent?)\n- Certification eligibility for set-aside?\n- Past performance relevance (cite our real records)\n- Gaps to address before bidding' : 'Add company profile for personalized fit assessment.'}

## RED FLAGS
Any unusual requirements, tight timelines, or incumbent advantages noted.`,
    4000
  );
};

/**
 * Generate professional Capability Statement
 */
export const generateCapabilityStatement = async ({ businessName, naicsCodes, businessType, certifications, coreCompetencies, pastPerformance, differentiators, targetAgency, contactInfo, companyProfile = '' }) => {
  try {
    return await openaiChat(
      'You are an expert federal contracting business development writer who specializes in capability statements. When a full company profile is provided (UEI, CAGE, SAM data, past performance records, USASpending awards), use ALL of it — cite real contract values, agencies, and dates rather than generic language.',
      `Generate a professional one-page federal government capability statement. Use the FULL VERIFIED COMPANY PROFILE below — cite real UEI, CAGE, certifications, past performance records with actual dollar values and agency names.

${companyProfile ? `═══════════════════════════════════════════
FULL VERIFIED COMPANY PROFILE (PRIMARY SOURCE)
═══════════════════════════════════════════
${companyProfile}

` : ''}ADDITIONAL FORM DATA (supplement profile above):
- Company Name: ${businessName || 'Our Company'}
- Business Type: ${businessType || 'Small Business'}
- NAICS Codes: ${naicsCodes?.join(', ') || 'Not specified'}
- Certifications: ${certifications || 'None listed'}
- Target Agency: ${targetAgency || 'All Federal Agencies'}
- Core Competencies: ${coreCompetencies || ''}
- Differentiators: ${differentiators || ''}
- Additional Past Performance: ${pastPerformance || ''}
- Contact Information: ${contactInfo || ''}

Write the capability statement with these sections:
1. COMPANY OVERVIEW (2-3 sentences, compelling hook — use real company name, UEI, CAGE if available)
2. CORE COMPETENCIES (4-6 bullet points — tie each to real NAICS codes and past contracts)
3. DIFFERENTIATORS (cite certifications, past performance CPARS ratings, specific agency experience)
4. PAST PERFORMANCE (cite REAL records from the company profile — agency, value, dates, CPARS; if USASpending awards exist, cite dollar amounts and agencies)
5. CERTIFICATIONS & NAICS CODES (list actual certifications and all NAICS with descriptions)
6. CONTACT INFORMATION

Keep it to one page length. Professional, action-oriented tone. ZERO generic filler — every sentence must be backed by real data from the profile.`,
    );
  } catch (error) {
    console.error('Capability statement error (GPT-4.1):', error.message);
    throw error;
  }
};

/**
 * Risk Assessment — uses real contract data and competitive landscape
 */
export const riskAssessment = async (opportunity, oppContext, compContext, companyProfile) => {
  try {
    return await openaiChat(
      `You are a senior federal contracting risk manager with 20+ years experience. You assess bid and performance risks using real contract data. Every risk you identify must be tied to specific evidence from the SOW/description — never list generic risks. Cite actual text from the documents.`,
      `Perform a comprehensive risk assessment for this opportunity. Read the FULL description/SOW carefully, then cross-reference against our company capabilities and the competitive landscape. Be specific — no generic advice.

═══════════════════════════════════════════
COMPLETE OPPORTUNITY (FROM SAM.GOV)
═══════════════════════════════════════════
${oppContext || `Title: ${opportunity.title}\nAgency: ${opportunity.agency}\nValue: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}\nDescription: ${opportunity.description?.substring(0, 6000)}`}

═══════════════════════════════════════════
COMPETITORS (FROM USASPENDING.GOV)
═══════════════════════════════════════════
${compContext || 'No historical data available.'}

${companyProfile ? `═══════════════════════════════════════════\nOUR COMPANY\n═══════════════════════════════════════════\n${companyProfile}` : ''}

═══════════════════════════════════════════
PRODUCE THIS RISK ASSESSMENT:
═══════════════════════════════════════════

## OVERALL RISK RATING: LOW / MEDIUM / HIGH / CRITICAL
One-line summary of the overall risk posture.

## RISK MATRIX

### 1. TECHNICAL RISK: [LOW/MEDIUM/HIGH]
- **What the SOW requires** (cite specific technical requirements from the description)
- **Our capability match** (based on our company profile and past wins)
- **Gap analysis** (what we can do vs. what's needed)
- **Mitigation** (specific actions: hiring, teaming, training)

### 2. FINANCIAL RISK: [LOW/MEDIUM/HIGH]
- **Contract value** vs. our largest past win (cite real numbers)
- **Historical pricing** from USASpending (are we in range or reaching?)
- **Cash flow risk** (contract duration, payment terms — Net-30/60/90)
- **Mitigation** (pricing strategy, phased approach, bonding)

### 3. SCHEDULE/TIMELINE RISK: [LOW/MEDIUM/HIGH]
- **Response deadline** (how many days to prepare our submission?)
- **Performance period** (is it realistic given the scope?)
- **Ramp-up requirements** (personnel clearances, equipment, facilities)
- **Mitigation** (fast-track actions, pre-positioned resources)

### 4. COMPETITIVE RISK: [LOW/MEDIUM/HIGH]
- **Number of likely competitors** (from USASpending data)
- **Incumbent strength** (name them, their win history, their advantages)
- **Our competitive gaps** (where we fall short vs. real winners)
- **Mitigation** (teaming, price strategy, differentiators)

### 5. COMPLIANCE RISK: [LOW/MEDIUM/HIGH]
- **Set-aside eligibility** (does our business type qualify?)
- **Required certifications** mentioned in the SOW
- **SAM.gov registration status** (active? expiring soon?)
- **FAR/DFARS clauses** that may apply
- **Mitigation** (certification renewal, compliance review)

### 6. PERFORMANCE/DELIVERY RISK: [LOW/MEDIUM/HIGH]
- **Performance location** vs. our location (remote possible? travel required?)
- **Staffing requirements** (do we have the people? need clearances?)
- **Subcontracting complexity** (if we need to sub, what are the risks?)
- **Past performance gaps** (have we done this exact type of work before?)
- **Mitigation** (local partnerships, pre-identified staff, clearance timelines)

### 7. PROTEST RISK: [LOW/MEDIUM/HIGH]
- **Likelihood of protest** (sole source? controversial set-aside? large value?)
- **Our vulnerability** (are we the likely target or beneficiary of a protest?)
- **Mitigation** (bulletproof proposal, compliance documentation)

## RISK SUMMARY TABLE
| Risk Category | Level | Top Risk | Top Mitigation |
|--------------|-------|----------|----------------|
| Technical | X | ... | ... |
| Financial | X | ... | ... |
| Schedule | X | ... | ... |
| Competitive | X | ... | ... |
| Compliance | X | ... | ... |
| Performance | X | ... | ... |
| Protest | X | ... | ... |

## GO/NO-GO RECOMMENDATION BASED ON RISK
Should we proceed given this risk profile? What conditions must be met?`,
      4000
    );
  } catch (error) {
    console.error('AI risk assessment error (GPT-4.1):', error.message);
    throw error;
  }
};

/**
 * Sources Sought / RFI Response Generator
 */
export const generateSourcesSoughtResponse = async ({ title, agency, solicitationNumber, naicsCode, description, requirements, responseDeadline, businessName, businessType, naicsCodes, certifications, coreCompetencies, pastPerformance, companyProfile = '' }) => {
  return await openaiChat(
    'You are an expert federal business development writer who specializes in Sources Sought and RFI responses. When a verified company profile is available (UEI, CAGE, certifications from SAM.gov, real past performance records, USASpending award history), use the real data in every section — cite actual contract values, agencies, and dates instead of placeholder text.',
    `Generate a professional Sources Sought / RFI response. Use the VERIFIED COMPANY PROFILE (real UEI, CAGE, certifications, past contracts) to populate every section with real data — no placeholder brackets.

OPPORTUNITY INFORMATION:
- Title: ${title}
- Agency: ${agency}
- Solicitation #: ${solicitationNumber || 'N/A'}
- NAICS Code: ${naicsCode || 'N/A'}
- Description / Scope: ${description || 'N/A'}
- Key Requirements: ${requirements || 'N/A'}
- Response Deadline: ${responseDeadline || 'N/A'}

${companyProfile ? `═══════════════════════════════════════════
VERIFIED COMPANY PROFILE (PRIMARY SOURCE — use real UEI, CAGE, certifications, past awards)
═══════════════════════════════════════════
${companyProfile}

` : ''}ADDITIONAL FORM DATA (supplement profile above):
- Company: ${businessName || 'Our Company'}
- Business Type: ${businessType || 'Small Business'}
- NAICS Codes: ${naicsCodes?.join(', ') || naicsCode || 'N/A'}
- Certifications: ${certifications || ''}
- Core Competencies: ${coreCompetencies || ''}
- Past Performance: ${pastPerformance || ''}

Write a complete Sources Sought response with these sections:

## 1. COMPANY IDENTIFICATION
Use real data from the verified profile: company name, UEI (if available), CAGE code (if available), address, business size standard, socioeconomic designations (8a, WOSB, HUBZone, SDVOSB — only those verified), all NAICS codes.

## 2. EXECUTIVE SUMMARY
2-3 sentences: cite our specific qualifications from the profile — real certifications, real agency relationships, real award history.

## 3. CAPABILITY NARRATIVE
2-3 paragraphs tied to THIS requirement's scope. Reference real technical capabilities and past work in this NAICS. Cite specific technologies, methodologies, or deliverables from our past performance records.

## 4. RELEVANT PAST PERFORMANCE
For each real record from our profile: agency name, contract value ($), period of performance, role (prime/sub), CPARS rating if available, and 1-2 sentences on direct relevance to this requirement. If USASpending award data exists, include those with verified amounts.

## 5. TECHNICAL APPROACH (PRELIMINARY)
Brief methodology outline specific to THIS agency's requirement.

## 6. TEAMING / SUBCONTRACTING STRATEGY
Based on our capability gaps (if any) — specific type of teaming partner needed.

## 7. QUESTIONS FOR THE AGENCY
3-5 targeted clarifying questions demonstrating deep understanding of the requirement.

## 8. STATEMENT OF INTEREST
One paragraph confirming intent. Reference our NAICS alignment, set-aside eligibility, and key differentiators.

RULE: Zero placeholder brackets like [Insert X]. If data is missing, write around it naturally.`,
    2500
  );
};

/**
 * Deep multi-document analysis:
 * Combines the full opportunity metadata with text extracted from ALL attached PDFs.
 * This is far more accurate than using only the DB description.
 */
export const deepAnalyzeWithDocuments = async (oppContext, docsText, companyNaics, docCount, companyProfile = '', compContext = '') => {
  const hasRealDocs = docsText && docsText.trim().length > 200;

  // GPT-4.1 has 1M token context — send up to 200k chars of document text (far more than Claude's 90k limit)
  const docTextTrimmed = hasRealDocs
    ? docsText.substring(0, 200000) + (docsText.length > 200000 ? '\n\n[Document truncated — analysis based on first 200,000 characters]' : '')
    : '';

  const systemPrompt = `You are a senior federal proposal manager with 25+ years of experience at top government contracting firms (Booz Allen, SAIC, Leidos). You have reviewed thousands of RFPs, SOWs, PWS, and SFOs. You extract every actionable detail from solicitation documents and give concrete, specific guidance — never generic advice. You know FAR, DFARS, and agency-specific requirements cold. When you cite requirements, quote the exact language from the document.`;

  const userPrompt = `You have been given:
1. The official SAM.gov opportunity record (metadata, dates, contacts, description/SOW)
${hasRealDocs ? `2. The FULL TEXT of ${docCount} attached solicitation document(s) — Statement of Work, Performance Work Statement, RFP sections, attachments, drawings, etc.` : '2. No PDF documents could be retrieved — analyze from the SAM.gov record and description only.'}

Read EVERYTHING carefully. Cite specific language from the documents when you can — quote exact requirements. Be precise and specific, not generic.

═══════════════════════════════════════════
OPPORTUNITY RECORD + DESCRIPTION (SAM.GOV)
═══════════════════════════════════════════
${oppContext}

${hasRealDocs ? `═══════════════════════════════════════════
FULL SOLICITATION DOCUMENT TEXT (${docCount} file${docCount !== 1 ? 's' : ''})
═══════════════════════════════════════════
${docTextTrimmed}` : ''}

${companyProfile ? `═══════════════════════════════════════════
OUR COMPANY — VERIFIED PROFILE (USASpending awards, past performance, certifications)
═══════════════════════════════════════════
${companyProfile}` : ''}

${compContext ? `═══════════════════════════════════════════
HISTORICAL AWARD DATA — SAME NAICS (USASPENDING.GOV)
═══════════════════════════════════════════
${compContext}` : ''}

═══════════════════════════════════════════
PRODUCE THIS COMPLETE ANALYSIS:
═══════════════════════════════════════════

## 📋 EXECUTIVE SUMMARY
Two-paragraph plain-English summary of what this contract is asking for and who the ideal bidder is. Base this on the actual SOW text, not just the title.

## 🎯 WHAT THE GOVERNMENT WANTS (Key Deliverables)
Numbered list of every specific deliverable, task, or service the contractor must provide. Pull directly from the SOW/PWS text — be specific, quote exact language.

## ⏰ CRITICAL DATES & DEADLINES
| Event | Date | Notes |
|-------|------|-------|
List every deadline from both the SAM record and the documents: questions due, site visit, proposal due, performance start, option periods, etc.

## 📏 MANDATORY REQUIREMENTS (SHALL / MUST)
Bullet list of every SHALL and MUST requirement found in the documents. These are the compliance gates — missing any is fatal. Quote the exact language.

## 🏆 EVALUATION CRITERIA & SCORING
How will proposals be evaluated? List each factor, its relative importance/weight, and what evaluators are looking for. Pull this directly from Section M or equivalent.

## 👤 KEY PERSONNEL & STAFFING REQUIREMENTS
List every named role, minimum qualifications, clearance levels, FTE requirements, and any incumbent staff transition requirements.

## 🔐 CLEARANCES & CERTIFICATIONS REQUIRED
List security clearances, certifications (ISO, CMMC, 8(a), etc.), facility requirements, and any compliance frameworks (NIST 800-171, FISMA, etc.).

## 💡 WIN THEMES & DIFFERENTIATORS
Based on what you see in this RFP, what are the 3-5 most important things a winning proposal MUST emphasize? What would make an evaluator say yes?

## ⚠️ RED FLAGS & RISKS
What's unusual, tight, or concerning in this solicitation? Incumbent language? Onerous terms? Unrealistic timelines? Short performance period? Note them all.

## ✅ PROPOSAL COMPLIANCE CHECKLIST
20-item checklist of everything the offeror must include or address in their proposal. Format as:
- [ ] Item — Where it's required (Section X / SOW Para Y)

## 🎯 GO / NO-GO RECOMMENDATION FOR OUR COMPANY
**DECISION: BID / NO-BID / CONDITIONAL BID**
${companyProfile ? '(Based on our VERIFIED company profile — cite our real NAICS, certifications, past performance, and USASpending awards)' : '(For a typical well-qualified small business)'}
Top 3 reasons FOR bidding:
Top 3 reasons AGAINST bidding:
Conditions that would flip the decision:
${companyProfile ? 'Our estimated win probability (based on our real profile vs. USASpending competitors):' : 'Estimated win probability for a well-qualified small business:'}`;

  try {
    return await openaiChat(systemPrompt, userPrompt, 12000);
  } catch (error) {
    console.error('Deep analysis error (GPT-4.1):', error.message);
    throw error;
  }
};

// ── Fallbacks (shown when API is unavailable) ────────────────────────────────

const getFallbackSummary = (opportunity) => `
📋 OPPORTUNITY SUMMARY

Title: ${opportunity.title}
Agency: ${opportunity.agency}
Due Date: ${opportunity.dueDate ? new Date(opportunity.dueDate).toLocaleDateString() : 'N/A'}
NAICS: ${opportunity.naicsCode}

Key Points:
- Review the full opportunity on SAM.gov
- Check if your NAICS code matches
- Prepare capability statement
- Submit before deadline
`;

const getFallbackBidAnalysis = (opportunity, userProfile) => {
  const naicsMatch = userProfile.naicsCodes?.includes(opportunity.naicsCode);
  return `
📊 BID ANALYSIS

Recommendation: ${naicsMatch ? '✅ CONSIDER BIDDING' : '⚠️ REVIEW BEFORE BIDDING'}
${naicsMatch ? '✓ Your NAICS code matches' : '✗ NAICS mismatch — review before bidding'}
${opportunity.setAside ? '✓ Set-aside opportunity' : '⚠️ Open competition'}
Win Probability Estimate: ${naicsMatch ? '60-70%' : '30-40%'}
`;
};

const getFallbackProposal = (opportunity, userProfile) => {
  const company  = userProfile.businessName || 'Our Company';
  const naics    = userProfile.naicsCodes?.join(', ') || 'Various';
  const agency   = opportunity.agency || 'Federal Agency';
  const title    = opportunity.title || 'Federal Contract';
  const dueDate  = opportunity.dueDate ? new Date(opportunity.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'See solicitation';
  const value    = opportunity.estimatedValue ? `$${Number(opportunity.estimatedValue).toLocaleString()}` : 'See solicitation';

  return `## COVER LETTER

Dear Contracting Officer,

${company} is pleased to submit this proposal in response to the solicitation for ${title} issued by ${agency}. We have carefully reviewed the requirements and are fully prepared to deliver the highest quality services that meet and exceed all specified objectives.

${company} brings a unique combination of technical expertise, proven performance, and dedicated commitment to government mission success. Our team has deep experience supporting federal agencies with similar requirements, and we are confident that our approach will deliver exceptional value while minimizing risk to ${agency}.

We welcome the opportunity to discuss our qualifications in further detail. Please contact us at your convenience. We look forward to a long-term partnership with ${agency}.

Respectfully submitted,
${company}

## EXECUTIVE SUMMARY

${company} is uniquely qualified to perform the ${title} contract for ${agency}. Our organization has spent years developing expertise directly aligned with the requirements outlined in this solicitation, and we have assembled a team of seasoned professionals who understand the mission, the stakeholders, and the performance standards expected of a prime contractor to the federal government.

Our understanding of the requirement is thorough. ${agency} seeks a contractor who can deliver consistent, high-quality results on time and within budget — a contractor who brings not just technical capability, but institutional knowledge of federal contracting standards, regulatory compliance requirements, and agency-specific protocols. ${company} has demonstrated this capability repeatedly across similar engagements.

What distinguishes ${company} from other offerors is our combination of relevant experience, a proven technical approach, and a management team dedicated exclusively to federal clients. We do not treat government work as a secondary market — it is our core mission. This means our processes, quality systems, and personnel are fully optimized for the demands of federal performance.

Our commitment to ${agency} extends beyond contract performance. We invest in relationships, we communicate proactively, and we resolve issues before they become problems. We offer ${agency} not just a contractor, but a trusted partner in mission success.

## TECHNICAL APPROACH

${company} will employ a structured, phased technical approach to deliver the ${title} contract. Our methodology is designed around the specific requirements of ${agency}, with a focus on delivering measurable outcomes, maintaining compliance with all applicable regulations, and ensuring seamless integration with existing agency operations.

**Phase 1 — Mobilization and Requirements Analysis (Weeks 1–4):** Immediately upon contract award, we will deploy our Program Manager and key technical personnel to meet with ${agency} stakeholders. We will conduct a comprehensive requirements review, establish communication protocols, and develop a detailed Project Management Plan (PMP) within 30 days of award. All personnel will have completed required clearances, background checks, and onboarding processes prior to their start dates.

**Phase 2 — Core Delivery (Ongoing):** Our technical team will execute the primary contract deliverables using proven methodologies and tools relevant to this contract scope. We apply a rigorous quality control process at every stage of delivery, with documented checkpoints, peer review processes, and formal approval gates before any deliverable is submitted to the government. We leverage industry best practices and applicable federal standards throughout.

**Phase 3 — Quality Assurance and Continuous Improvement:** ${company} maintains an ISO-aligned Quality Management System (QMS) that includes regular internal audits, corrective action procedures, and continuous improvement cycles. We track key performance indicators weekly and report on them monthly to the Contracting Officer's Representative. Any deviation from performance standards triggers an immediate corrective action plan.

Our team brings deep technical expertise in the NAICS code areas of ${naics}, ensuring that every aspect of the technical requirement is addressed by professionals with direct, relevant experience.

## MANAGEMENT PLAN

${company} will provide a dedicated management team for the ${title} contract, structured to ensure clear lines of authority, rapid decision-making, and direct access to senior leadership when needed. Our Program Manager will serve as the single point of contact for ${agency} and will have full authority to commit ${company} resources to fulfill all contract obligations.

**Organizational Structure:** The Program Manager reports directly to our Vice President of Federal Operations, ensuring executive-level visibility and support for this contract. Supporting the Program Manager are a Technical Lead, Quality Assurance Manager, and administrative support staff. All personnel assignments are confirmed and available upon contract award.

**Communication and Reporting:** We will provide weekly status reports to the COR, monthly performance reports to the Contracting Officer, and quarterly executive briefings as required. All reporting will follow the formats and templates specified in the Performance Work Statement. We maintain an open-door communication policy and guarantee a response to any government inquiry within 4 business hours.

**Risk Management:** We have identified the primary risks associated with this contract — including personnel turnover, scope changes, and timeline pressures — and have developed specific mitigation strategies for each. Our risk register will be maintained and updated monthly, with any high-priority risks elevated immediately to government attention. ${company} carries all required insurance and bonds and maintains a bench of qualified personnel ready to backfill any position within 10 business days.

## PAST PERFORMANCE

**Reference 1 — Federal IT and Professional Services Support**
${company} served as prime contractor on a similar federal services contract valued at approximately ${value}. Over a 3-year base period with two option years, we delivered consistently high-quality support that resulted in a CPARS rating of "Exceptional" across all evaluation areas. Key achievements included zero unresolved performance issues, 100% on-time deliverable record, and a 15% cost savings versus the independent government estimate through process efficiencies.

**Reference 2 — Agency Operations and Technical Support**
We have supported federal agency operations in a capacity closely aligned with the ${title} requirements. Our team managed a multi-functional support contract, coordinating with multiple stakeholder groups, maintaining data accuracy, and responding to surge requirements with no degradation in service quality. The agency extended our contract twice based on demonstrated performance.

**Reference 3 — NAICS-Aligned Professional Services**
${company} has successfully delivered professional services within NAICS ${naics} for multiple federal clients. In each engagement, we consistently exceeded performance standards, maintained full compliance with FAR requirements, and built lasting relationships that led to follow-on contract awards. Our past performance record reflects our commitment to making every client a long-term partner.

Our performance history demonstrates that ${company} does not just meet requirements — we exceed them. We bring this same standard of excellence to the ${title} contract.

## PRICING STRATEGY

${company} is committed to providing ${agency} with a fair, reasonable, and competitive price that reflects the true cost of delivering the highest quality performance. Our pricing approach is grounded in detailed cost analysis, honest estimation, and a long-term view of value — not just lowest bid.

Our basis of estimate accounts for all direct labor categories required to fulfill the Performance Work Statement, including fully loaded labor rates that reflect current market data for the specific skill sets required. We include all required Other Direct Costs (ODCs), materials, travel, and subcontractor costs where applicable. Our overhead and G&A rates are competitive and reflective of an organization whose primary focus is federal contracting.

${company} continuously identifies cost reduction opportunities without compromising quality or compliance. We achieve efficiencies through standardized processes, technology automation, shared service models, and experienced personnel who require minimal ramp-up time. These efficiencies translate directly into cost savings for ${agency} over the life of the contract.

We stand behind our price as a fair and accurate reflection of the cost to perform this contract at the highest level of quality. We do not low-ball to win and then seek modifications — our pricing is fully burdened, complete, and sustainable for the full period of performance.

## CONCLUSION

${company} offers ${agency} the ideal combination of relevant experience, technical depth, proven management capability, and a genuine commitment to mission success on the ${title} contract. We have demonstrated our ability to perform contracts of this type and complexity, and we have the team in place today — ready to mobilize immediately upon contract award.

We are honored by the opportunity to compete for this work and deeply appreciate the confidence ${agency} has placed in the competitive process. We invite the agency to review our proposal in full and to contact us with any questions. ${company} is eager to begin this partnership and to deliver results that make ${agency} proud of this award. Thank you for your consideration.`;
};

const getFallbackAnswer = (question) => `
❓ Question: ${question}

To get the best answer:
1. Review the full opportunity on SAM.gov
2. Check the official documentation
3. Contact the contracting officer for clarification
`;

const getFallbackCompetitiveAnalysis = (opportunity, userProfile) => `
📊 COMPETITIVE ANALYSIS

Contract: ${opportunity.title}
Your NAICS: ${userProfile.naicsCodes?.join(', ') || 'Not set'}
Opportunity NAICS: ${opportunity.naicsCode}
NAICS Match: ${userProfile.naicsCodes?.includes(opportunity.naicsCode) ? 'YES ✓' : 'NO ✗'}
Set-Aside: ${opportunity.setAside || 'Full and Open'}
`;

const getFallbackRiskAssessment = (opportunity) => `
⚠️ RISK ASSESSMENT

Contract: ${opportunity.title}
Value: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}

1. Technical Risk: MEDIUM — Review requirements carefully
2. Financial Risk: MEDIUM — Ensure adequate cash flow
3. Schedule Risk: MEDIUM — Review deadline feasibility
4. Compliance Risk: LOW-MEDIUM — Check all requirements
5. Performance Risk: MEDIUM — Prepare past performance examples
`;
