import CreditUsageLog from '../models/CreditUsageLog.js';
import AITokenUsage from '../models/AITokenUsage.js';

const mask = (key) => key ? key.slice(0, 8) + '•'.repeat(Math.min(key.length - 12, 20)) + key.slice(-4) : null;

async function getMonthlyTokenStats(provider) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const stats = await AITokenUsage.aggregate([
    { $match: { provider, createdAt: { $gte: monthStart } } },
    { $group: {
      _id: '$model',
      calls: { $sum: 1 },
      inputTokens: { $sum: '$inputTokens' },
      outputTokens: { $sum: '$outputTokens' },
      totalTokens: { $sum: '$totalTokens' },
      totalCost: { $sum: '$cost' },
    }},
    { $sort: { totalCost: -1 } },
  ]);
  const totals = await AITokenUsage.aggregate([
    { $match: { provider, createdAt: { $gte: monthStart } } },
    { $group: { _id: null, calls: { $sum: 1 }, inputTokens: { $sum: '$inputTokens' }, outputTokens: { $sum: '$outputTokens' }, totalTokens: { $sum: '$totalTokens' }, totalCost: { $sum: '$cost' } } },
  ]);
  // Daily breakdown for chart
  const daily = await AITokenUsage.aggregate([
    { $match: { provider, createdAt: { $gte: monthStart } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, calls: { $sum: 1 }, cost: { $sum: '$cost' }, tokens: { $sum: '$totalTokens' } } },
    { $sort: { _id: 1 } },
  ]);
  return {
    byModel: stats,
    totals: totals[0] || { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, totalCost: 0 },
    daily,
  };
}

async function checkAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { configured: false };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    });

    const headers = Object.fromEntries(res.headers.entries());
    const body = await res.json().catch(() => ({}));
    const valid = res.status === 200 || res.status === 201;

    const rateLimit = {
      requestsLimit: headers['anthropic-ratelimit-requests-limit'],
      requestsRemaining: headers['anthropic-ratelimit-requests-remaining'],
      requestsReset: headers['anthropic-ratelimit-requests-reset'],
      tokensLimit: headers['anthropic-ratelimit-tokens-limit'],
      tokensRemaining: headers['anthropic-ratelimit-tokens-remaining'],
      tokensReset: headers['anthropic-ratelimit-tokens-reset'],
      inputTokensLimit: headers['anthropic-ratelimit-input-tokens-limit'],
      inputTokensRemaining: headers['anthropic-ratelimit-input-tokens-remaining'],
      outputTokensLimit: headers['anthropic-ratelimit-output-tokens-limit'],
      outputTokensRemaining: headers['anthropic-ratelimit-output-tokens-remaining'],
    };

    const tokenStats = await getMonthlyTokenStats('anthropic');
    const models = ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
    const tier = rateLimit.requestsLimit ? (Number(rateLimit.requestsLimit) >= 4000 ? 'Scale' : Number(rateLimit.requestsLimit) >= 1000 ? 'Build' : 'Free') : 'Unknown';

    return {
      configured: true, valid, maskedKey: mask(key), status: res.status,
      error: !valid ? (body.error?.message || `HTTP ${res.status}`) : null,
      rateLimit, models, provider: 'Anthropic', tier,
      tokenStats,
      billingUrl: 'https://console.anthropic.com/settings/billing',
      usageUrl: 'https://console.anthropic.com/settings/usage',
    };
  } catch (err) {
    return { configured: true, valid: false, maskedKey: mask(key), error: err.message, provider: 'Anthropic' };
  }
}

