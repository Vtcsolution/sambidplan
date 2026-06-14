// One-time script: re-save a support member's password so it hashes correctly.
// Usage: node scripts/fix-support-password.js vtcsolutions85@gmail.com "YourPassword123"
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Admin from '../models/Admin.js';

const [,, email, newPassword] = process.argv;
if (!email || !newPassword) {
  console.error('Usage: node scripts/fix-support-password.js <email> <password>');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
if (!admin) { console.error('Admin not found:', email); process.exit(1); }

console.log(`Found: ${admin.name} | role: ${admin.role} | active: ${admin.isActive}`);

// Assigning plaintext triggers the pre-save hash — this is the correct path
admin.password = newPassword;
await admin.save();

console.log('✅ Password reset successfully. They can now log in at /admin/login');
await mongoose.disconnect();
