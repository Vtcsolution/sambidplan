import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireCompany, requireCompanyRole } from '../middleware/companyMiddleware.js';
import { uploadDocument as multerUpload } from '../middleware/documentUpload.js';
import {
  createCompany,
  getMyCompanyProfile,
  updateCompany,
  verifyUEI,
  inviteMember,
  previewInvite,
  acceptInvite,
  updateMemberRole,
  removeMember,
  leaveCompany,
  listDocuments,
  uploadDocument,
  deleteDocument,
  addComment,
  downloadDocument,
  getAIReadiness,
} from '../controllers/companyController.js';
import {
  createWorkspaceUser,
  listWorkspaceUsers,
  updateWorkspaceUser,
  deleteWorkspaceUser,
  workspaceLogin,
} from '../controllers/workspaceController.js';

const router = express.Router();

// Public workspace login — no auth required
router.post('/workspace/login', workspaceLogin);

// Public invite preview — no auth required
router.get('/join/:token', previewInvite);

router.use(protect);

// Company CRUD — no requireCompany on create/mine so users can create/check
router.post('/',            createCompany);
router.get('/mine',         getMyCompanyProfile);
router.get('/ai-readiness', getAIReadiness);

// Accept invite — user must be logged in but NOT necessarily in a company yet
router.post('/join/:token', acceptInvite);

// All routes below need the user to already be in a company
router.use(requireCompany);

router.put('/',            updateCompany);
router.post('/verify-uei', verifyUEI);

// Team
router.post('/invite',                   inviteMember);
router.put('/members/:memberId/role',    updateMemberRole);
router.delete('/members/:memberId',      removeMember);
router.delete('/leave',                  leaveCompany);

// Workspace users (owner only)
router.get('/workspace/users',                          listWorkspaceUsers);
router.post('/workspace/users',                         createWorkspaceUser);
router.put('/workspace/users/:workspaceUserId',         updateWorkspaceUser);
router.delete('/workspace/users/:workspaceUserId',      deleteWorkspaceUser);

// Documents
router.get('/documents',             listDocuments);
router.post('/documents/upload',     (req, res, next) => {
  multerUpload(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, uploadDocument);
router.delete('/documents/:id',      deleteDocument);
router.post('/documents/:id/comment', addComment);
router.get('/documents/:id/download', downloadDocument);

export default router;
