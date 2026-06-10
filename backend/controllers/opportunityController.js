// backend/controllers/opportunityController.js
import Opportunity from '../models/Opportunity.js';
import UserOpportunity from '../models/UserOpportunity.js';
import User from '../models/User.js';
import { fetchUSAspendingOpportunities } from '../services/usaspendingApiService.js';
import { triggerManualFetch, distributeToUser } from '../services/schedulerService.js';
import { fetchSAMOpportunities } from '../services/samApiService.js';

// Seed sample opportunities using user's actual NAICS codes so distribution always has candidates
export const seedSampleForUser = async (naicsCodes) => {
  const now = new Date();
  const samples = naicsCodes.flatMap((code, i) => [
    {
      source: 'sam', sourceId: `SAMPLE_${code}_A`,
      title: `IT Services Contract — NAICS ${code}`,
      description: 'Sample federal IT services opportunity. Replace with live SAM.gov data by refreshing.',
      agency: 'Department of Veterans Affairs',
      estimatedValue: 250000,
      postedDate: new Date(now - 1 * 86400000),
      dueDate: new Date(now.getTime() + 35 * 86400000),
      naicsCode: code, setAside: 'Small Business',
      url: 'https://sam.gov', lastFetched: now
    },
    {
      source: 'sam', sourceId: `SAMPLE_${code}_B`,
      title: `Cloud & Infrastructure Support — NAICS ${code}`,
      description: 'Sample cloud infrastructure opportunity. Replace with live SAM.gov data by refreshing.',
      agency: 'Department of Defense',
      estimatedValue: 500000,
      postedDate: new Date(now - 2 * 86400000),
      dueDate: new Date(now.getTime() + 20 * 86400000),
      naicsCode: code, setAside: '',
      url: 'https://sam.gov', lastFetched: now
    }
  ]);

  for (const s of samples) {
    await Opportunity.findOneAndUpdate(
      { sourceId: s.sourceId },
      s,
      { upsert: true, new: true }
    ).catch(() => {});
  }
  console.log(`🧪 Seeded ${samples.length} sample opportunities for NAICS [${naicsCodes.join(', ')}]`);
};

// ─── Access control ───────────────────────────────────────────────────────────
const checkUserAccess = async (user) => {
  const now = new Date();

  if (user.role === 'admin') {
    return { allowed: true, plan: user.plan, monthlyLimit: 'Unlimited', monthlyUsed: 0, daysLeft: 0, label: 'Admin', message: null };
  }

  if (user.plan === 'trial' && now > user.trialEndDate) {
    user.plan = 'expired';
    user.isTrialActive = false;
    await user.save();
    return { allowed: false, plan: 'expired', message: 'Your free trial has ended. Please upgrade to continue.', monthlyLimit: 0, monthlyUsed: 0, daysLeft: 0 };
  }

  // trial and free: daily limit of 3
  if (user.plan === 'trial' || user.plan === 'free') {
    const DAILY_LIMIT = 3;
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const lastDailyReset = new Date(user.lastDailyReset || 0);
    if (lastDailyReset < todayStart) {
      user.dailyMatchesUsed = 0;
      user.lastDailyReset = now;
      await user.save();
    }
    const dailyUsed      = user.dailyMatchesUsed || 0;
    const dailyRemaining = DAILY_LIMIT - dailyUsed;
    const daysLeft       = user.plan === 'trial' ? Math.max(0, Math.ceil((user.trialEndDate - now) / 86400000)) : 0;
    const allowed        = dailyRemaining > 0;
    const label          = user.plan === 'trial' ? 'Free Trial' : 'Free';
    return {
      allowed,
      plan:          user.plan,
      monthlyLimit:  DAILY_LIMIT,
      monthlyUsed:   dailyUsed,
      dailyLimit:    DAILY_LIMIT,
      dailyUsed,
      dailyRemaining,
      daysLeft,
      label,
      message: allowed
        ? `You've used ${dailyUsed} of ${DAILY_LIMIT} free matches today.`
        : 'Daily limit reached. Upgrade to get more matches.',
    };
  }

  // Monthly reset for starter / pro / enterprise
  const lastReset = new Date(user.lastMonthlyReset || 0);
  if (lastReset.getFullYear() !== now.getFullYear() || lastReset.getMonth() !== now.getMonth()) {
    user.monthlyMatchesUsed = 0;
    user.lastMonthlyReset = now;
    await user.save();
  }

  const planLimits = {
    starter:    { monthlyLimit: 500,      label: 'Starter' },
    pro:        { monthlyLimit: 3000,     label: 'Pro' },
    enterprise: { monthlyLimit: Infinity, label: 'Enterprise' },
    expired:    { monthlyLimit: 0,        label: 'Expired' },
  };

  const limit    = planLimits[user.plan] || planLimits.expired;
  const used     = user.monthlyMatchesUsed || 0;
  const allowed  = limit.monthlyLimit > 0;
  const capLabel = limit.monthlyLimit === Infinity ? 'Unlimited' : limit.monthlyLimit;

  return {
    allowed,
    plan:         user.plan,
    monthlyLimit: limit.monthlyLimit === Infinity ? 'Unlimited' : limit.monthlyLimit,
    monthlyUsed:  used,
    daysLeft:     0,
    label:        limit.label,
    message:      allowed
      ? `You've used ${used} of ${capLabel} matches this month.`
      : 'Monthly limit reached. Upgrade to continue.',
  };
};

