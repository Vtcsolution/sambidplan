import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import {
  createTicket,
  getMyTickets,
  getTicketById,
  replyToTicket,
  closeTicket,
} from '../controllers/ticketController.js';

const router = express.Router();

// multer: memory storage, 5 MB per file, max 3 files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/gif','image/webp',
                     'application/pdf','application/msword',
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                     'text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed'), false);
  },
});

router.use(protect);

router.post('/',              upload.array('attachments', 3), createTicket);
router.get('/',               getMyTickets);
router.get('/:id',            getTicketById);
router.post('/:id/reply',     upload.array('attachments', 3), replyToTicket);
router.put('/:id/close',      closeTicket);

export default router;
