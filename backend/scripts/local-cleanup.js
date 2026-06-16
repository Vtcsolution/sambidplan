import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI_API);
const db = mongoose.connection.db;

const inv = await db.collection('invoices').deleteMany({ status: 'pending' });
console.log(`🗑️  Deleted ${inv.deletedCount} pending invoice(s)`);

const u = await db.collection('users').updateMany({ plan: 'start' }, { $set: { plan: 'starter' } });
console.log(`🔧 Fixed ${u.modifiedCount} user(s) with plan 'start' → 'starter'`);

const remaining = await db.collection('invoices').countDocuments();
console.log(`📋 Total invoices remaining: ${remaining}`);

await mongoose.disconnect();
console.log('✅ Done');
