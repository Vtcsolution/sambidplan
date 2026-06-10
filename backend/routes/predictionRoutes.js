import express from 'express';
import { protectAny } from '../middleware/flexAdminMiddleware.js';
import { getDashboardPredictions, getMyAICredits } from '../controllers/predictionController.js';

const router = express.Router();
router.use(protectAny);

router.get('/dashboard', getDashboardPredictions);
router.get('/credits',   getMyAICredits);

export default router;
