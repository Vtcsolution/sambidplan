// backend/controllers/opportunityController.js
import Opportunity from '../models/Opportunity.js';
import UserOpportunity from '../models/UserOpportunity.js';
import User from '../models/User.js';
import { fetchUSAspendingOpportunities } from '../services/usaspendingApiService.js';
import { triggerManualFetch, distributeToUser } from '../services/schedulerService.js';
import axios from 'axios';
import { fetchSAMOpportunities, fetchSAMResourceLinks, samGetWithRotation } from '../services/samApiService.js';
import Company from '../models/Company.js';
import Plan from '../models/Plan.js';

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

  // trial and free: daily limit (admin-configurable via Plan model, fallback to 3)
  if (user.plan === 'trial' || user.plan === 'free') {
    let DAILY_LIMIT = 3;
    try {
      const dbPlan = await Plan.findOne({ name: 'free' }).select('dailyLimit').lean();
      if (dbPlan?.dailyLimit > 0) DAILY_LIMIT = dbPlan.dailyLimit;
    } catch {}
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

  // Read limit from Plan model (admin-configurable), fallback to hardcoded defaults
  const fallbackLimits = { starter: 500, pro: 3000, enterprise: 0, expired: 0 };
  let monthlyLimit;
  try {
    const dbPlan = await Plan.findOne({ name: user.plan }).select('opportunitiesPerMonth displayName').lean();
    monthlyLimit = dbPlan?.opportunitiesPerMonth > 0 ? dbPlan.opportunitiesPerMonth : (fallbackLimits[user.plan] ?? 0);
  } catch {
    monthlyLimit = fallbackLimits[user.plan] ?? 0;
  }
  const isUnlimited = monthlyLimit === 0 && ['enterprise'].includes(user.plan);

  const used     = user.monthlyMatchesUsed || 0;
  const allowed  = isUnlimited || monthlyLimit > 0;
  const capLabel = isUnlimited ? 'Unlimited' : monthlyLimit;

  // Count actual UserOpportunity records for this user this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const actualCount = await UserOpportunity.countDocuments({ user: user._id, fetchedAt: { $gte: monthStart } });

  return {
    allowed,
    plan:         user.plan,
    monthlyLimit: isUnlimited ? 'Unlimited' : monthlyLimit,
    monthlyUsed:  actualCount,
    daysLeft:     0,
    label:        user.plan.charAt(0).toUpperCase() + user.plan.slice(1),
    message:      allowed
      ? `You have ${actualCount} of ${capLabel} matches this month.`
      : 'Monthly limit reached. Upgrade to continue.',
  };
};

// Match scoring (used for admin path which reads master store directly)
// Set-aside type → which certifications qualify
const SET_ASIDE_CERT_MAP = {
  '8(a)':       ['8a', '8(a)'],
  'wosb':       ['wosb', 'edwosb', 'women'],
  'edwosb':     ['edwosb'],
  'hubzone':    ['hubzone'],
  'sdvosb':     ['sdvosb', 'service-disabled'],
  'vosb':       ['vosb', 'sdvosb', 'veteran'],
  'sdb':        ['sdb', '8a', '8(a)'],
};

