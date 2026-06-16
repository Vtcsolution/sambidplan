import Admin from '../models/Admin.js';
import User from '../models/User.js';
import SupportReferral, {
  FIRST_PURCHASE_RATE,
  RECURRING_RATE,
  PRO_ENTERPRISE_TARGET,
  PRO_ENTERPRISE_PLANS,
} from '../models/SupportReferral.js';
import SupportWithdrawal, { SUPPORT_MIN_WITHDRAWAL } from '../models/SupportWithdrawal.js';
import AdminNotification from '../models/admin/AdminNotification.js';
import { sendWithdrawalRequestEmails, sendWithdrawalStatusEmail } from '../services/emailService.js';

// ─── Internal: credit commission after a payment ──────────────────────────────
// Called from paymentController after every successful paid invoice.
// Detects first purchase vs. renewal automatically.
export const creditSupportCommission = async (userId, invoiceId, plan, paidAmount) => {
  try {
    const user = await User.findById(userId).select('supportReferredBy email');
    if (!user?.supportReferredBy) {
      console.log(`ℹ️  Support commission skipped for ${user?.email} — no support referral`);
      return;
    }
    console.log(`🔍 Processing support commission: user=${user.email}, plan=${plan}, amount=$${paidAmount}`);

    const existing = await SupportReferral.findOne({
      user:          userId,
      supportMember: user.supportReferredBy,
    });

    const isProEnterprise = PRO_ENTERPRISE_PLANS.includes(plan);

    // ── Case A: First purchase (any plan) → 15% one-time ─────────────────────
    if (!existing || existing.status === 'registered') {
      const commission = Math.round(paidAmount * FIRST_PURCHASE_RATE * 100) / 100;

      const referralDoc = {
        status:              'first_purchased',
        firstCommission:     commission,
        firstPurchasePlan:   plan,
        firstPurchaseAmount: paidAmount,
        firstPurchasedAt:    new Date(),
        countsTowardTarget:  isProEnterprise,
        commissionAmount:    commission,
        planPurchased:       plan,
        paidAmount,
        invoiceId,
        rewardedAt:          new Date(),
      };

      if (existing) {
        Object.assign(existing, referralDoc);
        await existing.save();
      } else {
        await SupportReferral.create({
          supportMember: user.supportReferredBy,
          user:          userId,
          ...referralDoc,
        });
      }

      // Credit 15% + conditionally bump Pro/Enterprise count
      const inc = {
        referralBalance:       commission,
        totalCommissionEarned: commission,
        totalOneTimeEarned:    commission,
      };
      if (isProEnterprise) inc.proEnterpriseReferralCount = 1;

      await Admin.findByIdAndUpdate(user.supportReferredBy, { $inc: inc });

      // Check if target just reached → unlock recurring
      const refreshed = await Admin.findById(user.supportReferredBy).select('recurringUnlocked proEnterpriseReferralCount email');
      if (!refreshed.recurringUnlocked && refreshed.proEnterpriseReferralCount >= PRO_ENTERPRISE_TARGET) {
        await Admin.findByIdAndUpdate(user.supportReferredBy, { $set: { recurringUnlocked: true } });
        console.log(`🎉 Support ${refreshed.email} UNLOCKED recurring commissions (100 Pro/Enterprise reached)!`);
      }

      console.log(`💸 Support one-time $${commission} (15%) → ${refreshed.email} | referee: ${user.email} | plan: ${plan}`);

      AdminNotification.create({
        title:    '🎯 Referral Converted',
        message:  `${user.email} purchased ${plan} plan ($${paidAmount}) via ${refreshed.email}'s referral — $${commission} commission earned`,
        type:     'referral_signup',
        priority: 'medium',
        actionUrl: '/admin/support-management',
        metadata: { supportMemberId: user.supportReferredBy, referredUser: user.email, plan, commission },
      }).catch(() => {});

      return;
    }

    // ── Case B: Renewal / repeat purchase → 7.5% recurring ───────────────────
    if (!isProEnterprise) return; // only Pro/Enterprise renewals earn recurring

    const admin = await Admin.findById(user.supportReferredBy).select('recurringUnlocked email proEnterpriseReferralCount');
    if (!admin.recurringUnlocked) {
      console.log(`ℹ️  Support ${admin.email} renewal skipped — recurring locked (${admin.proEnterpriseReferralCount}/${PRO_ENTERPRISE_TARGET})`);
      return;
    }

    const commission = Math.round(paidAmount * RECURRING_RATE * 100) / 100;
    if (commission <= 0) return;

    await SupportReferral.findOneAndUpdate(
      { user: userId, supportMember: user.supportReferredBy },
      {
        $push: { recurringCommissions: { invoiceId, plan, paidAmount, commission, earnedAt: new Date() } },
        $inc:  { totalRecurringEarned: commission, commissionAmount: commission },
        $set:  { planPurchased: plan },
      }
    );

    await Admin.findByIdAndUpdate(user.supportReferredBy, {
      $inc: {
        referralBalance:       commission,
        totalCommissionEarned: commission,
        totalRecurringEarned:  commission,
      },
    });

    console.log(`💸 Support recurring $${commission} (7.5%) → ${admin.email} | referee: ${user.email} | plan: ${plan}`);
  } catch (err) {
    console.error('Support commission error:', err.message, err.stack);
  }
};

