import crypto from 'crypto';
import mongoose from 'mongoose';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import WorkspaceInvite, { INVITE_EXPIRY_DAYS } from '../models/WorkspaceInvite.js';
import Story from '../models/Story.js';
import Piece from '../models/Piece.js';
import ScriptVersion from '../models/ScriptVersion.js';
import FactCheck from '../models/FactCheck.js';
import FactCheckComment from '../models/FactCheckComment.js';
import StoryComment from '../models/StoryComment.js';
import ActivityLog from '../models/ActivityLog.js';
import { env } from '../config/env.js';

/** Generate a URL-safe random slug (lowercase alphanumeric + hyphen/underscore). */
function generateRandomSlug(length = 12) {
  return crypto
    .randomBytes(Math.ceil((length * 3) / 4))
    .toString('base64url')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, length) || crypto.randomBytes(8).toString('hex');
}

/** GET /workspaces – list workspaces the current user is a member of */
export const listMine = async (req, res, next) => {
  try {
    const memberships = await WorkspaceMember.find({ userId: req.user._id })
      .populate('workspaceId')
      .lean();
    const workspaces = memberships
      .map((m) => m.workspaceId)
      .filter(Boolean)
      .map((w) => ({
        _id: w._id,
        name: w.name,
        slug: w.slug,
        role: memberships.find((m) => m.workspaceId?._id?.toString() === w._id?.toString())?.role,
        createdAt: w.createdAt,
      }));
    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
};

/** GET /workspaces/by-slug/:slug – get workspace by slug (for resolving current workspace in UI) */
export const getBySlug = async (req, res, next) => {
  try {
    const slug = (req.params.slug || '').trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }
    const workspace = await Workspace.findOne({ slug }).lean();
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
    res.json({
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        role: membership.role,
        createdAt: workspace.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /workspaces/:id – get workspace by id (must be member) */
export const getById = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id).lean();
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
    res.json({
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        role: membership.role,
        createdAt: workspace.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** POST /workspaces – create workspace and add current user as owner */
export const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    const nameStr = typeof name === 'string' ? name.trim().slice(0, 200) : '';
    if (!nameStr) {
      return res.status(400).json({ error: 'Name is required' });
    }

    let slug = generateRandomSlug();
    while (await Workspace.findOne({ slug })) {
      slug = generateRandomSlug();
    }

    const workspace = await Workspace.create({ name: nameStr, slug });
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: req.user._id,
      role: 'owner',
    });

    const populated = await Workspace.findById(workspace._id).lean();
    res.status(201).json({
      workspace: {
        _id: populated._id,
        name: populated.name,
        slug: populated.slug,
        role: 'owner',
        createdAt: populated.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /workspaces/:id/members – list members (must be member of workspace) */
export const listMembers = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const myMembership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id,
    }).lean();
    if (!myMembership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    const members = await WorkspaceMember.find({ workspaceId })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    const list = members.map((m) => ({
      _id: m._id,
      userId: m.userId?._id,
      name: m.userId?.name,
      email: m.userId?.email,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    res.json({ members: list });
  } catch (err) {
    next(err);
  }
};

/** PATCH /workspaces/:id/members/:userId – update a member's role (owner only) */
export const updateMemberRole = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const targetUserId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(workspaceId) || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'Invalid workspace or user id' });
    }
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const myMembership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id,
    }).lean();
    if (!myMembership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }
    if (myMembership.role !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owners can change member roles' });
    }
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }
    const newRole = req.body.role && ['owner', 'admin', 'editor', 'viewer'].includes(req.body.role)
      ? req.body.role
      : null;
    if (!newRole) {
      return res.status(400).json({ error: 'Valid role is required (owner, admin, editor, viewer)' });
    }
    const targetMembership = await WorkspaceMember.findOne({
      workspaceId,
      userId: targetUserId,
    });
    if (!targetMembership) {
      return res.status(404).json({ error: 'User is not a member of this workspace' });
    }
    targetMembership.role = newRole;
    await targetMembership.save();
    res.json({ member: { userId: targetMembership.userId, role: targetMembership.role } });
  } catch (err) {
    next(err);
  }
};

/** GET /workspaces/:id/invite – get current (latest non-expired) invite link (owner or admin only) */
export const getCurrentInvite = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id,
    }).lean();
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Only owners and admins can view the invite link' });
    }
    const now = new Date();
    const invite = await WorkspaceInvite.findOne({
      workspaceId,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();
    if (!invite) {
      return res.status(404).json({ error: 'No invite link yet. Create one below.' });
    }
    const inviteLink = `${env.clientUrl}/w/join?token=${invite.token}`;
    res.json({ inviteLink, token: invite.token, expiresAt: invite.expiresAt, role: invite.role });
  } catch (err) {
    next(err);
  }
};

/** POST /workspaces/:id/invites – create invite link (owner or admin only) */
export const createInvite = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id,
    }).lean();
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can create invites' });
    }
    const role = req.body.role && ['owner', 'admin', 'editor', 'viewer'].includes(req.body.role)
      ? req.body.role
      : 'editor';
    if (role === 'owner' && membership.role !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owners can invite new owners' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
    await WorkspaceInvite.create({
      workspaceId,
      token,
      role,
      expiresAt,
      createdBy: req.user._id,
    });
    const inviteLink = `${env.clientUrl}/w/join?token=${token}`;
    res.status(201).json({ inviteLink, token, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    next(err);
  }
};

/** DELETE /workspaces/:id – delete workspace and all its data (owner only) */
export const remove = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace id' });
    }
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id,
    }).lean();
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }
    if (membership.role !== 'owner') {
      return res.status(403).json({ error: 'Only the workspace owner can delete it' });
    }

    const storyIds = await Story.find({ workspaceId }).distinct('_id');
    const pieceIds = await Piece.find({ workspaceId }).distinct('_id');

    const factCheckIds = await FactCheck.find({
      $or: [{ storyId: { $in: storyIds } }, { outputId: { $in: pieceIds } }],
    }).distinct('_id');
    await FactCheckComment.deleteMany({ factCheckId: { $in: factCheckIds } });
    await FactCheck.deleteMany({ _id: { $in: factCheckIds } });

    await ScriptVersion.deleteMany({
      $or: [{ storyId: { $in: storyIds } }, { outputId: { $in: pieceIds } }],
    });
    await StoryComment.deleteMany({ storyId: { $in: storyIds } });
    await ActivityLog.deleteMany({ storyId: { $in: storyIds } });
    await Piece.deleteMany({ workspaceId });
    await Story.deleteMany({ workspaceId });
    await WorkspaceInvite.deleteMany({ workspaceId });
    await WorkspaceMember.deleteMany({ workspaceId });
    await Workspace.findByIdAndDelete(workspaceId);

    res.status(200).json({ deleted: true });
  } catch (err) {
    next(err);
  }
};
