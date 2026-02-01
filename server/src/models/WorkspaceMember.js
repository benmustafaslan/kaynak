import mongoose from 'mongoose';

const ROLES = ['owner', 'admin', 'editor', 'viewer'];
const STATUSES = ['active', 'pending']; // pending = joined via invite, awaiting owner approval

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true, enum: ROLES, default: 'editor' },
    status: { type: String, required: true, enum: STATUSES, default: 'active' },
  },
  { timestamps: true }
);

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
workspaceMemberSchema.index({ userId: 1 });

const WorkspaceMember = mongoose.model('WorkspaceMember', workspaceMemberSchema);
export default WorkspaceMember;
export { ROLES as WORKSPACE_MEMBER_ROLES, STATUSES as WORKSPACE_MEMBER_STATUSES };
