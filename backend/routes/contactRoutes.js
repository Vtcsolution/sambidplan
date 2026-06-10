import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { flexAdmin } from '../middleware/flexAdminMiddleware.js';
import {
  submitContactForm,
  activatePlanFromInquiry,
  confirmInquiryPayment,
  generatePaymentLink,
  supportChat,
  getMyInquiries,
  getContactInquiries,
  updateContactInquiry,
} from '../controllers/contactController.js';

const router = express.Router();

// Public — AI support chatbot
router.post('/chat', supportChat);

// Public — submit inquiry (attaches user if token present)
router.post('/', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  import('../middleware/authMiddleware.js').then(({ protect }) => {
    protect(req, res, next);
  }).catch(() => next());
}, submitContactForm);

// Logged-in user — their own inquiries
router.get('/mine', protect, getMyInquiries);

// Admin routes — accept both adminToken and user-admin token
router.get('/',                       flexAdmin, getContactInquiries);
router.put('/:id',                    flexAdmin, updateContactInquiry);
router.post('/:id/confirm-payment',   flexAdmin, confirmInquiryPayment);
router.post('/:id/payment-link',      flexAdmin, generatePaymentLink);
router.post('/:id/activate-plan',     flexAdmin, activatePlanFromInquiry);

export default router;