// Match scoring (used for admin path which reads master store directly)
const calculateMatchScore = (opportunity, user) => {
  let score = 0;
  const reasons = [];

  if (user.naicsCodes?.includes(opportunity.naicsCode)) {
    score += 50; reasons.push('✓ Your NAICS code matches this opportunity');
  } else if (user.naicsCodes?.length > 0) {
    score += 5;  reasons.push('✗ NAICS code mismatch');
  } else {
    score += 10; reasons.push('⚠️ No NAICS codes configured');
  }

  if (opportunity.setAside) {
    const sa = opportunity.setAside.toLowerCase();
    if (sa.includes('small business'))  { score += 20; reasons.push('✓ Small business set-aside'); }
    else if (sa.includes('sba'))        { score += 15; reasons.push('✓ SBA program'); }
    else                                { score += 5;  reasons.push('⚠️ Check set-aside'); }
  }

  if (opportunity.dueDate) {
    const daysLeft = Math.ceil((new Date(opportunity.dueDate) - new Date()) / 86400000);
    if (daysLeft > 30)      { score += 20; reasons.push(`✓ ${daysLeft} days to prepare`); }
    else if (daysLeft > 14) { score += 15; reasons.push(`⚠️ ${daysLeft} days left`); }
    else if (daysLeft > 7)  { score += 10; reasons.push(`⚠️ Only ${daysLeft} days left`); }
    else if (daysLeft > 0)  { score += 5;  reasons.push(`❗ Due in ${daysLeft} days`); }
    else                    { score += 5;  reasons.push('📊 Historical award — research only'); }
  }

  if (opportunity.estimatedValue) {
    if (opportunity.estimatedValue < 100000)      { score += 10; reasons.push('✓ Ideal size (<$100k)'); }
    else if (opportunity.estimatedValue < 500000) { score += 7;  reasons.push('✓ Manageable ($100k–$500k)'); }
    else                                           { score += 3;  reasons.push('⚠️ Large contract'); }
  }

  return { score: Math.min(100, score), reasons };
};

