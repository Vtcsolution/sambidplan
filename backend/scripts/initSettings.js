// backend/scripts/initSettings.js
// Run once to seed AdminSetting collection from .env values:
//   node backend/scripts/initSettings.js
import 'dotenv/config';
import mongoose from 'mongoose';
import AdminSetting from '../models/admin/AdminSetting.js';
import { ENV_MAP } from '../services/settingsService.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_API;

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  let created = 0;
  let skipped = 0;

  for (const [settingKey, envKey] of Object.entries(ENV_MAP)) {
    const val = process.env[envKey];
    if (!val || String(val).trim() === '') { skipped++; continue; }

    const [group, key] = settingKey.split('.');
    const existing = await AdminSetting.findOne({ key, group });
    if (existing) {
      // Update if value differs
      if (String(existing.value) !== String(val)) {
        existing.value = val;
        await existing.save();
        console.log(`  ↻  Updated  ${group}.${key} = ${envKey}`);
        created++;
      } else {
        skipped++;
      }
      continue;
    }

    await AdminSetting.create({ key, group, value: val });
    console.log(`  +  Created  ${group}.${key} = ${envKey} (${val.substring(0, 20)}${val.length > 20 ? '…' : ''})`);
    created++;
  }

  console.log(`\n✅ Done — ${created} upserted, ${skipped} skipped (already in DB or env empty)`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
