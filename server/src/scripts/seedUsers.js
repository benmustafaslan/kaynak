/**
 * Seed script: creates Editor (chief_editor) and Producer (producer) users.
 * Run from project root: npm run seed:users (from server dir) or node server/src/scripts/seedUsers.js
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.js';

const SEED_USERS = [
  {
    name: 'Editor',
    email: 'editor@kaynak.local',
    password: '12341234',
    role: 'chief_editor', // all permissions (e.g. approval, full access)
  },
  {
    name: 'Producer',
    email: 'producer@kaynak.local',
    password: '12341234',
    role: 'producer',
  },
];

async function seed() {
  await connectDB();

  for (const { name, email, password, role } of SEED_USERS) {
    const existing = await User.findOne({ email });
    if (existing) {
      existing.name = name;
      existing.password = password;
      existing.role = role;
      await existing.save();
      console.log(`Updated user: ${email} (${role})`);
    } else {
      await User.create({ name, email, password, role });
      console.log(`Created user: ${email} (${role})`);
    }
  }

  console.log('Seed complete.');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
