import express from 'express';
import {
  adminLogin, getAdminProfile, changeAdminPassword,
  createAdmin, listAdmins, seedFirstAdmin,
  updateAdmin, deleteAdmin,
} from '../controllers/adminAuthController.js';
import { protectAdmin, superAdminOnly } from '../middleware/adminAuthMiddleware.js';
import loginLimiter from '../middleware/loginLimiter.js';

const router = express.Router();

// Public — seed first admin (disabled once any admin exists)
router.post('/seed', seedFirstAdmin);

// Public — admin login (brute-force protected)
router.post('/login', loginLimiter, adminLogin);

// Protected admin routes
router.get('/profile',         protectAdmin, getAdminProfile);
router.put('/change-password', protectAdmin, changeAdminPassword);

// Super admin only
router.post('/create',  protectAdmin, superAdminOnly, createAdmin);
router.get('/list',     protectAdmin, superAdminOnly, listAdmins);
router.put('/:id',      protectAdmin, superAdminOnly, updateAdmin);
router.delete('/:id',   protectAdmin, superAdminOnly, deleteAdmin);

export default router;
