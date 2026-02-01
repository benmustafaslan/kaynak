/**
 * Finds stories that share the same headline (duplicate DB docs).
 * Use after re-running seed without clearing to see why you see "two of each".
 *
 * Options:
 *   --remove  Delete duplicate docs, keeping one per headline (oldest createdAt).
 *
 * Run: node server/src/scripts/findDuplicateStories.js
 *      node server/src/scripts/findDuplicateStories.js --remove
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Story from '../models/Story.js';

async function run() {
  await connectDB();

  const stories = await Story.find({ deletedAt: null })
    .sort({ headline: 1, createdAt: 1 })
    .select('_id headline createdAt kind')
    .lean();

  // Group by normalized headline (trim + lowercase)
  const byHeadline = new Map();
  for (const s of stories) {
    const key = (s.headline || '').trim().toLowerCase();
    if (!key) continue;
    if (!byHeadline.has(key)) byHeadline.set(key, []);
    byHeadline.get(key).push(s);
  }

  const duplicates = [...byHeadline.entries()].filter(([, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log('No duplicate headlines found. Each story has a unique headline.');
    await mongoose.connection.close();
    process.exit(0);
    return;
  }

  console.log(`Found ${duplicates.length} headline(s) with multiple stories:\n`);
  for (const [headline, list] of duplicates) {
    console.log(`  "${list[0].headline}" (${list.length} docs):`);
    for (const s of list) {
      console.log(`    - _id: ${s._id}  createdAt: ${s.createdAt}  kind: ${s.kind ?? 'story'}`);
    }
    console.log('');
  }

  const remove = process.argv.includes('--remove');
  if (!remove) {
    console.log('To delete duplicate docs (keep oldest per headline), run:');
    console.log('  node server/src/scripts/findDuplicateStories.js --remove\n');
    console.log('Or clear all seed data and re-seed once: npm run seed:clear && npm run seed:stories');
    await mongoose.connection.close();
    process.exit(0);
    return;
  }

  let deleted = 0;
  for (const [, list] of duplicates) {
    // Keep the first (oldest createdAt); delete the rest
    const toKeep = list[0]._id;
    const toDelete = list.slice(1).map((s) => s._id);
    const result = await Story.deleteMany({ _id: { $in: toDelete } });
    deleted += result.deletedCount;
  }
  console.log(`Removed ${deleted} duplicate story document(s). One per headline kept.`);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
