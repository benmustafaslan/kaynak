import mongoose from 'mongoose';
import { DEFAULT_PIECE_STATES, DEFAULT_BOARD_PIECE_STATES } from '../config/pieceWorkflow.js';

/** Default content formats; client may add custom types via Preferences. */
const CONTENT_FORMATS = ['youtube', 'instagram_reels', 'tiktok', 'article', 'other'];

const teamMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
}, { _id: false });

const pieceSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
    linkedStoryIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
      default: [],
    },
    createdFromStoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null },
    format: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    headline: { type: String, required: true, trim: true, maxlength: 500 },
    state: {
      type: String,
      enum: DEFAULT_PIECE_STATES,
      default: 'scripting',
    },
    currentScriptVersion: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    producer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    editors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teamMembers: [teamMemberSchema],
    // Ideas inbox: reject, park, approve (same semantics as Story ideas)
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    parkedUntil: { type: Date, default: null },
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    /** Single deadline (legacy); prefer deadlines by state when present. */
    deadline: { type: Date, default: null },
    /** Deadline per workflow state (keys from default or workspace workflow; e.g. Scripting, Production). */
    deadlines: {
      ...DEFAULT_BOARD_PIECE_STATES.reduce((acc, key) => {
        acc[key] = { type: Date, default: null };
        return acc;
      }, {}),
    },
  },
  { timestamps: true }
);

pieceSchema.index({ linkedStoryIds: 1 });
pieceSchema.index({ linkedStoryIds: 1, format: 1 });
pieceSchema.index({ state: 1 });
pieceSchema.index({ workspaceId: 1 });
pieceSchema.index({ workspaceId: 1, deadline: 1 });
pieceSchema.index({ producer: 1 });
pieceSchema.index({ editors: 1 });
pieceSchema.index({ 'teamMembers.userId': 1 });
// Index per board-state deadline for calendar/queries (default workflow; custom workflows later)
DEFAULT_BOARD_PIECE_STATES.forEach((key) => {
  pieceSchema.index({ workspaceId: 1, [`deadlines.${key}`]: 1 });
});

// Use 'outputs' collection for backward compatibility with existing data
const Piece = mongoose.model('Piece', pieceSchema, 'outputs');
export default Piece;
export { DEFAULT_PIECE_STATES as PIECE_STATES, CONTENT_FORMATS };
