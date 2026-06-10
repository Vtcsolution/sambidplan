import express from 'express';
import { flexAdmin } from '../middleware/flexAdminMiddleware.js';
import {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus
} from '../controllers/adminPlanController.js';

const router = express.Router();

// All routes accept adminToken OR user-admin token
router.use(flexAdmin);

router.get('/',           getAllPlans);
router.get('/:id',        getPlanById);
router.post('/',          createPlan);
router.put('/:id',        updatePlan);
router.delete('/:id',     deletePlan);
router.patch('/:id/toggle', togglePlanStatus);

export default router;