// ─── GET /api/opportunities ───────────────────────────────────────────────────
// Admins: read from global Opportunity store (full visibility)
// Users:  read from their personal UserOpportunity feed (plan-limited)
export const getOpportunities = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      search = '',
      status: statusFilter = 'all',
      minValue, maxValue,
      setAside: setAsideFilter = '',
      naicsCode: naicsFilter = '',
      sortBy = 'matchScore',
    } = req.query;
    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);

    // ── Admin path: full master store ──────────────────────────────────────────
    if (req.user.role === 'admin') {
      const query = { source: { $ne: 'usaspending' } };
      if (req.user.naicsCodes?.length) query.naicsCode = { $in: req.user.naicsCodes };

      const allOpps = await Opportunity.find(query).sort({ postedDate: -1 }).limit(10000).lean();

      const scored = allOpps
        .map(opp => {
          const { score, reasons } = calculateMatchScore(opp, req.user);
          const isActive = opp.dueDate && new Date(opp.dueDate) > new Date();
          return { ...opp, aiMatchScore: score, matchReasons: reasons, status: isActive ? 'active' : 'historical', canApply: isActive };
        })
        .sort((a, b) => b.aiMatchScore - a.aiMatchScore);

      const start = (pageNum - 1) * limitNum;
      return res.json({
        success: true,
        data: scored.slice(start, start + limitNum),
        userProfile: { plan: 'admin', monthlyLimit: 'Unlimited', remainingMatches: 'Unlimited', naicsCodes: req.user.naicsCodes || [] },
        stats: { total: scored.length, activeOpportunities: scored.filter(o => o.status === 'active').length },
        pagination: { page: pageNum, limit: limitNum, total: scored.length, pages: Math.ceil(scored.length / limitNum) }
      });
    }

    // ── Regular user path ──────────────────────────────────────────────────────
    const access = await checkUserAccess(req.user);

    if (!access.allowed) {
      return res.json({
        success: true,
        data: [],
        accessDenied: true,
        message: access.message,
        userProfile: { plan: access.plan, monthlyLimit: access.monthlyLimit, daysLeft: access.daysLeft, naicsCodes: req.user.naicsCodes || [] },
        pagination: { page: 1, limit: limitNum, total: 0, pages: 0 }
      });
    }

    const now = new Date();

    // ── Enterprise: query master store directly — ALL records where dueDate > today ──
    // Bypasses the personal feed so the user always sees everything in the DB.
    // No source filter — enterprise sees SAM.gov solicitations AND active federal
    // contract awards (usaspending records where performance period is still open).
    if (req.user.plan === 'enterprise') {
      const masterQuery = {
        dueDate: { $gt: now }  // strictly future — only requirement for enterprise
      };
      if (req.user.naicsCodes?.length) masterQuery.naicsCode = { $in: req.user.naicsCodes };
      if (naicsFilter) masterQuery.naicsCode = naicsFilter;

      let allOpps = await Opportunity.find(masterQuery).sort({ dueDate: 1 }).lean();

      // Score and rank
      let enterpriseResult = allOpps.map(opp => {
        const { score, reasons } = calculateMatchScore(opp, req.user);
        return { ...opp, aiMatchScore: score, matchReasons: reasons, status: 'active', canApply: true };
      }).sort((a, b) => b.aiMatchScore - a.aiMatchScore);

      // Apply filters
      if (search.trim()) {
        const q = search.toLowerCase();
        enterpriseResult = enterpriseResult.filter(o =>
          o.title?.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q) || o.agency?.toLowerCase().includes(q)
        );
      }
      if (setAsideFilter) enterpriseResult = enterpriseResult.filter(o => o.setAside === setAsideFilter);
      if (minValue)       enterpriseResult = enterpriseResult.filter(o => (o.estimatedValue || 0) >= parseFloat(minValue));
      if (maxValue)       enterpriseResult = enterpriseResult.filter(o => (o.estimatedValue || 0) <= parseFloat(maxValue));
      if (sortBy === 'dueDate')  enterpriseResult.sort((a, b) => new Date(a.dueDate||0) - new Date(b.dueDate||0));
      else if (sortBy === 'value')  enterpriseResult.sort((a, b) => (b.estimatedValue||0) - (a.estimatedValue||0));
      else if (sortBy === 'posted') enterpriseResult.sort((a, b) => new Date(b.postedDate||0) - new Date(a.postedDate||0));

      const eStart = (pageNum - 1) * limitNum;
      return res.json({
        success: true,
        data: enterpriseResult.slice(eStart, eStart + limitNum),
        userProfile: {
          naicsCodes: req.user.naicsCodes || [],
          plan: 'enterprise',
          monthlyMatchesUsed: 0,
          monthlyLimit: 'Unlimited',
          daysLeft: 0,
          trialEndDate: null,
          totalAssigned: enterpriseResult.length,
          remainingThisMonth: 'Unlimited'
        },
        stats: { total: enterpriseResult.length, activeOpportunities: enterpriseResult.length },
        pagination: { page: pageNum, limit: limitNum, total: enterpriseResult.length, pages: Math.ceil(enterpriseResult.length / limitNum) }
      });
    }

    // ── Starter / Pro / Trial / Free: personal UserOpportunity feed ────────────
    let userOpps = await UserOpportunity.find({ user: req.user._id })
      .populate('opportunity')
      .sort({ matchScore: -1, fetchedAt: -1 })
      .lean();

    // Remove stale records: past due-date OR missing due-date (award notices)
    const staleUOIds = userOpps
      .filter(uo => {
        if (!uo.opportunity) return true; // orphaned
        if (!uo.opportunity.dueDate) return true; // no deadline = award notice, exclude
        return new Date(uo.opportunity.dueDate) <= now; // past deadline
      })
      .map(uo => uo._id);

    if (staleUOIds.length > 0 && req.user.naicsCodes?.length > 0) {
      await UserOpportunity.deleteMany({ _id: { $in: staleUOIds } });
      await distributeToUser(req.user);
      userOpps = await UserOpportunity.find({ user: req.user._id })
        .populate('opportunity').sort({ matchScore: -1, fetchedAt: -1 }).lean();
    }

    // On-demand fill: if feed is empty (new user or fully expired)
    if (userOpps.filter(uo => uo.opportunity).length === 0 && req.user.naicsCodes?.length > 0) {
      console.log(`🔄 Empty feed for ${req.user.email} — triggering on-demand fill`);

      const masterCount = await Opportunity.countDocuments({
        naicsCode: { $in: req.user.naicsCodes },
        dueDate: { $gt: now }
      });

      if (masterCount === 0) {
        console.log('📡 Master store empty — fetching from SAM.gov...');
        for (const code of req.user.naicsCodes.slice(0, 3)) {
          await fetchSAMOpportunities(code, 200);
        }
        const afterFetch = await Opportunity.countDocuments({ naicsCode: { $in: req.user.naicsCodes } });
        if (afterFetch === 0) {
          await seedSampleForUser(req.user.naicsCodes.slice(0, 2));
        }
      }

      await distributeToUser(req.user);
      userOpps = await UserOpportunity.find({ user: req.user._id })
        .populate('opportunity').sort({ matchScore: -1, fetchedAt: -1 }).lean();
    }

    // Keep only records that have a dueDate strictly in the future
    let valid = userOpps.filter(uo =>
      uo.opportunity && uo.opportunity.dueDate && new Date(uo.opportunity.dueDate) > now
    );

    const result = valid.map(uo => {
      const opp = uo.opportunity;
      return {
        ...opp,
        aiMatchScore: uo.matchScore,
        matchReasons: uo.matchReasons,
        status:       'active',
        canApply:     true,
        assignedAt:   uo.fetchedAt
      };
    });

    // ── Advanced filters ──────────────────────────────────────────────────────
    let filtered = result;

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(o =>
        o.title?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        o.agency?.toLowerCase().includes(q)
      );
    }
    if (setAsideFilter) filtered = filtered.filter(o => o.setAside === setAsideFilter);
    if (naicsFilter)    filtered = filtered.filter(o => o.naicsCode === naicsFilter);
    if (minValue)       filtered = filtered.filter(o => (o.estimatedValue || 0) >= parseFloat(minValue));
    if (maxValue)       filtered = filtered.filter(o => (o.estimatedValue || 0) <= parseFloat(maxValue));

    // ── Sort ──────────────────────────────────────────────────────────────────
    if (sortBy === 'dueDate')    filtered.sort((a, b) => new Date(a.dueDate||0) - new Date(b.dueDate||0));
    else if (sortBy === 'value') filtered.sort((a, b) => (b.estimatedValue||0) - (a.estimatedValue||0));
    else if (sortBy === 'posted') filtered.sort((a, b) => new Date(b.postedDate||0) - new Date(a.postedDate||0));

    const start     = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);

    res.json({
      success: true,
      data: paginated,
      userProfile: {
        naicsCodes:         req.user.naicsCodes || [],
        plan:               access.plan,
        monthlyMatchesUsed: req.user.monthlyMatchesUsed || 0,
        monthlyLimit:       access.monthlyLimit,
        daysLeft:           access.daysLeft,
        trialEndDate:       req.user.trialEndDate,
        totalAssigned:      result.length,
        remainingThisMonth: access.monthlyLimit === 'Unlimited'
          ? 'Unlimited'
          : Math.max(0, access.monthlyLimit - (req.user.monthlyMatchesUsed || 0))
      },
      stats: {
        total:               filtered.length,
        activeOpportunities: filtered.length
      },
      pagination: {
        page:  pageNum,
        limit: limitNum,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limitNum)
      }
    });
  } catch (error) {
    console.error('getOpportunities error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/opportunities/refresh  (admin only) ────────────────────────────
// Triggers Phase 1 (master fetch) + Phase 2 (user distribution) immediately.
export const refreshOpportunities = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    console.log(`🔄 Admin ${req.user.email} triggered manual refresh`);
    await triggerManualFetch();

    const masterCount = await Opportunity.countDocuments();

    res.json({
      success: true,
      message: 'Master fetch and user distribution complete.',
      masterStoreCount: masterCount
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/opportunities/analysis/winning-bids ─────────────────────────────
export const getWinningBidsAnalysis = async (req, res) => {
  try {
    const { naicsCode, page = 1, limit = 20 } = req.query;

    if (!naicsCode) {
      return res.status(400).json({ success: false, message: 'NAICS code required' });
    }

    const awards = await fetchUSAspendingOpportunities(naicsCode, 100);

    if (!awards?.length) {
      return res.json({
        success: true,
        data: {
          naicsCode, totalAwards: 0, averageAwardValue: 0, totalContractValue: 0,
          topWinningAgencies: [], awards: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 },
          dataSource: 'No Data Available',
          note: 'No federal spending data found for this NAICS code.'
        }
      });
    }

    const validAwards  = awards.filter(a => a.estimatedValue > 0);
    const totalValue   = validAwards.reduce((sum, a) => sum + (a.estimatedValue || 0), 0);
    const averageValue = totalValue / (validAwards.length || 1);

    const topWinners = {};
    validAwards.forEach(a => {
      if (a.agency && a.agency !== 'Unknown Agency') topWinners[a.agency] = (topWinners[a.agency] || 0) + 1;
    });

    const sortedWinners = Object.entries(topWinners).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const start         = (parseInt(page) - 1) * parseInt(limit);
    const paginatedAwards = validAwards.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: {
        naicsCode,
        totalAwards:         validAwards.length,
        averageAwardValue:   Math.round(averageValue),
        totalContractValue:  Math.round(totalValue),
        topWinningAgencies:  sortedWinners.map(([name, count]) => ({ name, count })),
        awards: paginatedAwards.map(a => ({
          id: a.sourceId, title: a.title, agency: a.agency, value: a.estimatedValue, date: a.postedDate, url: a.url
        })),
        pagination: { page: parseInt(page), limit: parseInt(limit), total: validAwards.length, pages: Math.ceil(validAwards.length / parseInt(limit)) },
        dataSource:  'USAspending.gov (Real Data)',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Winning bids analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/opportunities/:id ───────────────────────────────────────────────
export const getOpportunityById = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Not found' });

    const { score, reasons } = calculateMatchScore(opportunity, req.user);
    const isActive = opportunity.dueDate && new Date(opportunity.dueDate) > new Date();

    res.json({
      success: true,
      data: {
        ...opportunity.toObject(),
        aiMatchScore:  score,
        matchReasons:  reasons,
        status:        isActive ? 'active' : 'historical',
        canApply:      isActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/opportunities/profile ──────────────────────────────────────────
export const updateUserProfile = async (req, res) => {
  try {
    const { naicsCodes, companyName, businessType } = req.body;
    if (naicsCodes && Array.isArray(naicsCodes)) req.user.naicsCodes = naicsCodes;
    if (companyName)  req.user.businessName  = companyName;
    if (businessType) req.user.businessType  = businessType;
    await req.user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        name:         req.user.name,
        email:        req.user.email,
        businessName: req.user.businessName,
        naicsCodes:   req.user.naicsCodes,
        businessType: req.user.businessType,
        plan:         req.user.plan,
        trialEndDate: req.user.trialEndDate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/opportunities/profile ──────────────────────────────────────────
export const getUserProfile = async (req, res) => {
  try {
    const access = await checkUserAccess(req.user);
    res.json({
      success: true,
      user: {
        name:             req.user.name,
        email:            req.user.email,
        businessName:     req.user.businessName,
        naicsCodes:       req.user.naicsCodes,
        businessType:     req.user.businessType,
        plan:             access.plan,
        planExpiresAt:    req.user.planExpiresAt,
        trialEndDate:     req.user.trialEndDate,
        monthlyMatchesUsed: req.user.monthlyMatchesUsed || 0,
        monthlyLimit:       access.monthlyLimit,
        daysLeft:         access.daysLeft,
        isTrialActive:    req.user.isTrialActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/opportunities/:id/proposal-outline ────────────────────────────
export const generateProposal = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Not found' });

    if (!['pro', 'enterprise'].includes(req.user.plan)) {
      return res.status(403).json({
        success: false,
        message: 'AI proposal generation requires Pro plan or higher.'
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
    `.trim();

    res.json({ success: true, data: { outline } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/opportunities/refresh-my-feed (user-accessible) ───────────────
// Clears the user's stale feed and refills it based on their current plan.
// Safe to call after a plan upgrade to get new quota/window immediately.
export const refreshUserFeed = async (req, res) => {
  try {
    const access = await checkUserAccess(req.user);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    // Clear existing feed so distributeToUser treats it as fresh
    await UserOpportunity.deleteMany({ user: req.user._id });

    // Ensure master store has active candidates for this user's NAICS codes
    if (req.user.naicsCodes?.length) {
      const masterCount = await Opportunity.countDocuments({
        naicsCode: { $in: req.user.naicsCodes },
        source: { $ne: 'usaspending' },
        dueDate: { $gt: new Date() }
      });
      if (masterCount === 0) {
        for (const code of req.user.naicsCodes.slice(0, 3)) {
          await fetchSAMOpportunities(code, 50).catch(() => {});
        }
      }
    }

    const added = await distributeToUser(req.user);
    console.log(`✅ User feed refreshed for ${req.user.email}: ${added || 0} opportunities`);

    res.json({ success: true, message: 'Your feed has been refreshed.', count: added || 0 });
  } catch (error) {
    console.error('Refresh user feed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/opportunities/debug/check  (admin only) ────────────────────────
export const debugCheckOpportunities = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const masterCount  = await Opportunity.countDocuments();
    const userFeedCount = await UserOpportunity.countDocuments({ user: req.user._id });

    const naicsCount = req.user.naicsCodes?.length
      ? await Opportunity.countDocuments({ naicsCode: { $in: req.user.naicsCodes } })
      : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCount = await Opportunity.countDocuments({
      naicsCode: { $in: req.user.naicsCodes || [] },
      postedDate: { $gte: sevenDaysAgo }
    });

    const sampleOpps = await Opportunity.find({
      naicsCode: { $in: req.user.naicsCodes || [] }
    }).limit(5).lean();

    res.json({
      success: true,
      data: {
        masterStoreTotal:          masterCount,
        matchingUserNAICS:         naicsCount,
        recentOpportunitiesLast7d: recentCount,
        userFeedTotal:             userFeedCount,
        sampleOpportunities: sampleOpps.map(o => ({
          id: o._id, title: o.title, naicsCode: o.naicsCode, postedDate: o.postedDate, dueDate: o.dueDate
        })),
        userInfo: {
          email:            req.user.email,
          plan:             req.user.plan,
          naicsCodes:       req.user.naicsCodes,
          monthlyMatchesUsed: req.user.monthlyMatchesUsed || 0,
          lastMonthlyReset:   req.user.lastMonthlyReset
        }
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
