import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './server/Models/Admin.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = new Admin({
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
    });

    await admin.save();
    console.log('Admin created successfully');
    console.log('Email:', process.env.ADMIN_EMAIL);
    console.log('Password:', adminPassword);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();