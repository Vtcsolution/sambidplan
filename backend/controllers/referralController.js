import User from '../models/User.js';
import Referral, { calcCommission } from '../models/Referral.js';
import Withdrawal, { MIN_PAID_REFERRALS, MIN_WITHDRAWAL_AMOUNT, MIN_BALANCE_TO_USE } from '../models/Withdrawal.js';
import { sendAdminUserActionAlert, sendPlanActivatedEmail } from '../services/emailService.js';
import { distributeToUser } from '../services/schedulerService.js';

// Standard monthly plan prices — fallback when no invoice amount is available
const PLAN_PRICES = { starter: 29, pro: 79, enterprise: 499 };
const PAID_PLANS  = ['starter', 'pro', 'enterprise'];

// ─── Helper: credit commission to referrer ────────────────────────────────────
// Called from paymentController after every successful plan purchase
export const creditReferralCommission = async (purchasingUserId, invoiceId, plan, amount) => {
  try {
    const purchaser = await User.findById(purchasingUserId);
    if (!purchaser?.referredBy) return;

    const referral = await Referral.findOne({ referee: purchasingUserId });
    if (!referral || referral.status === 'rewarded') return;

    // Use invoice amount; fall back to standard plan price if 0 or missing
    const effectiveAmount = (amount && amount > 0) ? amount : (PLAN_PRICES[plan] ?? 0);
    const commission = calcCommission(plan, effectiveAmount);
    if (commission <= 0) return;

    // Mark referral as converted + rewarded
    referral.status           = 'rewarded';
    referral.commissionAmount = commission;
    referral.commissionRate   = commission / effectiveAmount;
    referral.planPurchased    = plan;
    referral.invoiceId        = invoiceId;
    referral.rewardedAt       = new Date();
    await referral.save();

    // Credit balance to referrer
    await User.findByIdAndUpdate(purchaser.referredBy, {
      $inc: {
        referralBalance:       commission,
        totalReferralEarnings: commission,
        paidReferralCount:     1,
      },
    });

    console.log(`💸 Referral commission $${commission} credited to ${purchaser.referredBy} (referee: ${purchaser.email})`);
  } catch (err) {
    console.error('Referral commission error:', err.message, err.stack);
  }
};

// ─── Reconcile: credit commissions for existing paid referrals that were missed
// Called on server start AND via admin route POST /api/admin/referrals/reconcile
export const reconcileReferralCommissions = async () => {
  try {
    const { default: Invoice } = await import('../models/Invoice.js');

    // Find all referrals still in "registered" state whose referee already has a paid plan
    const pendingReferrals = await Referral.find({ status: 'registered' })
      .populate('referee', 'plan referredBy email _id');

    let credited = 0;

    for (const referral of pendingReferrals) {
      const referee = referral.referee;
      if (!referee || !PAID_PLANS.includes(referee.plan)) continue;

      // Try to find the paid invoice; fall back to standard plan price if none exists
      const invoice = await Invoice.findOne({
        user:   referee._id,
        status: 'paid',
        plan:   { $in: PAID_PLANS },
      }).sort({ paidAt: -1 });

      const planName = invoice?.plan  || referee.plan;
      const amount   = invoice?.amount ?? PLAN_PRICES[planName] ?? 0;

      const commission = calcCommission(planName, amount);
      if (commission <= 0) continue;

      // Update referral record
      referral.status           = 'rewarded';
      referral.commissionAmount = commission;
      referral.commissionRate   = commission / amount;
      referral.planPurchased    = planName;
      referral.invoiceId        = invoice?._id || null;
      referral.rewardedAt       = new Date();
      await referral.save();

      // Credit the referrer
      await User.findByIdAndUpdate(referral.referrer, {
        $inc: {
          referralBalance:       commission,
          totalReferralEarnings: commission,
          paidReferralCount:     1,
        },
      });

      console.log(`🔧 Reconcile: $${commission} credited to referrer (referee: ${referee.email}, plan: ${planName})`);
      credited++;
    }

    if (credited > 0) {
      console.log(`✅ Referral reconcile complete — ${credited} commission(s) credited`);
    } else {
      console.log('ℹ️  Referral reconcile: no pending commissions found');
    }
    return { credited };
  } catch (err) {
    console.error('Referral reconcile error:', err.message, err.stack);
    return { credited: 0, error: err.message };
  }
};

