import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI_API);
const db = mongoose.connection.db;

const NEW_KEY = 'SAM-19eb9d48-cd68-470d-a52b-1944fc2fb19b';

const result = await db.collection('adminsettings').updateOne(
  { group: 'api', key: 'samApiKey' },
  { $set: { value: NEW_KEY } },
  { upsert: true }
);

console.log('✅ SAM API key updated in MongoDB:', result.modifiedCount ? 'updated' : result.upsertedCount ? 'inserted' : 'no change');

const check = await db.collection('adminsettings').findOne({ group: 'api', key: 'samApiKey' });
console.log('✅ Verified value in DB:', check?.value?.substring(0, 20) + '...');

await mongoose.disconnect();
