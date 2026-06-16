import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI_API);
const db = mongoose.connection.db;

// Check jon's user doc
const user = await db.collection('users').findOne({ email: 'jon@gmail.com' });
console.log('👤 jon user:');
console.log('  plan:', user?.plan);
console.log('  supportReferredBy:', user?.supportReferredBy);

// Check SupportReferral docs
const referrals = await db.collection('supportreferrals').find({}).toArray();
console.log('\n📋 SupportReferral docs:', referrals.length);
referrals.forEach(r => console.log('  ', JSON.stringify({
  supportMember: r.supportMember,
  user: r.user,
  status: r.status,
  commissionAmount: r.commissionAmount,
  firstCommission: r.firstCommission,
})));

// Check John admin doc
const admin = await db.collection('admins').findOne({ role: 'support' });
console.log('\n👮 Support admin (John):');
console.log('  _id:', admin?._id);
console.log('  referralCode:', admin?.referralCode);
console.log('  referralBalance:', admin?.referralBalance);
console.log('  totalCommissionEarned:', admin?.totalCommissionEarned);

// Check invoices for jon
const invoices = await db.collection('invoices').find({ status: 'paid' }).toArray();
console.log('\n🧾 Paid invoices:', invoices.length);
invoices.forEach(i => console.log('  ', JSON.stringify({
  user: i.user,
  plan: i.plan,
  amount: i.amount,
  status: i.status,
  paymentMethod: i.paymentMethod,
})));

await mongoose.disconnect();
