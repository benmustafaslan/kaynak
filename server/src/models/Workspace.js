import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 64 },
  },
  { timestamps: true }
);

workspaceSchema.index({ slug: 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