// ─── GET /api/support/stats ───────────────────────────────────────────────────
export const getSupportStats = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    const frontendUrl  = process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:5173';
    const referralLink = `${frontendUrl}/signup?supportRef=${admin.referralCode}`;

    const [referrals, withdrawals] = await Promise.all([
      SupportReferral.find({ supportMember: admin._id })
        .populate('user', 'name email plan createdAt')
        .sort({ createdAt: -1 }),
      SupportWithdrawal.find({ supportMember: admin._id }).sort({ createdAt: -1 }),
    ]);

    const totalWithdrawn = withdrawals
      .filter(w => ['approved', 'paid'].includes(w.status))
      .reduce((s, w) => s + w.amount, 0);

    const pendingAmount = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((s, w) => s + w.amount, 0);

    const totalSignups = await User.countDocuments({ supportReferredBy: admin._id });

    res.json({
      success: true,
      data: {
        referralCode:               admin.referralCode,
        referralLink,
        referralBalance:            admin.referralBalance,
        totalCommissionEarned:      admin.totalCommissionEarned,
        totalOneTimeEarned:         admin.totalOneTimeEarned || 0,
        totalRecurringEarned:       admin.totalRecurringEarned || 0,
        // Target progress
        proEnterpriseReferralCount: admin.proEnterpriseReferralCount || 0,
        recurringUnlocked:          admin.recurringUnlocked || false,
        targetGoal:                 PRO_ENTERPRISE_TARGET,
        targetProgress:             Math.min(100, Math.round(((admin.proEnterpriseReferralCount || 0) / PRO_ENTERPRISE_TARGET) * 100)),
        // Commission rates (for UI display)
        firstPurchaseRate:          FIRST_PURCHASE_RATE,
        recurringRate:              RECURRING_RATE,
        canWithdraw:                admin.referralBalance >= SUPPORT_MIN_WITHDRAWAL,
        minWithdrawal:              SUPPORT_MIN_WITHDRAWAL,
        totalSignups,
        convertedCount: referrals.filter(r => r.status !== 'registered').length,
        totalWithdrawn,
        pendingAmount,
        referrals,
        recentWithdrawals: withdrawals.slice(0, 10),
      },
    });
  } catch (err) {
    console.error('Support stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/support/withdraw ───────────────────────────────────────────────
export const requestSupportWithdrawal = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);

    if (admin.referralBalance < SUPPORT_MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is $${SUPPORT_MIN_WITHDRAWAL}. Your balance is $${admin.referralBalance.toFixed(2)}.`,
      });
    }

    const { amount, method, accountDetails } = req.body;

    if (!amount || amount < SUPPORT_MIN_WITHDRAWAL) {
      return res.status(400).json({ success: false, message: `Minimum withdrawal amount is $${SUPPORT_MIN_WITHDRAWAL}.` });
    }
    if (amount > admin.referralBalance) {
      return res.status(400).json({ success: false, message: `Insufficient balance. Available: $${admin.referralBalance.toFixed(2)}` });
    }
    if (!method || !['bank_transfer', 'paypal', 'check'].includes(method)) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal method.' });
    }

    // Deduct immediately to prevent double-requests
    admin.referralBalance = Math.max(0, admin.referralBalance - amount);
    await admin.save();

    const withdrawal = await SupportWithdrawal.create({
      supportMember: admin._id,
      amount,
      method,
      accountDetails: accountDetails || {},
    });

    sendWithdrawalRequestEmails({
      supportName:  admin.name,
      supportEmail: admin.email,
      amount,
      paypalEmail:  accountDetails?.email || '',
    }).catch(e => console.error('Withdrawal request email error:', e.message));

    AdminNotification.create({
      title:          '💸 Withdrawal Request',
      message:        `${admin.name} (${admin.email}) requested $${Number(amount).toFixed(2)} via ${method.replace('_', ' ')}`,
      type:           'withdrawal_request',
      actionRequired: true,
      actionUrl:      '/admin/support-management',
      priority:       'high',
      metadata:       { supportMemberId: admin._id, amount, method, paypalEmail: accountDetails?.email || '' },
    }).catch(e => console.error('Withdrawal notification error:', e.message));

    res.json({ success: true, message: 'Withdrawal request submitted. Admin will process within 3–5 business days.', data: withdrawal });
  } catch (err) {
    console.error('Support withdrawal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/support/admin/all ───────────────────────────────────────────────
export const adminGetAllSupportStats = async (req, res) => {
  try {
    const members = await Admin.find({ role: 'support' }).select('-password').sort({ totalCommissionEarned: -1 });

    const stats = await Promise.all(members.map(async (m) => {
      const [signups, referrals, withdrawals] = await Promise.all([
        User.countDocuments({ supportReferredBy: m._id }),
        SupportReferral.find({ supportMember: m._id }).populate('user', 'name email plan createdAt'),
        SupportWithdrawal.find({ supportMember: m._id }).sort({ createdAt: -1 }),
      ]);

      const totalWithdrawn = withdrawals
        .filter(w => ['approved', 'paid'].includes(w.status))
        .reduce((s, w) => s + w.amount, 0);
      const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

      return {
        member: {
          _id:                        m._id,
          name:                       m.name,
          email:                      m.email,
          referralCode:               m.referralCode,
          referralBalance:            m.referralBalance,
          totalCommissionEarned:      m.totalCommissionEarned,
          totalOneTimeEarned:         m.totalOneTimeEarned || 0,
          totalRecurringEarned:       m.totalRecurringEarned || 0,
          proEnterpriseReferralCount: m.proEnterpriseReferralCount || 0,
          recurringUnlocked:          m.recurringUnlocked || false,
          isActive:                   m.isActive,
          lastLoginAt:                m.lastLoginAt,
          createdAt:                  m.createdAt,
        },
        targetProgress:     Math.min(100, Math.round(((m.proEnterpriseReferralCount || 0) / PRO_ENTERPRISE_TARGET) * 100)),
        totalSignups:       signups,
        convertedCount:     referrals.filter(r => r.status !== 'registered').length,
        proEnterpriseCount: referrals.filter(r => r.countsTowardTarget).length,
        totalWithdrawn,
        pendingWithdrawalCount: pendingWithdrawals.length,
        pendingWithdrawalAmount: pendingWithdrawals.reduce((s, w) => s + w.amount, 0),
        referrals,
        recentWithdrawals: withdrawals.slice(0, 5),
      };
    }));

    res.json({ success: true, data: stats, targetGoal: PRO_ENTERPRISE_TARGET });
  } catch (err) {
    console.error('Admin support stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/support/admin/withdrawals ───────────────────────────────────────
export const adminGetSupportWithdrawals = async (req, res) => {
  try {
    const withdrawals = await SupportWithdrawal.find()
      .populate('supportMember', 'name email referralCode')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: withdrawals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/support/admin/withdrawals/:id ───────────────────────────────────
export const adminProcessWithdrawal = async (req, res) => {
  try {
    const { status, adminNote, paymentId, proofScreenshotUrl } = req.body;
    const withdrawal = await SupportWithdrawal.findById(req.params.id).populate('supportMember');

    if (!withdrawal)
      return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
    if (!['pending', 'approved'].includes(withdrawal.status))
      return res.status(400).json({ success: false, message: 'Already processed.' });
    if (!['approved', 'rejected', 'paid'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    if (status === 'paid' && !paymentId?.trim())
      return res.status(400).json({ success: false, message: 'Payment ID is required when marking as paid.' });

    withdrawal.status      = status;
    withdrawal.adminNote   = adminNote  || '';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.admin._id;
    if (paymentId)          withdrawal.paymentId           = paymentId.trim();
    if (proofScreenshotUrl) withdrawal.proofScreenshotUrl  = proofScreenshotUrl.trim();
    await withdrawal.save();

    // Refund balance if rejected
    if (status === 'rejected') {
      await Admin.findByIdAndUpdate(withdrawal.supportMember._id, {
        $inc: { referralBalance: withdrawal.amount },
      });
    }

    const adminNotifyEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    sendWithdrawalStatusEmail({
      supportName:      withdrawal.supportMember.name,
      supportEmail:     withdrawal.supportMember.email,
      amount:           withdrawal.amount,
      status,
      adminNote:        adminNote || '',
      paymentId:        paymentId || '',
      proofScreenshotUrl: proofScreenshotUrl || '',
      adminEmail:       adminNotifyEmail,
    }).catch(e => console.error('Withdrawal status email error:', e.message));

    res.json({ success: true, message: `Withdrawal marked as ${status}.`, data: withdrawal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
