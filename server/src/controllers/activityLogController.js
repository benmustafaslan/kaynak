import ActivityLog from '../models/ActivityLog.js';
import Story from '../models/Story.js';

export const getRecent = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const logs = await ActivityLog.find({})
      .populate('userId', 'name email')
      .populate('storyId', 'headline state deletedAt')
      .sort({ createdAt: -1 })
      .limit(limit * 2)
      .lean();
    const filtered = logs
      .filter((log) => log.storyId != null && !log.storyId.deletedAt)
      .slice(0, limit);
    res.json({ activity: filtered });
  } catch (err) {
    next(err);
  }
};

export const getByStoryId = async (req, res, next) => {
  try {
    const story = await Story.findOne({ _id: req.params.storyId, deletedAt: null });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const logs = await ActivityLog.find({ storyId: req.params.storyId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ activity: logs });
  } catch (err) {
    next(err);
  }
};
