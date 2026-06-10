// backend/services/geminiService.js
// Switched from Google Gemini to OpenAI — same exported API, drop-in replacement
import OpenAI from 'openai';

// Lazy singleton — initialized on first use so dotenv has already run
let _client = null;

const getClient = () => {
  if (_client) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set in .env');
  _client = new OpenAI({ apiKey: key });
  console.log('✅ OpenAI client initialized (lazy)');
  return _client;
};

// Called by settingsService after admin updates the API key
export const resetAIClient = () => { _client = null; };

export const chat = async (systemPrompt, userPrompt, model = 'gpt-4o-mini', maxTokens = 1500) => {
  const client = getClient();
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });
  return res.choices[0].message.content.trim();
};

// Shared helper used by contactController for the support chatbot
// systemPrompt is optional — if provided, it's used as the system message
export const generateText = async (prompt, systemPrompt) => {
  const client = getClient();
  const messages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 500,
    temperature: 0.6,
  });
  return res.choices[0].message.content.trim();
};

/**
 * Go/No-Go structured analysis
 */
export const generateGoNoGoAnalysis = async ({ opportunityTitle, agency, naicsCode, setAside, estimatedValue, dueDate, competitorCount, pastPerformanceMatch, teamCapacity, notes, userNaics, businessName }) => {
  return await chat(
    'You are a federal business development strategist running a Go/No-Go bid decision analysis.',
    `Run a structured Go/No-Go bid decision analysis for this opportunity.

COMPANY: ${businessName || 'Our Company'} | NAICS: ${userNaics?.join(', ')}
OPPORTUNITY: ${opportunityTitle}
Agency: ${agency} | NAICS: ${naicsCode} | Set-Aside: ${setAside || 'Full & Open'}
Est. Value: $${estimatedValue || 'Unknown'} | Due: ${dueDate || 'Unknown'}
Competitor Count: ${competitorCount || 'Unknown'}
Past Performance Match: ${pastPerformanceMatch || 'Unknown'}
Team Capacity: ${teamCapacity || 'Available'}
Notes: ${notes || 'None'}

Provide:
## GO/NO-GO DECISION
**DECISION: [GO / NO-GO / CONDITIONAL GO]**
**Confidence: [X%]**

## SCORING MATRIX (score each 1-10)
- NAICS/Technical Match: X/10
- Past Performance Relevance: X/10
- Competitive Position: X/10
- Win Probability: X/10
- Revenue Impact: X/10
- Resource Availability: X/10
**TOTAL SCORE: XX/60**

## TOP 3 REASONS FOR THIS DECISION
## WIN STRATEGY (if GO)
## RISK MITIGATION
## RECOMMENDED NEXT STEPS`
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
## AGENCY FOCUS RECOMMENDATIONS`,
    'gpt-4o'
  );
};

/**
 * Summarize RFP/Opportunity
 */
export const summarizeRFP = async (opportunity) => {
  try {
    return await chat(
      'You are a federal contracting expert. Be concise and practical.',
      `Summarize this government contract opportunity:

Title: ${opportunity.title}
Agency: ${opportunity.agency}
Description: ${opportunity.description?.substring(0, 2000)}
Due Date: ${opportunity.dueDate ? new Date(opportunity.dueDate).toLocaleDateString() : 'N/A'}
NAICS Code: ${opportunity.naicsCode}

Provide:
1. Executive Summary (2-3 sentences)
2. Key Requirements (bullet points)
3. Evaluation Criteria
4. Recommended Actions
5. Red Flags (if any)`
    );
  } catch (error) {
    console.error('AI summarization error:', error.message);
    return getFallbackSummary(opportunity);
  }
};

/**
 * Bid/No-Bid Analysis
 */
