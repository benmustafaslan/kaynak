import mongoose from 'mongoose';

const PIECE_STATES = ['scripting', 'multimedia', 'finalization', 'published', 'archived'];
/** Default content formats; client may add custom types via Preferences. */
const CONTENT_FORMATS = ['youtube', 'instagram_reels', 'tiktok', 'article', 'other'];

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
      enum: PIECE_STATES,
      default: 'scripting',
    },
    currentScriptVersion: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Ideas inbox: reject, park, approve (same semantics as Story ideas)
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    parkedUntil: { type: Date, default: null },
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

pieceSchema.index({ linkedStoryIds: 1 });
pieceSchema.index({ linkedStoryIds: 1, format: 1 });
pieceSchema.index({ state: 1 });
pieceSchema.index({ workspaceId: 1 });

// Use 'outputs' collection for backward compatibility with existing data
const Piece = mongoose.model('Piece', pieceSchema, 'outputs');
export default Piece;
export { PIECE_STATES, CONTENT_FORMATS };
