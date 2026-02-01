import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 64 },
    /**
     * Optional per-workspace piece workflow. When null/empty, app uses default workflow.
     * Future: { key, label, order, showOnBoard }[]; validation and API will use this for state/labels.
     */
    pieceWorkflowStates: {
      type: [
        {
          key: { type: String, required: true, trim: true, maxlength: 64 },
          label: { type: String, required: true, trim: true, maxlength: 64 },
          order: { type: Number, default: 0 },
          showOnBoard: { type: Boolean, default: true },
        },
      ],
      default: undefined,
    },
  },
  { timestamps: true }
);

// slug already has unique: true above, which creates the index

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