// ─── GET /api/referral/stats ──────────────────────────────────────────────────
export const getReferralStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const [referrals, withdrawals] = await Promise.all([
      Referral.find({ referrer: req.user._id })
        .populate('referee', 'name email plan createdAt')
        .sort({ createdAt: -1 }),
      Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 }),
    ]);

    const paidReferrals     = referrals.filter(r => r.status === 'rewarded');
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
    const totalWithdrawn    = withdrawals
      .filter(w => ['approved', 'paid'].includes(w.status))
      .reduce((s, w) => s + w.amount, 0);

    const frontendUrl  = process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:5173';
    const referralLink = `${frontendUrl}/signup?ref=${user.referralCode}`;

    res.json({
      success: true,
      data: {
        referralCode:          user.referralCode,
        referralLink,
        referralBalance:       user.referralBalance,
        totalReferralEarnings: user.totalReferralEarnings,
        paidReferralCount:     user.paidReferralCount,
        canWithdraw:           user.paidReferralCount >= MIN_PAID_REFERRALS && user.referralBalance >= MIN_WITHDRAWAL_AMOUNT,
        canUseBalance:         user.referralBalance >= MIN_BALANCE_TO_USE,
        minPaidReferrals:      MIN_PAID_REFERRALS,
        minWithdrawalAmount:   MIN_WITHDRAWAL_AMOUNT,
        minBalanceToUse:       MIN_BALANCE_TO_USE,
        referrals,
        recentWithdrawals:     withdrawals.slice(0, 5),
        pendingWithdrawalAmount: pendingWithdrawals.reduce((s, w) => s + w.amount, 0),
        totalWithdrawn,
      },
    });
  } catch (err) {
    console.error('Get referral stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/referral/withdraw ──────────────────────────────────────────────
export const requestWithdrawal = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.paidReferralCount < MIN_PAID_REFERRALS) {
      return res.status(400).json({
        success: false,
        message: `You need at least ${MIN_PAID_REFERRALS} paid referrals to withdraw. You currently have ${user.paidReferralCount}.`,
      });
    }

    const { amount, method, accountDetails } = req.body;

    if (!amount || amount < MIN_WITHDRAWAL_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}.`,
      });
    }

    if (amount > user.referralBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${user.referralBalance.toFixed(2)}`,
      });
    }

    if (!method || !['bank_transfer', 'paypal', 'check'].includes(method)) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal method.' });
    }

    // Freeze balance immediately (deduct on pending so user can't double-request)
    user.referralBalance = Math.max(0, user.referralBalance - amount);
    await user.save();

    const withdrawal = await Withdrawal.create({
      user: user._id,
      amount,
      method,
      accountDetails: accountDetails || {},
    });

    // Notify admin (fire-and-forget)
    sendAdminUserActionAlert({
      action: 'withdrawal_requested',
      userName: user.name,
      userEmail: user.email,
      details: {
        'Amount':          `$${amount.toFixed(2)}`,
        'Method':          method,
        'Remaining Balance': `$${user.referralBalance.toFixed(2)}`,
        'Paid Referrals':  user.paidReferralCount,
      },
    }).catch(() => {});

    res.json({ success: true, message: 'Withdrawal request submitted. Admin will process within 3-5 business days.', data: withdrawal });
  } catch (err) {
    console.error('Request withdrawal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/referral/apply-balance ────────────────────────────────────────
// Apply referral balance toward a pending invoice (before Stripe/PayPal payment)
export const applyReferralBalance = async (req, res) => {
  try {
    const { invoiceId, amountToApply } = req.body;
    const user = await User.findById(req.user._id);

    if (!amountToApply || amountToApply <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount.' });
    }
    if (user.referralBalance < MIN_BALANCE_TO_USE) {
      return res.status(400).json({
        success: false,
        message: `A minimum referral balance of $${MIN_BALANCE_TO_USE} is required to apply toward a purchase. Your current balance is $${user.referralBalance.toFixed(2)}.`,
      });
    }
    if (amountToApply > user.referralBalance) {
      return res.status(400).json({ success: false, message: 'Insufficient referral balance.' });
    }

    const { default: Invoice } = await import('../models/Invoice.js');
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    if (String(invoice.user) !== String(user._id)) {
      return res.status(403).json({ success: false, message: 'Not your invoice.' });
    }
    if (invoice.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invoice is no longer pending.' });
    }

    const apply = Math.min(amountToApply, invoice.amount, user.referralBalance);
    invoice.amount         = Math.max(0, invoice.amount - apply);
    if (!invoice.metadata) invoice.metadata = new Map();
    invoice.metadata.set('referralBalanceApplied', String(apply));
    user.referralBalance   = Math.max(0, user.referralBalance - apply);

    // If invoice is fully covered by balance, mark paid immediately
    if (invoice.amount === 0) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      invoice.paymentMethod = 'referral_balance';
      await invoice.save();
      await user.save();

      // Upgrade plan
      const upgradedUser = await User.findById(user._id);
      upgradedUser.plan = invoice.plan;
      const duration = invoice.billingCycle === 'yearly' ? 365 : 30;
      upgradedUser.planExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      upgradedUser.isTrialActive = false;
      upgradedUser.dailyMatchesUsed = 0;
      await upgradedUser.save();

      distributeToUser(upgradedUser).catch(e => console.error('Distribution error (apply-balance):', e.message));

      // Notify admin (fire-and-forget)
      sendAdminUserActionAlert({
        action: 'plan_upgraded_balance',
        userName: upgradedUser.name,
        userEmail: upgradedUser.email,
        details: {
          'Plan Activated': invoice.plan,
          'Billing Cycle':  invoice.billingCycle || 'monthly',
          'Balance Applied': `$${apply.toFixed(2)}`,
          'Method':          'Referral Balance',
        },
      }).catch(() => {});

      // Notify user (fire-and-forget)
      sendPlanActivatedEmail({
        name:        upgradedUser.name,
        email:       upgradedUser.email,
        planName:    invoice.plan,
        planExpires: upgradedUser.planExpiresAt,
      }).catch(() => {});

      return res.json({
        success: true,
        fullyCovered: true,
        message: `$${apply} referral balance applied. Plan upgraded to ${invoice.plan}!`,
        newPlan: invoice.plan,
      });
    }

    await invoice.save();
    await user.save();

    res.json({
      success: true,
      fullyCovered: false,
      amountApplied: apply,
      remainingAmount: invoice.amount,
      newBalance: user.referralBalance,
      message: `$${apply} referral balance applied. Remaining $${invoice.amount} to be paid.`,
    });
  } catch (err) {
    console.error('Apply referral balance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/referral/activate-with-balance ─────────────────────────────────
// One-shot: create invoice + apply balance + upgrade plan (when balance fully covers cost)
export const activateWithBalance = async (req, res) => {
  try {
    const { plan, billingCycle = 'monthly', amount } = req.body;
    const user = await User.findById(req.user._id);

    if (!plan || !PAID_PLANS.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    if (user.referralBalance < MIN_BALANCE_TO_USE) {
      return res.status(400).json({
        success: false,
        message: `A minimum referral balance of $${MIN_BALANCE_TO_USE} is required. Your balance is $${user.referralBalance.toFixed(2)}.`,
      });
    }

    // Use provided amount if valid, else fall back to known monthly price
    const minExpected = PLAN_PRICES[plan] || 1;
    const planAmount  = (amount && amount >= minExpected) ? parseFloat(amount) : minExpected;

    if (user.referralBalance < planAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. This plan costs $${planAmount} but you only have $${user.referralBalance.toFixed(2)}.`,
      });
    }

    const { default: Invoice } = await import('../models/Invoice.js');

    // Create invoice already marked as paid via referral balance
    const invoice = await Invoice.create({
      user:          user._id,
      plan,
      billingCycle,
      amount:        0,
      status:        'paid',
      paidAt:        new Date(),
      paymentMethod: 'referral_balance',
      metadata:      new Map([['referralBalanceApplied', String(planAmount)]]),
    });

    // Deduct from balance
    user.referralBalance = Math.max(0, user.referralBalance - planAmount);

    // Upgrade plan
    const duration = billingCycle === 'yearly' ? 365 : 30;
    user.plan          = plan;
    user.planExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    user.isTrialActive = false;
    user.dailyMatchesUsed = 0;
    await user.save();

    // Notify admin (fire-and-forget)
    sendAdminUserActionAlert({
      action: 'plan_upgraded_balance',
      userName: user.name,
      userEmail: user.email,
      details: {
        'Plan Activated':    plan,
        'Billing Cycle':     billingCycle,
        'Balance Deducted':  `$${planAmount.toFixed(2)}`,
        'Remaining Balance': `$${user.referralBalance.toFixed(2)}`,
        'Method':            'Referral Balance (auto)',
      },
    }).catch(() => {});

    // Distribute today's opportunities immediately (fire-and-forget)
    distributeToUser(user).catch(e => console.error('Distribution error (activate-with-balance):', e.message));

    // Notify user (fire-and-forget)
    sendPlanActivatedEmail({
      name:        user.name,
      email:       user.email,
      planName:    plan,
      planExpires: user.planExpiresAt,
    }).catch(() => {});

    res.json({
      success: true,
      message: `Plan upgraded to ${plan}! $${planAmount} deducted from your referral balance.`,
      newPlan: plan,
      invoiceId: invoice._id,
    });
  } catch (err) {
    console.error('Activate with balance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
