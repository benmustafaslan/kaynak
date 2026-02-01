import mongoose from 'mongoose';
import { WORKSPACE_MEMBER_ROLES } from './WorkspaceMember.js';

const INVITE_EXPIRY_DAYS = 7;

const workspaceInviteSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    token: { type: String, required: true, unique: true },
    role: { type: String, required: true, enum: WORKSPACE_MEMBER_ROLES, default: 'editor' },
    expiresAt: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// token already has unique: true above, which creates the index
workspaceInviteSchema.index({ workspaceId: 1 });
workspaceInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL optional: auto-delete expired

const WorkspaceInvite = mongoose.model('WorkspaceInvite', workspaceInviteSchema);
export default WorkspaceInvite;
export { INVITE_EXPIRY_DAYS };
