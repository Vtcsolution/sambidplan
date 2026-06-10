import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fedvantage';

const adminSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true },
  role:        { type: String, enum: ['super_admin', 'admin', 'support'], default: 'admin' },
  permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive:    { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

const ADMINS = [
  {
    name: 'Rana Zia',
    email: 'ranazia943@gmail.com',
    password: '112233',
    role: 'super_admin',
    permissions: { users: true, payments: true, content: true, settings: true, aiTools: true, campaigns: true },
  },
  {
    name: 'Operations Admin',
    email: 'admin@sambid.co',
    password: '112233',
    role: 'admin',
    permissions: { users: true, payments: true, content: true, settings: false, aiTools: true, campaigns: true },
  },
  {
    name: 'Support Agent',
    email: 'support@sambid.co',
    password: '112233',
    role: 'support',
    permissions: { users: true, payments: false, content: true, settings: false, aiTools: false, campaigns: false },
  },
  {
    name: 'Co Founder',
    email: 'founder@sambid.co',
    password: '112233',
    role: 'super_admin',
    permissions: { users: true, payments: true, content: true, settings: true, aiTools: true, campaigns: true },
  },
];

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');

    for (const adminData of ADMINS) {
      const exists = await Admin.findOne({ email: adminData.email });
      if (exists) {
        console.log(`⚠️  Already exists: ${adminData.email}`);
        continue;
      }
      const hashed = await bcrypt.hash(adminData.password, 12);
      await Admin.create({ ...adminData, password: hashed });
      console.log(`✅ Created [${adminData.role}]: ${adminData.email}`);
    }

    console.log('\n🎉 All admins seeded!');
    console.log('────────────────────────────────────────');
    ADMINS.forEach(a => {
      console.log(`  ${a.role.padEnd(12)} | ${a.email.padEnd(30)} | Password: ${a.password}`);
    });
    console.log('────────────────────────────────────────');
    console.log('Login at: http://localhost:5173/admin/login');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
