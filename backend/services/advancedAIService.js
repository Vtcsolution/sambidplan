// backend/services/advancedAIService.js
import OpenAI from 'openai';

// Initialize OpenAI only if API key exists
let openai = null;
try {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI service initialized');
  } else {
    console.log('⚠️ OpenAI API key not found. AI features will be disabled.');
  }
} catch (error) {
  console.log('⚠️ OpenAI initialization failed:', error.message);
}

/**
 * Summarize RFP/Opportunity into key points
 */
export const summarizeRFP = async (opportunity) => {
  if (!openai) {
    return getFallbackSummary(opportunity);
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a federal contracting expert. Summarize this RFP into key points.'
        },
        {
          role: 'user',
          content: `
Title: ${opportunity.title}
Agency: ${opportunity.agency}
Description: ${opportunity.description?.substring(0, 2000)}

Provide:
1. Executive Summary
2. Key Requirements
3. Deadline: ${opportunity.dueDate}
4. Recommended Actions
`
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('RFP Summarization error:', error);
    return getFallbackSummary(opportunity);
  }
};

/**
 * Fallback summary when AI is not available
 */
const getFallbackSummary = (opportunity) => {
  return `
📋 OPPORTUNITY SUMMARY (AI Disabled - API Key Missing)

Title: ${opportunity.title}
Agency: ${opportunity.agency}
Due Date: ${opportunity.dueDate ? new Date(opportunity.dueDate).toLocaleDateString() : 'N/A'}
NAICS: ${opportunity.naicsCode}

Key Points:
- Review the full opportunity on SAM.gov
- Check if your NAICS code matches
- Prepare capability statement
- Submit before deadline

💡 Tip: Add OPENAI_API_KEY to .env file to enable AI features.
  `;
};

/**
 * Bid/No-Bid Recommendation with reasoning
 */
export const bidNoBidAnalysis = async (opportunity, userProfile) => {
  if (!openai) {
    return getFallbackBidAnalysis(opportunity, userProfile);
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a federal contracting advisor.'
        },
        {
          role: 'user',
          content: `
Company NAICS: ${userProfile.naicsCodes?.join(', ') || 'Not specified'}
Opportunity NAICS: ${opportunity.naicsCode}
Set-Aside: ${opportunity.setAside || 'None'}

Recommend: BID or NO-BID?
Provide reasons and win probability.
`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    return getFallbackBidAnalysis(opportunity, userProfile);
  }
};

const getFallbackBidAnalysis = (opportunity, userProfile) => {
  const naicsMatch = userProfile.naicsCodes?.includes(opportunity.naicsCode);
  return `
📊 BID ANALYSIS (AI Disabled)

Recommendation: ${naicsMatch ? '✅ CONSIDER BIDDING' : '⚠️ REVIEW BEFORE BIDDING'}

Reasons:
${naicsMatch ? '✓ Your NAICS code matches this opportunity' : '✗ NAICS code mismatch - consider adding this code'}
${opportunity.setAside ? '✓ Set-aside opportunity for small business' : '⚠️ No set-aside - open competition'}

Win Probability Estimate: ${naicsMatch ? '60-70%' : '30-40%'}

💡 Tip: Add OPENAI_API_KEY to .env file for detailed AI analysis.
  `;
};

/**
 * Generate full proposal section by section
 */
export const generateFullProposal = async (opportunity, userProfile) => {
  if (!openai) {
    return getFallbackProposal(opportunity, userProfile);
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional government proposal writer.'
        },
        {
          role: 'user',
          content: `
Write a proposal for: ${opportunity.title}
Agency: ${opportunity.agency}
Company: ${userProfile.businessName || 'Our Company'}

Include: Executive Summary, Technical Approach, Management Plan, Pricing Strategy.
`
        }
      ],
      temperature: 0.4,
      max_tokens: 1500
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    return getFallbackProposal(opportunity, userProfile);
  }
};

const getFallbackProposal = (opportunity, userProfile) => {
  return `
📝 PROPOSAL OUTLINE (AI Disabled)

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

5. Pricing
   - Competitive pricing structure
   - Cost breakdown to be provided

💡 Tip: Add OPENAI_API_KEY to .env file for AI-generated proposals.
  `;
};

// Export other functions with fallbacks
export const answerRFPQuestion = async (opportunity, question) => {
  if (!openai) {
    return `AI features are disabled. Please add OPENAI_API_KEY to your .env file to enable AI-powered answers.\n\nYour question: "${question}"\n\nFor now, please review the opportunity details on SAM.gov.`;
  }
  // ... rest of the function
};

export const competitiveAnalysis = async (opportunity, userProfile) => {
  if (!openai) {
    return getFallbackCompetitiveAnalysis(opportunity, userProfile);
  }
  // ... rest of the function
};

export const riskAssessment = async (opportunity) => {
  if (!openai) {
    return getFallbackRiskAssessment(opportunity);
  }
  // ... rest of the function
};

const getFallbackCompetitiveAnalysis = (opportunity, userProfile) => {
  return `
📊 COMPETITIVE ANALYSIS (AI Disabled)

Contract: ${opportunity.title}
Your NAICS: ${userProfile.naicsCodes?.join(', ') || 'Not set'}
Opportunity NAICS: ${opportunity.naicsCode}

Analysis:
- NAICS Match: ${userProfile.naicsCodes?.includes(opportunity.naicsCode) ? 'YES ✓' : 'NO ✗'}
- Set-Aside: ${opportunity.setAside || 'Full and Open'}

Recommendation: ${userProfile.naicsCodes?.includes(opportunity.naicsCode) ? 'You are competitive in this space' : 'Consider adding this NAICS code to your profile'}

💡 Tip: Add OPENAI_API_KEY for detailed competitor analysis.
  `;
};

const getFallbackRiskAssessment = (opportunity) => {
  return `
⚠️ RISK ASSESSMENT (AI Disabled)

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

💡 Tip: Add OPENAI_API_KEY for AI-powered risk assessment.
  `;
};