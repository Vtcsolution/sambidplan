import express from 'express';
import { applyAsPartner, listApplications, processApplication } from '../controllers/partnerController.js';
import { protectAdmin, superAdminOnly } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

router.post('/apply',                     applyAsPartner);
router.get('/admin/applications',         protectAdmin, superAdminOnly, listApplications);
router.put('/admin/applications/:id',     protectAdmin, superAdminOnly, processApplication);

export default router;
