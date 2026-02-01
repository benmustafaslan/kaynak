import ActivityLog from '../models/ActivityLog.js';
import Story from '../models/Story.js';

export const getRecent = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    let storyIds = null;
    if (req.workspaceId) {
      const stories = await Story.find({
        workspaceId: req.workspaceId,
        deletedAt: null,
      }, { _id: 1 }).lean();
      storyIds = stories.map((s) => s._id);
      if (storyIds.length === 0) {
        return res.json({ activity: [] });
      }
    }
    const logQuery = storyIds ? { storyId: { $in: storyIds } } : {};
    const logs = await ActivityLog.find(logQuery)
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
    const storyQuery = { _id: req.params.storyId, deletedAt: null };
    if (req.workspaceId) {
      storyQuery.workspaceId = req.workspaceId;
    }
    const story = await Story.findOne(storyQuery);
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
