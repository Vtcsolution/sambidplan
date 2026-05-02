// backend/middleware/rateLimitMiddleware.js
import UsageTracking from '../models/admin/UsageTracking.js';

export const checkApiLimit = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Admin users have no limits
    if (user.role === 'admin') {
      return next();
    }
    
    // Check if plan is active
    if (!user.isPlanActive()) {
      return res.status(403).json({
        success: false,
        message: `Your ${user.plan} plan has expired. Please renew to continue.`,
        code: 'PLAN_EXPIRED'
      });
    }
    
    // Get daily limit based on plan
    let dailyLimit = 10; // Default for free
    if (user.plan === 'starter') dailyLimit = 100;
    if (user.plan === 'pro') dailyLimit = 1000;
    if (user.plan === 'enterprise') dailyLimit = 10000;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let usage = await UsageTracking.findOne({
      user: user._id,
      date: { $gte: today }
    });
    
    if (!usage) {
      usage = await UsageTracking.create({
        user: user._id,
        date: today,
        remainingRequests: dailyLimit
      });
    }
    
    if (usage.apiRequests >= dailyLimit) {
      const resetTime = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      return res.status(429).json({
        success: false,
        message: `Daily API limit (${dailyLimit}) reached. Resets at ${resetTime.toLocaleTimeString()}.`,
        code: 'RATE_LIMIT_EXCEEDED',
        remaining: 0,
        resetAt: resetTime
      });
    }
    
    // Track usage
    usage.apiRequests += 1;
    usage.remainingRequests = dailyLimit - usage.apiRequests;
    await usage.save();
    
    // Add usage info to response headers
    res.setHeader('X-RateLimit-Limit', dailyLimit);
    res.setHeader('X-RateLimit-Remaining', usage.remainingRequests);
    res.setHeader('X-RateLimit-Reset', usage.date.getTime() + 24 * 60 * 60 * 1000);
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next();
  }
};