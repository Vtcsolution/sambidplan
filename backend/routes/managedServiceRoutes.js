import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  applyManagedService, getMyManagedService, getMyProjects, getMyProjectDetail,
  payInvoiceWithStripe, confirmInvoiceStripePayment,
} from '../controllers/managedServiceController.js';

const router = express.Router();
router.use(protect);

router.post('/',            applyManagedService);
router.get('/me',           getMyManagedService);
router.get('/projects',     getMyProjects);
router.get('/projects/:id', getMyProjectDetail);
router.post('/invoices/:invoiceId/pay-stripe',     payInvoiceWithStripe);
router.post('/invoices/:invoiceId/confirm-stripe', confirmInvoiceStripePayment);

export default router;
