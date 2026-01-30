import mongoose from 'mongoose';

const factCheckCommentSchema = new mongoose.Schema(
  {
    factCheckId: { type: mongoose.Schema.Types.ObjectId, ref: 'FactCheck', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: [String],
  },
  { timestamps: true }
);

factCheckCommentSchema.index({ factCheckId: 1 });

const FactCheckComment = mongoose.model('FactCheckComment', factCheckCommentSchema);
export default FactCheckComment;
