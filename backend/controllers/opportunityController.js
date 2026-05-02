// backend/controllers/opportunityController.js
import Opportunity from '../models/Opportunity.js';
import { fetchSAMOpportunities } from '../services/samApiService.js';
import { fetchUSAspendingOpportunities } from '../services/usaspendingApiService.js';

/**
 * Check user access, trial status, and daily limits
 */
const checkUserAccess = async (user) => {
  const now = new Date();
  
  // Reset daily matches if new day
  const lastReset = new Date(user.lastMatchReset);
  if (lastReset.toDateString() !== now.toDateString()) {
    user.dailyMatchesUsed = 0;
    user.lastMatchReset = now;
    await user.save();
  }
  
  // Check if trial has expired
  if (user.plan === 'trial' && now > user.trialEndDate) {
    user.plan = 'expired';
    user.isTrialActive = false;
    await user.save();
    return { 
      allowed: false, 
      plan: 'expired', 
      message: 'Your free trial has ended. Please upgrade to continue.',
      dailyLimit: 0,
      dailyUsed: user.dailyMatchesUsed,
      daysLeft: 0
    };
  }
  
  // Return limits based on plan
  const planLimits = {
    trial: { dailyLimit: 2, allowed: true, label: 'Free Trial' },
    free: { dailyLimit: 2, allowed: true, label: 'Free' },
    starter: { dailyLimit: 50, allowed: true, label: 'Starter' },
    pro: { dailyLimit: 1000, allowed: true, label: 'Pro' },
    enterprise: { dailyLimit: 10000, allowed: true, label: 'Enterprise' }
  };
  
  const limit = planLimits[user.plan] || planLimits.trial;
  const daysLeft = user.plan === 'trial' ? Math.ceil((user.trialEndDate - now) / (1000 * 60 * 60 * 24)) : 0;
  
  return {
    allowed: limit.allowed,
    plan: user.plan,
    dailyLimit: limit.dailyLimit,
    dailyUsed: user.dailyMatchesUsed,
    daysLeft,
    label: limit.label,
    message: limit.dailyLimit !== 'unlimited' 
      ? `You've used ${user.dailyMatchesUsed} of ${limit.dailyLimit} matches today.`
      : null
  };
};

// Calculate match score for an opportunity
const calculateMatchScore = (opportunity, user) => {
  let score = 0;
  const reasons = [];
  
  // NAICS Code Match (0-50 points)
  if (user.naicsCodes && user.naicsCodes.includes(opportunity.naicsCode)) {
    score += 50;
    reasons.push('✓ Your NAICS code matches this opportunity');
  } else if (user.naicsCodes && user.naicsCodes.length > 0) {
    score += 5;
    reasons.push('✗ NAICS code mismatch');
  } else {
    score += 10;
    reasons.push('⚠️ No NAICS codes configured');
  }
  
  // Set-Aside Status (0-20 points)
  if (opportunity.setAside) {
    if (opportunity.setAside.toLowerCase().includes('small business')) {
      score += 20;
      reasons.push('✓ Small business set-aside');
    } else if (opportunity.setAside.toLowerCase().includes('sba')) {
      score += 15;
      reasons.push('✓ SBA program');
    } else {
      score += 5;
      reasons.push('⚠️ Check set-aside');
    }
  }
  
  // Time Sensitivity (0-20 points) - Only for active opportunities
  if (opportunity.dueDate) {
    const dueDate = new Date(opportunity.dueDate);
    const now = new Date();
    if (dueDate > now) {
      const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      if (daysLeft > 30) {
        score += 20;
        reasons.push(`✓ ${daysLeft} days to prepare`);
      } else if (daysLeft > 14) {
        score += 15;
        reasons.push(`⚠️ ${daysLeft} days left`);
      } else if (daysLeft > 7) {
        score += 10;
        reasons.push(`⚠️ Only ${daysLeft} days left`);
      } else if (daysLeft > 0) {
        score += 5;
        reasons.push(`❗ Due in ${daysLeft} days`);
      }
    } else {
      score += 5;
      reasons.push('📊 Historical award - research only');
    }
  }
  
  // Contract Value (0-10 points)
  if (opportunity.estimatedValue) {
    if (opportunity.estimatedValue < 100000) {
      score += 10;
      reasons.push('✓ Ideal size (<$100k)');
    } else if (opportunity.estimatedValue < 500000) {
      score += 7;
      reasons.push('✓ Manageable size ($100k-$500k)');
    } else {
      score += 3;
      reasons.push('⚠️ Large contract');
    }
  }
  
  return { score: Math.min(100, score), reasons };
};


