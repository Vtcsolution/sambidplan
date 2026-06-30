import express from 'express';
import { protectAdmin } from '../middleware/adminAuthMiddleware.js';
import { uploadDocument } from '../middleware/documentUpload.js';
import {
  getManagedStats,
  listManagedServices,
  getManagedServiceById,
  updateManagedService,
  enrollCompany,
  addBid,
  updateBid,
  deleteBid,
  generateMonthlyFee,
  markInvoicePaid,
  updateInvoice,
  listAllInvoices,
  searchUsersForEnroll,
  searchOpportunitiesForBid,
  uploadBidDocument,
  deleteBidDocument,
  triggerMonthlyBillingRun,
} from '../controllers/adminManagedServiceController.js';

const router = express.Router();
router.use(protectAdmin);

// Static routes first — must come before /:id wildcard
router.get('/stats',                          getManagedStats);
router.get('/invoices',                       listAllInvoices);
router.get('/search-users',                   searchUsersForEnroll);
router.get('/search-opportunities',           searchOpportunitiesForBid);
router.post('/enroll',                        enrollCompany);
router.post('/run-monthly-billing',           triggerMonthlyBillingRun);
router.put('/invoices/:invoiceId/pay',        markInvoicePaid);
router.put('/invoices/:invoiceId',            updateInvoice);

// Wildcard routes after
router.get('/',                               listManagedServices);
router.get('/:id',                            getManagedServiceById);
router.put('/:id',                            updateManagedService);
router.post('/:id/bids',                      addBid);
router.put('/:id/bids/:bidId',                updateBid);
router.delete('/:id/bids/:bidId',             deleteBid);
router.post('/:id/bids/:bidId/documents',     uploadDocument, uploadBidDocument);
router.delete('/:id/bids/:bidId/documents/:docId', deleteBidDocument);
router.post('/:id/monthly-fee',               generateMonthlyFee);

export default router;