const calculateMatchScore = (opportunity, user) => {
  let score = 0;
  const reasons = [];

  // 1. NAICS match (50 pts exact, 35 pts same 4-digit family)
  const exactNaicsMatch = user.naicsCodes?.includes(opportunity.naicsCode);
  const naicsFamilyPfx = [...new Set((user.naicsCodes || []).map(c => c.slice(0, 4)))];
  const familyNaicsMatch = !exactNaicsMatch && naicsFamilyPfx.some(p => opportunity.naicsCode?.startsWith(p));
  if (exactNaicsMatch) {
    score += 50; reasons.push('✓ Your NAICS code matches this opportunity');
  } else if (familyNaicsMatch) {
    score += 35; reasons.push('✓ Same NAICS industry group — likely relevant');
  } else if (user.naicsCodes?.length > 0) {
    score += 5;  reasons.push('✗ NAICS code mismatch');
  } else {
    score += 10; reasons.push('⚠️ No NAICS codes configured');
  }

  // 2. Set-aside eligibility (up to 20 points — checks actual certifications)
  if (opportunity.setAside) {
    const sa = opportunity.setAside.toLowerCase();
    const userCerts = (user.certifications || []).map(c => (typeof c === 'string' ? c : c.name || c.type || '').toLowerCase());

    if (sa.includes('full and open') || sa.includes('unrestricted')) {
      score += 15; reasons.push('✓ Full & Open competition — anyone can bid');
    } else {
      // Check if user's certs qualify for this set-aside
      let eligible = false;
      for (const [keyword, qualifyingCerts] of Object.entries(SET_ASIDE_CERT_MAP)) {
        if (sa.includes(keyword)) {
          eligible = qualifyingCerts.some(cert => userCerts.some(uc => uc.includes(cert)));
          break;
        }
      }

      if (sa.includes('small business') && !eligible) {
        eligible = userCerts.length > 0 || (user.businessType && user.businessType !== 'corporation');
      }

      if (eligible) {
        score += 20; reasons.push(`✓ ${opportunity.setAside} — your certifications qualify`);
      } else if (userCerts.length === 0) {
        score += 5;  reasons.push(`⚠️ ${opportunity.setAside} — add certifications to check eligibility`);
      } else {
        score += 0;  reasons.push(`❌ ${opportunity.setAside} — you may not qualify (check your certs)`);
      }
    }
  }

  // 3. Timeline (20 points)
  if (opportunity.dueDate) {
    const daysLeft = Math.ceil((new Date(opportunity.dueDate) - new Date()) / 86400000);
    if (daysLeft > 30)      { score += 20; reasons.push(`✓ ${daysLeft} days to prepare`); }
    else if (daysLeft > 14) { score += 15; reasons.push(`⚠️ ${daysLeft} days left`); }
    else if (daysLeft > 7)  { score += 10; reasons.push(`⚠️ Only ${daysLeft} days left`); }
    else if (daysLeft > 0)  { score += 5;  reasons.push(`❗ Due in ${daysLeft} days`); }
    else                    { score += 5;  reasons.push('📊 Historical award — research only'); }
  }

  // 4. Contract value (10 points)
  if (opportunity.estimatedValue) {
    if (opportunity.estimatedValue < 100000)       { score += 10; reasons.push('✓ Ideal size (<$100k)'); }
    else if (opportunity.estimatedValue < 500000)  { score += 7;  reasons.push('✓ Manageable ($100k–$500k)'); }
    else if (opportunity.estimatedValue < 2000000) { score += 5;  reasons.push('⚠️ Large ($500k–$2M)'); }
    else                                            { score += 3;  reasons.push('⚠️ Very large contract (>$2M)'); }
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
      keywordMode = 'any',           // any | all | exact
      status: statusFilter = 'all',
      minValue, maxValue,
      setAside: setAsideFilter = '',
      naicsCode: naicsFilter = '',
      sortBy = 'matchScore',
      dueDateFrom = '', dueDateTo = '',
      postedFrom = '', postedTo = '',
      noticeType: noticeTypeFilter = '',
      agency: agencyFilter = '',
      placeOfPerformance: popFilter = '', // state or city text
      pscCode: pscFilter = '',
      daysLeft: daysLeftFilter = '',  // e.g. '15', '30', '60', '90'
      includePotential = 'true',     // include sector-matched potential matches
    } = req.query;
    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);

    // Helper: keyword-mode aware text search
    const matchesKeyword = (opp, q) => {
      if (!q.trim()) return true;
      const haystack = `${opp.title || ''} ${opp.description || ''} ${opp.agency || ''} ${opp.naicsDescription || ''} ${opp.pscDescription || ''}`.toLowerCase();
      const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (keywordMode === 'exact') return haystack.includes(q.trim().toLowerCase());
      if (keywordMode === 'all')   return terms.every(t => haystack.includes(t));
      return terms.some(t => haystack.includes(t)); // 'any' (default)
    };

    // Helper: compute deadline status for a dueDate
    const deadlineStatus = (dueDate) => {
      if (!dueDate) return { isExpired: false, hoursUntilDue: null, deadlineStatus: 'unknown' };
      const msLeft = new Date(dueDate) - new Date();
      const h = msLeft / (1000 * 60 * 60);
      if (h < 0)   return { isExpired: true,  hoursUntilDue: Math.round(h * 10) / 10, deadlineStatus: 'expired' };
      if (h < 24)  return { isExpired: false,  hoursUntilDue: Math.round(h * 10) / 10, deadlineStatus: 'closing_soon' };
      if (h < 72)  return { isExpired: false,  hoursUntilDue: Math.round(h * 10) / 10, deadlineStatus: 'due_soon' };
      return { isExpired: false, hoursUntilDue: Math.round(h * 10) / 10, deadlineStatus: 'active' };
    };

    // Enrich user with company certifications for set-aside eligibility checking
    if (!req.user.certifications) {
      try {
        const company = await Company.findOne({ owner: req.user._id }).select('certifications').lean();
        if (company?.certifications?.length) {
          req.user.certifications = company.certifications;
        }
      } catch {}
    }

    // ── Admin path: full master store ──────────────────────────────────────────
    if (req.user.role === 'admin') {
      const query = { source: { $ne: 'usaspending' } };
      if (req.user.naicsCodes?.length) query.naicsCode = { $in: req.user.naicsCodes };

      const [total, activeCount, pageOpps] = await Promise.all([
        Opportunity.countDocuments(query),
        Opportunity.countDocuments({ ...query, dueDate: { $gt: new Date() } }),
        Opportunity.find(query)
          .sort({ postedDate: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean()
      ]);

      const data = pageOpps.map(opp => {
        const { score, reasons } = calculateMatchScore(opp, req.user);
        const ds = deadlineStatus(opp.dueDate);
        return { ...opp, aiMatchScore: score, matchReasons: reasons, ...ds, status: ds.isExpired ? 'expired' : 'active', canApply: !ds.isExpired };
      });

      return res.json({
        success: true,
        data,
        userProfile: { plan: 'admin', monthlyLimit: 'Unlimited', remainingMatches: 'Unlimited', naicsCodes: req.user.naicsCodes || [] },
        stats: { total, activeOpportunities: activeCount },
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
      });
    }

    // ── Regular user path ──────────────────────────────────────────────────────
    const access = await checkUserAccess(req.user);

    // Only hard-block fully expired plans — daily/monthly limits should not hide the feed,
    // they only gate new distributions (enforced inside distributeToUser).
    if (access.plan === 'expired') {
      return res.json({
        success: true,
        data: [],
        accessDenied: true,
        message: access.message,
        userProfile: { plan: access.plan, monthlyLimit: 0, daysLeft: 0, naicsCodes: req.user.naicsCodes || [] },
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
      if (req.user.naicsCodes?.length) {
        const entPrefixes = [...new Set(req.user.naicsCodes.map(c => c.slice(0, 4)))];
        masterQuery.naicsCode = { $regex: new RegExp(`^(${entPrefixes.join('|')})`) };
      }
      if (naicsFilter) masterQuery.naicsCode = naicsFilter;

      let allOpps = await Opportunity.find(masterQuery).sort({ dueDate: 1 }).lean();

      // Score and rank
      let enterpriseResult = allOpps.map(opp => {
        const { score, reasons } = calculateMatchScore(opp, req.user);
        const ds = deadlineStatus(opp.dueDate);
        return { ...opp, aiMatchScore: score, matchReasons: reasons, ...ds, status: ds.isExpired ? 'expired' : 'active', canApply: !ds.isExpired };
      }).sort((a, b) => b.aiMatchScore - a.aiMatchScore);

      // Apply filters
      if (search.trim())     enterpriseResult = enterpriseResult.filter(o => matchesKeyword(o, search));
      if (setAsideFilter)    enterpriseResult = enterpriseResult.filter(o => o.setAside === setAsideFilter);
      if (minValue)          enterpriseResult = enterpriseResult.filter(o => (o.estimatedValue || 0) >= parseFloat(minValue));
      if (maxValue)          enterpriseResult = enterpriseResult.filter(o => (o.estimatedValue || 0) <= parseFloat(maxValue));
      if (dueDateFrom)       enterpriseResult = enterpriseResult.filter(o => o.dueDate && new Date(o.dueDate) >= new Date(dueDateFrom));
      if (dueDateTo)         enterpriseResult = enterpriseResult.filter(o => o.dueDate && new Date(o.dueDate) <= new Date(dueDateTo + 'T23:59:59'));
      if (postedFrom)        enterpriseResult = enterpriseResult.filter(o => o.postedDate && new Date(o.postedDate) >= new Date(postedFrom));
      if (postedTo)          enterpriseResult = enterpriseResult.filter(o => o.postedDate && new Date(o.postedDate) <= new Date(postedTo + 'T23:59:59'));
      if (noticeTypeFilter)  enterpriseResult = enterpriseResult.filter(o => o.noticeType === noticeTypeFilter);
      if (agencyFilter)      enterpriseResult = enterpriseResult.filter(o => o.agency?.toLowerCase().includes(agencyFilter.toLowerCase()));
      if (popFilter) {
        const pq = popFilter.trim().toLowerCase();
        const isStateAbbr = /^[a-z]{2}$/.test(pq);
        enterpriseResult = enterpriseResult.filter(o => {
          const pop = o.placeOfPerformance;
          if (!pop) return false;
          if (isStateAbbr) return pop.state?.toLowerCase() === pq;
          return pop.state?.toLowerCase().includes(pq) || pop.city?.toLowerCase().includes(pq) || pop.stateName?.toLowerCase().includes(pq);
        });
      }
      if (pscFilter)         enterpriseResult = enterpriseResult.filter(o => o.pscCode?.toLowerCase().includes(pscFilter.toLowerCase()) || o.pscDescription?.toLowerCase().includes(pscFilter.toLowerCase()));
      if (daysLeftFilter) {
        const maxDays = parseInt(daysLeftFilter);
        if (!isNaN(maxDays)) {
          const now = Date.now();
          enterpriseResult = enterpriseResult.filter(o => {
            if (!o.dueDate) return false;
            const days = (new Date(o.dueDate) - now) / 86400000;
            return days > 0 && days <= maxDays;
          });
        }
      }
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

    // 48-hour grace: remove opportunities whose dueDate has passed by more than 48 hours.
    // Opportunities with NO dueDate (award notices, special notices) are kept — they are
    // permanent records and may still be valuable to the user.
    const EXPIRED_GRACE_MS = 48 * 60 * 60 * 1000;
    const staleUOIds = userOpps
      .filter(uo => {
        if (!uo.opportunity) return true; // orphaned record — opportunity was deleted
        if (!uo.opportunity.dueDate) return false; // no deadline → keep it (award notice etc.)
        return new Date(uo.opportunity.dueDate) <= new Date(now - EXPIRED_GRACE_MS);
      })
      .map(uo => uo._id);

    if (staleUOIds.length > 0 && req.user.naicsCodes?.length > 0) {
      await UserOpportunity.deleteMany({ _id: { $in: staleUOIds } });
    }

    // Always check for new unassigned opportunities in the master store
    if (req.user.naicsCodes?.length > 0) {
      const existingOppIds = userOpps.filter(uo => uo.opportunity).map(uo => uo.opportunity._id);
      const userFamilyPfx = [...new Set(req.user.naicsCodes.map(c => c.slice(0, 4)))];
      const newInMaster = await Opportunity.countDocuments({
        naicsCode: { $regex: new RegExp(`^(${userFamilyPfx.join('|')})`) },
        dueDate: { $gt: now },
        source: { $ne: 'usaspending' },
        _id: { $nin: existingOppIds },
      });

      if (newInMaster > 0 || staleUOIds.length > 0) {
        await distributeToUser(req.user);
        userOpps = await UserOpportunity.find({ user: req.user._id })
          .populate('opportunity').sort({ matchScore: -1, fetchedAt: -1 }).lean();
      }
    }

    // On-demand fill: if feed is empty (new user or fully expired)
    if (userOpps.filter(uo => uo.opportunity).length === 0 && req.user.naicsCodes?.length > 0) {
      console.log(`🔄 Empty feed for ${req.user.email} — triggering on-demand fill`);

      const fillFamilyPfx = [...new Set(req.user.naicsCodes.map(c => c.slice(0, 4)))];
      const fillFamilyFilter = { naicsCode: { $regex: new RegExp(`^(${fillFamilyPfx.join('|')})`) } };
      const masterCount = await Opportunity.countDocuments({
        ...fillFamilyFilter,
        dueDate: { $gt: now }
      });

      if (masterCount === 0) {
        console.log('📡 Master store empty — fetching from SAM.gov...');
        for (const code of req.user.naicsCodes.slice(0, 3)) {
          await fetchSAMOpportunities(code, 200).catch(() => {});
        }
        const afterFetch = await Opportunity.countDocuments({
          ...fillFamilyFilter,
          dueDate: { $gt: now },
        });
        if (afterFetch === 0) {
          console.log('🧪 SAM.gov returned nothing — seeding sample opportunities');
          await seedSampleForUser(req.user.naicsCodes.slice(0, 2));
        }
      }

      await distributeToUser(req.user);
      userOpps = await UserOpportunity.find({ user: req.user._id })
        .populate('opportunity').sort({ matchScore: -1, fetchedAt: -1 }).lean();
    }

    // Keep opps with dueDate in future OR within the 48h expired grace window
    let valid = userOpps.filter(uo =>
      uo.opportunity && uo.opportunity.dueDate &&
      new Date(uo.opportunity.dueDate) > new Date(now - EXPIRED_GRACE_MS)
    );

    const result = valid.map(uo => {
      const opp = uo.opportunity;
      const ds = deadlineStatus(opp.dueDate);
      return {
        ...opp,
        aiMatchScore: uo.matchScore,
        matchReasons: uo.matchReasons,
        ...ds,
        status:     ds.isExpired ? 'expired' : 'active',
        canApply:   !ds.isExpired,
        assignedAt: uo.fetchedAt
      };
    });

    // ── Advanced filters ──────────────────────────────────────────────────────
    let filtered = result;

    if (search.trim())     filtered = filtered.filter(o => matchesKeyword(o, search));
    if (setAsideFilter)    filtered = filtered.filter(o => o.setAside === setAsideFilter);
    if (naicsFilter)       filtered = filtered.filter(o => o.naicsCode === naicsFilter);
    if (minValue)          filtered = filtered.filter(o => (o.estimatedValue || 0) >= parseFloat(minValue));
    if (maxValue)          filtered = filtered.filter(o => (o.estimatedValue || 0) <= parseFloat(maxValue));
    if (dueDateFrom)       filtered = filtered.filter(o => o.dueDate && new Date(o.dueDate) >= new Date(dueDateFrom));
    if (dueDateTo)         filtered = filtered.filter(o => o.dueDate && new Date(o.dueDate) <= new Date(dueDateTo + 'T23:59:59'));
    if (postedFrom)        filtered = filtered.filter(o => o.postedDate && new Date(o.postedDate) >= new Date(postedFrom));
    if (postedTo)          filtered = filtered.filter(o => o.postedDate && new Date(o.postedDate) <= new Date(postedTo + 'T23:59:59'));
    if (noticeTypeFilter)  filtered = filtered.filter(o => o.noticeType === noticeTypeFilter);
    if (agencyFilter)      filtered = filtered.filter(o => o.agency?.toLowerCase().includes(agencyFilter.toLowerCase()));
    if (popFilter) {
      const pq = popFilter.trim().toLowerCase();
      const isStateAbbr = /^[a-z]{2}$/.test(pq);
      filtered = filtered.filter(o => {
        const pop = o.placeOfPerformance;
        if (!pop) return false;
        if (isStateAbbr) return pop.state?.toLowerCase() === pq;
        return pop.state?.toLowerCase().includes(pq) || pop.city?.toLowerCase().includes(pq) || pop.stateName?.toLowerCase().includes(pq);
      });
    }
    if (pscFilter)         filtered = filtered.filter(o => o.pscCode?.toLowerCase().includes(pscFilter.toLowerCase()) || o.pscDescription?.toLowerCase().includes(pscFilter.toLowerCase()));
    if (daysLeftFilter) {
      const maxDays = parseInt(daysLeftFilter);
      if (!isNaN(maxDays)) {
        const now = Date.now();
        filtered = filtered.filter(o => {
          if (!o.dueDate) return false;
          const days = (new Date(o.dueDate) - now) / 86400000;
          return days > 0 && days <= maxDays;
        });
      }
    }

    // ── Sort ──────────────────────────────────────────────────────────────────
    if (sortBy === 'dueDate')    filtered.sort((a, b) => new Date(a.dueDate||0) - new Date(b.dueDate||0));
    else if (sortBy === 'value') filtered.sort((a, b) => (b.estimatedValue||0) - (a.estimatedValue||0));
    else if (sortBy === 'posted') filtered.sort((a, b) => new Date(b.postedDate||0) - new Date(a.postedDate||0));

    const start     = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);

    // ── Potential Matches: sector-level NAICS fallback (Problem 1 fix) ──────────
    // Catches opportunities where the CO entered the wrong NAICS code.
    // Looks for opps in the same 2-digit NAICS sector, outside user's exact codes.
    let potentialMatches = [];
    if (includePotential !== 'false' && req.user.naicsCodes?.length > 0 && pageNum === 1) {
      try {
        const sectorPrefixes = [...new Set(req.user.naicsCodes.map(n => String(n).slice(0, 2)))];
        const sectorRegex = new RegExp(`^(${sectorPrefixes.join('|')})`);
        const existingOppIds = valid.map(uo => uo._id || uo.opportunity?._id).filter(Boolean);

        const sectorOpps = await Opportunity.find({
          naicsCode: { $nin: req.user.naicsCodes, $regex: sectorRegex },
          dueDate: { $gt: now },
          source: { $ne: 'usaspending' },
          _id: { $nin: existingOppIds },
        }).sort({ postedDate: -1 }).limit(15).lean();

        potentialMatches = sectorOpps.map(opp => {
          const { score } = calculateMatchScore(opp, req.user);
          const ds = deadlineStatus(opp.dueDate);
          return {
            ...opp,
            isPotentialMatch: true,
            aiMatchScore: Math.min(score, 45),
            potentialMatchReason: `NAICS ${opp.naicsCode} is in the same industry sector as your registered codes. The contracting officer may have entered an incorrect code — this opportunity may still be relevant to your business.`,
            ...ds,
            status: 'active',
            canApply: true,
          };
        });
      } catch {}
    }

    res.json({
      success: true,
      data: paginated,
      potentialMatches,
      userProfile: {
        naicsCodes:         req.user.naicsCodes || [],
        plan:               access.plan,
        monthlyMatchesUsed: access.monthlyUsed,
        monthlyLimit:       access.monthlyLimit,
        daysLeft:           access.daysLeft,
        trialEndDate:       req.user.trialEndDate,
        totalAssigned:      result.length,
        remainingThisMonth: access.monthlyLimit === 'Unlimited'
          ? 'Unlimited'
          : Math.max(0, access.monthlyLimit - access.monthlyUsed)
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
// Extract noticeId (UUID) from stored fields or embedded URLs
// SAM.gov noticeId can be 32-char hex (no dashes) or standard UUID with dashes (36 chars).
// Always strip dashes before validating so both forms pass.
const isValidNoticeId = (s) => s && /^[a-f0-9]{32}$/i.test(s.replace(/-/g, ''));

const extractNoticeId = (opp) => {
  if (isValidNoticeId(opp.noticeId)) return opp.noticeId;
  if (opp.url) {
    // URL may contain UUID with or without dashes: /opp/<uuid>/view
    const m = opp.url.match(/\/opp\/([a-f0-9-]{32,36})\//i);
    if (m && isValidNoticeId(m[1])) return m[1];
  }
  if (opp.description && opp.description.startsWith('https://api.sam.gov')) {
    const fromDesc = opp.description.split('noticeid=')[1]?.split('&')[0];
    if (fromDesc) return fromDesc;
  }
  if (isValidNoticeId(opp.sourceId)) return opp.sourceId;
  return null;
};

export const getOpportunityById = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Not found' });

    const SAM_API_KEY = process.env.SAM_API_KEY || '';
    let dirty = false;

    // ── 1. Re-fetch description if it's a SAM.gov URL or missing/placeholder ──
    const isDescUrl     = opportunity.description?.startsWith('https://api.sam.gov') || opportunity.description?.startsWith('http://api.sam.gov');
    const isDescMissing = !opportunity.description || opportunity.description === 'No description available';

    if (isDescUrl || isDescMissing) {
      // Build base URL (no api_key — samGetWithRotation injects it per-key)
      let baseDescUrl = null;

      if (isDescUrl) {
        baseDescUrl = opportunity.description.replace(/[&?]api_key=[^&]*/i, '');
      } else if (isDescMissing) {
        const noticeId = extractNoticeId(opportunity);
        if (noticeId) {
          const noDashes = noticeId.replace(/-/g, '');
          baseDescUrl = `https://api.sam.gov/prod/opportunities/v1/noticedesc?noticeid=${noDashes}`;
        }
      }

      if (baseDescUrl) {
        try {
          const sep = baseDescUrl.includes('?') ? '&' : '?';
          const descRes = await samGetWithRotation(
            key => `${baseDescUrl}${sep}api_key=${key}`,
            { timeout: 15000, headers: { Accept: 'text/plain, text/html, application/json, */*', 'User-Agent': 'Mozilla/5.0 (compatible; FedNotify/1.0)' } }
          );
          // SAM.gov noticedesc returns plain string, HTML string, or JSON object
          let raw = String(descRes.data || '');
          let realText = raw.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
          // If stripping produced empty/short result, try JSON parse for {description:...}
          if (realText.length < 50) {
            try {
              const parsed = JSON.parse(raw);
              realText = String(parsed.description || parsed.content || parsed.text || '');
            } catch {}
          }
          if (realText && realText.length > 50 && !realText.startsWith('https://')) {
            opportunity.description = realText.substring(0, 15000);
            dirty = true;
          }
        } catch (e) {
          console.warn('getOpportunityById: description re-fetch failed:', e.message);
          // Primary URL was prod endpoint — retry with the standard (non-prod) endpoint
        }
      }
    }

    // ── 2. Re-fetch resource links if empty ──────────────────────────────────
    if (!opportunity.resourceLinks || opportunity.resourceLinks.length === 0) {
      const noticeId = extractNoticeId(opportunity);
      if (noticeId && SAM_API_KEY) {
        try {
          const links = await fetchSAMResourceLinks(SAM_API_KEY, noticeId);
          if (links.length > 0) {
            opportunity.resourceLinks = links;
            dirty = true;
          }
        } catch (e) {
          console.warn('getOpportunityById: could not re-fetch resource links:', e.message);
        }
      }
    }

    // Persist updates so next load is instant
    if (dirty) {
      await opportunity.save().catch(e => console.warn('getOpportunityById save error:', e.message));
    }

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
        monthlyMatchesUsed: access.monthlyUsed,
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
    // Only block fully-expired plans — daily/monthly limits are enforced by distributeToUser internally.
    const access = await checkUserAccess(req.user);
    if (access.plan === 'expired') {
      return res.status(403).json({ success: false, message: access.message || 'Your plan has expired. Please upgrade to continue.' });
    }

    if (!req.user.naicsCodes?.length) {
      return res.status(400).json({
        success: false,
        message: 'No NAICS codes configured. Please update your profile to receive matched opportunities.',
      });
    }

    const now = new Date();

    // Remove only truly expired opportunities (dueDate > 48h ago).
    // NEVER delete the entire feed — that loses all historical records.
    const EXPIRED_GRACE_MS = 48 * 60 * 60 * 1000;
    const expiredUOs = await UserOpportunity.find({ user: req.user._id })
      .populate('opportunity', 'dueDate')
      .lean();
    const expiredIds = expiredUOs
      .filter(uo => {
        if (!uo.opportunity) return true; // orphaned
        if (!uo.opportunity.dueDate) return false; // no deadline → keep
        return new Date(uo.opportunity.dueDate) <= new Date(now - EXPIRED_GRACE_MS);
      })
      .map(uo => uo._id);
    if (expiredIds.length > 0) {
      await UserOpportunity.deleteMany({ _id: { $in: expiredIds } });
    }

    // Add new matching opportunities from master store on top of existing feed
    const added = await distributeToUser(req.user);
    console.log(`✅ User feed refreshed for ${req.user.email}: ${added || 0} new opportunities added`);

    res.json({ success: true, message: `Feed refreshed — ${added || 0} new opportunities added.`, count: added || 0 });
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
