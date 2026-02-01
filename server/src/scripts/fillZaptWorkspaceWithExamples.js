/**
 * Fill Zapt's Workspace with example stories and pieces.
 * Run once after setupZaptAndMustafa.js (or whenever the workspace exists).
 *
 * Run from repo root: node server/src/scripts/fillZaptWorkspaceWithExamples.js
 * (or from server: node src/scripts/fillZaptWorkspaceWithExamples.js)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import mongoose from 'mongoose';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import Story from '../models/Story.js';
import Piece from '../models/Piece.js';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'newsroom_production';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

const EXAMPLE_STORIES = [
  {
    headline: 'Climate report findings',
    description:
      'Analysis of the latest climate report and implications for local policy. We need at least a few sentences so the description feels realistic for the story model.',
    state: 'idea',
  },
  {
    headline: 'City council budget review',
    description:
      'Coverage of the upcoming city council budget review session and key figures. This example shows a story in research so the board has variety.',
    state: 'research',
  },
  {
    headline: 'Local sports roundup',
    description:
      'Weekly roundup of local sports events and results. Description meets the minimum length and gives context for this scripting-stage story.',
    state: 'scripting',
  },
  {
    headline: 'Interview: Healthcare workers',
    description:
      'Interviews with frontline healthcare workers about conditions and challenges. Example story in multimedia stage for the Kanban board.',
    state: 'multimedia',
  },
  {
    headline: 'Housing affordability series',
    description:
      'First piece in a series on housing affordability and rent trends in the region. Used here as a finalization-stage example.',
    state: 'finalization',
  },
  {
    headline: 'Week in review',
    description:
      "Summary of the week's top stories and upcoming coverage. This one is published so the board shows a full workflow.",
    state: 'published',
  },
  {
    headline: 'Election night live blog',
    description:
      'Archived example of a past election night live blog. Kept for reference and to show the archived column on the board.',
    state: 'archived',
  },
];

function pickCreatedBy(members, userIds) {
  const owner = members.find((m) => m.role === 'owner');
  if (owner) return owner.userId;
  if (members.length) return members[0].userId;
  return userIds[0] || null;
}

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });

  const workspace = await Workspace.findOne({ name: "Zapt's Workspace" });
  if (!workspace) {
    console.error("No workspace named \"Zapt's Workspace\" found. Run setupZaptAndMustafa.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const workspaceId = workspace._id;
  const members = await WorkspaceMember.find({ workspaceId }).lean();
  const userIds = await User.find().select('_id').limit(10).lean().then((docs) => docs.map((d) => d._id));
  const createdBy = pickCreatedBy(members, userIds);

  if (!createdBy) {
    console.error('No user found to set as createdBy. Add at least one member to Zapt\'s Workspace or create a user.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const now = new Date();

  // Create stories
  const storyIds = [];
  for (const ex of EXAMPLE_STORIES) {
    const isWorkflow = ex.state !== 'idea';
    const story = await Story.create({
      workspaceId,
      headline: ex.headline,
      description: ex.description,
      state: ex.state,
      createdBy,
      approved: isWorkflow,
      approvedBy: isWorkflow ? createdBy : null,
      approvedAt: isWorkflow ? now : null,
      stateChangedAt: isWorkflow ? now : null,
      stateHistory: isWorkflow
        ? [{ state: ex.state, enteredAt: now, exitedAt: null, durationDays: null }]
        : [],
      ...(ex.state === 'published' && { publishedAt: now }),
      ...(ex.state === 'archived' && { archivedAt: now }),
    });
    storyIds.push(story._id);
  }
  console.log('Created', storyIds.length, 'example stories in Zapt\'s Workspace.');

  // Create pieces linked to some of the stories
  const pieceSpecs = [
    { headline: 'Climate report – 60s explainer', format: 'youtube', state: 'scripting', storyIndex: 0 },
    { headline: 'Council budget – Reels cut', format: 'instagram_reels', state: 'multimedia', storyIndex: 1 },
    { headline: 'Sports roundup – TikTok', format: 'tiktok', state: 'finalization', storyIndex: 2 },
    { headline: 'Healthcare interview – long read', format: 'article', state: 'published', storyIndex: 3 },
    { headline: 'Housing series – podcast teaser', format: 'other', state: 'scripting', storyIndex: 4 },
  ];

  for (const spec of pieceSpecs) {
    const storyId = storyIds[spec.storyIndex];
    const isApproved = spec.state !== 'scripting';
    await Piece.create({
      workspaceId,
      linkedStoryIds: [storyId],
      createdFromStoryId: storyId,
      format: spec.format,
      headline: spec.headline,
      state: spec.state,
      createdBy,
      approved: isApproved,
      approvedBy: isApproved ? createdBy : null,
      approvedAt: isApproved ? now : null,
    });
  }
  console.log('Created', pieceSpecs.length, 'example pieces in Zapt\'s Workspace.');

  console.log('Done. Open the Board and Ideas Inbox for Zapt\'s Workspace to see the content.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
