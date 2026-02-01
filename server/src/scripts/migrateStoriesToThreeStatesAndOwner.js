/**
 * Migrate stories to 3 states (idea, visible, archived) and single ownerId.
 * - Map state: idea→idea, archived→archived, research/scripting/multimedia/finalization/published→visible
 * - Set ownerId = producer || createdBy (then remove producer, editors, teamMembers)
 * - Optionally copy story producer/editors to linked pieces (one story per piece) for existing pieces
 *
 * Run from repo root: node server/src/scripts/migrateStoriesToThreeStatesAndOwner.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import mongoose from 'mongoose';
import Story from '../models/Story.js';
import Piece from '../models/Piece.js';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'newsroom_production';

function mapState(oldState) {
  if (!oldState || typeof oldState !== 'string') return 'idea';
  const s = oldState.toLowerCase();
  if (s === 'idea' || s === 'archived') return s;
  return 'visible';
}

async function run() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });

  const stories = await Story.find({}).lean();
  let updatedStories = 0;
  let updatedPieces = 0;

  for (const story of stories) {
    const newState = mapState(story.state);
    const ownerId = story.producer || story.createdBy || story.ownerId;
    const updates = {
      state: newState,
      ownerId: ownerId || null,
      $unset: {},
    };
    if (story.producer !== undefined) updates.$unset.producer = 1;
    if (story.editors !== undefined) updates.$unset.editors = 1;
    if (story.teamMembers !== undefined) updates.$unset.teamMembers = 1;
    if (Object.keys(updates.$unset).length === 0) delete updates.$unset;

    if (story.state !== newState || String(story.ownerId || '') !== String(ownerId || '') || updates.$unset) {
      await Story.updateOne(
        { _id: story._id },
        updates.$unset ? { $set: { state: newState, ownerId: ownerId || null }, $unset: updates.$unset } : { $set: { state: newState, ownerId: ownerId || null } }
      );
      updatedStories++;
    }

    // Optionally copy story roles to pieces linked only to this story (so "my pieces" still works)
    const pieces = await Piece.find({ linkedStoryIds: story._id }).lean();
    for (const piece of pieces) {
      const linkedIds = piece.linkedStoryIds || [];
      if (linkedIds.length !== 1 || String(linkedIds[0]) !== String(story._id)) continue;
      const hasRoles = piece.producer != null || (piece.editors && piece.editors.length) || (piece.teamMembers && piece.teamMembers.length);
      if (hasRoles) continue;
      const pieceUpdates = {};
      if (story.producer) pieceUpdates.producer = story.producer;
      if (story.editors && story.editors.length) pieceUpdates.editors = story.editors;
      if (story.teamMembers && story.teamMembers.length) pieceUpdates.teamMembers = story.teamMembers;
      if (Object.keys(pieceUpdates).length) {
        await Piece.updateOne({ _id: piece._id }, { $set: pieceUpdates });
        updatedPieces++;
      }
    }
  }

  console.log('Stories updated:', updatedStories, '/', stories.length);
  console.log('Pieces updated with roles from story:', updatedPieces);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