async function checkOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'your_openai_api_key_here') return { configured: false };

  try {
    const modelsRes = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } });
    const modelsBody = await modelsRes.json().catch(() => ({}));
    const valid = modelsRes.status === 200;
    const modelIds = valid ? (modelsBody.data || []).map(m => m.id).filter(id =>
      id.startsWith('gpt-4') || id.startsWith('gpt-3') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4')
    ).sort().slice(0, 12) : [];

    let rateLimit = {};
    if (valid) {
      try {
        const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-3.5-turbo', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        });
        const h = Object.fromEntries(chatRes.headers.entries());
        rateLimit = {
          requestsLimit: h['x-ratelimit-limit-requests'], requestsRemaining: h['x-ratelimit-remaining-requests'],
          requestsReset: h['x-ratelimit-reset-requests'], tokensLimit: h['x-ratelimit-limit-tokens'],
          tokensRemaining: h['x-ratelimit-remaining-tokens'], tokensReset: h['x-ratelimit-reset-tokens'],
        };
      } catch {}
    }

    let billing = null;
    if (valid) {
      for (const url of ['https://api.openai.com/dashboard/billing/credit_grants', 'https://api.openai.com/dashboard/billing/subscription']) {
        try {
          const bRes = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
          if (bRes.ok) { const d = await bRes.json(); if (d.total_granted || d.total_available || d.hard_limit_usd) { billing = d; break; } }
        } catch {}
      }
    }

    const tokenStats = await getMonthlyTokenStats('openai');
    let tier = 'Unknown';
    if (rateLimit.requestsLimit) {
      const rpm = Number(rateLimit.requestsLimit);
      tier = rpm >= 10000 ? 'Tier 5' : rpm >= 5000 ? 'Tier 4' : rpm >= 3500 ? 'Tier 3' : rpm >= 500 ? 'Tier 2' : rpm >= 60 ? 'Tier 1' : 'Free';
    }

    return {
      configured: true, valid, maskedKey: mask(key), status: modelsRes.status,
      error: !valid ? (modelsBody.error?.message || `HTTP ${modelsRes.status}`) : null,
      rateLimit, models: modelIds, billing, tier, provider: 'OpenAI',
      tokenStats,
      billingUrl: 'https://platform.openai.com/settings/organization/billing/overview',
      usageUrl: 'https://platform.openai.com/usage',
    };
  } catch (err) {
    return { configured: true, valid: false, maskedKey: mask(key), error: err.message, provider: 'OpenAI' };
  }
}

async function checkGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { configured: false };

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
    const body = await res.json().catch(() => ({}));
    const valid = res.status === 200;
    const models = valid ? (body.models || []).map(m => m.name?.replace('models/', '')).filter(n => n?.includes('gemini')).slice(0, 8) : [];

    const tokenStats = await getMonthlyTokenStats('gemini');

    return {
      configured: true, valid, maskedKey: mask(key), status: res.status,
      error: !valid ? (body.error?.message || `HTTP ${res.status}`) : null,
      models, provider: 'Google Gemini', tier: models.some(m => m.includes('pro')) ? 'Paid' : 'Free',
      tokenStats,
      billingUrl: 'https://aistudio.google.com/app/apikey',
      usageUrl: 'https://console.cloud.google.com/billing',
    };
  } catch (err) {
    return { configured: true, valid: false, maskedKey: mask(key), error: err.message, provider: 'Google Gemini' };
  }
}

export const getAIKeyStatus = async (req, res) => {
  try {
    const [anthropic, openai, gemini] = await Promise.all([checkAnthropic(), checkOpenAI(), checkGemini()]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [usageByModel, totalUsage, totalTokens] = await Promise.all([
      CreditUsageLog.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        { $group: { _id: '$model', totalCredits: { $sum: '$creditsUsed' }, totalCalls: { $sum: 1 } } },
        { $sort: { totalCredits: -1 } },
      ]),
      CreditUsageLog.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        { $group: { _id: null, credits: { $sum: '$creditsUsed' }, calls: { $sum: 1 } } },
      ]),
      AITokenUsage.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        { $group: { _id: null, cost: { $sum: '$cost' }, tokens: { $sum: '$totalTokens' }, calls: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        anthropic, openai, gemini,
        platformUsage: {
          month: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          totalCredits: totalUsage[0]?.credits || 0,
          totalCalls: totalUsage[0]?.calls || 0,
          byModel: usageByModel,
          realCost: `$${(totalTokens[0]?.cost || 0).toFixed(4)}`,
          totalTokens: totalTokens[0]?.tokens || 0,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
