// backend/services/emailSchedulerService.js
import cron from 'node-cron';
import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';
import AlertNotification from '../models/AlertNotification.js';
import SavedOpportunity from '../models/SavedOpportunity.js';
import UserCertification from '../models/UserCertification.js';
import {
  sendTrialReminder,
  sendTrialDailyUpgradeEmail,
  sendTrialExpiredNotification,
  sendDailyDigest,
  sendRealTimeAlert,
  sendWeeklyDigest,
  sendDeadlineReminder,
  sendCertificationExpiryAlert,
  sendWeeklyMarketResearchEmail,
} from './emailService.js';
import { generateMarketResearchReport } from './geminiService.js';

// SAM Registration & Certification Expiry Alerts — 90, 60, 30 days before
const processCertificationExpiryAlerts = async () => {
  const REMINDER_DAYS = [90, 60, 30];
  const now = new Date(); now.setHours(0, 0, 0, 0);

  for (const daysAhead of REMINDER_DAYS) {
    const from = new Date(now); from.setDate(from.getDate() + daysAhead);
    const to   = new Date(from); to.setDate(to.getDate() + 1);

    const certs = await UserCertification.find({
      expiryDate: { $gte: from, $lt: to },
      [`remindersSent.d${daysAhead}`]: { $ne: true },
    }).populate('user', 'email name emailAlertsEnabled plan');

    for (const cert of certs) {
      if (!cert.user?.emailAlertsEnabled) continue;
      try {
        await sendCertificationExpiryAlert(cert.user, cert, daysAhead);
        cert.remindersSent = { ...(cert.remindersSent || {}), [`d${daysAhead}`]: true };
        await cert.save();
      } catch (e) {
        console.error(`Cert expiry alert failed for ${cert.user?.email}:`, e.message);
      }
    }
  }
};

// Smart Deadline Reminders — fires at 30, 14, 7, 3, 1 day before submission deadline
const processDeadlineReminders = async () => {
  const REMINDER_DAYS = [30, 14, 7, 3, 1];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const daysAhead of REMINDER_DAYS) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const saved = await SavedOpportunity.find({
      [`deadlineReminderSent.d${daysAhead}`]: { $ne: true },
    }).populate([
      { path: 'user', match: { emailAlertsEnabled: true, plan: { $in: ['starter', 'pro', 'enterprise'] } } },
      { path: 'opportunity', match: { dueDate: { $gte: targetDate, $lt: nextDay } } },
    ]);

    for (const s of saved) {
      if (!s.user || !s.opportunity) continue;
      try {
        await sendDeadlineReminder(s.user, s.opportunity, daysAhead);
        s.deadlineReminderSent = { ...(s.deadlineReminderSent || {}), [`d${daysAhead}`]: true };
        await s.save();
      } catch (e) {
        console.error(`Deadline reminder failed for ${s.user?.email}:`, e.message);
      }
    }
  }
};

// Process trial reminders — sends an upgrade nudge EVERY day of the 3-day trial
const processTrialReminders = async () => {
  console.log('📧 Processing trial reminders...');

  const users = await User.find({
    plan: 'trial',
    isTrialActive: true,
    trialEndDate: { $exists: true }
  });

  const today = new Date().toDateString();

  for (const user of users) {
    const daysLeft = user.getTrialDaysLeft
      ? user.getTrialDaysLeft()
      : Math.ceil((user.trialEndDate - new Date()) / (1000 * 60 * 60 * 24));

    // Send expired notification on day 0
    if (daysLeft <= 0 && user.isTrialActive) {
      try {
        await sendTrialExpiredNotification(user);
      } catch (e) {
        console.error(`Trial expired email failed for ${user.email}:`, e.message);
      }
      user.isTrialActive = false;
      user.plan = 'expired';
      await user.save();
      continue;
    }

    // Send one upgrade nudge per day for every remaining day of the trial
    const lastSent = user.lastTrialReminderSent;
    if (!lastSent || new Date(lastSent).toDateString() !== today) {
      try {
        await sendTrialDailyUpgradeEmail(user, daysLeft);
        user.lastTrialReminderSent = new Date();
        await user.save();
      } catch (e) {
        console.error(`Trial daily upgrade email failed for ${user.email}:`, e.message);
      }
    }
  }
};

