/**
 * Migration: create default workspace, assign all existing stories and pieces to it,
 * and add all existing users as workspace members (role: editor).
 * Workspace slug is a random string (not derived from name).
 *
 * Run from server directory: node src/scripts/migrateToWorkspaces.js
 * Requires MONGODB_URI and MONGODB_DB_NAME in .env (or parent .env).
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'newsroom_production';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment');
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
  const db = mongoose.connection.db;

  const Workspace = mongoose.connection.collection('workspaces');
  const WorkspaceMember = mongoose.connection.collection('workspacemembers');
  const Story = mongoose.connection.collection('stories');
  const Piece = mongoose.connection.collection('outputs'); // pieces are in 'outputs' collection
  const User = mongoose.connection.collection('users');

  const defaultName = 'Default';

  // Check if a default-named workspace already exists (legacy or re-run)
  const existing = await Workspace.findOne({ name: defaultName });
  if (existing) {
    console.log('Default workspace already exists. Skipping migration.');
    await mongoose.disconnect();
    process.exit(0);
  }

  let slug = randomSlug();
  while (await Workspace.findOne({ slug })) {
    slug = randomSlug();
  }

  const workspaceResult = await Workspace.insertOne({
    name: defaultName,
    slug,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const workspaceId = workspaceResult.insertedId;
  console.log('Created default workspace:', workspaceId.toString(), 'slug:', slug);

  const users = await User.find({}).toArray();
  for (const user of users) {
    await WorkspaceMember.insertOne({
      workspaceId,
      userId: user._id,
      role: 'editor',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log('Added', users.length, 'users as workspace members');

  const storyResult = await Story.updateMany(
    { $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
    { $set: { workspaceId } }
  );
  console.log('Updated', storyResult.modifiedCount, 'stories with workspaceId');

  const pieceResult = await Piece.updateMany(
    { $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
    { $set: { workspaceId } }
  );
  console.log('Updated', pieceResult.modifiedCount, 'pieces with workspaceId');

  console.log('Migration complete.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
