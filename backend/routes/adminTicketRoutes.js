import express from 'express';
import multer from 'multer';
import { flexAdmin } from '../middleware/flexAdminMiddleware.js';
import {
  adminGetAllTickets,
  adminGetTicketById,
  adminReplyToTicket,
  adminUpdateTicketStatus,
} from '../controllers/ticketController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
});

router.use(flexAdmin);

router.get('/',                    adminGetAllTickets);
router.get('/:id',                 adminGetTicketById);
router.post('/:id/reply',          upload.array('attachments', 3), adminReplyToTicket);
router.put('/:id/status',          adminUpdateTicketStatus);

export default router;
