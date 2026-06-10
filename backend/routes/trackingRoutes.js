// backend/routes/trackingRoutes.js — public, no auth
import express from 'express';
import { trackOpen, trackClick } from '../controllers/trackingController.js';

const router = express.Router();

router.get('/open/:trackingId',  trackOpen);
router.get('/click/:trackingId', trackClick);

export default router;
