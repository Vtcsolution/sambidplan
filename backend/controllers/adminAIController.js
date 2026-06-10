import axios from 'axios';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import ContactInquiry from '../models/ContactInquiry.js';
import SavedOpportunity from '../models/SavedOpportunity.js';
import AdminNotification from '../models/admin/AdminNotification.js';
import CampaignLog from '../models/admin/CampaignLog.js';
import { chat } from '../services/geminiService.js';
import { sendBroadcastEmailToSegment } from '../services/emailService.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const daysSince = (date) => date ? Math.floor((Date.now() - new Date(date)) / 86400000) : 999;

// ── AI Platform Insights ─────────────────────────────────────────────────────
// @route  POST /api/admin-ai/insights
export const getPlatformInsights = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);

    const [totalUsers, newUsers, paidInvoices, planCounts, contactInquiries] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Invoice.find({ status: 'paid', paidAt: { $gte: thirtyDaysAgo } }),
      User.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
      ContactInquiry.countDocuments({ status: 'new' }),
    ]);

    const revenue30d = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const planMap = Object.fromEntries(planCounts.map(p => [p._id, p.count]));

    const summary = `
Platform Stats (last 30 days):
- Total users: ${totalUsers}
- New signups: ${newUsers}
- Revenue: $${revenue30d.toLocaleString()}
- Plans: Free=${planMap.free || 0}, Trial=${planMap.trial || 0}, Starter=${planMap.starter || 0}, Pro=${planMap.pro || 0}, Enterprise=${planMap.enterprise || 0}
- Open enterprise inquiries: ${contactInquiries}
- Paid invoices this month: ${paidInvoices.length}
    `.trim();

    const aiAnalysis = await chat(
      'You are an expert SaaS business analyst providing actionable insights to a platform admin.',
      `Analyze this federal contracting SaaS platform data and provide strategic recommendations:

${summary}

Provide:
## EXECUTIVE SUMMARY (2-3 sentences)
## KEY METRICS INTERPRETATION
## TOP 3 GROWTH OPPORTUNITIES
## TOP 3 RISKS TO ADDRESS
## RECOMMENDED ACTIONS THIS WEEK (5 specific actions)
## REVENUE FORECAST (next 30 days estimate based on current trends)

Be specific and actionable. Focus on user growth, retention, and revenue.`
    );

    res.json({
      success: true,
      data: { stats: { totalUsers, newUsers, revenue30d, planMap, contactInquiries, invoices: paidInvoices.length }, aiAnalysis, summary },
    });
  } catch (err) {
    console.error('Admin AI insights error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── User Segmentation ─────────────────────────────────────────────────────────
// @route  GET /api/admin-ai/segments
export const getUserSegments = async (req, res) => {
  try {
    const users = await User.find().select('name email plan createdAt lastMatchReset dailyMatchesUsed naicsCodes onboardingCompleted isTrialActive trialEndDate');

    const segments = {
      churnRisk:        [],
      trialExpiringSoon:[],
      powerUsers:       [],
      neverActive:      [],
      upgradeReady:     [],
      enterprise:       [],
    };

    for (const u of users) {
      const daysSinceActivity = daysSince(u.lastMatchReset);
      const trialDaysLeft = u.isTrialActive ? Math.ceil((new Date(u.trialEndDate) - Date.now()) / 86400000) : -1;

      if (u.plan === 'enterprise') { segments.enterprise.push(u); continue; }
      if (!u.naicsCodes?.length || !u.onboardingCompleted) { segments.neverActive.push(u); continue; }
      if (u.isTrialActive && trialDaysLeft >= 0 && trialDaysLeft <= 3) { segments.trialExpiringSoon.push(u); }
      if (['pro', 'starter'].includes(u.plan) && daysSinceActivity > 14) { segments.churnRisk.push(u); }
      if (['free', 'trial'].includes(u.plan) && u.dailyMatchesUsed >= 1 && u.naicsCodes?.length > 0) { segments.upgradeReady.push(u); }
      if (['pro', 'enterprise'].includes(u.plan) && daysSinceActivity <= 3) { segments.powerUsers.push(u); }
    }

    const toSummary = (arr) => arr.slice(0, 10).map(u => ({ id: u._id, name: u.name, email: u.email, plan: u.plan }));

    res.json({
      success: true,
      data: {
        counts: Object.fromEntries(Object.entries(segments).map(([k, v]) => [k, v.length])),
        samples: Object.fromEntries(Object.entries(segments).map(([k, v]) => [k, toSummary(v)])),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Churn Prediction ─────────────────────────────────────────────────────────
// @route  GET /api/admin-ai/churn-prediction
export const getChurnPrediction = async (req, res) => {
  try {
    const paidUsers = await User.find({ plan: { $in: ['starter', 'pro', 'enterprise'] } })
      .select('name email plan createdAt lastMatchReset dailyMatchesUsed naicsCodes planExpiresAt');

    const atRisk = paidUsers.map(u => {
      const daysSinceLogin = daysSince(u.lastMatchReset);
      const daysUntilExpiry = u.planExpiresAt ? Math.ceil((new Date(u.planExpiresAt) - Date.now()) / 86400000) : 999;
      const usageScore = Math.min(u.dailyMatchesUsed / 5, 10);
      const riskScore = Math.min(100, (daysSinceLogin * 3) + (daysUntilExpiry < 10 ? 30 : 0) - (usageScore * 5));

      return {
        id:             u._id,
        name:           u.name,
        email:          u.email,
        plan:           u.plan,
        daysSinceLogin,
        daysUntilExpiry,
        riskScore:      Math.max(0, riskScore),
        riskLevel:      riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low',
      };
    }).sort((a, b) => b.riskScore - a.riskScore);

    const high = atRisk.filter(u => u.riskLevel === 'High');

    // AI recommendation for the top at-risk users
    let aiRecommendation = '';
    if (high.length > 0) {
      aiRecommendation = await chat(
        'You are a SaaS customer success expert.',
        `${high.length} paid subscribers are at high churn risk (inactive for 14+ days). Plans: ${[...new Set(high.map(u => u.plan))].join(', ')}.

Provide:
## IMMEDIATE ACTIONS (this week)
## EMAIL SUBJECT LINES (3 re-engagement subject lines)
## RE-ENGAGEMENT OFFER IDEAS (2-3 specific offers)
## LONG-TERM RETENTION STRATEGY

Keep under 200 words total.`
      );
    }

    res.json({ success: true, data: { users: atRisk, high: high.length, total: paidUsers.length, aiRecommendation } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Platform Health ──────────────────────────────────────────────────────────
// @route  GET /api/admin-ai/platform-health
export const getPlatformHealth = async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 86400000);

    const [totalUsers, activeUsers, recentInvoices, openInquiries, totalOpportunities] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastMatchReset: { $gte: last24h } }),
      Invoice.countDocuments({ createdAt: { $gte: last24h } }),
      ContactInquiry.countDocuments({ status: 'new' }),
      (await import('../models/Opportunity.js')).default.countDocuments(),
    ]);

    const metrics = [
      { name: 'Total Users',           value: totalUsers,           unit: 'users',   status: 'ok' },
      { name: 'Active (24h)',           value: activeUsers,          unit: 'users',   status: activeUsers > 0 ? 'ok' : 'warn' },
      { name: 'Opportunities in Store', value: totalOpportunities,   unit: 'records', status: totalOpportunities > 100 ? 'ok' : 'warn' },
      { name: 'New Invoices (24h)',     value: recentInvoices,       unit: 'invoices',status: 'ok' },
      { name: 'Open Inquiries',         value: openInquiries,        unit: 'pending', status: openInquiries > 10 ? 'warn' : 'ok' },
    ];

    // ── External API health checks (axios — consistent with rest of codebase) ──
    const checkSam = async () => {
      try {
        const r = await axios.get(
          `https://api.sam.gov/opportunities/v2/search?limit=1&api_key=${process.env.SAM_API_KEY}`,
          { timeout: 10000 }
        );
        return { name: 'SAM.gov API', status: 'ok', code: r.status };
      } catch (e) {
        const code = e.response?.status ?? 'N/A';
        // 429 = rate limited: API is reachable, just throttled → Warning not Error
        return { name: 'SAM.gov API', status: code === 429 ? 'warn' : 'error', code };
      }
    };

    const checkUsa = async () => {
      try {
        // USASpending is a POST-only API — same endpoint the usaspendingApiService uses
        const r = await axios.post(
          'https://api.usaspending.gov/api/v2/search/spending_by_award/',
          {
            filters: {
              award_type_codes: ['A', 'B', 'C', 'D'],
              time_period: [{ start_date: '2024-01-01', end_date: '2024-01-02' }],
            },
            fields: ['Award ID'],
            limit: 1,
            page: 1,
          },
          { timeout: 15000 }
        );
        return { name: 'USASpending API', status: 'ok', code: r.status };
      } catch (e) {
        const code = e.response?.status ?? 'N/A';
        return { name: 'USASpending API', status: 'error', code };
      }
    };

    const [samResult, usaResult] = await Promise.all([checkSam(), checkUsa()]);
    const apiStatus = [samResult, usaResult];

    res.json({ success: true, data: { metrics, apiStatus, checkedAt: now } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── AI Content Generator ──────────────────────────────────────────────────────
// @route  POST /api/admin-ai/generate-content
export const generateContent = async (req, res) => {
  try {
    const { type, context } = req.body;
    // type: 'email_subject', 'email_body', 'announcement', 'push_notification', 'blog_intro'

    const prompts = {
      email_subject: `Generate 5 compelling email subject lines for a federal contracting SaaS platform (Sambid Notify). Context: ${context}. Make them personalized, urgent, and benefit-focused. Output as numbered list.`,
      email_body: `Write a professional marketing email for Sambid Notify, a federal contracting intelligence platform. Context/purpose: ${context}. Include: subject line, greeting, 2-3 body paragraphs, clear CTA button text, sign-off. Keep it concise (150-200 words for body).`,
      announcement: `Write a platform announcement for Sambid Notify users. Context: ${context}. Format: headline, 2 sentences of context, bullet points of what's new, CTA. Enthusiastic but professional tone.`,
      push_notification: `Write 5 browser push notification messages for Sambid Notify. Context: ${context}. Each must be under 80 characters. Format: [Title] | [Body]. Make them compelling and action-oriented.`,
      blog_intro: `Write a 200-word blog post introduction for Sambid Notify's blog. Topic: ${context}. Target audience: small business federal contractors. SEO-friendly, informative, ends with a hook to keep reading.`,
    };

    const prompt = prompts[type] || `Generate helpful content for Sambid Notify platform. Type: ${type}. Context: ${context}`;
    const content = await chat('You are an expert SaaS marketer specializing in federal contracting platforms.', prompt);

    res.json({ success: true, data: { content, type } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Revenue Forecast ──────────────────────────────────────────────────────────
// @route  GET /api/admin-ai/revenue-forecast
export const getRevenueForecast = async (req, res) => {
  try {
    const invoices = await Invoice.find({ status: 'paid' }).sort({ paidAt: -1 }).limit(100);

    const monthlyRevenue = {};
    invoices.forEach(inv => {
      const key = new Date(inv.paidAt).toISOString().slice(0, 7);
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (inv.amount || 0);
    });

    const planCounts = await User.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]);
    const planPrices = { starter: 29, pro: 79, enterprise: 499 };
    const mrr = planCounts.reduce((sum, p) => sum + (planPrices[p._id] || 0) * p.count, 0);

    const history = Object.entries(monthlyRevenue).sort().slice(-6);

    const aiAnalysis = await chat(
      'You are a SaaS financial analyst.',
      `Analyze this SaaS platform revenue data:

Monthly Revenue History: ${history.map(([m, v]) => `${m}: $${v}`).join(', ')}
Current MRR (estimated): $${mrr}
Plan Distribution: ${planCounts.map(p => `${p._id}: ${p.count}`).join(', ')}

Provide:
## REVENUE SUMMARY
## MRR TREND (growing/declining/stable)
## 30-DAY FORECAST ($X estimated)
## 90-DAY FORECAST ($X estimated)
## KEY GROWTH LEVERS (top 3 actions to increase MRR)

Be specific with numbers.`
    );

    res.json({
      success: true,
      data: { monthlyRevenue: Object.fromEntries(history), mrr, planCounts, aiAnalysis },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Segment Users Lookup ──────────────────────────────────────────────────────
// @route  GET /api/admin-ai/segment-users?segment=trial
export const getSegmentUsers = async (req, res) => {
  try {
    const { segment } = req.query;
    const segmentFilters = {
      all:        {},
      trial:      { plan: 'trial', isTrialActive: true },
      free:       { plan: 'free' },
      starter:    { plan: 'starter' },
      pro:        { plan: 'pro' },
      enterprise: { plan: 'enterprise' },
      paid:       { plan: { $in: ['starter', 'pro', 'enterprise'] } },
      at_risk:    { plan: { $in: ['starter', 'pro', 'enterprise'] }, lastMatchReset: { $lt: new Date(Date.now() - 14 * 86400000) } },
      no_naics:   { naicsCodes: { $size: 0 } },
    };
    const filter = segmentFilters[segment] || {};
    const users = await User.find(filter)
      .select('name email plan isTrialActive trialEndDate lastMatchReset naicsCodes createdAt businessName planExpiresAt')
      .lean();

    const mapped = users.map(u => ({
      _id:            u._id,
      name:           u.name || u.email?.split('@')[0] || 'User',
      email:          u.email,
      plan:           u.plan,
      businessName:   u.businessName || '',
      trialDaysLeft:  u.isTrialActive && u.trialEndDate
                        ? Math.max(0, Math.ceil((new Date(u.trialEndDate) - Date.now()) / 86400000))
                        : null,
      planExpiresAt:  u.planExpiresAt,
      lastActive:     u.lastMatchReset,
      daysSinceActive: daysSince(u.lastMatchReset),
      naicsCount:     (u.naicsCodes || []).length,
      joinedAt:       u.createdAt,
    }));

    res.json({ success: true, data: { users: mapped, count: mapped.length, segment } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Automated Campaign Trigger ────────────────────────────────────────────────
// @route  POST /api/admin-ai/send-campaign
export const sendCampaign = async (req, res) => {
  try {
    const { segment, subject, body, fromName, targetUserId } = req.body;
    if (!segment || !subject || !body)
      return res.status(400).json({ success: false, message: 'segment, subject, and body are required.' });

    let users;

    if (targetUserId) {
      // Single user send
      const user = await User.findById(targetUserId).select('name email');
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
      users = [user];
    } else {
      // Segment send
      // Use { $ne: false } so users without the field set (older accounts) are included;
      // only explicitly opted-out users (emailAlertsEnabled: false) are excluded.
      const segmentFilters = {
        all:        {},
        trial:      { plan: 'trial', isTrialActive: true },
        free:       { plan: 'free' },
        starter:    { plan: 'starter' },
        pro:        { plan: 'pro' },
        enterprise: { plan: 'enterprise' },
        paid:       { plan: { $in: ['starter', 'pro', 'enterprise'] } },
        at_risk:    { plan: { $in: ['starter', 'pro', 'enterprise'] }, lastMatchReset: { $lt: new Date(Date.now() - 14 * 86400000) } },
        no_naics:   { naicsCodes: { $size: 0 } },
      };
      const filter = { ...(segmentFilters[segment] || {}), emailAlertsEnabled: { $ne: false } };
      users = await User.find(filter).select('name email');
      if (users.length === 0)
        return res.status(400).json({ success: false, message: 'No users found for this segment.' });
    }

    // Check SMTP is configured before starting the loop
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({
        success: false,
        message: 'Email (SMTP) is not configured. Go to Admin → Settings → Email/SMTP and save your credentials first.',
      });
    }

    let sent = 0;
    const errors = [];
    const errorDetails = [];
    const recipients = [];
    for (const user of users) {
      try {
        await sendBroadcastEmailToSegment(user, subject, body, fromName || 'Sambid Notify');
        sent++;
        recipients.push({ name: user.name || '', email: user.email, delivered: true });
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.error(`❌ Campaign email failed for ${user.email}:`, e.message);
        errors.push(user.email);
        errorDetails.push({ email: user.email, error: e.message });
        recipients.push({ name: user.name || '', email: user.email, delivered: false });
      }
    }

    // Determine campaign status
    const status = sent === users.length ? 'success' : sent > 0 ? 'partial' : 'failed';

    // Save to campaign log
    await CampaignLog.create({
      segment,
      subject,
      bodyPreview:  body.slice(0, 200),
      fromName:     fromName || 'Sambid Notify',
      targetUserId: targetUserId || null,
      targetEmail:  targetUserId ? users[0]?.email : null,
      totalUsers:   users.length,
      sent,
      failed:       errors.length,
      recipients,
      failedEmails: errors,
      status,
    });

    await AdminNotification.create({
      title:   `📧 Campaign Sent — ${segment}`,
      message: `"${subject}" sent to ${sent}/${users.length} ${targetUserId ? 'user' : `users in segment: ${segment}`}`,
      type:    'system',
      actionRequired: false,
      priority: 'medium',
    });

    const message = sent === 0 && errors.length > 0
      ? `All ${errors.length} emails failed. First error: ${errorDetails[0]?.error || 'unknown'}`
      : `Campaign sent to ${sent} user${sent !== 1 ? 's' : ''}.${errors.length ? ` (${errors.length} failed)` : ''}`;

    res.json({ success: sent > 0, message, data: { sent, total: users.length, errors, errorDetails } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Campaign History ──────────────────────────────────────────────────────────
// @route  GET /api/admin-ai/campaign-history
export const getCampaignHistory = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(50, parseInt(req.query.limit || '20'));
    const skip  = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      CampaignLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('targetUserId', 'name email')
        .lean(),
      CampaignLog.countDocuments(),
    ]);

    res.json({ success: true, data: { logs, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