export const bidNoBidAnalysis = async (opportunity, userProfile) => {
  try {
    return await chat(
      'You are a federal contracting bid strategist.',
      `Analyze if this company should bid on this government contract:

COMPANY: ${userProfile.businessName || 'Small Business'} | NAICS: ${userProfile.naicsCodes?.join(', ') || 'N/A'} | Type: ${userProfile.businessType || 'Small Business'}

OPPORTUNITY: ${opportunity.title}
Agency: ${opportunity.agency} | NAICS: ${opportunity.naicsCode} | Set-Aside: ${opportunity.setAside || 'Full and Open'} | Value: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}

Provide:
1. Recommendation: BID or NO-BID
2. Confidence Level (0-100%)
3. Top 3 Reasons
4. Win Probability (0-100%)
5. Suggested Bid Range (if BID)
6. Key Challenges`
    );
  } catch (error) {
    console.error('AI bid analysis error:', error.message);
    return getFallbackBidAnalysis(opportunity, userProfile);
  }
};

/**
 * Generate Full Proposal
 */
export const generateFullProposal = async (opportunity, userProfile) => {
  const company    = userProfile.businessName || 'Our Company';
  const naics      = userProfile.naicsCodes?.join(', ') || 'Various';
  const setAside   = opportunity.setAside || 'Full and Open Competition';
  const value      = opportunity.estimatedValue ? `$${Number(opportunity.estimatedValue).toLocaleString()}` : 'Not specified';
  const dueDate    = opportunity.dueDate ? new Date(opportunity.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'See solicitation';
  const desc       = opportunity.description?.substring(0, 2500) || 'See solicitation documents for full requirements.';

  const systemPrompt = `You are a senior federal proposal writer with 20+ years of experience winning government contracts. You write Section L/M-compliant proposals that score highest on technical and management evaluation factors. Your writing is specific, confident, and evidence-based — never generic. You always write complete, full-length sections with real substance, professional paragraph structure, and persuasive language. You never use placeholder brackets like [Insert X] — you write real, credible content. Use the company name and contract details provided.`;

  const userPrompt = `Write a complete, professionally-formatted government proposal response for the following contract. Each section must be full-length with real, specific, professional content — minimum 3-5 substantial paragraphs per section.

═══════════════════════════════════════════
CONTRACT INFORMATION
═══════════════════════════════════════════
Title: ${opportunity.title}
Agency: ${opportunity.agency || 'Federal Agency'}
NAICS Code: ${opportunity.naicsCode || naics}
Set-Aside: ${setAside}
Estimated Value: ${value}
Proposal Due: ${dueDate}
Description: ${desc}

═══════════════════════════════════════════
OUR COMPANY
═══════════════════════════════════════════
Company: ${company}
NAICS Codes: ${naics}
Certifications: Small Business${userProfile.certifications ? ', ' + userProfile.certifications : ''}

═══════════════════════════════════════════
REQUIRED SECTIONS — write each fully
═══════════════════════════════════════════

## COVER LETTER

Write a formal 3-paragraph cover letter addressed to the Contracting Officer. Include: (1) intent to submit and contract reference, (2) company qualifications summary and why we are uniquely positioned to win, (3) statement of commitment, point of contact, and professional closing. Use a professional business letter format.

## EXECUTIVE SUMMARY

Write 4 substantial paragraphs covering: (1) a compelling opening that demonstrates deep understanding of the agency's mission and this specific requirement, (2) ${company}'s qualifications, relevant experience, and specific capabilities that match this contract, (3) our approach and key differentiators — what sets us apart from every other offeror, (4) summary of expected outcomes, value delivered, and why we represent the lowest risk highest value choice.

## TECHNICAL APPROACH

Write 5+ paragraphs with full technical depth covering: (1) our methodology and technical framework for this specific contract, (2) Phase 1 approach — mobilization, requirements analysis, and kickoff activities, (3) Phase 2 — core delivery methodology with specific tools, technologies, and processes relevant to this contract scope, (4) quality assurance and quality control plan with specific metrics and review processes, (5) innovation and continuous improvement approach. Reference the contract description specifically.

## MANAGEMENT PLAN

Write 4+ paragraphs covering: (1) organizational structure and reporting hierarchy for this contract, (2) key personnel roles and qualifications — Program Manager, Technical Lead, and support staff relevant to this scope, (3) communication and reporting plan with specific cadences and deliverable schedules, (4) risk management approach with specific identified risks for this contract type and our mitigation strategies.

## PAST PERFORMANCE

Write 3 specific past performance examples (even if slightly generalized, make them highly credible and relevant to this contract type). Each example must include: agency/client name, contract scope, contract value range, period of performance, specific achievements and metrics, and direct relevance to this procurement. Format as distinct subsections. End with a paragraph on how this experience directly prepares us to succeed on this contract.

## PRICING STRATEGY

Write 3+ paragraphs covering: (1) our pricing philosophy and approach — cost realism, best value, competitive but fair, (2) basis of estimate and cost elements included (labor categories, ODCs, overhead, profit), (3) cost reduction strategies and efficiencies we bring that reduce total cost of ownership for the government, (4) our commitment to staying within budget and managing cost growth.

## CONCLUSION

Write a strong 2-paragraph conclusion: (1) recap our unique value proposition and why ${company} is the right choice for this contract, (2) express enthusiasm and commitment, thank the agency for the opportunity, and provide a clear call to action with contact information.

FORMAT RULES:
- Use the exact section headings shown above (## COVER LETTER, ## EXECUTIVE SUMMARY, etc.)
- Write in first person plural (we, our, us) referring to ${company}
- Be specific to this contract — reference the agency name, contract title, and scope throughout
- Professional, confident, government-contract tone
- No bullet-only sections — use paragraphs with occasional bullets for lists
- Do not use placeholder brackets like [Name] or [Insert X]`;

  try {
    return await chat(systemPrompt, userPrompt, 'gpt-4o', 4000);
  } catch (error) {
    console.error('AI proposal error:', error.message);
    // Try smaller model if gpt-4o fails
    try {
      return await chat(systemPrompt, userPrompt, 'gpt-4o-mini', 3500);
    } catch (err2) {
      console.error('AI proposal fallback model error:', err2.message);
      return getFallbackProposal(opportunity, userProfile);
    }
  }
};

/**
 * Answer RFP Questions
 */
export const answerRFPQuestion = async (opportunity, question) => {
  try {
    return await chat(
      'You are a federal contracting expert who answers RFP questions clearly.',
      `Based on this contract, answer the question:

CONTRACT: ${opportunity.title}
AGENCY: ${opportunity.agency}
DESCRIPTION: ${opportunity.description?.substring(0, 1500)}

QUESTION: ${question}`
    );
  } catch (error) {
    console.error('AI Q&A error:', error.message);
    return getFallbackAnswer(question);
  }
};

/**
 * Competitive Analysis
 */
export const competitiveAnalysis = async (opportunity, userProfile) => {
  try {
    return await chat(
      'You are a federal contracting competitive intelligence analyst.',
      `Analyze competition for this contract:

OPPORTUNITY: ${opportunity.title} | Agency: ${opportunity.agency} | NAICS: ${opportunity.naicsCode} | Set-Aside: ${opportunity.setAside || 'Full and Open'} | Value: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}
COMPANY: ${userProfile.businessName || 'Small Business'} | NAICS: ${userProfile.naicsCodes?.join(', ') || 'Various'}

Provide:
1. Likely Competitor Types
2. Our Competitive Advantages
3. Weaknesses to Address
4. Differentiation Strategy
5. Key Win Themes
6. Price Positioning (Low/Medium/High)`
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
    'gpt-4o'
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
      'gpt-4o'
    );
  } catch (error) {
    console.error('Capability statement error:', error.message);
    throw error;
  }
};

/**
 * Risk Assessment
 */
export const riskAssessment = async (opportunity) => {
  try {
    return await chat(
      'You are a federal contracting risk assessment expert.',
      `Assess risks for this contract:

CONTRACT: ${opportunity.title}
AGENCY: ${opportunity.agency}
VALUE: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}
DESCRIPTION: ${opportunity.description?.substring(0, 1000)}

Rate each risk LOW/MEDIUM/HIGH and provide mitigation:
1. Technical Risks
2. Financial Risks
3. Schedule Risks
4. Compliance Risks
5. Performance Risks`
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
    'gpt-4o',
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
