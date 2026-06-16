// One-off maintenance: replace the paypalOrderId index with a PARTIAL unique
// index so pending invoices (paypalOrderId: null) no longer collide, while real
// PayPal order IDs stay unique. NON-DESTRUCTIVE — only touches the index, never
// the invoice documents.
//
// Run from backend/:  node scripts/fix-paypal-index.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const uri = process.env.MONGO_URI_API || process.env.MONGO_URI || 'mongodb://localhost:27017/fedvantage';
const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
console.log(`🔌 Connecting: ${masked}`);

await mongoose.connect(uri);
const col = mongoose.connection.db.collection('invoices');
console.log(`📂 Database in use: ${mongoose.connection.db.databaseName}`);

// 1. Guard: refuse to create a unique index if real duplicate order IDs exist.
const dupes = await col.aggregate([
  { $match: { paypalOrderId: { $type: 'string' } } },
  { $group: { _id: '$paypalOrderId', n: { $sum: 1 }, ids: { $push: '$_id' } } },
  { $match: { n: { $gt: 1 } } },
]).toArray();

if (dupes.length) {
  console.error('❌ Found duplicate non-null paypalOrderId values — resolve these first:');
  dupes.forEach(d => console.error(`   "${d._id}" → ${d.n} invoices: ${d.ids.join(', ')}`));
  await mongoose.disconnect();
  process.exit(1);
}

// 2. Drop the old index if present.
const existing = await col.indexes();
const old = existing.find(i => i.name === 'paypalOrderId_1');
if (old) {
  console.log('🗑️  Dropping old index:', JSON.stringify({ name: old.name, unique: old.unique, sparse: old.sparse, partial: old.partialFilterExpression }));
  await col.dropIndex('paypalOrderId_1');
} else {
  console.log('ℹ️  No existing paypalOrderId_1 index found.');
}

// 3. Create the partial unique index (matches the Invoice model).
await col.createIndex(
  { paypalOrderId: 1 },
  { unique: true, partialFilterExpression: { paypalOrderId: { $type: 'string' } }, name: 'paypalOrderId_1' }
);
console.log('✅ Created partial unique index on paypalOrderId.');

const after = await col.indexes();
console.log('📋 Indexes now:');
after.forEach(i => console.log('   ', JSON.stringify({ name: i.name, key: i.key, unique: i.unique, sparse: i.sparse, partial: i.partialFilterExpression })));

await mongoose.disconnect();
console.log('🏁 Done.');
