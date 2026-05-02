// backend/routes/adminPlanRoutes.js
import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus
} from '../controllers/adminPlanController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

router.get('/', getAllPlans);
router.get('/:id', getPlanById);
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);
router.patch('/:id/toggle', togglePlanStatus);

export default router;