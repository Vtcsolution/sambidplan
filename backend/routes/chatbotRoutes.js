import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { chatWithBot, contactSupport } from '../controllers/chatbotController.js';

const router = express.Router();
router.use(protect);

router.post('/message', chatWithBot);
router.post('/contact-support', contactSupport);

export default router;
