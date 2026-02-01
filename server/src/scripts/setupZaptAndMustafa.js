/**
 * One-off setup:
 * 1. Rename the "Default" workspace to "Zapt's Workspace"
 * 2. Create user mustafa@kaynak.app (password: 12341234)
 * 3. Create a personal workspace for this user and add them as owner
 * 4. Add this user to Zapt's Workspace as a member
 *
 * Run from repo root: node server/src/scripts/setupZaptAndMustafa.js
 * (or from server: node src/scripts/setupZaptAndMustafa.js)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';

function randomSlug(length = 12) {
  return crypto
    .randomBytes(Math.ceil((length * 3) / 4))
    .toString('base64url')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, length) || crypto.randomBytes(8).toString('hex');
}

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'newsroom_production';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });

  // 1. Find workspace named "Default" and rename to Zapt's Workspace (slug unchanged)
  const defaultWs = await Workspace.findOne({ name: 'Default' });
  if (!defaultWs) {
    console.error('No workspace named "Default" found. Run migrateToWorkspaces.js first.');
    await mongoose.disconnect();
    process.exit(1);
  }
  defaultWs.name = "Zapt's Workspace";
  await defaultWs.save();
  console.log("Renamed workspace to Zapt's Workspace (slug:", defaultWs.slug + ')');

  const zaptsWorkspaceId = defaultWs._id;

  // 2. Create user mustafa@kaynak.app
  let mustafa = await User.findOne({ email: 'mustafa@kaynak.app' });
  if (mustafa) {
    console.log('User mustafa@kaynak.app already exists.');
  } else {
    mustafa = await User.create({
      email: 'mustafa@kaynak.app',
      password: '12341234',
      name: 'Mustafa',
    });
    console.log('Created user mustafa@kaynak.app');
  }

  // 3. Create personal workspace for Mustafa (random slug)
  const personalName = "Mustafa's Workspace";
  const existingPersonal = await WorkspaceMember.findOne({
    userId: mustafa._id,
    role: 'owner',
  }).populate('workspaceId');
  if (!existingPersonal?.workspaceId) {
    let personalSlug = randomSlug();
    while (await Workspace.findOne({ slug: personalSlug })) {
      personalSlug = randomSlug();
    }
    const personalWs = await Workspace.create({
      name: personalName,
      slug: personalSlug,
    });
    await WorkspaceMember.create({
      workspaceId: personalWs._id,
      userId: mustafa._id,
      role: 'owner',
    });
    console.log("Created personal workspace: Mustafa's Workspace (slug:", personalSlug + ')');
  } else {
    console.log("Personal workspace already exists.");
  }

  // 4. Invite Mustafa to Zapt's Workspace (add as member)
  const existingMember = await WorkspaceMember.findOne({
    workspaceId: zaptsWorkspaceId,
    userId: mustafa._id,
  });
  if (!existingMember) {
    await WorkspaceMember.create({
      workspaceId: zaptsWorkspaceId,
      userId: mustafa._id,
      role: 'editor',
    });
    console.log("Added mustafa@kaynak.app to Zapt's Workspace as editor.");
  } else {
    console.log("User is already a member of Zapt's Workspace.");
  }

  console.log('Done.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
