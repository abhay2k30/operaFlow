const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const checkAndFixAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const email = 'admin@example.com';
    const password = 'admin123';
    
    let user = await User.findOne({ email });
    
    if (user) {
      console.log('Admin user found.');
      const passwordHash = await bcrypt.hash(password, 8);
      user.passwordHash = passwordHash;
      user.role = 'Admin';
      await user.save();
      console.log('Admin password and role updated/verified.');
    } else {
      console.log('Admin user NOT found. Creating...');
      const passwordHash = await bcrypt.hash(password, 8);
      user = new User({
        name: 'Admin User',
        email,
        passwordHash,
        role: 'Admin'
      });
      await user.save();
      console.log('Admin user created successfully.');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAndFixAdmin();
