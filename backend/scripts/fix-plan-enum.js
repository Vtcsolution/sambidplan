// Fix users with plan='start' (invalid) → 'starter'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI_API);
console.log('✅ Connected');

const result = await mongoose.connection.db.collection('users').updateMany(
  { plan: 'start' },
  { $set: { plan: 'starter' } }
);

console.log(`✅ Fixed ${result.modifiedCount} user(s): plan 'start' → 'starter'`);
await mongoose.disconnect();
