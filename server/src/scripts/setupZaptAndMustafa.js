/**
 * One-off setup:
 * 1. Rename the "Default" workspace to "Zapt's Workspace"
 * 2. Create users mustafa@kaynak.app and editor@kaynak.local (password: 12341234)
 * 3. Create a personal workspace for Mustafa and add them as owner
 * 4. Add mustafa@kaynak.app and editor@kaynak.local to Zapt's Workspace as owners
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

  // 1. Find Zapt's Workspace: rename "Default" if present, or use existing "Zapt's Workspace"
  const ZAPTS_NAME = "Zapt's Workspace";
  let zaptsWorkspace = await Workspace.findOne({ name: 'Default' });
  if (zaptsWorkspace) {
    zaptsWorkspace.name = ZAPTS_NAME;
    await zaptsWorkspace.save();
    console.log("Renamed workspace to Zapt's Workspace (slug:", zaptsWorkspace.slug + ')');
  } else {
    zaptsWorkspace = await Workspace.findOne({ name: ZAPTS_NAME });
    if (!zaptsWorkspace) {
      console.error('No workspace named "Default" or "Zapt\'s Workspace" found. Run migrateToWorkspaces.js first.');
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log("Using existing Zapt's Workspace (slug:", zaptsWorkspace.slug + ')');
  }

  const zaptsWorkspaceId = zaptsWorkspace._id;

  // 2. Create users mustafa@kaynak.app and editor@kaynak.local
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

  let editor = await User.findOne({ email: 'editor@kaynak.local' });
  if (editor) {
    console.log('User editor@kaynak.local already exists.');
  } else {
    editor = await User.create({
      email: 'editor@kaynak.local',
      password: '12341234',
      name: 'Editor',
    });
    console.log('Created user editor@kaynak.local');
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

  // 4. Add mustafa@kaynak.app and editor@kaynak.local to Zapt's Workspace as owners
  for (const { user, email } of [
    { user: mustafa, email: 'mustafa@kaynak.app' },
    { user: editor, email: 'editor@kaynak.local' },
  ]) {
    const existing = await WorkspaceMember.findOne({
      workspaceId: zaptsWorkspaceId,
      userId: user._id,
    });
    if (!existing) {
      await WorkspaceMember.create({
        workspaceId: zaptsWorkspaceId,
        userId: user._id,
        role: 'owner',
      });
      console.log("Added", email, "to Zapt's Workspace as owner.");
    } else if (existing.role !== 'owner') {
      existing.role = 'owner';
      await existing.save();
      console.log("Updated", email, "to owner of Zapt's Workspace.");
    } else {
      console.log(email, "is already an owner of Zapt's Workspace.");
    }
  }

  console.log('Done.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
