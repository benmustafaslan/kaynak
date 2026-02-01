/**
 * Deletes script version documents that have both storyId and outputId null.
 * These can cause "E11000 duplicate key" errors. Safe to run anytime.
 *
 * Run from project root (uses MONGODB_URI from .env):
 *   node server/src/scripts/deleteOrphanScriptVersions.js
 *
 * If the error is from production (e.g. newsroom_production), run against
 * the production database by setting MONGODB_URI when you run:
 *   MONGODB_URI="mongodb+srv://user:pass@cluster.../newsroom_production" node server/src/scripts/deleteOrphanScriptVersions.js
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import ScriptVersion from '../models/ScriptVersion.js';

async function run() {
  await connectDB();

  const dbName = mongoose.connection.db?.databaseName || 'unknown';
  console.log('Connected to database:', dbName);

  // 1) Delete any orphan: storyId null and (outputId null or missing) - use raw to catch missing field
  const orphanResult = await ScriptVersion.collection.deleteMany({
    storyId: null,
    $or: [{ outputId: null }, { outputId: { $exists: false } }],
  });
  if (orphanResult.deletedCount > 0) {
    console.log('Deleted', orphanResult.deletedCount, 'orphan(s) (storyId null, outputId null/missing).');
  }

  // 2) Drop and recreate the story index so it's rebuilt from current data only (clears stale entries)
  try {
    await ScriptVersion.collection.dropIndex('storyId_1_version_1');
    console.log('Dropped index storyId_1_version_1.');
  } catch (e) {
    if (e.code === 27 || e.codeName === 'IndexNotFound') {
      console.log('Index storyId_1_version_1 did not exist (ok).');
    } else throw e;
  }
  await ScriptVersion.collection.createIndex(
    { storyId: 1, version: 1 },
    { unique: true, partialFilterExpression: { outputId: null } }
  );
  console.log('Recreated index storyId_1_version_1.');

  console.log('Done. The E11000 duplicate key error should be gone.');

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
