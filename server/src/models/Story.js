import mongoose from 'mongoose';

const deadlineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  notifications: {
    hours_24: { type: Boolean, default: false },
    hours_1: { type: Boolean, default: false },
  },
  completed: { type: Boolean, default: false },
}, { _id: false });

const checklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { _id: false });

const teamMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
}, { _id: false });

const stateHistoryEntrySchema = new mongoose.Schema(
  {
    state: { type: String, required: true },
    enteredAt: { type: Date, required: true },
    exitedAt: { type: Date, default: null },
    durationDays: { type: Number, default: null },
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
    headline: { type: String, required: true, trim: true, maxlength: 500 },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50000,
    },
    state: {
      type: String,
      enum: ['idea', 'research', 'scripting', 'multimedia', 'finalization', 'published', 'archived'],
      default: 'idea',
    },
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    parkedUntil: { type: Date, default: null },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', default: null },
    producer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    editors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teamMembers: [teamMemberSchema],
    deadlines: [deadlineSchema],
    currentScriptVersion: { type: Number, default: 0 },
    researchNotes: { type: String, default: '' },
    categories: [String],
    checklist: [checklistItemSchema],
    seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', default: null },
    useSeriesResources: { type: Boolean, default: false },
    // Parent story (package) grouping: child stories reference parent; parent holds childOrder
    kind: { type: String, enum: ['story', 'parent'], default: 'story' },
    parentStoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null },
    childOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    archivedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    // Workflow tracking
    stateChangedAt: { type: Date, default: null },
    stateHistory: [stateHistoryEntrySchema],
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String, default: null },
    blockedAt: { type: Date, default: null },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
    cycleTimeDays: { type: Number, default: null },
  },
  { timestamps: true }
);

storySchema.index({ state: 1, deletedAt: 1 });
storySchema.index({ approved: 1, state: 1, deletedAt: 1 });
storySchema.index({ createdBy: 1, deletedAt: 1 });
storySchema.index({ headline: 'text', description: 'text' });
storySchema.index({ deadlines: 1 });
storySchema.index({ categories: 1 });
storySchema.index({ parentStoryId: 1, deletedAt: 1 });
storySchema.index({ workspaceId: 1, deletedAt: 1 });

const Story = mongoose.model('Story', storySchema);
export default Story;
