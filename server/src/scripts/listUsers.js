/**
 * List all registered users (name, email, role).
 * Usage: node src/scripts/listUsers.js
 * Run from server directory: node src/scripts/listUsers.js
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import connectDB from '../config/database.js';
import User from '../models/User.js';

async function run() {
  await connectDB();

  const users = await User.find({})
    .select('name email role createdAt')
    .sort({ name: 1 })
    .lean();

  if (users.length === 0) {
    console.log('No registered users.');
  } else {
    console.log(`Registered users (${users.length}):\n`);
    users.forEach((u, i) => {
      const role = u.role || '(none)';
      const created = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '';
      console.log(`${i + 1}. ${u.name}  <${u.email}>  role: ${role}  created: ${created}`);
    });
  }

  await import('mongoose').then((m) => m.default.connection.close());
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