export const getOpportunities = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    console.log('📋 Getting opportunities for user:', req.user.email);
    console.log('📋 User NAICS codes:', req.user.naicsCodes);
    console.log('📋 User plan:', req.user.plan);
    console.log('📋 Daily matches used:', req.user.dailyMatchesUsed);
    
    // Check user access and limits
    const access = await checkUserAccess(req.user);
    
    if (!access.allowed) {
      return res.json({
        success: true,
        data: [],
        accessDenied: true,
        message: access.message,
        userProfile: { 
          naicsCodes: req.user.naicsCodes || [], 
          plan: access.plan,
          dailyMatchesUsed: access.dailyUsed,
          dailyLimit: access.dailyLimit,
          daysLeft: access.daysLeft,
          trialEndDate: req.user.trialEndDate
        },
        pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 }
      });
    }
    
    // Build query - get ALL opportunities matching user's NAICS (not just active)
    // For free users, they can see historical data too
    const query = {};
    if (req.user.naicsCodes && req.user.naicsCodes.length > 0) {
      query.naicsCode = { $in: req.user.naicsCodes };
    }
    
    console.log('📋 MongoDB Query:', JSON.stringify(query));
    
    // Get all opportunities from database (including historical)
    let allOpportunities = await Opportunity.find(query)
      .sort({ postedDate: -1 });
    
    console.log(`📋 Found ${allOpportunities.length} total opportunities in database`);
    
    if (allOpportunities.length === 0) {
      return res.json({
        success: true,
        data: [],
        userProfile: { 
          naicsCodes: req.user.naicsCodes || [], 
          plan: access.plan,
          dailyMatchesUsed: access.dailyUsed,
          dailyLimit: access.dailyLimit,
          daysLeft: access.daysLeft,
          remainingMatches: access.dailyLimit - access.dailyUsed
        },
        message: 'No opportunities found. Click Refresh to fetch data.',
        pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 }
      });
    }
    
    // Apply match scoring to ALL opportunities
    const matchedOpportunities = allOpportunities.map(opp => {
      const { score, reasons } = calculateMatchScore(opp, req.user);
      const isActive = opp.dueDate && new Date(opp.dueDate) > new Date();
      return {
        ...opp.toObject(),
        aiMatchScore: score,
        matchReasons: reasons,
        status: isActive ? 'active' : 'historical',
        canApply: isActive
      };
    });
    
    // Sort by match score (highest first)
    matchedOpportunities.sort((a, b) => b.aiMatchScore - a.aiMatchScore);
    
    // Apply daily limit for trial/free users
    let finalOpportunities = matchedOpportunities;
    let limitReached = false;
    let limitMessage = null;
    let remainingMatches = 0;
    
    if (access.dailyLimit !== 'unlimited') {
      remainingMatches = access.dailyLimit - access.dailyUsed;
      
      console.log(`📊 Daily limit: ${access.dailyLimit}, Used: ${access.dailyUsed}, Remaining: ${remainingMatches}`);
      
      if (remainingMatches <= 0) {
        limitReached = true;
        limitMessage = `Daily limit reached (${access.dailyLimit}/day). Upgrade to Pro for unlimited matches.`;
        finalOpportunities = [];
      } else {
        // Show up to remaining matches
        finalOpportunities = matchedOpportunities.slice(0, remainingMatches);
        
        // Update daily usage
        req.user.dailyMatchesUsed += finalOpportunities.length;
        await req.user.save();
        
        console.log(`✅ Showing ${finalOpportunities.length} of ${matchedOpportunities.length} matches (${req.user.dailyMatchesUsed}/${access.dailyLimit} used)`);
        
        if (matchedOpportunities.length > remainingMatches) {
          limitMessage = `Showing ${remainingMatches} of ${matchedOpportunities.length} matches. Upgrade to Pro to see all.`;
        }
      }
    }
    
    // Paginate
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedData = finalOpportunities.slice(startIndex, startIndex + parseInt(limit));
    
    // Get updated access info
    const updatedAccess = await checkUserAccess(req.user);
    
    console.log(`📋 Returning ${paginatedData.length} opportunities to frontend`);
    
    res.json({
      success: true,
      data: paginatedData,
      limitReached,
      limitMessage,
      userProfile: { 
        naicsCodes: req.user.naicsCodes || [], 
        plan: updatedAccess.plan,
        dailyMatchesUsed: req.user.dailyMatchesUsed,
        dailyLimit: updatedAccess.dailyLimit,
        daysLeft: updatedAccess.daysLeft,
        trialEndDate: req.user.trialEndDate,
        remainingMatches: updatedAccess.dailyLimit !== 'unlimited' 
          ? Math.max(0, updatedAccess.dailyLimit - req.user.dailyMatchesUsed)
          : 'Unlimited',
        totalAvailable: matchedOpportunities.length
      },
      stats: {
        total: finalOpportunities.length,
        activeOpportunities: finalOpportunities.filter(o => o.status === 'active').length,
        totalAvailable: matchedOpportunities.length
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: finalOpportunities.length,
        pages: Math.ceil(finalOpportunities.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getOpportunities:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Refresh opportunities from SAM.gov API
// @route   POST /api/opportunities/refresh
export const refreshOpportunities = async (req, res) => {
  try {
    let allOpportunities = [];
    
    console.log('🔄 Refreshing opportunities from SAM.gov for user:', req.user.email);
    console.log('📋 User NAICS codes:', req.user.naicsCodes);
    
    // Fetch from SAM.gov for each NAICS code
    if (req.user.naicsCodes && req.user.naicsCodes.length > 0) {
      for (const code of req.user.naicsCodes.slice(0, 2)) {
        console.log(`📡 Fetching SAM.gov for NAICS: ${code}`);
        const samOpps = await fetchSAMOpportunities(code, 20);
        
        // Only keep active opportunities (future due dates)
        const activeOpps = samOpps.filter(opp => opp.dueDate && new Date(opp.dueDate) > new Date());
        
        if (activeOpps.length > 0) {
          allOpportunities.push(...activeOpps);
          console.log(`✅ Got ${activeOpps.length} active opportunities for NAICS ${code}`);
        }
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`📊 Total active opportunities fetched: ${allOpportunities.length}`);
    
    // Save to database
    let savedCount = 0;
    for (const opp of allOpportunities) {
      if (opp.sourceId) {
        await Opportunity.findOneAndUpdate(
          { sourceId: opp.sourceId },
          opp,
          { upsert: true, new: true }
        ).catch(err => console.log('Save error:', err.message));
        savedCount++;
      }
    }
    
    console.log(`💾 Saved ${savedCount} active opportunities to database`);
    
    res.json({
      success: true,
      message: `Fetched ${allOpportunities.length} active opportunities matching your profile`,
      count: allOpportunities.length,
      totalSaved: savedCount
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ... rest of the functions (getWinningBidsAnalysis, getOpportunityById, etc.) remain the same
// @desc    Get winning bid analysis for market research
// @route   GET /api/opportunities/analysis/winning-bids
export const getWinningBidsAnalysis = async (req, res) => {
  try {
    const { naicsCode, page = 1, limit = 20 } = req.query;
    
    if (!naicsCode) {
      return res.status(400).json({ success: false, message: 'NAICS code required' });
    }
    
    const awards = await fetchUSAspendingOpportunities(naicsCode, 100);
    
    if (!awards || awards.length === 0) {
      return res.json({
        success: true,
        data: {
          naicsCode,
          totalAwards: 0,
          averageAwardValue: 0,
          totalContractValue: 0,
          topWinningAgencies: [],
          awards: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 },
          dataSource: 'No Data Available',
          note: 'No federal spending data found for this NAICS code.'
        }
      });
    }
    
    // Calculate statistics
    const validAwards = awards.filter(a => a.estimatedValue > 0);
    const totalValue = validAwards.reduce((sum, award) => sum + (award.estimatedValue || 0), 0);
    const averageValue = totalValue / (validAwards.length || 1);
    const topWinners = {};
    
    validAwards.forEach(award => {
      const agency = award.agency;
      if (agency && agency !== 'Unknown Agency') {
        topWinners[agency] = (topWinners[agency] || 0) + 1;
      }
    });
    
    const sortedWinners = Object.entries(topWinners)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // Paginate
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedAwards = validAwards.slice(startIndex, startIndex + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        naicsCode,
        totalAwards: validAwards.length,
        averageAwardValue: Math.round(averageValue),
        totalContractValue: Math.round(totalValue),
        topWinningAgencies: sortedWinners.map(([name, count]) => ({ name, count })),
        awards: paginatedAwards.map(a => ({
          id: a.sourceId,
          title: a.title,
          agency: a.agency,
          value: a.estimatedValue,
          date: a.postedDate,
          url: a.url
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: validAwards.length,
          pages: Math.ceil(validAwards.length / parseInt(limit))
        },
        dataSource: 'USAspending.gov (Real Data)',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Winning bids analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single opportunity
// @route   GET /api/opportunities/:id
export const getOpportunityById = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    const { score, reasons } = calculateMatchScore(opportunity, req.user);
    const isActive = opportunity.dueDate && new Date(opportunity.dueDate) > new Date();
    
    res.json({
      success: true,
      data: {
        ...opportunity.toObject(),
        aiMatchScore: score,
        matchReasons: reasons,
        status: isActive ? 'active' : 'historical',
        canApply: isActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user's NAICS codes and company info
// @route   PUT /api/opportunities/profile
export const updateUserProfile = async (req, res) => {
  try {
    const { naicsCodes, companyName, businessType } = req.body;
    
    if (naicsCodes && Array.isArray(naicsCodes)) {
      req.user.naicsCodes = naicsCodes;
    }
    if (companyName) {
      req.user.businessName = companyName;
    }
    if (businessType) {
      req.user.businessType = businessType;
    }
    
    await req.user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        name: req.user.name,
        email: req.user.email,
        businessName: req.user.businessName,
        naicsCodes: req.user.naicsCodes,
        businessType: req.user.businessType,
        plan: req.user.plan,
        trialEndDate: req.user.trialEndDate,
        dailyMatchesUsed: req.user.dailyMatchesUsed
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/opportunities/profile
export const getUserProfile = async (req, res) => {
  try {
    const access = await checkUserAccess(req.user);
    
    res.json({
      success: true,
      user: {
        name: req.user.name,
        email: req.user.email,
        businessName: req.user.businessName,
        naicsCodes: req.user.naicsCodes,
        businessType: req.user.businessType,
        plan: access.plan,
        planExpiresAt: req.user.planExpiresAt,
        trialEndDate: req.user.trialEndDate,
        dailyMatchesUsed: req.user.dailyMatchesUsed,
        dailyLimit: access.dailyLimit === 'unlimited' ? 'Unlimited' : access.dailyLimit,
        daysLeft: access.daysLeft,
        isTrialActive: req.user.isTrialActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate proposal outline
// @route   POST /api/opportunities/:id/proposal-outline
export const generateProposal = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    // Check if user has access to AI features
    const allowedPlans = ['pro', 'enterprise'];
    if (!allowedPlans.includes(req.user.plan)) {
      return res.status(403).json({
        success: false,
        message: 'AI proposal generation requires Pro plan or higher. Upgrade to continue.'
      });
    }
    
    const outline = `
PROPOSAL OUTLINE FOR: ${opportunity.title}

AGENCY: ${opportunity.agency}
NAICS CODE: ${opportunity.naicsCode}
DEADLINE: ${opportunity.dueDate ? new Date(opportunity.dueDate).toLocaleDateString() : 'N/A'}

1. Executive Summary
2. Technical Approach
3. Management Plan
4. Past Performance
5. Pricing Strategy

URL: ${opportunity.url}
    `;
    
    res.json({ success: true, data: { outline } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};