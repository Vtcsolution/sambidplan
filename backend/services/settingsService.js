import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, '../.env');

// Maps each AdminSetting (group.key) to its process.env variable name.
export const ENV_MAP = {
  // General
  'general.siteName':              'PLATFORM_NAME',
  'general.siteUrl':               'FRONTEND_URL',
  'general.supportEmail':          'SUPPORT_EMAIL',
  'general.trackBaseUrl':          'TRACK_BASE_URL',

  // Email / SMTP (Hostinger)
  'email.smtpHost':                'SMTP_HOST',
  'email.smtpPort':                'SMTP_PORT',
  'email.smtpSecure':              'SMTP_SECURE',
  'email.smtpUser':                'SMTP_USER',
  'email.smtpPass':                'SMTP_PASS',
  // Sender aliases
  'email.emailNoreply':            'EMAIL_NOREPLY',
  'email.emailSupport':            'EMAIL_SUPPORT',
  'email.emailBilling':            'EMAIL_BILLING',

  // AI
  'api.openaiApiKey':              'OPENAI_API_KEY',
  'api.geminiApiKey':              'GEMINI_API_KEY',

  // SAM.gov
  'api.samApiKey':                 'SAM_API_KEY',
  'api.samApiUrl':                 'SAM_API_URL',
  'api.usaspendingApiUrl':         'USASPENDING_API_URL',

  // Stripe
  'payment.stripeSecretKey':       'STRIPE_SECRET_KEY',
  'payment.stripePublicKey':       'STRIPE_PUBLISHABLE_KEY',

  // PayPal
  'payment.paypalClientId':        'PAYPAL_CLIENT_ID',
  'payment.paypalClientSecret':    'PAYPAL_CLIENT_SECRET',
  'payment.paypalMode':            'PAYPAL_MODE',

  // Payoneer
  'payment.payoneerApiBase':       'PAYONEER_API_BASE',
  'payment.payoneerClientId':      'PAYONEER_CLIENT_ID',
  'payment.payoneerClientSecret':  'PAYONEER_CLIENT_SECRET',
  'payment.payoneerProgramId':     'PAYONEER_PROGRAM_ID',
};

// Apply a flat { 'group.key': value } object to process.env.
export const applyToEnv = (flatMap) => {
  for (const [settingKey, envKey] of Object.entries(ENV_MAP)) {
    const val = flatMap[settingKey];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      process.env[envKey] = String(val);
    }
  }
};

// Convert grouped { general: { siteName: 'X' } } → flat → apply to process.env.
export const applyGroupedToEnv = (grouped) => {
  const flat = {};
  for (const [group, fields] of Object.entries(grouped)) {
    for (const [key, value] of Object.entries(fields)) {
      flat[`${group}.${key}`] = value;
    }
  }
  applyToEnv(flat);
};

// Write updated values back to the .env file.
// Preserves comments, blank lines, and all existing keys.
export const writeEnvFile = (groupedSettings) => {
  try {
    // Build { ENV_KEY: value } from the grouped settings via ENV_MAP
    const updates = {};
    for (const [settingKey, envKey] of Object.entries(ENV_MAP)) {
      const [group, key] = settingKey.split('.');
      if (groupedSettings[group] !== undefined && groupedSettings[group][key] !== undefined) {
        const val = groupedSettings[group][key];
        if (val !== null && String(val).trim() !== '') {
          updates[envKey] = String(val);
        }
      }
    }

    if (Object.keys(updates).length === 0) return;

    // Read current .env content
    let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    const lines = content.split('\n');
    const seen = new Set();

    // Update existing KEY=value lines in-place
    const updated = lines.map(line => {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (match && updates[match[1]] !== undefined) {
        seen.add(match[1]);
        return `${match[1]}=${updates[match[1]]}`;
      }
      return line;
    });

    // Append any new keys not already present in the file
    for (const [key, val] of Object.entries(updates)) {
      if (!seen.has(key)) {
        updated.push(`${key}=${val}`);
      }
    }

    fs.writeFileSync(ENV_PATH, updated.join('\n'), 'utf8');
    console.log(`✅ .env file updated (${Object.keys(updates).length} variables)`);
  } catch (err) {
    console.warn('⚠️ Could not write .env file:', err.message);
  }
};

// Load all settings from MongoDB and apply to process.env.
// If DB has no records, auto-seeds from current process.env values (from .env).
export const loadSettingsFromDB = async () => {
  try {
    const { default: AdminSetting } = await import('../models/admin/AdminSetting.js');
    let settings = await AdminSetting.find({});

    if (!settings.length) {
      console.log('⚙️  No admin settings in DB — seeding from .env values...');
      const docs = [];
      for (const [settingKey, envKey] of Object.entries(ENV_MAP)) {
        const val = process.env[envKey];
        if (val !== undefined && String(val).trim() !== '') {
          const [group, key] = settingKey.split('.');
          docs.push({ key, group, value: val });
        }
      }
      if (docs.length) {
        // insertMany with ordered:false ignores duplicate-key errors gracefully
        try {
          await AdminSetting.insertMany(docs, { ordered: false });
        } catch (e) {
          // Some duplicates may exist — that's fine
          if (e.code !== 11000) throw e;
        }
        settings = await AdminSetting.find({});
        console.log(`✅ Seeded ${settings.length} settings into DB from .env`);
      }
    }

    if (settings.length) {
      const flat = {};
      settings.forEach(s => { flat[`${s.group}.${s.key}`] = s.value; });
      applyToEnv(flat);
      console.log(`✅ Loaded ${settings.length} admin settings from DB into process.env`);
    }
  } catch (err) {
    console.warn('⚠️ Could not load admin settings from DB:', err.message);
  }
};
