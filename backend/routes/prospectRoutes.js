// backend/routes/prospectRoutes.js
import express from 'express';
import { flexAdmin } from '../middleware/flexAdminMiddleware.js';
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

router.get('/stats',              getProspectStats);
router.get('/',                   getProspects);
router.get('/export',             exportProspects);
router.get('/sync/status',        getProspectSyncStatus);
router.post('/sync/start',        triggerProspectSync);
router.post('/sync/collect',      triggerCollectOnly);
router.post('/sync/enrich',       triggerEnrichOnly);
router.post('/sync/resume',       resumeProspectSyncHandler);
router.post('/sync/stop',         stopProspectSyncHandler);
router.post('/sync/clear',        clearAllProspects);
// AI website finder
router.get('/ai-finder/status',   getAIFinderStatus);
router.post('/ai-finder/start',   startAIWebsiteFinder);
router.post('/ai-finder/stop',    stopAIWebsiteFinderHandler);

router.put('/:id/contacted',      markContacted);
router.put('/:id/status',         updateResponseStatus);
router.delete('/:id',             deleteProspect);
router.post('/bulk/contacted',    bulkMarkContacted);

// Email outreach
router.post('/quick-add',                   quickAddProspect);
router.get('/email/templates',              getEmailTemplates);
router.get('/email/preview/:templateId',    previewEmailTemplate);
router.post('/email/generate',              generateProspectEmail);
router.post('/email/send',                  sendProspectEmails);
router.get('/:id/email-history',            getProspectEmailHistory);

export default router;
