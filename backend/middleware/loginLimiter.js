import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

// Brute-force protection for login endpoints only.
// Applied per-route so token-verify / profile GETs are never blocked.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 0 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: { success: false, message: 'Too many login attempts — please wait 15 minutes.' },
});

export default loginLimiter;
