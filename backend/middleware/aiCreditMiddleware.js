// backend/middleware/aiCreditMiddleware.js
// Drop-in middleware: requireAICredits('feature_name')
// Checks the user has enough monthly AI credits, deducts them, then calls next().
// On insufficient credits returns 402 with structured data the frontend can render.

import { spendAICredits } from '../services/aiCreditService.js';
import { PLAN_AI_CREDITS, FEATURE_COSTS } from '../config/aiCredits.js';

export const requireAICredits = (feature) => async (req, res, next) => {
  try {
    // Admin users bypass all credit checks
    if (req.user?.role === 'admin') return next();

    const meta = {
      opportunityTitle: req.body?.title || req.query?.title || '',
      opportunityId: req.params?.id || req.body?.opportunityId || '',
    };
    const result = await spendAICredits(req.user._id, feature, meta);

    if (!result.allowed) {
      return res.status(402).json({
        success: false,
        code:    'AI_CREDITS_EXHAUSTED',
        message: `You've used all ${result.limit} AI credits for this month. ` +
                 `Upgrade your plan for more credits or wait until next month.`,
        data: {
          feature:   result.feature,
          cost:      result.cost,
          used:      result.used,
          limit:     result.limit,
          remaining: result.remaining,
          nextReset: result.nextReset,
        },
      });
    }

    // Attach credit info to request so controllers can return it to the frontend
    req.aiCredits = {
      cost:      result.cost,
      remaining: result.remaining,
      limit:     result.limit,
    };

    next();
  } catch (err) {
    console.error('AI credit middleware error:', err.message);
    next(); // non-fatal — let the AI call proceed rather than block on an error
  }
};
