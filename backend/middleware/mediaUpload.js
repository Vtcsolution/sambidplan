import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const VIDEO_DIR = path.join(__dirname, '../uploads/videos');
const IMAGE_DIR = path.join(__dirname, '../uploads/images');

[VIDEO_DIR, IMAGE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, VIDEO_DIR);
    else cb(null, IMAGE_DIR);
  },
  filename: (req, file, cb) => {
    const prefix = file.mimetype.startsWith('video/') ? 'vid-' : 'img-';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, prefix + unique + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/jpg','image/png','image/webp','video/mp4','video/webm','video/quicktime'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only images (jpg/png/webp) and videos (mp4/webm/mov) are allowed.'), false);
};

export const mediaUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300 MB max (covers large videos)
});
