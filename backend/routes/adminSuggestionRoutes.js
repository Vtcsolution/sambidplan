import express from 'express';
import { flexAdmin } from '../middleware/flexAdminMiddleware.js';
import {
  adminGetSuggestions,
  adminUpdateSuggestion,
  adminDeleteSuggestion,
} from '../controllers/suggestionController.js';

const router = express.Router();

router.use(flexAdmin);

router.get('/',         adminGetSuggestions);
router.patch('/:id',    adminUpdateSuggestion);
router.delete('/:id',   adminDeleteSuggestion);

export default router;
