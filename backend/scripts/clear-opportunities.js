// One-time script: wipe all opportunities and user assignments so tomorrow's
// fresh SAM.gov fetch populates the DB with complete, correct data.
// Run: node backend/scripts/clear-opportunities.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI_API;
if (!MONGO_URI) { console.error('❌ MONGO_URI_API not set in .env'); process.exit(1); }

await mongoose.connect(MONGO_URI);
console.log('✅ Connected to MongoDB Atlas');

const db = mongoose.connection.db;

const oppResult  = await db.collection('opportunities').deleteMany({});
const uoResult   = await db.collection('useropportunities').deleteMany({});

console.log(`🗑️  Deleted ${oppResult.deletedCount}  records from opportunities`);
console.log(`🗑️  Deleted ${uoResult.deletedCount}  records from useropportunities`);
console.log('✅ Done — restart backend and run a manual fetch from admin panel');

await mongoose.disconnect();
