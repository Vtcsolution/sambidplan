// backend/routes/savedRoutes.js
import express from 'express';
import {
  saveOpportunity,
  getSavedOpportunities,
  getSavedOpportunityById,
  unsaveOpportunity,
  updateSavedStatus,
  checkSaved
} from '../controllers/savedController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/', saveOpportunity);
router.get('/', getSavedOpportunities);
router.get('/check/:opportunityId', checkSaved);
router.get('/:id', getSavedOpportunityById);
router.delete('/:id', unsaveOpportunity);
router.put('/:id', updateSavedStatus);

export default router;