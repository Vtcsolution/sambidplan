// backend/routes/prospectRoutes.js
import express from 'express';
import { flexAdmin } from '../middleware/flexAdminMiddleware.js';
import { requirePermission, adminOrSuperAdmin } from '../middleware/adminAuthMiddleware.js';
import {
  getProspectStats,
  getProspects,
  exportProspects,
  triggerProspectSync,
  triggerCollectOnly,
  triggerEnrichOnly,
  resumeProspectSyncHandler,
  stopProspectSyncHandler,
  getProspectSyncStatus,
  markContacted,
  bulkMarkContacted,
  updateResponseStatus,
  deleteProspect,
  clearAllProspects,
  startAIWebsiteFinder,
  stopAIWebsiteFinderHandler,
  getAIFinderStatus,
  getEmailTemplates,
  previewEmailTemplate,
  generateProspectEmail,
  sendProspectEmails,
  getProspectEmailHistory,
  quickAddProspect,
} from '../controllers/prospectController.js';

const router = express.Router();

router.use(flexAdmin);

// Read-only — all authenticated admins
router.get('/stats',              getProspectStats);
router.get('/',                   getProspects);
router.get('/sync/status',        getProspectSyncStatus);
router.get('/ai-finder/status',   getAIFinderStatus);

// Admin-only operations (sync, enrich, clear, export, delete)
router.get('/export',             adminOrSuperAdmin, exportProspects);
router.post('/sync/start',        adminOrSuperAdmin, triggerProspectSync);
router.post('/sync/collect',      adminOrSuperAdmin, triggerCollectOnly);
router.post('/sync/enrich',       adminOrSuperAdmin, triggerEnrichOnly);
router.post('/sync/resume',       adminOrSuperAdmin, resumeProspectSyncHandler);
router.post('/sync/stop',         adminOrSuperAdmin, stopProspectSyncHandler);
router.post('/sync/clear',        adminOrSuperAdmin, clearAllProspects);
router.delete('/:id',             adminOrSuperAdmin, deleteProspect);
router.post('/quick-add',         adminOrSuperAdmin, quickAddProspect);

// Support users with content permission can mark/update prospects
router.put('/:id/contacted',      requirePermission('content'), markContacted);
router.put('/:id/status',         requirePermission('content'), updateResponseStatus);
router.post('/bulk/contacted',    requirePermission('content'), bulkMarkContacted);

// AI tools — require aiTools permission
router.post('/ai-finder/start',   requirePermission('aiTools'), startAIWebsiteFinder);
router.post('/ai-finder/stop',    requirePermission('aiTools'), stopAIWebsiteFinderHandler);

// Email outreach — require campaigns permission
router.get('/email/templates',              requirePermission('campaigns'), getEmailTemplates);
router.get('/email/preview/:templateId',    requirePermission('campaigns'), previewEmailTemplate);
router.post('/email/generate',              requirePermission('campaigns'), generateProspectEmail);
router.post('/email/send',                  requirePermission('campaigns'), sendProspectEmails);
router.get('/:id/email-history',            requirePermission('campaigns'), getProspectEmailHistory);

export default router;
