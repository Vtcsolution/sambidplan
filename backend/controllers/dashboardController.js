// backend/controllers/dashboardController.js
import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';
import UserOpportunity from '../models/UserOpportunity.js';
import SavedOpportunity from '../models/SavedOpportunity.js';
import Alert from '../models/Alert.js';
import AlertNotification from '../models/AlertNotification.js';
import { distributeToUser } from '../services/schedulerService.js';
import { fetchSAMOpportunities } from '../services/samApiService.js';
import { seedSampleForUser } from './opportunityController.js';

// ─── Date key helper ──────────────────────────────────────────────────────────
const dateKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// @desc    Get all dashboard stats for the logged-in user in one call
// @route   GET /api/dashboard/stats
export const getDashboardStats = async (req, res) => {
  try {
    const userId    = req.user._id;
    const now       = new Date();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekAgo    = new Date(now - 7  * 86400000);
    const monthAgo   = new Date(now - 30 * 86400000);

    // ── Parallel queries for speed ────────────────────────────────────────────
    let [
      totalFeedCount,
      todayFeedCount,
      highMatchCount,
      savedCount,
      savedThisWeek,
      activeAlertsCount,
      unreadNotifCount,
      upcomingDeadlines,
      recentOpps,
      user
    ] = await Promise.all([
      // Total opportunities in user's feed
      UserOpportunity.countDocuments({ user: userId }),

      // New opportunities added to feed today
      UserOpportunity.countDocuments({ user: userId, fetchedAt: { $gte: todayStart } }),

      // High-match opportunities (score >= 70)
      UserOpportunity.countDocuments({ user: userId, matchScore: { $gte: 70 } }),

      // Saved opportunities
      SavedOpportunity.countDocuments({ user: userId }),

      // Saved this week
      SavedOpportunity.countDocuments({ user: userId, savedAt: { $gte: weekAgo } }),

      // Active alerts
      Alert.countDocuments({ user: userId, isActive: true }),

      // Unread alert notifications
      AlertNotification.countDocuments({ user: userId, isRead: false }),

      // Upcoming deadlines — next 5 opportunities from user feed
      UserOpportunity.find({ user: userId })
        .populate({
          path: 'opportunity',
          match: { dueDate: { $gte: now } },
          select: 'title agency dueDate estimatedValue naicsCode'
        })
        .sort({ 'opportunity.dueDate': 1 })
        .limit(20)
        .lean(),

      // Recent 5 opportunities for the feed preview
      UserOpportunity.find({ user: userId })
        .populate('opportunity', 'title agency dueDate estimatedValue naicsCode setAside')
        .sort({ matchScore: -1, fetchedAt: -1 })
        .limit(5)
        .lean(),

      // Fresh user doc for plan/trial info
      User.findById(userId)
    ]);

    // ── On-demand fill when dashboard loads with an empty feed ────────────────
    if (totalFeedCount === 0 && req.user.naicsCodes?.length > 0) {
      console.log(`🔄 Dashboard: empty feed for ${req.user.email} — triggering on-demand fill`);
      const masterCount = await Opportunity.countDocuments({ naicsCode: { $in: req.user.naicsCodes } });
      if (masterCount === 0) {
        for (const code of req.user.naicsCodes.slice(0, 3)) {
          await fetchSAMOpportunities(code, 50);
        }
        const afterFetch = await Opportunity.countDocuments({ naicsCode: { $in: req.user.naicsCodes } });
        if (afterFetch === 0) {
          await seedSampleForUser(req.user.naicsCodes.slice(0, 2));
        }
      }
      await distributeToUser(req.user);

      // Re-query updated counts so the response reflects real data
      [totalFeedCount, todayFeedCount, highMatchCount, upcomingDeadlines, recentOpps] = await Promise.all([
        UserOpportunity.countDocuments({ user: userId }),
        UserOpportunity.countDocuments({ user: userId, fetchedAt: { $gte: todayStart } }),
        UserOpportunity.countDocuments({ user: userId, matchScore: { $gte: 70 } }),
        UserOpportunity.find({ user: userId })
          .populate({ path: 'opportunity', match: { dueDate: { $gte: now } }, select: 'title agency dueDate estimatedValue naicsCode' })
          .sort({ 'opportunity.dueDate': 1 }).limit(20).lean(),
        UserOpportunity.find({ user: userId })
          .populate('opportunity', 'title agency dueDate estimatedValue naicsCode setAside')
          .sort({ matchScore: -1, fetchedAt: -1 }).limit(5).lean()
      ]);
      console.log(`✅ Dashboard on-demand fill: ${totalFeedCount} opportunities for ${req.user.email}`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Enterprise override: read stats directly from master Opportunity store ──
    // (enterprise users bypass UserOpportunity in the Opportunities page, so personal
    //  feed counts are misleading — reflect the real master store numbers instead)
    if (user.plan === 'enterprise') {
      const naics = user.naicsCodes || [];
      const enterpriseBase = {
        dueDate: { $gt: now },  // enterprise sees all sources — sam + usaspending
        ...(naics.length ? { naicsCode: { $in: naics } } : {}),
      };

      [totalFeedCount, todayFeedCount, highMatchCount] = await Promise.all([
        // Total active solicitations in master store
        Opportunity.countDocuments(enterpriseBase),
        // Posted today (new arrivals)
        Opportunity.countDocuments({ ...enterpriseBase, postedDate: { $gte: todayStart } }),
        // "High match" proxy: due date still 7+ days away (enough time to bid)
        Opportunity.countDocuments({ ...enterpriseBase, dueDate: { $gt: new Date(now.getTime() + 7 * 86400000) } }),
      ]);

      // Recent 5 from master store sorted by newest post
      const masterRecent = await Opportunity.find(enterpriseBase)
        .sort({ postedDate: -1 }).limit(5).lean();
      recentOpps = masterRecent.map(opp => ({
        opportunity:  opp,
        matchScore:   75,
        matchReasons: ['✓ Your NAICS code matches this opportunity'],
        fetchedAt:    opp.lastFetched || now,
      }));

      // Upcoming deadlines: nearest 10 from master store
      const masterUpcoming = await Opportunity.find(enterpriseBase)
        .sort({ dueDate: 1 }).limit(10).lean();
      upcomingDeadlines = masterUpcoming.map(opp => ({ opportunity: opp, matchScore: 75 }));
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Filter upcoming deadlines (populate with match: only returns null for unmatched)
    const deadlines = upcomingDeadlines
      .filter(uo => uo.opportunity)
      .slice(0, 5)
      .map(uo => ({
        id:             uo.opportunity._id,
        title:          uo.opportunity.title,
        agency:         uo.opportunity.agency,
        dueDate:        uo.opportunity.dueDate,
        estimatedValue: uo.opportunity.estimatedValue,
        daysLeft:       Math.ceil((new Date(uo.opportunity.dueDate) - now) / 86400000),
        matchScore:     uo.matchScore
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // Recent feed
    const recent = recentOpps
      .filter(uo => uo.opportunity)
      .map(uo => ({
        id:             uo.opportunity._id,
        title:          uo.opportunity.title,
        agency:         uo.opportunity.agency,
        dueDate:        uo.opportunity.dueDate,
        estimatedValue: uo.opportunity.estimatedValue,
        naicsCode:      uo.opportunity.naicsCode,
        setAside:       uo.opportunity.setAside,
        matchScore:     uo.matchScore,
        matchReasons:   uo.matchReasons,
        fetchedAt:      uo.fetchedAt,
        isActive:       uo.opportunity.dueDate && new Date(uo.opportunity.dueDate) > now
      }));

    // Plan info
    const planLimits = {
      trial:      15,  free: 50,
      starter:    500, pro: 3000,
      enterprise: 'Unlimited'
    };
    const monthlyLimit  = user.role === 'admin' ? 'Unlimited' : (planLimits[user.plan] || 50);
    const daysLeft      = user.plan === 'trial' ? Math.max(0, Math.ceil((user.trialEndDate - now) / 86400000)) : null;
    const planExpiresDays = user.planExpiresAt
      ? Math.ceil((user.planExpiresAt - now) / 86400000)
      : null;

    res.json({
      success: true,
      data: {
        // User
        user: {
          name:             user.name,
          email:            user.email,
          plan:             user.plan,
          businessName:     user.businessName,
          naicsCodes:       user.naicsCodes || [],
          monthlyMatchesUsed: user.monthlyMatchesUsed || 0,
          monthlyLimit,
          trialDaysLeft:    daysLeft,
          planExpiresDays,
          isTrialActive:    user.isTrialActive,
          planExpiresAt:    user.planExpiresAt,
          isEmailVerified:  user.isEmailVerified
        },
        // Opportunity stats
        opportunities: {
          total:      totalFeedCount,
          today:      todayFeedCount,
          highMatch:  highMatchCount,
          usagePercent: monthlyLimit === 'Unlimited'
            ? 0
            : Math.round(((user.monthlyMatchesUsed || 0) / monthlyLimit) * 100)
        },
        // Engagement
        saved:         { total: savedCount, thisWeek: savedThisWeek },
        alerts:        { active: activeAlertsCount, unreadNotifications: unreadNotifCount },
        // Content
        upcomingDeadlines: deadlines,
        recentOpportunities: recent
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get calendar events — opportunities grouped by due date for a month
// @route   GET /api/dashboard/calendar?month=YYYY-MM
export const getCalendarEvents = async (req, res) => {
  try {
    const userId = req.user._id;

    // Parse month param, default to current month
    const monthParam = req.query.month || new Date().toISOString().slice(0, 7);
    const [y, m]     = monthParam.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd   = new Date(y, m, 0, 23, 59, 59); // last day of month

    // Extend window slightly so we can show +/- a few days for calendar overflow
    const windowStart = new Date(y, m - 1, -6);  // ~1 week before month start
    const windowEnd   = new Date(y, m, 14);       // ~2 weeks after month end

    // Enterprise: read from master Opportunity store directly (same as opportunities page)
    // Non-enterprise: read from personal UserOpportunity feed
    let feedOpps;
    if (req.user.plan === 'enterprise') {
      const naics = req.user.naicsCodes || [];
      const masterQuery = {
        dueDate: { $gte: windowStart, $lte: windowEnd },
        ...(naics.length ? { naicsCode: { $in: naics } } : {}),
      };
      const masterOpps = await Opportunity.find(masterQuery, 'title agency dueDate estimatedValue naicsCode setAside').lean();
      feedOpps = masterOpps.map(opp => ({ opportunity: opp, matchScore: 75 }));
    } else {
      feedOpps = await UserOpportunity.find({ user: userId })
        .populate({
          path: 'opportunity',
          match: { dueDate: { $gte: windowStart, $lte: windowEnd } },
          select: 'title agency dueDate estimatedValue naicsCode setAside'
        })
        .lean();
    }

    const savedOpps = await SavedOpportunity.find({ user: userId })
      .populate({
        path: 'opportunity',
        match: { dueDate: { $gte: windowStart, $lte: windowEnd } },
        select: 'title agency dueDate estimatedValue naicsCode setAside'
      })
      .lean();

    // Build a set of saved opportunity IDs for quick lookup
    const savedMap = {};
    savedOpps.forEach(s => {
      if (s.opportunity) savedMap[s.opportunity._id.toString()] = s.status;
    });

    // Normalise into calendar events
    const eventsMap = {};   // key: "YYYY-MM-DD" → [events]

    const push = (opp, extra = {}) => {
      if (!opp?.dueDate) return;
      const key = dateKey(opp.dueDate);
      if (!eventsMap[key]) eventsMap[key] = [];
      // Avoid duplicates
      if (eventsMap[key].some(e => e.id === opp._id.toString())) return;
      const now      = new Date();
      const daysLeft = Math.ceil((new Date(opp.dueDate) - now) / 86400000);
      eventsMap[key].push({
        id:             opp._id.toString(),
        title:          opp.title,
        agency:         opp.agency,
        dueDate:        opp.dueDate,
        estimatedValue: opp.estimatedValue,
        naicsCode:      opp.naicsCode,
        setAside:       opp.setAside,
        daysLeft,
        urgency:        daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'urgent' : daysLeft <= 14 ? 'soon' : 'normal',
        ...extra
      });
    };

    feedOpps.forEach(uo => push(uo.opportunity, {
      matchScore:    uo.matchScore,
      savedStatus:   savedMap[uo.opportunity?._id?.toString()] || null,
      isSaved:       !!savedMap[uo.opportunity?._id?.toString()]
    }));

    // Also include saved-only opps not in feed
    savedOpps.forEach(s => {
      if (s.opportunity && !feedOpps.some(uo => uo.opportunity?._id?.toString() === s.opportunity._id.toString())) {
        push(s.opportunity, { matchScore: null, savedStatus: s.status, isSaved: true });
      }
    });

    // Stats for the visible month only
    const monthEvents = Object.entries(eventsMap)
      .filter(([key]) => key >= dateKey(monthStart) && key <= dateKey(monthEnd))
      .flatMap(([, evts]) => evts);

    const now = new Date();
    const stats = {
      totalThisMonth: monthEvents.length,
      critical:       monthEvents.filter(e => e.urgency === 'critical' && new Date(e.dueDate) >= now).length,
      urgent:         monthEvents.filter(e => e.urgency === 'urgent'   && new Date(e.dueDate) >= now).length,
      upcoming:       monthEvents.filter(e => new Date(e.dueDate) >= now).length,
      totalValue:     monthEvents.reduce((s, e) => s + (e.estimatedValue || 0), 0)
    };

    res.json({ success: true, data: { events: eventsMap, stats, month: monthParam } });
  } catch (err) {
    console.error('Calendar events error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
