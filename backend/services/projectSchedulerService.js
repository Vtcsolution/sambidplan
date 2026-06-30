import cron from 'node-cron';
import ManagedProject    from '../models/ManagedProject.js';
import ProjectMilestone  from '../models/ProjectMilestone.js';
import ManagedService    from '../models/ManagedService.js';
import CommissionInvoice from '../models/CommissionInvoice.js';
import UserNotification  from '../models/UserNotification.js';
import User              from '../models/User.js';
import { sendDeadlineAlertEmail } from './emailService.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '';

// ── Daily: Deadline alerts (7-day and 3-day warnings) ────────────────────────
const runDeadlineAlerts = async () => {
  console.log('⏰ Running project deadline alerts...');
  try {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 86400000);
    const in3days = new Date(now.getTime() + 3 * 86400000);

    const projects = await ManagedProject.find({
      status: { $in: ['in_progress', 'vendor_selected'] },
      deliveryDeadline: { $gte: now, $lte: in7days },
    }).lean();

    for (const project of projects) {
      const daysLeft = Math.ceil((new Date(project.deliveryDeadline) - now) / 86400000);
      const alertType = daysLeft <= 3 ? 'deadline_3day' : 'deadline_7day';

      const alreadySent = project.alertsSent?.some(a => a.type === alertType);
      if (alreadySent) continue;

      const recipients = [project.selectedVendor?.email, ADMIN_EMAIL].filter(Boolean);
      if (recipients.length) {
        await sendDeadlineAlertEmail(recipients, project, daysLeft).catch(() => {});
      }

      await ManagedProject.findByIdAndUpdate(project._id, {
        $push: { alertsSent: { type: alertType, sentAt: new Date() } },
      });

      // Notify project owner
      try {
        await UserNotification.create({
          user: project.owner,
          type: 'managed_project_update',
          title: `Deadline Alert: ${daysLeft} days left`,
          message: `"${project.title}" delivery deadline is in ${daysLeft} days.`,
          link: '/company/managed-service',
        });
      } catch {}

      console.log(`  📧 Sent ${alertType} for "${project.title}" (${daysLeft}d left)`);
    }
    console.log(`✅ Deadline alerts done — ${projects.length} project(s) checked`);
  } catch (err) {
    console.error('❌ Deadline alerts error:', err.message);
  }
};

// ── Daily: Flag overdue government payments ──────────────────────────────────
const runGovPaymentCheck = async () => {
  console.log('💰 Checking overdue government payments...');
  try {
    const now = new Date();
    const overdueProjects = await ManagedProject.find({
      status: { $in: ['delivered', 'payment_pending'] },
      govPaymentStatus: 'pending',
      govPaymentExpectedDate: { $lt: now },
    }).lean();

    for (const project of overdueProjects) {
      const daysOverdue = Math.ceil((now - new Date(project.govPaymentExpectedDate)) / 86400000);
      const alertType = 'gov_payment_overdue';
      const alreadySent = project.alertsSent?.some(a => a.type === alertType);
      if (alreadySent) continue;

      try {
        await UserNotification.create({
          user: project.owner,
          type: 'managed_payment_update',
          title: 'Government Payment Overdue',
          message: `Payment for "${project.title}" is ${daysOverdue} days overdue (expected ${new Date(project.govPaymentExpectedDate).toLocaleDateString()}).`,
          link: '/company/managed-service',
        });
      } catch {}

      await ManagedProject.findByIdAndUpdate(project._id, {
        $push: { alertsSent: { type: alertType, sentAt: new Date() } },
      });

      console.log(`  ⚠️ Gov payment overdue: "${project.title}" (${daysOverdue}d)`);
    }
    console.log(`✅ Gov payment check done — ${overdueProjects.length} overdue`);
  } catch (err) {
    console.error('❌ Gov payment check error:', err.message);
  }
};

