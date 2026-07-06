// backend/services/deadlineAlertService.js
//
// Three tiers of deadline alerts sent to users for matched opportunities:
//
//   1. "upcoming"  — one email when a matched opp first enters the user's alertDays window
//   2. "1day"      — up to 5 emails, every 5 hours, while <24 h remain
//   3. "final"     — up to 3 emails, every 20 minutes, while <60 min remain

import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';
import UserOpportunity from '../models/UserOpportunity.js';
import DeadlineAlert from '../models/DeadlineAlert.js';
import {
  sendDeadlineUpcomingAlert,
  sendDeadline1DayAlert,
  sendDeadlineFinalAlert,
} from './emailService.js';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MIN  = 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────────────────────

const alreadySent = async (userId, oppId, alertType, alertIndex) =>
  DeadlineAlert.exists({ user: userId, opportunity: oppId, alertType, alertIndex });

const markSent = (userId, oppId, alertType, alertIndex, dueDate) =>
  DeadlineAlert.create({ user: userId, opportunity: oppId, alertType, alertIndex, dueDate })
    .catch(e => { if (e.code !== 11000) console.error('DeadlineAlert.create error:', e.message); });

// ── 1. Upcoming deadline (first notice within user's alertDays window) ─────────
export const checkUpcomingDeadlineAlerts = async () => {
  try {
    const now = new Date();
    const users = await User.find({
      emailAlertsEnabled: { $ne: false },
      plan: { $nin: ['expired'] },
    }).lean();

    let sent = 0;
    for (const user of users) {
      try {
        const alertDays = user.deadlineAlertDays || 30;
        const windowEnd = new Date(now.getTime() + alertDays * 24 * MS_PER_HOUR);

        // Opps in user's feed that have a due date within their alert window
        const userOpps = await UserOpportunity.find({ user: user._id })
          .populate({
            path: 'opportunity',
            match: {
              dueDate: { $gt: now, $lte: windowEnd },
            },
          })
          .lean();

        for (const { opportunity: opp } of userOpps) {
          if (!opp) continue;
          if (await alreadySent(user._id, opp._id, 'upcoming', 1)) continue;

          const daysLeft = Math.ceil((new Date(opp.dueDate) - now) / (24 * MS_PER_HOUR));
          await sendDeadlineUpcomingAlert(user, opp, daysLeft);
          await markSent(user._id, opp._id, 'upcoming', 1, opp.dueDate);
          sent++;
        }
      } catch (userErr) {
        console.error(`Upcoming alert error for ${user.email}:`, userErr.message);
      }
    }
    if (sent) console.log(`📅 Upcoming deadline alerts: ${sent} sent`);
  } catch (err) {
    console.error('checkUpcomingDeadlineAlerts error:', err.message);
  }
};

// ── 2. 1-day countdown (5 emails, every 5 h, while 4–24 h remain) ─────────────
export const check1DayDeadlineAlerts = async () => {
  try {
    const now = new Date();
    // Window: opps with 4 h < dueDate <= 24 h from now
    const low  = new Date(now.getTime() + 4  * MS_PER_HOUR);
    const high = new Date(now.getTime() + 24 * MS_PER_HOUR);

    const users = await User.find({
      emailAlertsEnabled: { $ne: false },
      plan: { $nin: ['expired'] },
    }).lean();

    let sent = 0;
    for (const user of users) {
      try {
        const userOpps = await UserOpportunity.find({ user: user._id })
          .populate({
            path: 'opportunity',
            match: { dueDate: { $gt: low, $lte: high } },
          })
          .lean();

        for (const { opportunity: opp } of userOpps) {
          if (!opp) continue;

          // How many have we sent already?
          const sentCount = await DeadlineAlert.countDocuments({
            user: user._id, opportunity: opp._id, alertType: '1day',
          });
          if (sentCount >= 5) continue;

          const nextIndex = sentCount + 1;
          if (await alreadySent(user._id, opp._id, '1day', nextIndex)) continue;

          // Enforce ~5 h gap between consecutive 1day alerts
          if (sentCount > 0) {
            const lastAlert = await DeadlineAlert.findOne({
              user: user._id, opportunity: opp._id, alertType: '1day',
            }).sort({ sentAt: -1 }).lean();
            if (lastAlert) {
              const gapMs = now - new Date(lastAlert.sentAt);
              if (gapMs < 5 * MS_PER_HOUR - 5 * MS_PER_MIN) continue; // tolerance 5 min
            }
          }

          const hoursLeft = (new Date(opp.dueDate) - now) / MS_PER_HOUR;
          await sendDeadline1DayAlert(user, opp, nextIndex, hoursLeft);
          await markSent(user._id, opp._id, '1day', nextIndex, opp.dueDate);
          sent++;
        }
      } catch (userErr) {
        console.error(`1-day alert error for ${user.email}:`, userErr.message);
      }
    }
    if (sent) console.log(`⚠️  1-day deadline alerts: ${sent} sent`);
  } catch (err) {
    console.error('check1DayDeadlineAlerts error:', err.message);
  }
};

// ── 3. Final-hour alerts (3 emails, every 20 min, while <60 min remain) ───────
export const checkFinalHourDeadlineAlerts = async () => {
  try {
    const now = new Date();
    const high = new Date(now.getTime() + 60 * MS_PER_MIN); // opps due within 60 min

    const users = await User.find({
      emailAlertsEnabled: { $ne: false },
      plan: { $nin: ['expired'] },
    }).lean();

    let sent = 0;
    for (const user of users) {
      try {
        const userOpps = await UserOpportunity.find({ user: user._id })
          .populate({
            path: 'opportunity',
            match: { dueDate: { $gt: now, $lte: high } },
          })
          .lean();

        for (const { opportunity: opp } of userOpps) {
          if (!opp) continue;

          const sentCount = await DeadlineAlert.countDocuments({
            user: user._id, opportunity: opp._id, alertType: 'final',
          });
          if (sentCount >= 3) continue;

          const nextIndex = sentCount + 1;
          if (await alreadySent(user._id, opp._id, 'final', nextIndex)) continue;

          // Enforce ~20 min gap between consecutive final alerts
          if (sentCount > 0) {
            const lastAlert = await DeadlineAlert.findOne({
              user: user._id, opportunity: opp._id, alertType: 'final',
            }).sort({ sentAt: -1 }).lean();
            if (lastAlert) {
              const gapMs = now - new Date(lastAlert.sentAt);
              if (gapMs < 20 * MS_PER_MIN - 2 * MS_PER_MIN) continue; // tolerance 2 min
            }
          }

          const minutesLeft = (new Date(opp.dueDate) - now) / MS_PER_MIN;
          await sendDeadlineFinalAlert(user, opp, nextIndex, minutesLeft);
          await markSent(user._id, opp._id, 'final', nextIndex, opp.dueDate);
          sent++;
        }
      } catch (userErr) {
        console.error(`Final-hour alert error for ${user.email}:`, userErr.message);
      }
    }
    if (sent) console.log(`🚨 Final-hour deadline alerts: ${sent} sent`);
  } catch (err) {
    console.error('checkFinalHourDeadlineAlerts error:', err.message);
  }
};
