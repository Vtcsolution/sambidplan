// backend/services/geminiService.js
// AI backend — Claude Opus 4.8 via Anthropic SDK
import Anthropic from '@anthropic-ai/sdk';

let _client = null;

const getClient = () => {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set in .env');
  _client = new Anthropic({ apiKey: key });
  console.log('✅ Anthropic Claude client initialized (lazy)');
  return _client;
};

export const resetAIClient = () => { _client = null; };

// Tiered models — Opus for heavy analysis, Sonnet for light tasks
const HEAVY = 'claude-opus-4-8';    // $5/$25 per 1M — bid analysis, proposals, competitive, risk, go/no-go
const LIGHT = 'claude-sonnet-4-6';  // $3/$15 per 1M — summarize, Q&A, capability statement, chatbot

// Model pricing: $ per 1M tokens
const MODEL_PRICING = {
  'claude-opus-4-8':             { input: 15, output: 75 },
  'claude-sonnet-4-6':           { input: 3,  output: 15 },
  'claude-haiku-4-5-20251001':   { input: 1,  output: 5  },
};

const logTokenUsage = async (model, usage) => {
  try {
    const AITokenUsage = (await import('../models/AITokenUsage.js')).default;
    const pricing = MODEL_PRICING[model] || { input: 3, output: 15 };
    const inputCost = (usage.input_tokens / 1_000_000) * pricing.input;
    const outputCost = (usage.output_tokens / 1_000_000) * pricing.output;
    await AITokenUsage.create({
      provider: 'anthropic',
      model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
      cost: inputCost + outputCost,
    });
  } catch {}
};

export const chat = async (systemPrompt, userPrompt, model = LIGHT, maxTokens = 2048) => {
  const client = getClient();
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });
  if (res.usage) logTokenUsage(model, res.usage);
  const text = res.content.find(b => b.type === 'text');
  return text?.text?.trim() || '';
};

export const generateText = async (prompt, systemPrompt) => {
  const client = getClient();
  const res = await client.messages.create({
    model: LIGHT,
    max_tokens: 512,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [
      { role: 'user', content: prompt },
    ],
  });
  if (res.usage) logTokenUsage(LIGHT, res.usage);
  const text = res.content.find(b => b.type === 'text');
  return text?.text?.trim() || '';
};

/**
 * Go/No-Go structured analysis
 */
export const generateGoNoGoAnalysis = async ({ opportunity, oppContext, compContext, companyProfile, teamCapacity, notes, userNaics, businessName }) => {
  const hasRealData = !!oppContext;

  return await chat(
    `You are a Shipley-certified federal capture director running a formal Go/No-Go gate review. You have access to REAL government data: the complete SAM.gov opportunity (full SOW/description), historical award winners from USASpending.gov, and the company's verified profile with actual past wins. Base EVERY scoring decision on specific evidence from this data. Never guess.`,
    `Run a formal Go/No-Go gate review for this opportunity.${hasRealData ? ' You have been given COMPLETE real data — use it.' : ''}

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
    HEAVY, 3500
  );
};

/**
 * AI Market Research Report
 */
export const generateMarketResearchReport = async ({ naicsCodes, businessName }) => {
  return await chat(
    'You are a federal market research analyst specializing in government contracting intelligence.',
    `Generate a weekly market intelligence report for a federal contractor.

COMPANY: ${businessName || 'Our Company'} | NAICS: ${naicsCodes?.join(', ') || 'Not specified'}

Cover:
## EXECUTIVE SUMMARY
## MARKET OPPORTUNITY ANALYSIS (agency spend, contract vehicles, set-aside trends)
## UPCOMING OPPORTUNITIES TO WATCH (5-7 types coming in next 90 days)
## COMPETITIVE LANDSCAPE
## HOT TOPICS & TRENDS (3-5 policy/tech trends)
## RECOMMENDED ACTIONS (5 specific BD actions for this week)
## AGENCY FOCUS RECOMMENDATIONS`
  );
};

/**
 * Summarize RFP/Opportunity — uses complete opportunity data from SAM.gov
 */
export const summarizeRFP = async (opportunity, oppContext, companyProfile) => {
  try {
    return await chat(
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
      LIGHT, 1500
    );
  } catch (error) {
    console.error('AI summarization error:', error.message);
    return getFallbackSummary(opportunity);
  }
};

/**
 * Bid/No-Bid Analysis — uses real competitive data from USASpending
 */
