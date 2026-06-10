import { getUserPredictions } from '../services/aiPredictionService.js';
import { spendAICredits, getAICredits } from '../services/aiCreditService.js';

// @desc    Get AI predictions for current user's dashboard
// @route   GET /api/predictions/dashboard
export const getDashboardPredictions = async (req, res) => {
  try {
    if (!['pro', 'enterprise'].includes(req.user.plan) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'AI Contract Predictions require Pro plan or higher. Please upgrade.',
      });
    }

    const forceRefresh = req.query.refresh === 'true';

    // Only spend credits on a forced refresh (not on cached reads)
    if (forceRefresh && req.user.role !== 'admin') {
      const creditResult = await spendAICredits(req.user._id, 'ai_predictions');
      if (!creditResult.allowed) {
        return res.status(402).json({
          success: false,
          code:    'AI_CREDITS_EXHAUSTED',
          message: `You've used all ${creditResult.limit} AI credits for this month.`,
          data:    creditResult,
        });
      }
    }

    const data = await getUserPredictions(req.user, forceRefresh);

    // Attach current credit balance to response
    const credits = await getAICredits(req.user);
    res.json({ success: true, data: { ...data, credits } });
  } catch (err) {
    console.error('Prediction error:', err.status || '', err.message, err.error || '');
    const userMsg = err.status === 401 ? 'OpenAI API key is invalid or expired.'
      : err.status === 429 ? 'AI rate limit reached. Please wait a moment and try again.'
      : err.status === 404 ? `AI model not found: ${err.message}`
      : `AI predictions temporarily unavailable: ${err.message}`;
    res.status(500).json({ success: false, message: userMsg });
  }
};

// @desc    Get current user's AI credit balance
// @route   GET /api/predictions/credits
export const getMyAICredits = async (req, res) => {
  try {
    const credits = await getAICredits(req.user);
    res.json({ success: true, data: credits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
