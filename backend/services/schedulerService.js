// backend/services/schedulerService.js
//
// Two-phase opportunity pipeline:
//  Phase 1 — Master Fetch:  SAM.gov API → global Opportunity collection (every 30 min)
//  Phase 2 — Distribution:  global Opportunity → per-user UserOpportunity (every hour + midnight)
//
// Plan limits applied during distribution:
//  trial        : 3 opps/day,       source window = last 7 days (7-day trial)
//  free         : 3 opps/day,       source window = last 7 days
//  starter      : 500 opps/month,   source window = last 14 days
//  pro          : 3000 opps/month,  source window = last 60 days
//  enterprise   : Unlimited,        source window = last 180 days

import cron from 'node-cron';
import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';
import UserOpportunity from '../models/UserOpportunity.js';
import Alert from '../models/Alert.js';
import AlertNotification from '../models/AlertNotification.js';
import { fetchSAMOpportunities, fetchSAMByKeyword, getKeywordsForNaics, fetchSAMPage } from './samApiService.js';
import { triggerBulkDownload, bulkStats, resolveAllPendingDescriptions, resolveAllPendingResourceLinks } from './samBulkService.js';
import { sendPushToUser } from './pushService.js';
import { syncSamEntities, syncSamEntitiesDynamic } from './samEntityService.js';
import { syncUsaSpendingCompanies } from './usaSpendingCompanyService.js';
import { syncFpdsCompanies } from './fpdsService.js';
import { syncSbaCompanies } from './sbaService.js';
import {
  checkUpcomingDeadlineAlerts,
  check1DayDeadlineAlerts,
  checkFinalHourDeadlineAlerts,
} from './deadlineAlertService.js';

// ─── Configuration ────────────────────────────────────────────────────────────
const MAX_NAICS_PER_FETCH  = 5;     // max unique NAICS codes fetched per master cycle (quota-safe)
const NAICS_FETCH_DELAY_MS = 5000;  // delay between SAM.gov calls (5s — avoids rate limiting)
const USER_BATCH_DELAY_MS  = 500;   // delay between users during distribution
const MIN_FETCH_INTERVAL_MS = 28 * 60 * 1000; // don't re-run master fetch if ran < 28 min ago (30-min cron cycle)

// ─── Fetch stats (in-memory, survives per session) ───────────────────────────
export const fetchStats = {
  lastMasterFetchAt:      null,
  lastMasterFetchCount:   0,
  lastDistributionAt:     null,
  lastDistributionCount:  0,
  totalFetchRuns:         0,
  isFetching:             false,
};

const PLAN_CONFIG = {
  trial:      { dailyLimit: 3,          sourceWindowDays: 7   },
  free:       { dailyLimit: 3,          sourceWindowDays: 7   },
  starter:    { monthlyLimit: 500,      sourceWindowDays: 14  },
  pro:        { monthlyLimit: 3000,     sourceWindowDays: 60  },
  enterprise: { monthlyLimit: Infinity, sourceWindowDays: 180 },
  expired:    { monthlyLimit: 0,        sourceWindowDays: 0   },
};

// ─── Scoring ──────────────────────────────────────────────────────────────────
const calculateMatchScore = (opportunity, user) => {
  let score = 0;
  const reasons = [];

  const exactNaicsMatch = user.naicsCodes?.includes(opportunity.naicsCode);
  const familyPrefixes = [...new Set((user.naicsCodes || []).map(c => c.slice(0, 4)))];
  const familyNaicsMatch = !exactNaicsMatch && familyPrefixes.some(p => opportunity.naicsCode?.startsWith(p));
  const keywordNaicsMatch = !exactNaicsMatch && !familyNaicsMatch &&
    opportunity.suggestedNaics?.some(n => user.naicsCodes?.includes(n));
  if (exactNaicsMatch) {
    score += 50; reasons.push('✓ Your NAICS code matches this opportunity');
  } else if (familyNaicsMatch) {
    score += 35; reasons.push('✓ Same NAICS industry group — likely relevant');
  } else if (keywordNaicsMatch) {
    score += 25; reasons.push('✓ Keyword-matched — may have incorrect NAICS code on posting');
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
    else                    { score += 5;  reasons.push('📊 Historical — research only'); }
  }

  if (opportunity.estimatedValue) {
    if (opportunity.estimatedValue < 100000)      { score += 10; reasons.push('✓ Ideal size (<$100k)'); }
    else if (opportunity.estimatedValue < 500000) { score += 7;  reasons.push('✓ Manageable ($100k–$500k)'); }
    else                                           { score += 3;  reasons.push('⚠️ Large contract'); }
  }

  return { score: Math.min(100, score), reasons };
};

