import mongoose from 'mongoose';

const LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const scriptVersionSchema = new mongoose.Schema(
  {
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: false, default: null },
    outputId: { type: mongoose.Schema.Types.ObjectId, ref: 'Piece', default: null },
    version: { type: Number, required: true },
    content: { type: String, default: '' },
    wordCount: { type: Number, default: 0 },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    editedAt: { type: Date, default: null },
    locked: { type: Boolean, default: false },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lockedAt: { type: Date, default: null },
    lockExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

scriptVersionSchema.index({ storyId: 1, version: 1 }, { unique: true, partialFilterExpression: { outputId: null } });
scriptVersionSchema.index({ outputId: 1, version: 1 }, { unique: true, partialFilterExpression: { outputId: { $ne: null } } });

scriptVersionSchema.statics.isLockExpired = function (doc) {
  if (!doc?.locked || !doc.lockExpires) return true;
  return new Date() > doc.lockExpires;
};

const ScriptVersion = mongoose.model('ScriptVersion', scriptVersionSchema);
export default ScriptVersion;
export { LOCK_TIMEOUT_MS };
