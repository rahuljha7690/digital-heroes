// Creates (or resets) the demo admin + demo customer used for the submission.
// Usage: npm run seed:admin   (reads ADMIN_* / DEMO_* from .env)
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import User from './models/User.js';

const accounts = [
  {
    name: 'Digital Heroes Admin',
    email: process.env.ADMIN_EMAIL || 'admin@digitalheroes.test',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
  },
  {
    name: 'Demo Customer',
    email: process.env.DEMO_EMAIL || 'customer@digitalheroes.test',
    password: process.env.DEMO_PASSWORD || 'Customer@12345',
    role: 'customer',
  },
];

try {
  await connectDB();
  for (const account of accounts) {
    const password = await bcrypt.hash(account.password, 12);
    await User.updateOne(
      { email: account.email.toLowerCase() },
      { $set: { name: account.name, password, role: account.role, isActive: true } },
      { upsert: true }
    );
    console.log(`Ready: ${account.role} -> ${account.email}`);
  }
} catch (error) {
  console.error('Seeding accounts failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}