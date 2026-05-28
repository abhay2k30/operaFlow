const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const DEMO_USERS = [
  { name: 'Admin User',            email: 'admin@operaflow.in',      password: 'admin123',   role: 'Admin' },
  { name: 'Inventory Manager',     email: 'inventory@operaflow.in',  password: 'inv123',     role: 'InventoryManager' },
  { name: 'Procurement Officer',   email: 'purchase@operaflow.in',   password: 'proc123',    role: 'Procurement' },
  { name: 'Finance Manager',       email: 'finance@operaflow.in',    password: 'fin123',     role: 'Finance' },
  { name: 'Production Supervisor', email: 'production@operaflow.in', password: 'prod123',    role: 'Production' },
  { name: 'Sales Executive',       email: 'sales@operaflow.in',      password: 'sales123',   role: 'Sales' },
  { name: 'QC Inspector',          email: 'quality@operaflow.in',    password: 'quality123', role: 'QualityControl' },
];

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const u of DEMO_USERS) {
      const passwordHash = await bcrypt.hash(u.password, 8);
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        existing.passwordHash = passwordHash;
        existing.role = u.role;
        existing.name = u.name;
        await existing.save();
        console.log(`✅ Updated: ${u.email} (${u.role})`);
      } else {
        await User.create({ name: u.name, email: u.email, passwordHash, role: u.role });
        console.log(`✅ Created: ${u.email} (${u.role})`);
      }
    }

    console.log('\n--- Demo credentials ---');
    DEMO_USERS.forEach(u =>
      console.log(`${u.role.padEnd(20)} ${u.email.padEnd(32)} password: ${u.password}`)
    );
    mongoose.disconnect();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedAdmin();
