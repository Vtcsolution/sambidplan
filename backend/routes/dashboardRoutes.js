import express from 'express';
import { getDashboardStats, getCalendarEvents } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/stats', getDashboardStats);
router.get('/calendar', getCalendarEvents);

export default router;
