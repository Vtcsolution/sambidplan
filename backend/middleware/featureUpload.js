import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const FEATURE_DIR = path.join(__dirname, '../uploads/features');
if (!fs.existsSync(FEATURE_DIR)) fs.mkdirSync(FEATURE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FEATURE_DIR),
  filename: (req, file, cb) => {
    const prefix = file.mimetype.startsWith('video/') ? 'fvid-' : 'fimg-';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, prefix + unique + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only images (jpg/png/webp/gif) and videos (mp4/webm/mov) are allowed.'), false);
};

export const featureUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
});
