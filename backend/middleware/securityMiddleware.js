// backend/middleware/securityMiddleware.js
// Global security middleware — NoSQL injection, XSS, input limits, password validation

// ── Strip MongoDB operators from user input (prevents NoSQL injection) ────────
const stripMongoOps = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripMongoOps);

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    clean[key] = typeof val === 'object' ? stripMongoOps(val) : val;
  }
  return clean;
};

export const noSQLInjectionGuard = (req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = stripMongoOps(req.body);
  // req.query and req.params are read-only in Express 5+ — sanitize values in-place
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (key.startsWith('$')) { delete req.query[key]; continue; }
      if (typeof req.query[key] === 'object') req.query[key] = stripMongoOps(req.query[key]);
    }
  }
  next();
};

// ── Strip HTML/script tags from string fields (XSS prevention) ───────────────
const SKIP_XSS_PATHS = ['/api/ai/', '/api/opportunities'];

const stripTags = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

const sanitizeObj = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return stripTags(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObj);
  if (typeof obj === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      clean[key] = sanitizeObj(val);
    }
    return clean;
  }
  return obj;
};

export const xssGuard = (req, res, next) => {
  if (SKIP_XSS_PATHS.some(p => req.path.startsWith(p))) return next();
  if (req.body && typeof req.body === 'object') req.body = sanitizeObj(req.body);
  next();
};

// ── Enforce input length limits ──────────────────────────────────────────────
const MAX_FIELD_LENGTHS = {
  name: 255, businessName: 255, email: 254, phone: 20,
  title: 500, subject: 500, description: 15000, notes: 5000,
  message: 10000, capabilities: 5000, question: 2000,
  rfpText: 100000, password: 128,
};

export const inputLengthGuard = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') return next();

  for (const [field, maxLen] of Object.entries(MAX_FIELD_LENGTHS)) {
    if (req.body[field] && typeof req.body[field] === 'string' && req.body[field].length > maxLen) {
      return res.status(400).json({
        success: false,
        message: `Field "${field}" exceeds maximum length of ${maxLen} characters.`,
      });
    }
  }
  next();
};

// ── Password validation before bcrypt (DoS prevention) ──────────────────────
export const passwordLengthGuard = (req, res, next) => {
  const pw = req.body?.password;
  if (pw && typeof pw === 'string') {
    if (pw.length > 128) {
      return res.status(400).json({ success: false, message: 'Password must be 128 characters or less.' });
    }
    if (pw.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
  }
  next();
};

// ── Block dangerous file extensions ─────────────────────────────────────────
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.sh', '.bash', '.csh', '.ksh',
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.py', '.pyc', '.pyo',
  '.rb', '.pl', '.cgi',
  '.jar', '.class', '.war',
  '.asp', '.aspx', '.cer',
  '.htaccess', '.htpasswd',
  '.vbs', '.vbe', '.wsf', '.wsh',
  '.ps1', '.psm1', '.psd1',
];

export const fileExtensionGuard = (req, res, next) => {
  if (!req.file && !req.files) return next();
  const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];

  for (const file of files) {
    if (!file?.originalname) continue;
    const name = file.originalname.toLowerCase();

    // Check for dangerous extensions anywhere in the filename (blocks double extensions like file.jpg.exe)
    for (const ext of DANGEROUS_EXTENSIONS) {
      if (name.includes(ext)) {
        return res.status(400).json({ success: false, message: `File type "${ext}" is not allowed.` });
      }
    }
  }
  next();
};

// ── NAICS code validator ────────────────────────────────────────────────────
export const validateNAICS = (code) => /^\d{2,6}$/.test(code);

// ── Path traversal guard ────────────────────────────────────────────────────
import path from 'path';

export const isPathSafe = (filePath, baseDir) => {
  const resolved = path.resolve(filePath);
  const base = path.resolve(baseDir);
  return resolved.startsWith(base + path.sep) || resolved === base;
};
