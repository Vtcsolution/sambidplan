// backend/routes/paymentRoutes.js
import express from 'express';
import {
  getPlans,
  createInvoice,
  getUserInvoices,
  getInvoiceById,
  adminVerifyPayment,
  cancelSubscription,
  createPayPalPayment,
  capturePayPalPaymentHandler,
  simulatePayPalCapture,
  getPlanStatus,
  createStripePayment,
  confirmStripePaymentHandler,
  createPayoneerCheckout,
  capturePayoneerReturn,
} from '../controllers/paymentController.js';
import { createPlanRequest, getUserPlanRequests, submitPaymentProof } from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { flexAdmin } from '../middleware/flexAdminMiddleware.js';

const router = express.Router();

// Public routes
router.get('/plans', getPlans);

// Protected routes (require login)
router.use(protect);

// Invoice routes
router.post('/create-invoice', createInvoice);
router.get('/invoices', getUserInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/cancel', cancelSubscription);

// PayPal payment routes
router.post('/paypal/create-order', createPayPalPayment);
router.post('/paypal/capture', capturePayPalPaymentHandler);
router.post('/paypal/simulate-capture', simulatePayPalCapture); // DEV ONLY

// Stripe payment routes
router.post('/stripe/create-intent', createStripePayment);
router.post('/stripe/confirm', confirmStripePaymentHandler);

// Payoneer payment routes
router.post('/payoneer/create-session', createPayoneerCheckout);
router.post('/payoneer/capture', capturePayoneerReturn);

// Plan status polling (used after payment to confirm activation)
router.get('/plan-status', getPlanStatus);

// Annual plan requests (submitted by regular users)
router.post('/plan-requests', createPlanRequest);
router.get('/plan-requests', getUserPlanRequests);
router.post('/plan-requests/:id/submit-proof', submitPaymentProof);

// Admin only routes (accept both adminToken and user-admin token)
router.post('/verify-payment/:invoiceId', flexAdmin, adminVerifyPayment);

export default router;