// Send real-time alerts IMMEDIATELY (no delay)
const processRealTimeAlerts = async () => {
  console.log('📧 Processing real-time alerts...');
  
  // Get ALL users who want real-time alerts (Enterprise and Pro with realtime setting)
  const users = await User.find({
    plan: { $in: ['enterprise', 'pro'] },
    emailAlertsEnabled: true,
    alertFrequency: 'realtime'
  });
  
  for (const user of users) {
    // Get UNREAD notifications that haven't been emailed yet
    const notifications = await AlertNotification.find({
      user: user._id,
      isRead: false,
      emailSent: false
    }).populate('opportunity');
    
    // Send email for each notification immediately
    for (const notification of notifications) {
      if (notification.opportunity && !notification.emailSent) {
        try {
          await sendRealTimeAlert(user, notification.opportunity);
          notification.emailSent = true;
          notification.emailSentAt = new Date();
          await notification.save();
          console.log(`📧 Real-time email sent to ${user.email} for: ${notification.opportunity.title}`);
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${user.email}:`, emailError.message);
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
};

// Process daily digests (for users who prefer daily)
const processDailyDigests = async () => {
  console.log('📧 Processing daily digests...');
  
  const users = await User.find({
    plan: { $in: ['starter', 'pro', 'enterprise'] },
    emailAlertsEnabled: true,
    alertFrequency: 'daily'
  });
  
  for (const user of users) {
    // Get notifications from last 24 hours that haven't been emailed
    const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const notifications = await AlertNotification.find({
      user: user._id,
      emailSent: false,
      sentAt: { $gte: lastDay }
    }).populate('opportunity');
    
    if (notifications.length > 0) {
      const opportunities = notifications.map(n => n.opportunity).filter(o => o);
      if (opportunities.length > 0) {
        const lastSent = user.lastDigestSent;
        const today = new Date().toDateString();
        
        if (!lastSent || new Date(lastSent).toDateString() !== today) {
          await sendDailyDigest(user, opportunities);
          // Mark all as emailed
          await AlertNotification.updateMany(
            { _id: { $in: notifications.map(n => n._id) } },
            { emailSent: true, emailSentAt: new Date() }
          );
          user.lastDigestSent = new Date();
          await user.save();
          console.log(`📧 Daily digest sent to ${user.email} (${opportunities.length} matches)`);
        }
      }
    }
  }
};

// Process weekly digests (for free users)
const processWeeklyDigests = async () => {
  console.log('📧 Processing weekly digests...');
  
  const users = await User.find({
    plan: 'free',
    emailAlertsEnabled: true,
    alertFrequency: 'weekly'
  });
  
  for (const user of users) {
    // Send on Mondays only
    const today = new Date().getDay();
    if (today !== 1) continue; // 1 = Monday
    
    const lastSent = user.lastDigestSent;
    const thisWeek = getWeekNumber(new Date());
    
    if (!lastSent || getWeekNumber(new Date(lastSent)) !== thisWeek) {
      // Get last 7 days of notifications
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const notifications = await AlertNotification.find({
        user: user._id,
        emailSent: false,
        sentAt: { $gte: lastWeek }
      }).populate('opportunity');
      
      if (notifications.length > 0) {
        const opportunities = notifications.map(n => n.opportunity).filter(o => o);
        if (opportunities.length > 0) {
          await sendWeeklyDigest(user, opportunities);
          // Mark all as emailed
          await AlertNotification.updateMany(
            { _id: { $in: notifications.map(n => n._id) } },
            { emailSent: true, emailSentAt: new Date() }
          );
          user.lastDigestSent = new Date();
          await user.save();
          console.log(`📧 Weekly digest sent to ${user.email} (${opportunities.length} matches)`);
        }
      }
    }
  }
};

// Helper function to get week number
const getWeekNumber = (date) => {
  const d = new Date(date);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-${weekNumber}`;
};

// Main scheduler - runs every 5 minutes (for real-time)
export const startEmailScheduler = () => {
  console.log('\n📧 Starting Email Notification Scheduler...');
  console.log('   📨 Real-time emails (Enterprise/Pro) → sent immediately when matches found');
  console.log('   📅 Daily digest (Starter/Pro/Enterprise) → sent at 8 AM');
  console.log('   📆 Weekly digest (Free) → sent on Mondays at 9 AM');
  console.log('   ⏰ Trial reminders → sent every day during the 3-day trial');
  
  // Process real-time alerts every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('\n📧 [SCHEDULER] Running real-time email check...', new Date().toLocaleString());
    try {
      await processRealTimeAlerts();
    } catch (error) {
      console.error('❌ Real-time alerts error:', error);
    }
  });
  
  // Process trial reminders every hour
  cron.schedule('0 * * * *', async () => {
    console.log('\n📧 [SCHEDULER] Running trial reminders check...');
    try {
      await processTrialReminders();
    } catch (error) {
      console.error('❌ Trial reminders error:', error);
    }
  });
  
  // Deadline reminders — run daily at 7 AM
  cron.schedule('0 7 * * *', async () => {
    console.log('\n📧 [SCHEDULER] Checking deadline reminders...');
    try {
      await processDeadlineReminders();
      await processCertificationExpiryAlerts();
    } catch (error) {
      console.error('❌ Deadline/cert reminders error:', error);
    }
  });

  // Daily digest at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('\n📧 [SCHEDULER] Running daily digest...', new Date().toLocaleString());
    try {
      await processDailyDigests();
    } catch (error) {
      console.error('❌ Daily digest error:', error);
    }
  });
  
  // Weekly AI Market Research Report — Enterprise users, Monday at 6 AM
  cron.schedule('0 6 * * 1', async () => {
    console.log('\n📊 [SCHEDULER] Sending weekly market research to Enterprise users...');
    try {
      const enterpriseUsers = await User.find({ plan: 'enterprise', emailAlertsEnabled: true });
      for (const user of enterpriseUsers) {
        try {
          const report = await generateMarketResearchReport({ naicsCodes: user.naicsCodes, businessName: user.businessName });
          await sendWeeklyMarketResearchEmail(user, report);
          await new Promise(r => setTimeout(r, 2000)); // rate limit
        } catch (e) {
          console.error(`Market research email failed for ${user.email}:`, e.message);
        }
      }
    } catch (error) {
      console.error('❌ Weekly market research error:', error);
    }
  });

  // Weekly digest on Monday at 9 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('\n📧 [SCHEDULER] Running weekly digest...', new Date().toLocaleString());
    try {
      await processWeeklyDigests();
    } catch (error) {
      console.error('❌ Weekly digest error:', error);
    }
  });
  
  // Also run once on startup (after 30 seconds)
  setTimeout(async () => {
    console.log('\n📧 [STARTUP] Running initial email check...');
    try {
      await processRealTimeAlerts();
      await processTrialReminders();
    } catch (error) {
      console.error('❌ Initial email check error:', error);
    }
  }, 30000);
  
  console.log('✅ Email notification scheduler started successfully!');
  console.log('   ⏱️  Real-time check every 5 minutes');
  console.log('   ⏱️  Daily digest at 8:00 AM');
  console.log('   ⏱️  Weekly digest on Mondays at 9:00 AM\n');
};

// Manual trigger for testing
export const triggerManualEmailCheck = async () => {
  console.log('🔧 Manual email check triggered');
  await processRealTimeAlerts();
  await processTrialReminders();
  await processDailyDigests();
  console.log('✅ Manual email check completed');
};