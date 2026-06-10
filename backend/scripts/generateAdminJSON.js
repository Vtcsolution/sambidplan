// Run: node scripts/generateAdminJSON.js
// Outputs ready-to-paste MongoDB documents with bcrypt hashed passwords

import bcrypt from 'bcryptjs';

const admins = [
  { name: 'Rana Zia',          email: 'ranazia943@gmail.com',    role: 'super_admin' },
  { name: 'Operations Admin',  email: 'admin@sambid.co',  role: 'admin'       },
  { name: 'Support Agent',     email: 'support@sambid.co',role: 'support'     },
  { name: 'Co Founder',        email: 'founder@sambid.co',role: 'super_admin' },
];

const allPerms  = { users: true, payments: true, content: true, settings: true,  aiTools: true, campaigns: true };
const adminPerms = { users: true, payments: true, content: true, settings: false, aiTools: true, campaigns: true };
const supPerms   = { users: true, payments: false,content: true, settings: false, aiTools: false,campaigns: false };

const permMap = { super_admin: allPerms, admin: adminPerms, support: supPerms };

const docs = [];
for (const a of admins) {
  const hash = await bcrypt.hash('112233', 12);
  docs.push({
    name:        a.name,
    email:       a.email,
    password:    hash,
    role:        a.role,
    permissions: permMap[a.role],
    isActive:    true,
    lastLoginAt: null,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  });
}

console.log('\n✅ Copy-paste these into MongoDB Compass → admins collection → Add Documents:\n');
console.log(JSON.stringify(docs, null, 2));
