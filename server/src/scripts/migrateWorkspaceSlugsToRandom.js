/**
 * Migration: set all existing workspace slugs to unique random strings.
 * Run once to update workspaces that had name-based slugs (e.g. "default").
 *
 * Run from repo root: node server/src/scripts/migrateWorkspaceSlugsToRandom.js
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import mongoose from 'mongoose';
import Workspace from '../models/Workspace.js';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'newsroom_production';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

function randomSlug(length = 12) {
  return crypto
    .randomBytes(Math.ceil((length * 3) / 4))
    .toString('base64url')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, length) || crypto.randomBytes(8).toString('hex');
}

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });

  const workspaces = await Workspace.find({}).lean();
  const used = new Set(workspaces.map((w) => w.slug));

  for (const w of workspaces) {
    let slug = randomSlug();
    while (used.has(slug)) {
      slug = randomSlug();
    }
    used.add(slug);
    await Workspace.updateOne({ _id: w._id }, { $set: { slug } });
    console.log(`Updated workspace "${w.name}" (${w._id}): ${w.slug} → ${slug}`);
  }

  console.log('Done. All workspace slugs are now random strings.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
