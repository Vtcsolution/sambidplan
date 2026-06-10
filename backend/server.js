// backend/server.js
import http from 'http';
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import opportunityRoutes from "./routes/opportunityRoutes.js";
import savedRoutes from './routes/savedRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';  // ← Make sure this exists
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminPlanRoutes from './routes/adminPlanRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import contactRoutes   from './routes/contactRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminAIRoutes   from './routes/adminAIRoutes.js';
import referralRoutes    from './routes/referralRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';
import creditTopupRoutes from './routes/creditTopupRoutes.js';
import ticketRoutes           from './routes/ticketRoutes.js';
import adminTicketRoutes      from './routes/adminTicketRoutes.js';
import suggestionRoutes       from './routes/suggestionRoutes.js';
import adminSuggestionRoutes  from './routes/adminSuggestionRoutes.js';
import prospectRoutes          from './routes/prospectRoutes.js';
import trackingRoutes          from './routes/trackingRoutes.js';
import pastPerformanceRoutes   from './routes/pastPerformanceRoutes.js';
import { reconcileReferralCommissions } from './controllers/referralController.js';
import { startScheduler } from './services/schedulerService.js';
import { startEmailScheduler } from './services/emailSchedulerService.js';
import { loadSettingsFromDB } from './services/settingsService.js';

dotenv.config();
connectDB().then(() => loadSettingsFromDB());

// Start all schedulers
startScheduler();
startEmailScheduler();

const app = express();

// ── Trust proxy — REQUIRED when running behind nginx on VPS ──────────────────
// Without this, rate limiting uses nginx's IP instead of the real client IP,
// and req.ip / req.protocol are incorrect.
app.set('trust proxy', 1);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,   // allow PayPal/Stripe iframes
  contentSecurityPolicy: false,        // CSP handled by nginx; API returns JSON only
}));

// CORS — allow localhost + configured frontend URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Rate limiters ─────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

// General API limiter: 2000 req / 15 min per IP
// (admin panel polls sync/AI status every 3-4 s; needs headroom)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 0 : 2000,          // 0 = unlimited in development
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: { success: false, message: 'Too many requests — please try again in 15 minutes.' },
});

// Login-only brute-force limiter: 15 attempts / 15 min per IP
// Applied ONLY to the login POST endpoint, NOT to token-verify/profile GETs
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 0 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: { success: false, message: 'Too many login attempts — please wait 15 minutes.' },
});

// ── Body parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/",       (req, res) => res.json({ success: true, message: "Sambid API is running." }));
app.get("/health", (req, res) => res.json({ success: true, status: "healthy", timestamp: new Date().toISOString() }));

// API Routes - NOTE: Order matters
app.use("/api/auth", authRoutes);          // login limiter applied per-route inside authRoutes
app.use("/api/opportunities", apiLimiter, opportunityRoutes);
app.use('/api/saved',        apiLimiter, savedRoutes);
app.use('/api/payment',      apiLimiter, paymentRoutes);
app.use('/api/ai',           apiLimiter, aiRoutes);
app.use('/api/admin',        apiLimiter, adminRoutes);
app.use('/api/admin/plans',  apiLimiter, adminPlanRoutes);
app.use('/api/alerts',       apiLimiter, alertRoutes);
app.use('/api/dashboard',    apiLimiter, dashboardRoutes);
app.use('/api/push',         apiLimiter, pushRoutes);
app.use('/api/contact',      apiLimiter, contactRoutes);
app.use('/api/admin-auth',   adminAuthRoutes); // login limiter applied per-route inside adminAuthRoutes
app.use('/api/admin-ai',     apiLimiter, adminAIRoutes);
app.use('/api/referral',      apiLimiter, referralRoutes);
app.use('/api/predictions',   apiLimiter, predictionRoutes);
app.use('/api/tickets',            apiLimiter, ticketRoutes);
app.use('/api/admin/tickets',      apiLimiter, adminTicketRoutes);
app.use('/api/suggestions',        apiLimiter, suggestionRoutes);
app.use('/api/admin/suggestions',  apiLimiter, adminSuggestionRoutes);
app.use('/api/admin/prospects',    apiLimiter, prospectRoutes);
app.use('/api/track',              trackingRoutes); // public — no auth, no rate limit
app.use('/api/past-performance',   apiLimiter, pastPerformanceRoutes);
app.use('/api/credits',            apiLimiter, creditTopupRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong. Please try again.'
    : err.message || 'Internal server error';
  console.error(`[${new Date().toISOString()}] ${err.stack || err.message}`);
  res.status(status).json({ success: false, message });
});

const PORT = process.env.PORT || 8000;
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (HTTP + WebSocket)`);
  setTimeout(() => reconcileReferralCommissions(), 3000);
});