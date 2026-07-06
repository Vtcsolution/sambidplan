import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI_API);

const db = mongoose.connection.db;

// Find the user account (ali or whoever has NAICS codes set)
const users = await db.collection('users').find({}).toArray();
console.log('Users in DB:');
users.forEach(u => console.log(` - ${u.email} | plan: ${u.plan} | naics: ${u.naicsCodes?.join(',')}`));

// Target user — update this email if needed
const TARGET_EMAIL = users.find(u => u.email !== 'ranazia943@gmail.com')?.email || users[0]?.email;
const user = users.find(u => u.email === TARGET_EMAIL);

if (!user) { console.error('No user found'); process.exit(1); }
console.log(`\n✅ Updating company profile for user: ${user.email}`);

// KayKay LLC company data
const companyData = {
  owner:        user._id,
  name:         'KayKay LLC',
  uei:          'QFYKY4UL5XP3',
  cage:         '9HQZ7',
  ueiVerified:  false,
  website:      'https://kaykayllc.com',
  phone:        '+1 331 808 5028',
  address: {
    street: '930 York RD STE 50D',
    city:   'Hinsdale',
    state:  'IL',
    zip:    '60521-2991',
    country:'United States',
  },
  naicsCodes: ['423430', '334111', '541512', '238210'],
  certifications: [
    { name: 'Small Business', type: 'SB', verified: false },
  ],
  capabilities: 'IT hardware reseller and solutions provider specializing in computers, laptops, servers, monitors, networking equipment (routers, switches, firewalls), structured cabling, and IT infrastructure. Serving federal agencies and commercial clients with over three decades of experience in Information Technology procurement and deployment.',
  updatedAt: new Date(),
};

const result = await db.collection('companies').findOneAndUpdate(
  { owner: user._id },
  { $set: companyData },
  { upsert: true, returnDocument: 'after' }
);

console.log('✅ Company profile saved:', result?.name || 'KayKay LLC');
console.log('   UEI:    QFYKY4UL5XP3');
console.log('   CAGE:   9HQZ7');
console.log('   NAICS:  423430, 334111, 541512, 238210');
console.log('   Phone:  +1 331 808 5028');
console.log('   Address: 930 York RD STE 50D, Hinsdale, IL 60521-2991');

// Also update user's businessName, businessType, naicsCodes
await db.collection('users').updateOne(
  { _id: user._id },
  { $set: {
    businessName: 'KayKay LLC',
    businessType: 'llc',
    naicsCodes: ['423430', '334111', '541512', '238210'],
  }}
);
console.log('\n✅ User profile updated: businessName, businessType, naicsCodes');

await mongoose.disconnect();
console.log('\n🎉 Done! Restart backend to see company profile in AI features.');
