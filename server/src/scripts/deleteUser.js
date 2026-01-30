/**
 * Delete a user by email.
 * Usage: node src/scripts/deleteUser.js <email>
 * Example: node src/scripts/deleteUser.js user@example.com
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

const email = process.argv[2];
if (!email) {
  console.error('Usage: node src/scripts/deleteUser.js <email>');
  process.exit(1);
}

async function run() {
  await connectDB();

  const result = await User.deleteOne({ email: email.trim().toLowerCase() });
  if (result.deletedCount === 0) {
    console.log(`No user found with email: ${email}`);
  } else {
    console.log(`Deleted user: ${email}`);
  }

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
