/**
 * One-time migration: copy Output.storyId -> linkedStoryIds and createdFromStoryId, then remove storyId.
 * Run from project root: node server/src/scripts/migrateOutputsToLinkedStories.js
 * (Ensure .env is loaded or set MONGODB_URI.)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import mongoose from 'mongoose';
import connectDB from '../config/database.js';

async function run() {
  await connectDB();
  const coll = mongoose.connection.db.collection('outputs');
  const withStoryId = await coll.find({ storyId: { $exists: true } }).toArray();
  if (withStoryId.length === 0) {
    console.log('No outputs with storyId found. Nothing to migrate.');
    process.exit(0);
    return;
  }
  console.log(`Migrating ${withStoryId.length} output(s)...`);
  for (const doc of withStoryId) {
    const storyId = doc.storyId;
    const id = doc._id;
    await coll.updateOne(
      { _id: id },
      {
        $set: {
          linkedStoryIds: [storyId],
          createdFromStoryId: storyId,
        },
        $unset: { storyId: '' },
      }
    );
    console.log(`  Migrated output ${id}`);
  }
  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
