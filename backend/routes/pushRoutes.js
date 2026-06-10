import express from 'express';
import { getVapidPublicKey, subscribe, unsubscribe, getStatus, sendTest } from '../controllers/pushController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/vapid-public-key', getVapidPublicKey);   // public — no auth needed
router.use(protect);
router.post('/subscribe',   subscribe);
router.delete('/unsubscribe', unsubscribe);
router.get('/status',       getStatus);
router.post('/test',        sendTest);

export default router;
