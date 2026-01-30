import Story from '../models/Story.js';
import ScriptVersion, { LOCK_TIMEOUT_MS } from '../models/ScriptVersion.js';
import { logActivity } from './activityLog.js';

function expireLockIfNeeded(doc) {
  if (ScriptVersion.isLockExpired(doc)) {
    doc.locked = false;
    doc.lockedBy = null;
    doc.lockedAt = null;
    doc.lockExpires = null;
    return true;
  }
  return false;
}

export const list = async (req, res, next) => {
  try {
    const versions = await ScriptVersion.find({ storyId: req.params.storyId })
      .sort({ version: -1 })
      .populate('editedBy', 'name email')
      .lean();
    res.json({ versions });
  } catch (err) {
    next(err);
  }
};

export const getCurrent = async (req, res, next) => {
  try {
    const story = await Story.findOne({ _id: req.params.storyId, deletedAt: null });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const version = await ScriptVersion.findOne({
      storyId: req.params.storyId,
      version: story.currentScriptVersion || 0,
    })
      .populate('lockedBy', 'name email')
      .lean();
    if (!version) {
      return res.json({ content: '', version: 0, locked: false });
    }
    const expired = ScriptVersion.isLockExpired(version);
    res.json({
      content: version.content,
      version: version.version,
      wordCount: version.wordCount,
      locked: version.locked && !expired,
      lockedBy: version.locked && !expired ? version.lockedBy : null,
      lockExpires: version.lockExpires,
      editedBy: version.editedBy,
      editedAt: version.editedAt,
    });
  } catch (err) {
    next(err);
  }
};

export const acquireLock = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const story = await Story.findOne({ _id: req.params.storyId, deletedAt: null });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    let current = await ScriptVersion.findOne({
      storyId: req.params.storyId,
      version: story.currentScriptVersion || 0,
    });
    if (!current) {
      current = await ScriptVersion.create({
        storyId: req.params.storyId,
        version: story.currentScriptVersion || 0,
        content: '',
        editedBy: userId,
        editedAt: new Date(),
      });
    }

    expireLockIfNeeded(current);
    if (current.locked && current.lockedBy.toString() !== userId.toString()) {
      return res.status(409).json({
        error: 'Script is being edited by someone else',
        lockedBy: await current.populate('lockedBy', 'name email').then((d) => d.lockedBy),
        lockExpires: current.lockExpires,
      });
    }

    current.locked = true;
    current.lockedBy = userId;
    current.lockedAt = new Date();
    current.lockExpires = new Date(Date.now() + LOCK_TIMEOUT_MS);
    await current.save();

    const populated = await ScriptVersion.findById(current._id)
      .populate('lockedBy', 'name email')
      .lean();
    res.json({
      locked: true,
      lockExpires: populated.lockExpires,
      lockedBy: populated.lockedBy,
    });
  } catch (err) {
    next(err);
  }
};

export const releaseLock = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const story = await Story.findOne({ _id: req.params.storyId, deletedAt: null });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const current = await ScriptVersion.findOne({
      storyId: req.params.storyId,
      version: story.currentScriptVersion || 0,
    });
    if (!current) {
      return res.json({ message: 'No lock to release' });
    }

    expireLockIfNeeded(current);
    if (current.locked && current.lockedBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You do not hold the lock' });
    }

    current.locked = false;
    current.lockedBy = null;
    current.lockedAt = null;
    current.lockExpires = null;
    await current.save();
    res.json({ message: 'Lock released' });
  } catch (err) {
    next(err);
  }
};

export const saveDraft = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { content } = req.body;
    const story = await Story.findOne({ _id: req.params.storyId, deletedAt: null });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    let current = await ScriptVersion.findOne({
      storyId: req.params.storyId,
      version: story.currentScriptVersion || 0,
    });
    if (!current) {
      current = await ScriptVersion.create({
        storyId: req.params.storyId,
        version: story.currentScriptVersion || 0,
        content: typeof content === 'string' ? content : '',
        wordCount: 0,
        editedBy: userId,
        editedAt: new Date(),
      });
      return res.json({ version: current.version, saved: true });
    }

    expireLockIfNeeded(current);
    if (current.locked && current.lockedBy.toString() !== userId.toString()) {
      return res.status(409).json({ error: 'Script is locked by another user' });
    }

    current.content = typeof content === 'string' ? content : current.content;
    current.wordCount = (current.content.match(/\S+/g) || []).length;
    current.editedBy = userId;
    current.editedAt = new Date();
    if (current.locked && current.lockedBy.toString() === userId.toString()) {
      current.lockExpires = new Date(Date.now() + LOCK_TIMEOUT_MS);
    }
    await current.save();
    res.json({ version: current.version, saved: true });
  } catch (err) {
    next(err);
  }
};

export const saveAsNewVersion = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { content } = req.body;
    const story = await Story.findOne({ _id: req.params.storyId, deletedAt: null });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const current = await ScriptVersion.findOne({
      storyId: req.params.storyId,
      version: story.currentScriptVersion || 0,
    });
    if (current) {
      current.locked = false;
      current.lockedBy = null;
      current.lockedAt = null;
      current.lockExpires = null;
      await current.save();
    }

    const newVersion = (story.currentScriptVersion || 0) + 1;
    const wordCount = (typeof content === 'string' ? content : '').match(/\S+/g)?.length ?? 0;
    await ScriptVersion.create({
      storyId: req.params.storyId,
      version: newVersion,
      content: typeof content === 'string' ? content : '',
      wordCount,
      editedBy: userId,
      editedAt: new Date(),
    });
    story.currentScriptVersion = newVersion;
    await story.save();

    await logActivity(story._id, userId, 'edited_script', { version: newVersion });

    res.json({ version: newVersion, saved: true });
  } catch (err) {
    next(err);
  }
};
