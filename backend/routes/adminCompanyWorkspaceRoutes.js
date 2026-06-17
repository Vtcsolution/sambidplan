import express from 'express';
import { protectAdmin } from '../middleware/adminAuthMiddleware.js';
import {
  getWorkspaceStats,
  listAllCompanies,
  getCompanyById,
  adminVerifyUEI,
  adminUnverifyUEI,
  deleteCompany,
  adminRemoveMember,
} from '../controllers/adminCompanyWorkspaceController.js';

const router = express.Router();
router.use(protectAdmin);

router.get('/stats',            getWorkspaceStats);
router.get('/',                 listAllCompanies);
router.get('/:id',              getCompanyById);
router.put('/:id/verify-uei',   adminVerifyUEI);
router.put('/:id/unverify-uei', adminUnverifyUEI);
router.delete('/:id',           deleteCompany);
router.delete('/:id/members/:memberId', adminRemoveMember);

export default router;
