// backend/services/geminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

// DIRECT API KEY (temporary fix - will work immediately)
const GEMINI_API_KEY = 'AIzaSyDdipExXg9jQMe3pPSGVA-iZzTAD81Y1gI';

let genAI = null;
let model = null;

try {
  if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('✅ Google Gemini AI initialized with direct API key');
  } else {
    console.log('⚠️ No API key available');
  }
} catch (error) {
  console.log('⚠️ Gemini initialization failed:', error.message);
}

/**
 * Summarize RFP/Opportunity using Gemini
 */
export const summarizeRFP = async (opportunity) => {
  if (!model) {
    return getFallbackSummary(opportunity);
  }
  
  try {
    const prompt = `
      You are a federal contracting expert. Summarize this government contract opportunity:
      
      Title: ${opportunity.title}
      Agency: ${opportunity.agency}
      Description: ${opportunity.description?.substring(0, 2000)}
      Due Date: ${opportunity.dueDate ? new Date(opportunity.dueDate).toLocaleDateString() : 'N/A'}
      NAICS Code: ${opportunity.naicsCode}
      
      Please provide:
      1. Executive Summary (2-3 sentences)
      2. Key Requirements (bullet points)
      3. Evaluation Criteria (what they look for)
      4. Recommended Actions (what to do next)
      5. Red Flags (if any)
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini summarization error:', error);
    return getFallbackSummary(opportunity);
  }
};

/**
 * Bid/No-Bid Analysis using Gemini
 */
export const bidNoBidAnalysis = async (opportunity, userProfile) => {
  if (!model) {
    return getFallbackBidAnalysis(opportunity, userProfile);
  }
  
  try {
    const prompt = `
      Analyze if this company should bid on this government contract:
      
      COMPANY PROFILE:
      - Business Name: ${userProfile.businessName || 'Small Business'}
      - NAICS Codes: ${userProfile.naicsCodes?.join(', ') || 'Not specified'}
      - Business Type: ${userProfile.businessType || 'Small Business'}
      
      OPPORTUNITY:
      - Title: ${opportunity.title}
      - Agency: ${opportunity.agency}
      - NAICS Code: ${opportunity.naicsCode}
      - Set-Aside: ${opportunity.setAside || 'Full and Open'}
      - Estimated Value: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}
      
      Provide:
      1. Recommendation: BID or NO-BID
      2. Confidence Level (0-100%)
      3. Top 3 Reasons for recommendation
      4. Win Probability (0-100%)
      5. Suggested Bid Amount Range (if BID)
      6. Key Challenges to overcome
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini bid analysis error:', error);
    return getFallbackBidAnalysis(opportunity, userProfile);
  }
};

/**
 * Generate Full Proposal using Gemini
 */
export const generateFullProposal = async (opportunity, userProfile) => {
  if (!model) {
    return getFallbackProposal(opportunity, userProfile);
  }
  
  try {
    const prompt = `
      Write a professional government proposal for:
      
      CONTRACT OPPORTUNITY:
      - Title: ${opportunity.title}
      - Agency: ${opportunity.agency}
      - Description: ${opportunity.description?.substring(0, 1500)}
      - Due Date: ${opportunity.dueDate ? new Date(opportunity.dueDate).toLocaleDateString() : 'N/A'}
      
      OUR COMPANY:
      - Name: ${userProfile.businessName || 'Our Company'}
      - NAICS: ${userProfile.naicsCodes?.join(', ') || 'Various'}
      
      Please write these sections:
      
      1. COVER LETTER (Professional, 1 paragraph)
      2. EXECUTIVE SUMMARY (Key strengths, 2-3 paragraphs)
      3. TECHNICAL APPROACH (How we'll do the work)
      4. MANAGEMENT PLAN (Team structure, timeline)
      5. PAST PERFORMANCE (Relevant experience)
      6. PRICING STRATEGY (Competitive approach)
      7. CONCLUSION (Call to action)
      
      Use professional government contracting language. Be persuasive and specific.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini proposal error:', error);
    return getFallbackProposal(opportunity, userProfile);
  }
};

/**
 * Ask questions about RFP using Gemini
 */
export const answerRFPQuestion = async (opportunity, question) => {
  if (!model) {
    return getFallbackAnswer(question);
  }
  
  try {
    const prompt = `
      Based on this government contract opportunity, answer the following question:
      
      CONTRACT: ${opportunity.title}
      AGENCY: ${opportunity.agency}
      DESCRIPTION: ${opportunity.description?.substring(0, 1500)}
      
      QUESTION: ${question}
      
      Provide a clear, detailed, and helpful answer. If the information is not available in the description, suggest where to find it.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini Q&A error:', error);
    return getFallbackAnswer(question);
  }
};

/**
 * Competitive Analysis using Gemini
 */
