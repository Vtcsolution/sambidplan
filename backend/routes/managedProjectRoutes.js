import express from 'express';
import { protectAdmin } from '../middleware/adminAuthMiddleware.js';
import { uploadDocument } from '../middleware/documentUpload.js';
import {
  getProjectStats,
  listProjects,
  createProject,
  getProject,
  updateProject,
  updateProgress,
  recordGovPayment,
  selectVendor,
  addQuote,
  updateQuote,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  processSubcontractorPayment,
  recordMilestoneGovPayment,
  uploadProjectDocument,
  deleteProjectDocument,
} from '../controllers/managedProjectController.js';

const router = express.Router();
router.use(protectAdmin);

// Static routes first
router.get('/stats', getProjectStats);

// CRUD
router.get('/',  listProjects);
router.post('/', createProject);

// Per-project routes
router.get('/:id',              getProject);
router.put('/:id',              updateProject);
router.put('/:id/progress',     updateProgress);
router.post('/:id/gov-payment', recordGovPayment);
router.post('/:id/select-vendor', selectVendor);

// Quotes
router.post('/:id/quotes',            addQuote);
router.put('/:id/quotes/:quoteId',    updateQuote);

// Milestones
router.post('/:id/milestones',                       addMilestone);
router.put('/:id/milestones/:milestoneId',            updateMilestone);
router.delete('/:id/milestones/:milestoneId',         deleteMilestone);
router.post('/:id/milestones/:milestoneId/pay',       processSubcontractorPayment);
router.post('/:id/milestones/:milestoneId/gov-payment', recordMilestoneGovPayment);

// Documents
router.post('/:id/documents',                 uploadDocument, uploadProjectDocument);
router.delete('/:id/documents/:docId',        deleteProjectDocument);

export default router;
