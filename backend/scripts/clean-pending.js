import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI_API);
const db = mongoose.connection.db;

const result = await db.collection('invoices').deleteMany({ status: 'pending' });
console.log(`🗑️  Deleted ${result.deletedCount} pending invoice(s)`);

const remaining = await db.collection('invoices').find({}).toArray();
console.log(`📋 Remaining invoices (${remaining.length}):`);
remaining.forEach(i => console.log(`  ${i.invoiceNumber} — ${i.status} — ${i.plan} — $${i.amount}`));

await mongoose.disconnect();
console.log('✅ Done');
