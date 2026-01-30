import mongoose from 'mongoose';

const storyCommentSchema = new mongoose.Schema(
  {
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: true }
);

storyCommentSchema.index({ storyId: 1, createdAt: 1 });

const StoryComment = mongoose.model('StoryComment', storyCommentSchema);
export default StoryComment;
