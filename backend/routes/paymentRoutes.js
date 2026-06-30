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

// Public: which payment gateways are enabled + Stripe publishable key
router.get('/gateways', (req, res) => {
  const isTrue = (v) => v === true || v === 'true' || v === '1';
  res.json({
    success: true,
    data: {
      stripe:   isTrue(process.env.ENABLE_STRIPE),
      paypal:   isTrue(process.env.ENABLE_PAYPAL),
      payoneer: isTrue(process.env.ENABLE_PAYONEER),
      stripePublicKey: isTrue(process.env.ENABLE_STRIPE) ? process.env.STRIPE_PUBLISHABLE_KEY : null,
      paypalClientId:  isTrue(process.env.ENABLE_PAYPAL) ? process.env.PAYPAL_CLIENT_ID : null,
    },
  });
});

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