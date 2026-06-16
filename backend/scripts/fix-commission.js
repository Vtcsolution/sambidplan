import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI_API);
const db = mongoose.connection.db;

const FIRST_PURCHASE_RATE = 0.15;
const PRO_ENTERPRISE_PLANS = ['pro', 'enterprise'];

// Find all paid invoices where commission wasn't credited
const paidInvoices = await db.collection('invoices').find({ status: 'paid' }).toArray();
console.log(`🔍 Checking ${paidInvoices.length} paid invoice(s)...`);

for (const invoice of paidInvoices) {
  const user = await db.collection('users').findOne({ _id: invoice.user });
  if (!user?.supportReferredBy) { console.log(`  ⏭️  ${user?.email} — no support referral`); continue; }

  const referral = await db.collection('supportreferrals').findOne({
    user: invoice.user,
    supportMember: user.supportReferredBy,
  });

  if (!referral) { console.log(`  ⏭️  ${user.email} — no referral doc`); continue; }
  if (referral.status !== 'registered') { console.log(`  ✅ ${user.email} — already processed (${referral.status})`); continue; }

  // Commission not yet credited — fix it now
  const commission = Math.round(invoice.amount * FIRST_PURCHASE_RATE * 100) / 100;
  const isProEnterprise = PRO_ENTERPRISE_PLANS.includes(invoice.plan);

  console.log(`\n💰 Crediting missed commission for ${user.email}:`);
  console.log(`   Plan: ${invoice.plan}, Paid: $${invoice.amount}, Commission: $${commission} (15%)`);

  // Update SupportReferral
  await db.collection('supportreferrals').updateOne(
    { _id: referral._id },
    {
      $set: {
        status:              'first_purchased',
        firstCommission:     commission,
        firstPurchasePlan:   invoice.plan,
        firstPurchaseAmount: invoice.amount,
        firstPurchasedAt:    new Date(),
        countsTowardTarget:  isProEnterprise,
        commissionAmount:    commission,
        planPurchased:       invoice.plan,
        paidAmount:          invoice.amount,
        invoiceId:           invoice._id,
        rewardedAt:          new Date(),
      }
    }
  );

  // Credit admin balance
  const inc = {
    referralBalance:       commission,
    totalCommissionEarned: commission,
    totalOneTimeEarned:    commission,
  };
  if (isProEnterprise) inc.proEnterpriseReferralCount = 1;

  await db.collection('admins').updateOne(
    { _id: user.supportReferredBy },
    { $inc: inc }
  );

  // Verify
  const updatedAdmin = await db.collection('admins').findOne({ _id: user.supportReferredBy });
  console.log(`   ✅ Admin balance now: $${updatedAdmin.referralBalance}`);
}

console.log('\n🏁 Done');
await mongoose.disconnect();