// ── Weekly: Progress summary for active projects ─────────────────────────────
const runWeeklyProgressSummary = async () => {
  console.log('📊 Running weekly project progress summary...');
  try {
    const activeProjects = await ManagedProject.find({ status: 'in_progress' })
      .populate('owner', 'name email')
      .lean();

    for (const project of activeProjects) {
      if (!project.owner?.email) continue;

      const milestones = await ProjectMilestone.find({ managedProject: project._id }).lean();
      const approved = milestones.filter(m => m.status === 'approved').length;
      const inProgress = milestones.filter(m => m.status === 'in_progress' || m.status === 'submitted').length;

      try {
        await UserNotification.create({
          user: project.owner._id,
          type: 'managed_project_update',
          title: 'Weekly Progress Report',
          message: `"${project.title}": ${project.overallProgress}% complete — ${approved}/${milestones.length} milestones done, ${inProgress} in progress.`,
          link: '/company/managed-service',
        });
      } catch {}
    }
    console.log(`✅ Weekly summary done — ${activeProjects.length} active projects`);
  } catch (err) {
    console.error('❌ Weekly summary error:', err.message);
  }
};

// ── Monthly: Auto-generate the monthly retainer fee for every active company ─
// Previously 100% manual — admin had to remember to click "Monthly Fee" per
// company every month. Now it's automatic on the 1st, with a duplicate guard
// so re-running the job (or a late server restart) never double-bills.
export const runMonthlyCommissionFees = async () => {
  console.log('🧾 Running monthly managed-service fee billing...');
  try {
    const { sendMonthlyFeeEmail } = await import('../controllers/adminManagedServiceController.js');
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const activeServices = await ManagedService.find({ status: 'active' }).populate('owner', 'name email');
    let billed = 0, skipped = 0;

    for (const ms of activeServices) {
      if (!ms.monthlyFee || ms.monthlyFee <= 0) { skipped++; continue; }

      const alreadyBilled = await CommissionInvoice.exists({
        managedService: ms._id,
        type: 'monthly_fee',
        createdAt: { $gte: monthStart },
      });
      if (alreadyBilled) { skipped++; continue; }

      try {
        const invoice = await CommissionInvoice.create({
          managedService: ms._id,
          company:        ms.company,
          owner:          ms.owner._id,
          type:           'monthly_fee',
          amount:         ms.monthlyFee,
          dueDate:        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        });

        await UserNotification.create({
          user: ms.owner._id,
          type: 'commission_invoice',
          title: 'Monthly Service Invoice',
          message: `Your monthly service invoice of $${ms.monthlyFee.toLocaleString()} (${invoice.invoiceNumber}) has been generated and is due in 14 days.`,
          link: '/company/managed-service',
        });
        sendMonthlyFeeEmail(ms.owner, invoice).catch(() => {});

        billed++;
        console.log(`  💳 Billed ${ms.owner.email} — ${invoice.invoiceNumber} ($${ms.monthlyFee})`);
      } catch (err) {
        console.error(`  ❌ Failed to bill managed service ${ms._id}:`, err.message);
      }
    }

    console.log(`✅ Monthly fee billing done — ${billed} billed, ${skipped} skipped (already billed or $0 fee)`);
  } catch (err) {
    console.error('❌ Monthly fee billing error:', err.message);
  }
};

// ── Bootstrap ────────────────────────────────────────────────────────────────
export const startProjectScheduler = () => {
  console.log('📅 Starting Project Scheduler');
  console.log('   Deadline alerts:        daily 08:00 UTC');
  console.log('   Gov payment check:      daily 09:00 UTC');
  console.log('   Weekly progress summary: Monday 10:00 UTC');
  console.log('   Monthly fee billing:    1st of month 02:00 UTC');

  cron.schedule('0 8 * * *',  () => runDeadlineAlerts());
  cron.schedule('0 9 * * *',  () => runGovPaymentCheck());
  cron.schedule('0 10 * * 1', () => runWeeklyProgressSummary());
  cron.schedule('0 2 1 * *',  () => runMonthlyCommissionFees());
};
