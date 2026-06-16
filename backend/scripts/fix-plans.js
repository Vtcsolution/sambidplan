import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI_API);
const db = mongoose.connection.db;

const before = await db.collection('plans').find({}).toArray();
console.log('📋 Plans BEFORE:');
before.forEach(p => console.log(`  ${p.name}: monthly=$${p.priceMonthly} yearly=$${p.priceYearly}`));

const correctPrices = {
  starter:    { priceMonthly: 29,  priceYearly: 278  },
  pro:        { priceMonthly: 79,  priceYearly: 758  },
  enterprise: { priceMonthly: 499, priceYearly: 4788 },
};

for (const [name, prices] of Object.entries(correctPrices)) {
  const res = await db.collection('plans').updateOne(
    { name },
    { $set: prices }
  );
  console.log(`✅ Updated ${name}: monthly=$${prices.priceMonthly} yearly=$${prices.priceYearly} (matched: ${res.matchedCount})`);
}

const after = await db.collection('plans').find({}).toArray();
console.log('📋 Plans AFTER:');
after.forEach(p => console.log(`  ${p.name}: monthly=$${p.priceMonthly} yearly=$${p.priceYearly}`));

await mongoose.disconnect();
console.log('🏁 Done');
