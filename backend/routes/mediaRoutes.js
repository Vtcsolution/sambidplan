import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { flexAdmin } from '../middleware/flexAdminMiddleware.js';
import { mediaUpload } from '../middleware/mediaUpload.js';
import PageMedia from '../models/PageMedia.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const router = express.Router();

const BASE_SLOTS = {
  home:     ['hero', 'phase_01','phase_02','phase_03','phase_04','phase_05','phase_06','phase_07'],
  features: Array.from({ length: 12 }, (_, i) => `feature_${String(i+1).padStart(2,'0')}`),
};

// ── Public: get all media for a page ──────────────────────────────────────────
router.get('/page/:page', async (req, res) => {
  const { page } = req.params;
  if (!['home','features'].includes(page)) {
    return res.status(400).json({ success: false, message: 'Invalid page.' });
  }
  try {
    const records = await PageMedia.find({ page }).lean();
    const media = {};
    records.forEach(r => {
      if (!media[r.slot]) media[r.slot] = {};
      media[r.slot][r.type] = { _id: r._id, url: r.url, filename: r.filename, size: r.size, updatedAt: r.updatedAt };
    });
    res.json({ success: true, media, slots: BASE_SLOTS[page] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: upload media for a slot ────────────────────────────────────────────
router.post('/upload', flexAdmin, mediaUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const { page, slot } = req.body;
  if (!page || !slot) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: 'page and slot are required.' });
  }
  if (!BASE_SLOTS[page]?.includes(slot)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: 'Invalid page or slot.' });
  }

  const type = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  const url  = `/uploads/${type === 'video' ? 'videos' : 'images'}/${req.file.filename}`;

  try {
    // Delete old file from disk if replacing
    const existing = await PageMedia.findOne({ page, slot, type });
    if (existing) {
      const oldPath = path.join(__dirname, '..', existing.url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const record = await PageMedia.findOneAndUpdate(
      { page, slot, type },
      { filename: req.file.filename, originalName: req.file.originalname, url, size: req.file.size },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, media: record });
  } catch (err) {
    // Clean up on DB error
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: delete media for a slot ───────────────────────────────────────────
router.delete('/:id', flexAdmin, async (req, res) => {
  try {
    const record = await PageMedia.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Media not found.' });

    const filePath = path.join(__dirname, '..', record.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await record.deleteOne();

    res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
