import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI_API);
const db = mongoose.connection.db;

const opps = await db.collection('opportunities')
  .find({ source: 'sam' }, { projection: { title: 1, description: 1, resourceLinks: 1, noticeId: 1 } })
  .limit(5).toArray();

console.log(`\nFound ${opps.length} SAM opportunities in DB:\n`);
opps.forEach((o, i) => {
  console.log(`[${i+1}] ${o.title?.substring(0, 70)}`);
  console.log(`    description: ${o.description?.substring(0, 150)}`);
  console.log(`    resourceLinks count: ${o.resourceLinks?.length || 0}`);
  if (o.resourceLinks?.length) console.log(`    first link: ${JSON.stringify(o.resourceLinks[0])}`);
  console.log('');
});

await mongoose.disconnect();
