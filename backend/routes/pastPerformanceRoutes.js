import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getAll, getOne, create, update, remove, exportOne, exportAll } from '../controllers/pastPerformanceController.js';

const router = express.Router();
router.use(protect);

router.get('/',              getAll);
router.get('/:id',           getOne);
router.post('/',             create);
router.put('/:id',           update);
router.delete('/:id',        remove);
router.get('/:id/export',    exportOne);
router.post('/export/batch', exportAll);

export default router;
