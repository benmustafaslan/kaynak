import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';

/**
 * Workspaces are strictly isolated: different teams and people use different workspaces.
 * Data must never be linked or visible across workspaces. All workspace-scoped queries
 * must filter by workspaceId only (no shared "null" or cross-workspace visibility).
 */

/**
 * Requires X-Workspace-Id header. Resolves workspace and ensures req.user is a member.
 * Sets req.workspaceId and req.workspace (and req.workspaceMember.role).
 * Use this for all routes that read/write workspace data; then filter strictly by req.workspaceId.
 */
export const requireWorkspace = async (req, res, next) => {
  try {
    const raw = req.headers['x-workspace-id'];
    const id = typeof raw === 'string' ? raw.trim() : null;
    if (!id) {
      return res.status(400).json({ error: 'X-Workspace-Id header is required' });
    }

    const workspace = await Workspace.findById(id).lean();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const membership = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      userId: req.user._id,
    }).lean();

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    req.workspaceId = workspace._id;
    req.workspace = workspace;
    req.workspaceMember = membership;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional workspace: if X-Workspace-Id is present, resolve and set req.workspaceId/req.workspace
 * only when user is a member. Otherwise continue without workspace (e.g. for /workspaces list).
 */
export const optionalWorkspace = async (req, res, next) => {
  try {
    const raw = req.headers['x-workspace-id'];
    const id = typeof raw === 'string' ? raw.trim() : null;
    if (!id) {
      return next();
    }

    const workspace = await Workspace.findById(id).lean();
    if (!workspace) {
      return next();
    }

    const membership = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      userId: req.user._id,
    }).lean();

    if (!membership) {
      return next();
    }

    req.workspaceId = workspace._id;
    req.workspace = workspace;
    req.workspaceMember = membership;
    next();
  } catch (err) {
    next(err);
  }
};
