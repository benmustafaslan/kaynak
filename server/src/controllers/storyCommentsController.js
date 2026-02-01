import StoryComment from '../models/StoryComment.js';
import Story from '../models/Story.js';

export const list = async (req, res, next) => {
  try {
    const storyQuery = { _id: req.params.storyId, deletedAt: null };
    if (req.workspaceId) {
      storyQuery.workspaceId = req.workspaceId;
    }
    const story = await Story.findOne(storyQuery);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const comments = await StoryComment.find({ storyId: req.params.storyId })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 })
      .lean();
    res.json({ comments });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const storyQuery = { _id: req.params.storyId, deletedAt: null };
    if (req.workspaceId) {
      storyQuery.workspaceId = req.workspaceId;
    }
    const story = await Story.findOne(storyQuery);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const text = typeof req.body.text === 'string' ? req.body.text.trim().slice(0, 5000) : '';
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    const comment = await StoryComment.create({
      storyId: req.params.storyId,
      userId,
      text,
    });
    const populated = await StoryComment.findById(comment._id)
      .populate('userId', 'name email')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};
