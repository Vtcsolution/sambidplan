import express from 'express';
import {
  adminLogin, getAdminProfile, changeAdminPassword,
  createAdmin, listAdmins, seedFirstAdmin,
  updateAdmin, deleteAdmin,
} from '../controllers/adminAuthController.js';
import { protectAdmin, superAdminOnly } from '../middleware/adminAuthMiddleware.js';
import loginLimiter, { sensitiveAuthLimiter } from '../middleware/loginLimiter.js';
import { passwordLengthGuard } from '../middleware/securityMiddleware.js';

const router = express.Router();

// Public — seed first admin (disabled once any admin exists + rate limited)
router.post('/seed', sensitiveAuthLimiter, passwordLengthGuard, seedFirstAdmin);

// Public — admin login (brute-force protected)
router.post('/login', loginLimiter, passwordLengthGuard, adminLogin);

// Protected admin routes
router.get('/profile',         protectAdmin, getAdminProfile);
router.put('/change-password', protectAdmin, changeAdminPassword);

// Super admin only
router.post('/create',  protectAdmin, superAdminOnly, createAdmin);
router.get('/list',     protectAdmin, superAdminOnly, listAdmins);
router.put('/:id',      protectAdmin, superAdminOnly, updateAdmin);
router.delete('/:id',   protectAdmin, superAdminOnly, deleteAdmin);

export default router;
