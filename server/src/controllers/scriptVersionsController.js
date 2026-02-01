import mongoose from 'mongoose';
import Story from '../models/Story.js';
import ScriptVersion from '../models/ScriptVersion.js';

const CURRENT_VERSION = 0;

function isValidStoryId(id) {
  return id && String(id).trim() !== '' && mongoose.Types.ObjectId.isValid(id);
}

export const getCurrent = async (req, res, next) => {
  try {
    if (!isValidStoryId(req.params.storyId)) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const story = await Story.findOne({ _id: req.params.storyId, deletedAt: null });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const version = await ScriptVersion.findOne({
      storyId: req.params.storyId,
      outputId: null,
      version: CURRENT_VERSION,
    })
      .populate('editedBy', 'name email')
      .lean();
    if (!version) {
      return res.json({ content: '', wordCount: 0, editedBy: null, editedAt: null });
    }
    res.json({
      content: version.content,
      wordCount: version.wordCount,
      editedBy: version.editedBy,
      editedAt: version.editedAt,
    });
  } catch (err) {
    next(err);
  }
};

export const saveDraft = async (req, res, next) => {
  try {
    if (!isValidStoryId(req.params.storyId)) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const userId = req.user._id;
    const { content } = req.body;
    const story = await Story.findOne({ _id: req.params.storyId, deletedAt: null });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    let current = await ScriptVersion.findOne({
      storyId: req.params.storyId,
      outputId: null,
      version: CURRENT_VERSION,
    });
    if (!current) {
      current = await ScriptVersion.create({
        storyId: req.params.storyId,
        outputId: null,
        version: CURRENT_VERSION,
        content: typeof content === 'string' ? content : '',
        wordCount: (typeof content === 'string' ? content : '').match(/\S+/g)?.length ?? 0,
        editedBy: userId,
        editedAt: new Date(),
      });
    } else {
      current.content = typeof content === 'string' ? content : current.content;
      current.wordCount = (current.content.match(/\S+/g) || []).length;
      current.editedBy = userId;
      current.editedAt = new Date();
      await current.save();
    }
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
};