export const bidNoBidAnalysis = async (opportunity, userProfile, oppContext, compContext, companyProfile) => {
  try {
    return await chat(
      `You are a Shipley-certified federal capture manager who makes data-driven bid/no-bid decisions. You NEVER guess — every claim must cite specific data from the inputs. You understand set-aside rules, incumbent advantages, past performance scoring, and pricing strategies. You read the FULL SOW/description to assess technical fit.`,
      `Make a bid/no-bid decision for this company on this contract. Read the FULL description to understand requirements, then cross-reference against our capabilities and the real competitive landscape.

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
      HEAVY, 3000
    );
  } catch (error) {
    console.error('AI bid analysis error:', error.message);
    return getFallbackBidAnalysis(opportunity, userProfile);
  }
};

/**
 * Generate Full Proposal — informed by real award/competitor data
 */
export const generateFullProposal = async (opportunity, userProfile, oppContext, compContext, companyProfile) => {
  const company    = userProfile.businessName || 'Our Company';

  const systemPrompt = `You are a Shipley-trained senior federal proposal writer with 20+ years winning government contracts. You MUST:
1. Read the FULL SOW/description text and address every requirement directly in the Technical Approach
2. Reference the company's REAL past wins from USASpending (actual agencies, amounts, dates)
3. Use REAL competitor pricing data to inform the Pricing Strategy (cite actual award amounts)
4. Address the specific agency's mission (research from the department/sub-tier/office chain)
5. If the description mentions submission requirements (page limits, required sections), follow them
6. Never use placeholder brackets like [Insert X] — write real content
7. Never invent past performance — if the company has no wins, acknowledge it and emphasize capabilities`;

  const userPrompt = `Write a complete government proposal response. You MUST use the real data below — real contract details, real competitor landscape, AND the company's REAL past wins and certifications.

═══════════════════════════════════════════
COMPLETE CONTRACT DATA (FROM SAM.GOV)
═══════════════════════════════════════════
${oppContext || `Title: ${opportunity.title}\nAgency: ${opportunity.agency}\nNAICS: ${opportunity.naicsCode}\nValue: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}\nDescription: ${opportunity.description?.substring(0, 2500)}`}

═══════════════════════════════════════════
REAL HISTORICAL AWARDS IN THIS SPACE (FROM USASPENDING.GOV)
═══════════════════════════════════════════
${compContext || 'No historical data available.'}

═══════════════════════════════════════════
OUR COMPANY — REAL VERIFIED DATA
═══════════════════════════════════════════
${companyProfile || `Company: ${company}\nNAICS: ${userProfile.naicsCodes?.join(', ') || 'Various'}\nCertifications: Small Business${userProfile.certifications ? ', ' + userProfile.certifications : ''}`}

═══════════════════════════════════════════
REQUIRED SECTIONS
═══════════════════════════════════════════

## COVER LETTER
Formal 3-paragraph letter. Reference the ACTUAL solicitation number, agency name, and contract title. Address it to the contracting officer if their name is in the contact data. Include our company name, UEI, CAGE code if available.

## EXECUTIVE SUMMARY
4 paragraphs. (1) Demonstrate understanding of the agency's SPECIFIC mission by referencing the department/sub-tier/office. (2) Show we understand the ACTUAL scope by citing specific requirements from the description/SOW. (3) Our qualifications — reference our REAL past wins and certifications. (4) Why we represent best value — reference competitive pricing from USASpending data.

## TECHNICAL APPROACH
Read the FULL description/SOW text carefully. For EACH major requirement or task mentioned in the description:
- State the requirement (quote or paraphrase from the SOW)
- Describe our specific approach to meeting it
- Reference relevant tools, technologies, methodologies
- Cite our past experience with similar work (from our real contract history)
Write 5+ substantive paragraphs. This is the most important section — it must directly address what the SOW asks for, not generic capabilities.

## MANAGEMENT PLAN
4+ paragraphs. Address: (1) Organizational structure for this SPECIFIC contract at the ACTUAL performance location. (2) Key personnel roles. (3) Communication plan with the ACTUAL agency office. (4) Quality assurance approach. (5) Risk mitigation for the specific risks of this contract.

## PAST PERFORMANCE
Use ONLY our REAL data:
- If we have USASpending wins: cite each one with agency, value, dates, scope, and relevance to this contract
- If we have no federal wins: state honestly that we are pursuing our first federal contract, then emphasize commercial experience and relevant capabilities
- Compare our track record against the REAL competitors from USASpending data (name them, their contract counts)
- Explain why our experience — even if smaller in scale — makes us the right choice

## PRICING STRATEGY
Reference REAL historical award data:
- "Similar contracts in NAICS ${opportunity.naicsCode} have been awarded at $X–$Y (based on ${'{'}USASpending data{'}'})."
- Our pricing philosophy: competitive but realistic
- How our pricing compares to the actual market range
- Value proposition: what the agency gets for our price that they won't get from lower bidders

## CONCLUSION
2 paragraphs. Recap why ${company} is the right choice for this SPECIFIC contract. Reference: our NAICS match, our certifications, our past performance, our competitive pricing, and our commitment to the agency's mission.

FORMAT RULES:
- Write in first person plural referring to ${company}
- Reference real data throughout (actual names, amounts, dates from the data provided)
- Professional government-contract tone
- No placeholder brackets`;

  try {
    return await chat(systemPrompt, userPrompt, HEAVY, 4000);
  } catch (error) {
    console.error('AI proposal error:', error.message);
    try {
      return await chat(systemPrompt, userPrompt, LIGHT, 3500);
    } catch (err2) {
      console.error('AI proposal fallback model error:', err2.message);
      return getFallbackProposal(opportunity, userProfile);
    }
  }
};

/**
 * Answer RFP Questions — uses complete opportunity data
 */
export const answerRFPQuestion = async (opportunity, question, oppContext) => {
  try {
    return await chat(
      'You are a federal contracting expert. Answer questions using ONLY the real contract data provided. If the answer is not in the data, say so clearly — do not guess or invent information.',
      `Answer the question using ONLY the real contract data below.

═══════════════════════════════════════════
COMPLETE CONTRACT DATA (FROM SAM.GOV)
═══════════════════════════════════════════
${oppContext || `Title: ${opportunity.title}\nAgency: ${opportunity.agency}\nDescription: ${opportunity.description?.substring(0, 2000)}`}

═══════════════════════════════════════════
QUESTION: ${question}

Answer based strictly on the data above. If the information is not available in the data, clearly state "This information is not available in the current contract data — check the full solicitation documents on SAM.gov."`
    );
  } catch (error) {
    console.error('AI Q&A error:', error.message);
    return getFallbackAnswer(question);
  }
};

/**
 * Competitive Analysis — uses REAL competitor data from USASpending
 */
export const competitiveAnalysis = async (opportunity, userProfile, oppContext, compContext, companyProfile) => {
  try {
    return await chat(
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
      HEAVY, 3000
    );
  } catch (error) {
    console.error('AI competitive analysis error:', error.message);
    return getFallbackCompetitiveAnalysis(opportunity, userProfile);
  }
};

/**
 * Analyze RFP document text — extract key info and compliance checklist
 */
export const analyzeRFPDocument = async (rfpText, companyNaics) => {
  return await chat(
    'You are a federal proposal expert who analyzes RFP/solicitation documents.',
    `Analyze this federal RFP/solicitation document and extract all critical information. Be thorough and specific.

COMPANY NAICS CODES: ${companyNaics || 'Not specified'}

RFP DOCUMENT TEXT:
${rfpText.substring(0, 8000)}

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
Quick assessment: Should a company with NAICS ${companyNaics} bid on this? State BID or NO-BID with 2-3 bullet reasons.

## RED FLAGS
Any unusual requirements, tight timelines, or incumbent advantages noted.`,
    HEAVY
  );
};

/**
 * Generate professional Capability Statement
 */
export const generateCapabilityStatement = async ({ businessName, naicsCodes, businessType, certifications, coreCompetencies, pastPerformance, differentiators, targetAgency, contactInfo }) => {
  try {
    return await chat(
      'You are an expert federal contracting business development writer who specializes in capability statements.',
      `Generate a professional one-page federal government capability statement for this company. Format it clearly with labeled sections, use strong action verbs, and make it compelling for federal contracting officers.

COMPANY INFORMATION:
- Company Name: ${businessName || 'Our Company'}
- Business Type: ${businessType || 'Small Business'}
- NAICS Codes: ${naicsCodes?.join(', ') || 'Not specified'}
- Certifications: ${certifications || 'None listed'}
- Target Agency: ${targetAgency || 'All Federal Agencies'}

CORE COMPETENCIES:
${coreCompetencies || 'Provide general capabilities based on NAICS codes'}

PAST PERFORMANCE:
${pastPerformance || 'Federal contracting experience in relevant areas'}

DIFFERENTIATORS / VALUE PROPOSITION:
${differentiators || 'Quality, reliability, and competitive pricing'}

CONTACT INFORMATION:
${contactInfo || 'Contact details to be added'}

Write the capability statement with these sections:
1. COMPANY OVERVIEW (2-3 sentences, compelling hook)
2. CORE COMPETENCIES (4-6 bullet points)
3. DIFFERENTIATORS (why choose us — 3-4 points)
4. PAST PERFORMANCE (2-3 examples or summary)
5. CERTIFICATIONS & NAICS CODES
6. CONTACT INFORMATION

Keep it to one page length. Use professional, action-oriented language appropriate for federal procurement officers.`,
      LIGHT
    );
  } catch (error) {
    console.error('Capability statement error:', error.message);
    throw error;
  }
};

/**
 * Risk Assessment — uses real contract data and competitive landscape
 */
export const riskAssessment = async (opportunity, oppContext, compContext, companyProfile) => {
  try {
    return await chat(
      `You are a federal contracting risk manager who assesses bid and performance risks using real data. You read the FULL SOW/description to identify technical, compliance, and operational risks. Every risk you identify must be tied to specific evidence from the data — never list generic risks.`,
      `Perform a comprehensive risk assessment for this opportunity. Read the FULL description/SOW to identify specific risks, then cross-reference against our company capabilities and the competitive landscape.

═══════════════════════════════════════════
COMPLETE OPPORTUNITY (FROM SAM.GOV)
═══════════════════════════════════════════
${oppContext || `Title: ${opportunity.title}\nAgency: ${opportunity.agency}\nValue: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}\nDescription: ${opportunity.description?.substring(0, 4000)}`}

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
      HEAVY, 3000
    );
  } catch (error) {
    console.error('AI risk assessment error:', error.message);
    return getFallbackRiskAssessment(opportunity);
  }
};

