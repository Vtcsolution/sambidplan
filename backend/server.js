// server.js - Remove the userRoutes import
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import opportunityRoutes from "./routes/opportunityRoutes.js";
import savedRoutes from './routes/savedRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminPlanRoutes from './routes/adminPlanRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import { startScheduler } from './services/schedulerService.js';
import { startEmailScheduler } from './services/emailSchedulerService.js';

dotenv.config();
connectDB();

// Start all schedulers
startScheduler();
startEmailScheduler();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => res.json({ success: true, message: "Sambid API is running..." }));

// API Routes - NOTE: NO userRoutes here
app.use("/api/auth", authRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/plans', adminPlanRoutes);
app.use('/api/alerts', alertRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});