// ─── Phase 1: Master Fetch ─────────────────────────────────────────────────────
// Pulls from SAM.gov for every unique NAICS code across all active users
// and upserts results into the global Opportunity collection.
export const runMasterFetch = async ({ force = false } = {}) => {
  if (fetchStats.isFetching) {
    console.log('⏳ Master fetch already in progress — skipping');
    return;
  }

  // Guard: don't hammer SAM.gov if we ran recently (protects API quota)
  // Admin-triggered manual runs bypass this guard via force=true
  if (!force && fetchStats.lastMasterFetchAt) {
    const msSinceLast = Date.now() - new Date(fetchStats.lastMasterFetchAt).getTime();
    if (msSinceLast < MIN_FETCH_INTERVAL_MS) {
      const minsAgo = Math.round(msSinceLast / 60000);
      console.log(`⏭️  Master fetch skipped — last run was ${minsAgo} min ago (min interval: 8 min)`);
      return;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🌐 PHASE 1 — MASTER FETCH  (SAM.gov → Global Opportunity Store)');
  console.log('   Time:', new Date().toISOString());
  console.log('='.repeat(70));

  fetchStats.isFetching = true;

  try {
    const users = await User.find({
      naicsCodes: { $exists: true, $not: { $size: 0 } },
      plan: { $nin: ['expired'] }
    });

    const uniqueNaics = [...new Set(users.flatMap(u => u.naicsCodes || []))];
    console.log(`📋 ${uniqueNaics.length} unique NAICS codes found across ${users.length} active users`);

    let totalProcessed = 0;

    for (const code of uniqueNaics.slice(0, MAX_NAICS_PER_FETCH)) {
      console.log(`📡 Fetching SAM.gov for NAICS ${code}...`);
      const opps = await fetchSAMOpportunities(code, 100);
      totalProcessed += opps.length;
      await new Promise(r => setTimeout(r, NAICS_FETCH_DELAY_MS));
    }

    // Keyword searches for cross-NAICS coverage — catches ~5-6% of misclassified postings.
    // Group by 4-digit family so we run one search per sector, not per code.
    const naicsFamilyMap = new Map();
    for (const code of uniqueNaics.slice(0, MAX_NAICS_PER_FETCH)) {
      const prefix = code.slice(0, 4);
      if (!naicsFamilyMap.has(prefix)) naicsFamilyMap.set(prefix, []);
      naicsFamilyMap.get(prefix).push(code);
    }
    const MAX_KEYWORD_FETCHES = 2; // cap to protect SAM.gov quota
    let kwFetches = 0;
    for (const [prefix, codes] of naicsFamilyMap) {
      if (kwFetches >= MAX_KEYWORD_FETCHES) break;
      const keywords = getKeywordsForNaics(codes[0]);
      if (!keywords) continue;
      console.log(`🔍 Keyword fetch for NAICS family ${prefix} (${codes.join(', ')})...`);
      await fetchSAMByKeyword(keywords, codes, 50);
      kwFetches++;
      await new Promise(r => setTimeout(r, NAICS_FETCH_DELAY_MS));
    }
    if (kwFetches > 0) {
      console.log(`🔍 Keyword coverage: ${kwFetches} family search(es) completed`);
    }

    const masterCount = await Opportunity.countDocuments();
    fetchStats.lastMasterFetchAt    = new Date();
    fetchStats.lastMasterFetchCount = totalProcessed;
    fetchStats.totalFetchRuns      += 1;

    console.log(`\n✅ Master fetch done — ${totalProcessed} records processed, ${masterCount} total in store`);
    console.log('='.repeat(70) + '\n');
  } catch (err) {
    console.error('❌ Master fetch error:', err.message);
  } finally {
    fetchStats.isFetching = false;
  }
};

// ─── Phase 2: User Distribution ───────────────────────────────────────────────
// For each active user, pulls matching opportunities from the master store
// (filtered by NAICS + plan-based date window) and assigns them to their
// personal UserOpportunity feed, up to the plan's daily limit.

const distributeToUser = async (user) => {
  const now = new Date();

  // Treat expired trial as 'expired' plan
  const effectivePlan = (user.plan === 'trial' && now > user.trialEndDate) ? 'expired' : user.plan;
  const config = PLAN_CONFIG[effectivePlan] || PLAN_CONFIG.free;

  if (config.monthlyLimit === 0) return 0;

  const isDaily = !!config.dailyLimit;
  let remaining;

  if (isDaily) {
    // Reset daily counter at the start of a new calendar day
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const lastDailyReset = new Date(user.lastDailyReset || 0);
    if (lastDailyReset < todayStart) {
      user.dailyMatchesUsed = 0;
      user.lastDailyReset = now;
      await user.save();
    }
    remaining = config.dailyLimit - (user.dailyMatchesUsed || 0);
    if (remaining <= 0) {
      console.log(`⏸️  ${user.email}: daily limit reached (${config.dailyLimit}/day)`);
      return 0;
    }
  } else {
    // Reset monthly counter at the start of a new calendar month
    const lastReset = new Date(user.lastMonthlyReset || 0);
    if (lastReset.getFullYear() !== now.getFullYear() || lastReset.getMonth() !== now.getMonth()) {
      user.monthlyMatchesUsed = 0;
      user.lastMonthlyReset = now;
      await user.save();
    }
    remaining = config.monthlyLimit === Infinity
      ? 9999
      : config.monthlyLimit - (user.monthlyMatchesUsed || 0);
    if (remaining <= 0) {
      console.log(`⏸️  ${user.email}: monthly limit reached (${config.monthlyLimit})`);
      return 0;
    }
  }

  // Source window: only consider master-store opportunities posted within the plan's window
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - config.sourceWindowDays);

  // IDs already in this user's feed — skip them
  const existing = await UserOpportunity.find({ user: user._id }).select('opportunity').lean();
  const existingIds = existing.map(e => e.opportunity);

  // Only active solicitations: due date must exist AND be strictly in the future
  const activeFilter = { dueDate: { $gt: now } };

  // Expand NAICS codes to 4-digit family so sibling codes (e.g. 541512/541513/541519 for user with 541511) are included.
  // Also include opportunities tagged via keyword search (suggestedNaics) for wrong-NAICS catches.
  const naicsFamilyPrefixes = [...new Set((user.naicsCodes || []).map(c => c.slice(0, 4)))];
  const naicsFamilyFilter = naicsFamilyPrefixes.length > 0
    ? { $or: [
        { naicsCode: { $regex: new RegExp(`^(${naicsFamilyPrefixes.join('|')})`) } },
        { suggestedNaics: { $in: user.naicsCodes } },
      ]}
    : { $or: [
        { naicsCode: { $in: user.naicsCodes } },
        { suggestedNaics: { $in: user.naicsCodes } },
      ]};

  // Fetch candidates from master store within plan window (SAM.gov only — exclude past-award data)
  let candidates = await Opportunity.find({
    ...naicsFamilyFilter,
    postedDate: { $gte: windowStart },
    _id: { $nin: existingIds },
    source: { $ne: 'usaspending' },
    ...activeFilter
  })
    .sort({ postedDate: -1 })
    .limit(remaining * 5)
    .lean();

  // Fallback: if window returned nothing, use any active master store data for these NAICS
  if (candidates.length === 0) {
    candidates = await Opportunity.find({
      ...naicsFamilyFilter,
      _id: { $nin: existingIds },
      source: { $ne: 'usaspending' },
      ...activeFilter
    })
      .sort({ postedDate: -1 })
      .limit(remaining * 5)
      .lean();
  }

  if (candidates.length === 0) return 0;

  // Score and rank
  const scored = candidates
    .map(opp => ({ opp, ...calculateMatchScore(opp, user) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, remaining);

  // Assign to user feed
  let assigned = 0;
  for (const { opp, score, reasons } of scored) {
    try {
      await UserOpportunity.create({
        user: user._id,
        opportunity: opp._id,
        matchScore: score,
        matchReasons: reasons,
        fetchedAt: now
      });
      assigned++;
    } catch (err) {
      if (err.code !== 11000) console.error(`Assign error (${opp._id}):`, err.message);
      // 11000 = duplicate key — opportunity already exists for this user, skip silently
    }
  }

  if (assigned > 0) {
    if (isDaily) {
      user.dailyMatchesUsed = (user.dailyMatchesUsed || 0) + assigned;
    } else {
      user.monthlyMatchesUsed = (user.monthlyMatchesUsed || 0) + assigned;
    }
    await user.save();
    const cap = isDaily ? `${config.dailyLimit}/day` : (config.monthlyLimit === Infinity ? '∞/mo' : `${config.monthlyLimit}/mo`);
    const used = isDaily ? user.dailyMatchesUsed : user.monthlyMatchesUsed;
    console.log(
      `✅ ${user.email} [${effectivePlan}]: +${assigned} new opps ` +
      `(${used}/${cap}, window=${config.sourceWindowDays}d)`
    );

    // Push notification — fire-and-forget (don't block distribution)
    const topMatch = scored[0];
    const pushTitle = `${assigned} new contract match${assigned !== 1 ? 'es' : ''} found`;
    const pushBody  = topMatch
      ? `Top: ${topMatch.opp.title?.substring(0, 70)} (${topMatch.score}% match)`
      : `${assigned} contracts matching your NAICS codes are ready.`;
    sendPushToUser(user._id, pushTitle, pushBody, { url: '/opportunities' }).catch(() => {});
  }

  return assigned;
};

const checkUserAlerts = async (user) => {
  try {
    const recentCutoff = new Date(Date.now() - 60 * 60 * 1000); // last hour
    const recentUserOpps = await UserOpportunity.find({
      user: user._id,
      fetchedAt: { $gte: recentCutoff }
    }).populate('opportunity').lean();

    const alerts = await Alert.find({ user: user._id, isActive: true }).lean();
    if (!alerts.length || !recentUserOpps.length) return;

    for (const { opportunity: opp } of recentUserOpps) {
      if (!opp) continue;

      for (const alert of alerts) {
        const alreadyNotified = await AlertNotification.exists({
          user: user._id,
          alert: alert._id,
          opportunity: opp._id
        });
        if (alreadyNotified) continue;

        let matched = 0;
        let total = 0;

        if (alert.naicsCodes?.length)  { total++; if (alert.naicsCodes.includes(opp.naicsCode)) matched++; }
        if (alert.keywords?.length)    {
          total++;
          const text = `${opp.title} ${opp.description}`.toLowerCase();
          if (alert.keywords.some(kw => text.includes(kw.toLowerCase()))) matched++;
        }
        if (alert.agencies?.length)    {
          total++;
          if (alert.agencies.some(a => opp.agency?.toLowerCase().includes(a.toLowerCase()))) matched++;
        }
        if (alert.minValue > 0 || alert.maxValue) {
          total++;
          const v = opp.estimatedValue || 0;
          const okMin = !alert.minValue || v >= alert.minValue;
          const okMax = !alert.maxValue || v <= alert.maxValue;
          if (okMin && okMax) matched++;
        }

        const pct = total > 0 ? Math.round((matched / total) * 100) : 100;
        if (pct >= (alert.matchScore || 50)) {
          await AlertNotification.create({
            user: user._id,
            alert: alert._id,
            opportunity: opp._id,
            matchScore: pct,
            matchReasons: [],
            isRead: false,
            sentAt: new Date()
          });
          console.log(`🔔 Alert match: ${user.email} → "${opp.title}" (${pct}%)`);
        }
      }
    }
  } catch (err) {
    console.error('Alert check error:', err.message);
  }
};

export const runUserDistribution = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('📤 PHASE 2 — USER DISTRIBUTION  (Global Store → User Feeds)');
  console.log('   Time:', new Date().toISOString());
  console.log('='.repeat(70));

  try {
    const users = await User.find({
      naicsCodes: { $exists: true, $not: { $size: 0 } },
      plan: { $nin: ['expired'] }
    });

    console.log(`👥 ${users.length} active users to process`);
    let totalAssigned = 0;

    for (const user of users) {
      try {
        const count = await distributeToUser(user);
        totalAssigned += count;
        if (count > 0) await checkUserAlerts(user);
      } catch (userErr) {
        console.warn(`⚠️  Skipping user ${user._id}: ${userErr.message}`);
      }
      await new Promise(r => setTimeout(r, USER_BATCH_DELAY_MS));
    }

    fetchStats.lastDistributionAt    = new Date();
    fetchStats.lastDistributionCount = totalAssigned;

    console.log(`\n🎉 Distribution complete — ${totalAssigned} new opportunities assigned across all users`);
    console.log('='.repeat(70) + '\n');
  } catch (err) {
    console.error('❌ User distribution error:', err.message);
  }
};

// ─── Scheduler Bootstrap ──────────────────────────────────────────────────────
export const startScheduler = () => {
  console.log('\n🚀 Starting Hybrid Opportunity Scheduler');
  console.log('   Phase 1a — API Fetch (per NAICS)        : MANUAL only (Admin panel button)');
  console.log('   Phase 1b — Bulk Nightly Download (all)   : 04:00 UTC (09:00 AM Pakistan)');
  console.log('   Phase 2  — User Distribution             : every 10 min');

  // Phase 1a: Automatic API fetch is DISABLED — use Admin panel buttons to fetch manually.
  // Uncomment the line below to re-enable auto-fetch every 30 min:
  // cron.schedule('*/30 * * * *', () => runMasterFetch());

  // Phase 2: distribute to users every 10 min (reads local DB only — no SAM.gov quota used)
  cron.schedule('*/10 * * * *', () => runUserDistribution());

  // Daily full cycle at 6 AM — distribution only (no auto SAM.gov fetch)
  cron.schedule('0 6 * * *', async () => {
    console.log('\n🌅 DAILY 6 AM DISTRIBUTION starting...');
    await runUserDistribution();
  });

  // Phase 1b: Nightly bulk download at 04:00 UTC = 09:00 AM Pakistan (PST UTC+5).
  // Why 4 AM UTC:
  //   • US Eastern midnight (00:00 ET = 04:00-05:00 UTC) means the entire
  //     US government business day is over and all SAM.gov postings for that
  //     day are finalised and available via the API.
  //   • Pakistan users wake up to fully refreshed data by 9 AM their time.
  //   • No NAICS filter — every category is downloaded so no opportunity is missed.
  //   • Deduplication via sourceId upsert; API-fetched records are never duplicated.
  //   • The master fetch cron (0 * * * *) also fires at 04:00 UTC — the 55-min guard
  //     on runMasterFetch will skip it so bulk gets the full quota to itself.
  cron.schedule('0 4 * * *', async () => {
    // Wait 5 min for SAM.gov quota reset to fully propagate before making any calls.
    // Quota resets at midnight US Eastern (04:00 UTC summer / 05:00 UTC winter).
    // Without this wait the first requests can still see yesterday's exhausted quota.
    console.log('\n⏳ 04:00 UTC — waiting 5 min for SAM.gov quota reset to propagate...');
    await new Promise(r => setTimeout(r, 5 * 60 * 1000));
    console.log('\n🌙 BULK DOWNLOAD (04:05 UTC = 09:05 AM Pakistan) starting...');
    await triggerBulkDownload();
    // Wait 2 min then distribute so users see fresh data on login
    await new Promise(r => setTimeout(r, 120_000));
    await runUserDistribution();
  });

  // SAM Entity sync — 02:00 UTC daily.
  // Uses dynamic quota: consumes all remaining daily SAM.gov requests minus 200
  // reserved for the day's opportunity-fetching crons (hourly master + nightly bulk).
  // At 02:00 UTC only ~2 hourly master-fetch crons have fired, so the full ~750-800
  // pages (~75-80k companies) are typically available — covering the full ~140k SAM
  // entity list within 2 nightly runs.
  cron.schedule('0 2 * * *', async () => {
    console.log('\n🏢 02:00 UTC SAM ENTITY SYNC starting (dynamic quota)…');
    await syncSamEntitiesDynamic(200);
  });

  // USASpending company sync — 02:30 UTC daily (enriches contract history, no email)
  cron.schedule('30 2 * * *', async () => {
    console.log('\n📊 02:30 UTC USASPENDING COMPANY SYNC starting…');
    await syncUsaSpendingCompanies(50);
  });

  // FPDS company sync — 03:00 UTC daily (skip gracefully if endpoint unavailable)
  cron.schedule('0 3 * * *', async () => {
    console.log('\n📋 03:00 UTC FPDS COMPANY SYNC starting…');
    await syncFpdsCompanies(30);
  });

  // SBA DSBS company sync — 03:30 UTC daily (skip gracefully if endpoint unavailable)
  cron.schedule('30 3 * * *', async () => {
    console.log('\n🏢 03:30 UTC SBA DSBS COMPANY SYNC starting…');
    await syncSbaCompanies(30);
  });

  // ── Deadline Alerts ─────────────────────────────────────────────────────────
  // Upcoming deadline: hourly — notify users when an opp enters their alert window
  cron.schedule('0 * * * *', async () => {
    await checkUpcomingDeadlineAlerts();
  });

  // 1-day countdown: every hour — send up to 5 emails (every 5h) when <24h remain
  cron.schedule('5 * * * *', async () => {
    await check1DayDeadlineAlerts();
  });

  // Final hour: every 20 min — send up to 3 emails (every 20min) when <60min remain
  cron.schedule('*/20 * * * *', async () => {
    await checkFinalHourDeadlineAlerts();
  });

  // Daily plan expiry sweep — 01:00 UTC
  // Downgrades expired trials → free and expired paid plans → free
  cron.schedule('0 1 * * *', async () => {
    const now = new Date();
    console.log('\n⏰ PLAN EXPIRY SWEEP starting...');

    const expiredTrials = await User.updateMany(
      { plan: 'trial', trialEndDate: { $lt: now }, isTrialActive: true },
      { $set: { plan: 'free', isTrialActive: false } }
    );

    const expiredPaid = await User.updateMany(
      { plan: { $in: ['starter', 'pro', 'enterprise'] }, planExpiresAt: { $lt: now } },
      { $set: { plan: 'free', planExpiresAt: null } }
    );

    console.log(`✅ Expiry sweep: ${expiredTrials.modifiedCount} trials → free, ${expiredPaid.modifiedCount} paid plans → free`);
  });

  // Startup fetch disabled — use Admin → Hybrid Data Pipeline test buttons instead.
  // Auto-fetch on restart was burning SAM.gov quota every time nodemon restarted.
  setTimeout(async () => {
    console.log('\n📤 Running initial user distribution on startup (no SAM.gov fetch)...');
    await runUserDistribution();

    // Auto-seed company database from USASpending if it's empty
    try {
      const { default: SamCompany } = await import('../models/SamCompany.js');
      const companyCount = await SamCompany.countDocuments();
      if (companyCount === 0) {
        console.log('\n📊 Company database is empty — auto-seeding from USASpending.gov (20 pages)…');
        syncUsaSpendingCompanies(20).catch(err =>
          console.error('Auto-seed USASpending error:', err.message)
        );
      }
    } catch (err) {
      console.error('Auto-seed check error:', err.message);
    }
  }, 10000);

  console.log('✅ Hybrid scheduler started\n');
};

// On-demand distribution for a single user.
export { distributeToUser };

// Manual trigger (used by admin refresh endpoint)
export const triggerManualFetch = async () => {
  console.log('🔧 Manual fetch triggered');
  await runMasterFetch({ force: true }); // bypass cooldown — admin explicitly requested this
  await runUserDistribution();
};

// Manual trigger for bulk download (used by admin panel)
export const triggerManualBulk = async () => {
  console.log('🔧 Manual bulk download triggered');
  await triggerBulkDownload();
  await runUserDistribution();
};

// ─── Test fetch: 10 records per click, no NAICS filter, 1 API call ───────────
export const triggerTestFetch = async (offset = 0) => {
  console.log(`🧪 Test fetch — ALL categories, offset ${offset}, limit 10`);
  const result = await fetchSAMPage(null, 10, offset);
  await runUserDistribution();
  return { ...result, message: `Test fetch: ${result.saved} records saved (offset ${offset})` };
};

// Export bulk stats for admin dashboard
export { bulkStats };