/**
 * Sources Sought / RFI Response Generator
 */
export const generateSourcesSoughtResponse = async ({ title, agency, solicitationNumber, naicsCode, description, requirements, responseDeadline, businessName, businessType, naicsCodes, certifications, coreCompetencies, pastPerformance }) => {
  return await chat(
    'You are an expert federal business development writer who specializes in Sources Sought and RFI responses. Write professionally, concisely, and persuasively.',
    `Generate a professional Sources Sought / RFI response for the following opportunity. Format each section clearly with headers.

OPPORTUNITY INFORMATION:
- Title: ${title}
- Agency: ${agency}
- Solicitation #: ${solicitationNumber || 'N/A'}
- NAICS Code: ${naicsCode || 'N/A'}
- Description / Scope: ${description || 'N/A'}
- Key Requirements: ${requirements || 'N/A'}
- Response Deadline: ${responseDeadline || 'N/A'}

RESPONDING COMPANY:
- Company: ${businessName || 'Our Company'}
- Business Type: ${businessType || 'Small Business'}
- NAICS Codes: ${naicsCodes?.join(', ') || naicsCode || 'N/A'}
- Certifications: ${certifications || 'None listed'}
- Core Competencies: ${coreCompetencies || 'Technology services, IT support, consulting'}
- Past Performance: ${pastPerformance || 'Federal and commercial experience'}

Write a complete Sources Sought response with these sections:

## 1. COMPANY IDENTIFICATION
(Company name, DUNS/UEI placeholder, address, POC, email, phone, NAICS, business size, socioeconomic designations)

## 2. EXECUTIVE SUMMARY
(2-3 sentences: who we are and why we are qualified for this requirement)

## 3. CAPABILITY NARRATIVE
(Detailed description of relevant technical capabilities — 2-3 paragraphs, specific to the requirement)

## 4. RELEVANT PAST PERFORMANCE
(2-3 examples demonstrating direct relevance — agency name, contract value, scope, outcome)

## 5. TECHNICAL APPROACH (PRELIMINARY)
(Brief outline of how the company would approach this requirement)

## 6. TEAMING / SUBCONTRACTING STRATEGY
(Whether the company would pursue as prime, sub, or team, and with what type of partners)

## 7. QUESTIONS FOR THE AGENCY
(3-5 targeted clarifying questions that demonstrate understanding and help refine the acquisition)

## 8. STATEMENT OF INTEREST
(One paragraph confirming intent to bid on the resulting solicitation)

Keep the tone professional, specific, and tailored to a federal contracting officer audience.`,
    LIGHT,
    2000
  );
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
