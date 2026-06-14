import Admin from '../models/Admin.js';
import User from '../models/User.js';
import SupportReferral, { SUPPORT_DISCOUNT_RATE, SUPPORT_COMMISSION_RATE } from '../models/SupportReferral.js';
import SupportWithdrawal, { SUPPORT_MIN_WITHDRAWAL } from '../models/SupportWithdrawal.js';

// ─── Internal: credit support commission after a payment ─────────────────────
// Called from paymentController after every successful plan payment
export const creditSupportCommission = async (userId, invoiceId, plan, paidAmount) => {
  try {
    const user = await User.findById(userId).select('supportReferredBy email');
    if (!user?.supportReferredBy) return;

    const commission = Math.round(paidAmount * SUPPORT_COMMISSION_RATE * 100) / 100;
    if (commission <= 0) return;

    // Upsert a referral record (one per user, update on repeat purchases)
    const referral = await SupportReferral.findOneAndUpdate(
      { user: userId, supportMember: user.supportReferredBy },
      {
        $set: {
          status: 'rewarded',
          planPurchased: plan,
          paidAmount,
          rewardedAt: new Date(),
          invoiceId,
        },
        $inc: { commissionAmount: commission },
        $setOnInsert: {
          supportMember: user.supportReferredBy,
          user: userId,
        },
      },
      { upsert: true, new: true }
    );

    // Credit support member balance
    await Admin.findByIdAndUpdate(user.supportReferredBy, {
      $inc: {
        referralBalance:       commission,
        totalCommissionEarned: commission,
      },
    });

    console.log(`💸 Support commission $${commission} credited (user: ${user.email}, plan: ${plan})`);
  } catch (err) {
    console.error('Support commission error:', err.message);
  }
};

// ─── GET /api/support/stats ───────────────────────────────────────────────────
export const getSupportStats = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    const frontendUrl = process.env.FRONTEND_URL || 'https://sambid.co';
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

    // Users who signed up via this support member (SupportReferral + direct lookup)
    const totalSignups = await User.countDocuments({ supportReferredBy: admin._id });

    res.json({
      success: true,
      data: {
        referralCode:          admin.referralCode,
        referralLink,
        referralBalance:       admin.referralBalance,
        totalCommissionEarned: admin.totalCommissionEarned,
        canWithdraw:           admin.referralBalance >= SUPPORT_MIN_WITHDRAWAL,
        minWithdrawal:         SUPPORT_MIN_WITHDRAWAL,
        totalSignups,
        convertedCount: referrals.filter(r => r.status === 'rewarded').length,
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

    // Deduct balance immediately
    admin.referralBalance = Math.max(0, admin.referralBalance - amount);
    await admin.save();

    const withdrawal = await SupportWithdrawal.create({
      supportMember: admin._id,
      amount,
      method,
      accountDetails: accountDetails || {},
    });

    res.json({ success: true, message: 'Withdrawal request submitted. Admin will process within 3-5 business days.', data: withdrawal });
  } catch (err) {
    console.error('Support withdrawal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/support/admin/all ───────────────────────────────────────────────
// Admin view: all support members with their referral stats
export const adminGetAllSupportStats = async (req, res) => {
  try {
    const supportMembers = await Admin.find({ role: 'support' }).select('-password').sort({ createdAt: -1 });

    const stats = await Promise.all(supportMembers.map(async (member) => {
      const [signups, referrals, withdrawals] = await Promise.all([
        User.countDocuments({ supportReferredBy: member._id }),
        SupportReferral.find({ supportMember: member._id }),
        SupportWithdrawal.find({ supportMember: member._id }),
      ]);

      return {
        member: {
          _id: member._id,
          name: member.name,
          email: member.email,
          referralCode: member.referralCode,
          referralBalance: member.referralBalance,
          totalCommissionEarned: member.totalCommissionEarned,
          isActive: member.isActive,
          lastLoginAt: member.lastLoginAt,
        },
        totalSignups: signups,
        convertedCount: referrals.filter(r => r.status === 'rewarded').length,
        totalWithdrawn: withdrawals.filter(w => ['approved','paid'].includes(w.status)).reduce((s,w) => s+w.amount, 0),
        pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
      };
    }));

    res.json({ success: true, data: stats });
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

    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
    if (!['pending', 'approved'].includes(withdrawal.status)) {
      return res.status(400).json({ success: false, message: 'Already processed.' });
    }
    if (!['approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    if (status === 'paid' && !paymentId?.trim()) {
      return res.status(400).json({ success: false, message: 'Payment ID / transaction reference is required.' });
    }

    withdrawal.status      = status;
    withdrawal.adminNote   = adminNote || '';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.admin._id;
    if (paymentId)           withdrawal.paymentId           = paymentId.trim();
    if (proofScreenshotUrl)  withdrawal.proofScreenshotUrl  = proofScreenshotUrl.trim();

    await withdrawal.save();

    if (status === 'rejected') {
      await Admin.findByIdAndUpdate(withdrawal.supportMember._id, {
        $inc: { referralBalance: withdrawal.amount },
      });
    }

    res.json({ success: true, message: `Withdrawal marked as ${status}.`, data: withdrawal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
