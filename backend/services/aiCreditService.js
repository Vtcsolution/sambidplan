import User from '../models/User.js';
import { PLAN_AI_CREDITS, FEATURE_COSTS, FEATURE_LABELS } from '../config/aiCredits.js';

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
  const planLimit    = PLAN_AI_CREDITS[user.plan] ?? 0;
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

export const spendAICredits = async (userId, feature) => {
  const cost = FEATURE_COSTS[feature];
  if (cost === undefined) throw new Error(`Unknown AI feature: ${feature}`);

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.role === 'admin') return { allowed: true, cost, remaining: Infinity, limit: Infinity };

  await resetIfDue(user);

  const planLimit     = PLAN_AI_CREDITS[user.plan] ?? 0;
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

  return {
    allowed:   true,
    cost,
    used:      used + cost,
    limit:     planLimit,
    remaining: totalRemaining - cost,
    bonusCredits: Math.max(0, bonus - Math.max(0, cost - planRemaining)),
  };
};
