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

// Story states: idea | visible | archived
const EXAMPLE_STORIES = [
  { headline: 'Climate report findings', description: 'Analysis of the latest climate report and implications for local policy. We need at least a few sentences so the description feels realistic for the story model.', state: 'idea' },
  { headline: 'City council budget review', description: 'Coverage of the upcoming city council budget review session and key figures. This example shows a visible story so the board has variety.', state: 'visible' },
  { headline: 'Local sports roundup', description: 'Weekly roundup of local sports events and results. Description meets the minimum length and gives context for this story.', state: 'visible' },
  { headline: 'Interview: Healthcare workers', description: 'Interviews with frontline healthcare workers about conditions and challenges. Example story for the Kanban board.', state: 'visible' },
  { headline: 'Housing affordability series', description: 'First piece in a series on housing affordability and rent trends in the region. Used here as an example.', state: 'visible' },
  { headline: 'Week in review', description: "Summary of the week's top stories and upcoming coverage. This one is visible so the board shows workflow.", state: 'visible' },
  { headline: 'Election night live blog', description: 'Archived example of a past election night live blog. Kept for reference and to show the archived column on the board.', state: 'archived' },
  { headline: 'School board referendum', description: 'Coverage of the upcoming school board referendum and impact on local districts. Research and community reaction.', state: 'visible' },
  { headline: 'Summer festival preview', description: 'Preview of the annual summer festival lineup, vendors, and schedule. Scripting in progress for multiple formats.', state: 'visible' },
  { headline: 'Small business recovery', description: 'Feature on how small businesses are recovering post-pandemic. Multimedia production with video and article.', state: 'visible' },
  { headline: 'Traffic safety campaign', description: 'Public awareness campaign on traffic safety and new speed limits. Final edits before publication.', state: 'visible' },
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

  // Create stories (state: idea | visible | archived; single ownerId)
  const storyIds = [];
  for (const ex of EXAMPLE_STORIES) {
    const isVisibleOrArchived = ex.state === 'visible' || ex.state === 'archived';
    const story = await Story.create({
      workspaceId,
      headline: ex.headline,
      description: ex.description,
      state: ex.state,
      ownerId: createdBy,
      createdBy,
      approved: isVisibleOrArchived,
      approvedBy: isVisibleOrArchived ? createdBy : null,
      approvedAt: isVisibleOrArchived ? now : null,
      stateChangedAt: isVisibleOrArchived ? now : null,
      stateHistory: isVisibleOrArchived ? [{ state: ex.state, enteredAt: now, exitedAt: null, durationDays: null }] : [],
      ...(ex.state === 'visible' && { publishedAt: now }),
      ...(ex.state === 'archived' && { archivedAt: now }),
    });
    storyIds.push(story._id);
  }
  console.log('Created', storyIds.length, 'example stories in Zapt\'s Workspace.');

  // Helper: date N days from now (noon UTC for consistent display)
  const daysFromNow = (days) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(12, 0, 0, 0);
    return d;
  };

  // Create pieces linked to some of the stories (deadline: days from now, null = no deadline)
  const pieceSpecs = [
    { headline: 'Climate report – 60s explainer', format: 'youtube', state: 'scripting', storyIndex: 0, deadlineDays: 3 },
    { headline: 'Council budget – Reels cut', format: 'instagram_reels', state: 'multimedia', storyIndex: 1, deadlineDays: 1 },
    { headline: 'Sports roundup – TikTok', format: 'tiktok', state: 'finalization', storyIndex: 2, deadlineDays: 2 },
    { headline: 'Healthcare interview – long read', format: 'article', state: 'published', storyIndex: 3, deadlineDays: null },
    { headline: 'Housing series – podcast teaser', format: 'other', state: 'scripting', storyIndex: 4, deadlineDays: 5 },
    { headline: 'School referendum – explainer video', format: 'youtube', state: 'scripting', storyIndex: 7, deadlineDays: 7 },
    { headline: 'School referendum – social clips', format: 'instagram_reels', state: 'scripting', storyIndex: 7, deadlineDays: 6 },
    { headline: 'Summer festival – TikTok teaser', format: 'tiktok', state: 'multimedia', storyIndex: 8, deadlineDays: 4 },
    { headline: 'Summer festival – article', format: 'article', state: 'scripting', storyIndex: 8, deadlineDays: 10 },
    { headline: 'Small business – video feature', format: 'youtube', state: 'finalization', storyIndex: 9, deadlineDays: 2 },
    { headline: 'Small business – Instagram carousel', format: 'instagram_reels', state: 'multimedia', storyIndex: 9, deadlineDays: 3 },
    { headline: 'Traffic safety – PSA video', format: 'youtube', state: 'finalization', storyIndex: 10, deadlineDays: 1 },
    { headline: 'Traffic safety – newsletter blurb', format: 'article', state: 'scripting', storyIndex: 10, deadlineDays: 4 },
  ];

  for (const spec of pieceSpecs) {
    const storyId = storyIds[spec.storyIndex];
    const isApproved = spec.state !== 'scripting';
    const deadline = spec.deadlineDays != null ? daysFromNow(spec.deadlineDays) : null;
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
      ...(deadline && { deadline }),
    });
  }
  console.log('Created', pieceSpecs.length, 'example pieces in Zapt\'s Workspace (many with deadlines).');

  console.log('Done. Open the Board and Ideas Inbox for Zapt\'s Workspace to see the content.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
