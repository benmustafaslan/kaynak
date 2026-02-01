import WorkspaceInvite from '../models/WorkspaceInvite.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';

/** POST /invites/accept – accept invite by token, add current user to workspace */
export const accept = async (req, res, next) => {
  try {
    const token = (req.body.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const invite = await WorkspaceInvite.findOne({ token }).lean();
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found or expired' });
    }
    if (new Date() > new Date(invite.expiresAt)) {
      await WorkspaceInvite.deleteOne({ _id: invite._id });
      return res.status(410).json({ error: 'Invite has expired' });
    }
    const existing = await WorkspaceMember.findOne({
      workspaceId: invite.workspaceId,
      userId: req.user._id,
    });
    if (existing) {
      await WorkspaceInvite.deleteOne({ _id: invite._id });
      const workspace = await Workspace.findById(invite.workspaceId).lean();
      return res.json({
        workspace: {
          _id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
          role: existing.role,
        },
        alreadyMember: true,
      });
    }
    await WorkspaceMember.create({
      workspaceId: invite.workspaceId,
      userId: req.user._id,
      role: invite.role,
    });
    await WorkspaceInvite.deleteOne({ _id: invite._id });
    const workspace = await Workspace.findById(invite.workspaceId).lean();
    res.json({
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        role: invite.role,
      },
      alreadyMember: false,
    });
  } catch (err) {
    next(err);
  }
};