export const competitiveAnalysis = async (opportunity, userProfile) => {
  if (!model) {
    return getFallbackCompetitiveAnalysis(opportunity, userProfile);
  }
  
  try {
    const prompt = `
      Analyze the competition for this government contract:
      
      OPPORTUNITY:
      - Title: ${opportunity.title}
      - Agency: ${opportunity.agency}
      - NAICS: ${opportunity.naicsCode}
      - Set-Aside: ${opportunity.setAside || 'Full and Open'}
      - Value: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}
      
      OUR COMPANY:
      - ${userProfile.businessName || 'Small Business'}
      - NAICS: ${userProfile.naicsCodes?.join(', ') || 'Various'}
      
      Provide:
      1. Likely Competitor Types
      2. Our Competitive Advantages
      3. Our Weaknesses to Address
      4. Differentiation Strategy
      5. Key Win Themes to Emphasize
      6. Price Positioning (Low/Medium/High)
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini competitive analysis error:', error);
    return getFallbackCompetitiveAnalysis(opportunity, userProfile);
  }
};

/**
 * Risk Assessment using Gemini
 */
export const riskAssessment = async (opportunity) => {
  if (!model) {
    return getFallbackRiskAssessment(opportunity);
  }
  
  try {
    const prompt = `
      Assess risks for this government contract:
      
      CONTRACT: ${opportunity.title}
      AGENCY: ${opportunity.agency}
      VALUE: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}
      DESCRIPTION: ${opportunity.description?.substring(0, 1000)}
      
      Provide risk assessment for:
      1. Technical Risks (difficulty, complexity)
      2. Financial Risks (profitability, cash flow)
      3. Schedule Risks (deadline feasibility)
      4. Compliance Risks (regulatory, security)
      5. Performance Risks (past performance requirements)
      
      Rate each risk: LOW / MEDIUM / HIGH
      Provide mitigation strategies for each.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini risk assessment error:', error);
    return getFallbackRiskAssessment(opportunity);
  }
};

// ============ FALLBACK FUNCTIONS ============

const getFallbackSummary = (opportunity) => {
  return `
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
};

const getFallbackBidAnalysis = (opportunity, userProfile) => {
  const naicsMatch = userProfile.naicsCodes?.includes(opportunity.naicsCode);
  return `
📊 BID ANALYSIS

Recommendation: ${naicsMatch ? '✅ CONSIDER BIDDING' : '⚠️ REVIEW BEFORE BIDDING'}

Reasons:
${naicsMatch ? '✓ Your NAICS code matches this opportunity' : '✗ NAICS code mismatch - consider adding this code'}
${opportunity.setAside ? '✓ Set-aside opportunity for small business' : '⚠️ No set-aside - open competition'}

Win Probability Estimate: ${naicsMatch ? '60-70%' : '30-40%'}
  `;
};

const getFallbackProposal = (opportunity, userProfile) => {
  return `
📝 PROPOSAL OUTLINE

OPPORTUNITY: ${opportunity.title}
AGENCY: ${opportunity.agency}

1. Executive Summary
   - ${userProfile.businessName || 'Our company'} is qualified for this work
   - Understanding of requirements
   - Commitment to excellence

2. Technical Approach
   - Methodology to be provided
   - Quality control measures
   - Compliance with specifications

3. Management Plan
   - Project organization
   - Key personnel (to be assigned)
   - Timeline management

4. Past Performance
   - Relevant experience summary
   - Client references available

5. Pricing Strategy
   - Competitive pricing structure
   - Cost breakdown to be provided
  `;
};

const getFallbackAnswer = (question) => {
  return `
❓ Question: ${question}

To get the best answer, please:
1. Review the full opportunity on SAM.gov
2. Check the official documentation
3. Contact the contracting officer for clarification
  `;
};

const getFallbackCompetitiveAnalysis = (opportunity, userProfile) => {
  return `
📊 COMPETITIVE ANALYSIS

Contract: ${opportunity.title}
Your NAICS: ${userProfile.naicsCodes?.join(', ') || 'Not set'}
Opportunity NAICS: ${opportunity.naicsCode}

Analysis:
- NAICS Match: ${userProfile.naicsCodes?.includes(opportunity.naicsCode) ? 'YES ✓' : 'NO ✗'}
- Set-Aside: ${opportunity.setAside || 'Full and Open'}

Recommendation: ${userProfile.naicsCodes?.includes(opportunity.naicsCode) ? 'You are competitive in this space' : 'Consider adding this NAICS code to your profile'}
  `;
};

const getFallbackRiskAssessment = (opportunity) => {
  return `
⚠️ RISK ASSESSMENT

Contract: ${opportunity.title}
Value: $${opportunity.estimatedValue?.toLocaleString() || 'Unknown'}

Identified Risks:
1. Technical Risk: MEDIUM - Review requirements carefully
2. Schedule Risk: ${opportunity.dueDate ? 'Review deadline' : 'MEDIUM'}
3. Competition Risk: Depends on set-aside status

Mitigation Strategies:
- Thoroughly review all requirements
- Prepare compliance matrix
- Submit questions before deadline
  `;
};