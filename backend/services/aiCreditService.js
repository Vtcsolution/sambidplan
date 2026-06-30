import User from '../models/User.js';
import Plan from '../models/Plan.js';
import CreditUsageLog from '../models/CreditUsageLog.js';
import { PLAN_AI_CREDITS, FEATURE_COSTS, FEATURE_LABELS } from '../config/aiCredits.js';

let _planCreditsCache = null;
let _planCreditsCacheAt = 0;
const getPlanCredits = async (planName) => {
  if (!_planCreditsCache || Date.now() - _planCreditsCacheAt > 60_000) {
    try {
      const plans = await Plan.find().select('name aiCreditsPerMonth').lean();
      _planCreditsCache = {};
      plans.forEach(p => {
        if (p.aiCreditsPerMonth > 0) _planCreditsCache[p.name] = p.aiCreditsPerMonth;
      });
      _planCreditsCacheAt = Date.now();
    } catch { _planCreditsCache = {}; }
  }
  return _planCreditsCache[planName] ?? PLAN_AI_CREDITS[planName] ?? 0;
};
export const clearPlanCreditsCache = () => { _planCreditsCache = null; _planCreditsCacheAt = 0; };

const resetIfDue = async (user) => {
  const now = new Date();
  const lastReset = user.lastAIReset ? new Date(user.lastAIReset) : new Date(0);
  const sameMonth =
    lastReset.getFullYear() === now.getFullYear() &&
    lastReset.getMonth()    === now.getMonth();

  if (!sameMonth) {
    await User.findByIdAndUpdate(user._id, {
      monthlyAIGenerationsUsed: 0,
      lastAIReset: now,
    });
    user.monthlyAIGenerationsUsed = 0;
    user.lastAIReset = now;
  }
};

export const getAICredits = async (user) => {
  await resetIfDue(user);
  const planLimit    = await getPlanCredits(user.plan);
  const used         = user.monthlyAIGenerationsUsed || 0;
  const planRemaining = Math.max(0, planLimit - used);
  const bonus        = user.bonusAICredits || 0;
  return {
    limit:     planLimit,
    used,
    remaining: planRemaining + bonus,
    planRemaining,
    bonusCredits: bonus,
    resetDate: new Date(user.lastAIReset || Date.now()),
  };
};

export const spendAICredits = async (userId, feature, meta = {}) => {
  const cost = FEATURE_COSTS[feature];
  if (cost === undefined) throw new Error(`Unknown AI feature: ${feature}`);

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.role === 'admin') return { allowed: true, cost, remaining: Infinity, limit: Infinity };

  await resetIfDue(user);

  const planLimit     = await getPlanCredits(user.plan);
  const used          = user.monthlyAIGenerationsUsed || 0;
  const planRemaining = Math.max(0, planLimit - used);
  const bonus         = user.bonusAICredits || 0;
  const totalRemaining = planRemaining + bonus;

  if (totalRemaining < cost) {
    const nextReset = new Date(user.lastAIReset || Date.now());
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);
    return {
      allowed:   false,
      cost,
      used,
      limit:     planLimit,
      remaining: totalRemaining,
      bonusCredits: bonus,
      nextReset,
      feature:   FEATURE_LABELS[feature] || feature,
    };
  }

  // Use plan credits first, then bonus credits
  if (planRemaining >= cost) {
    await User.findByIdAndUpdate(userId, { $inc: { monthlyAIGenerationsUsed: cost } });
  } else {
    const fromBonus = cost - planRemaining;
    await User.findByIdAndUpdate(userId, {
      $inc: { monthlyAIGenerationsUsed: planRemaining, bonusAICredits: -fromBonus },
    });
  }

  const remaining = totalRemaining - cost;

  // Log usage
  try {
    const modelTier = cost >= 15 ? 'Claude Opus 4.8 (Heavy)' : cost >= 10 ? 'Claude Opus 4.8' : 'Claude Sonnet 4.6';
    await CreditUsageLog.create({
      user: userId,
      userName: user.name || '',
      userEmail: user.email || '',
      businessName: user.businessName || '',
      feature,
      featureLabel: FEATURE_LABELS[feature] || feature,
      creditsUsed: cost,
      model: modelTier,
      opportunityTitle: meta.opportunityTitle || '',
      opportunityId: meta.opportunityId || '',
      plan: user.plan || '',
      creditsRemaining: remaining,
    });
  } catch (logErr) {
    console.error('Credit usage log error:', logErr.message);
  }

  return {
    allowed:   true,
    cost,
    used:      used + cost,
    limit:     planLimit,
    remaining,
    bonusCredits: Math.max(0, bonus - Math.max(0, cost - planRemaining)),
  };
};
