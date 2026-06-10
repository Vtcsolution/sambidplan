import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createSuggestion, getMySuggestions } from '../controllers/suggestionController.js';

const router = express.Router();

router.use(protect);

router.post('/',   createSuggestion);
router.get('/my',  getMySuggestions);

export default router;
