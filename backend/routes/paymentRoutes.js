// backend/routes/paymentRoutes.js
import express from 'express';
import {
  getPlans,
  createInvoice,
  getUserInvoices,
  getInvoiceById,
  adminVerifyPayment,
  cancelSubscription,
  createStripePayment,
  confirmStripePaymentHandler,
  createPayPalPayment,
  capturePayPalPaymentHandler
} from '../controllers/paymentController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

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

// Stripe payment routes
router.post('/stripe/create-intent', createStripePayment);
router.post('/stripe/confirm', confirmStripePaymentHandler);

// PayPal payment routes
router.post('/paypal/create-order', createPayPalPayment);     // ← Make sure this exists
router.post('/paypal/capture', capturePayPalPaymentHandler);  // ← Make sure this exists

// Admin only routes
router.post('/verify-payment/:invoiceId', adminOnly, adminVerifyPayment);

export default router;