import FactCheck from '../models/FactCheck.js';
import FactCheckComment from '../models/FactCheckComment.js';
import Story from '../models/Story.js';

const TYPES = ['claim', 'question', 'source_needed'];
const STATUSES = ['pending', 'verified', 'disputed'];

function storyQueryForWorkspace(storyId, workspaceId) {
  const q = { _id: storyId, deletedAt: null };
  if (workspaceId) {
    q.workspaceId = workspaceId;
  }
  return q;
}

export const list = async (req, res, next) => {
  try {
    const story = await Story.findOne(storyQueryForWorkspace(req.params.storyId, req.workspaceId));
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const { scriptVersion } = req.query;
    const query = { storyId: req.params.storyId };
    if (scriptVersion !== undefined && scriptVersion !== '') {
      query.scriptVersion = Number(scriptVersion);
    }
    const factChecks = await FactCheck.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: 1 })
      .lean();
    res.json({ factChecks });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const story = await Story.findOne(storyQueryForWorkspace(req.params.storyId, req.workspaceId));
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const { scriptVersion, textSelection, type, note, assignedTo } = req.body;

    if (!textSelection || typeof textSelection.start !== 'number' || typeof textSelection.end !== 'number' || typeof textSelection.text !== 'string') {
      return res.status(400).json({ error: 'textSelection (start, end, text) is required' });
    }

    const version = scriptVersion !== undefined ? Number(scriptVersion) : (story.currentScriptVersion || 0);
    const factCheck = await FactCheck.create({
      storyId: req.params.storyId,
      scriptVersion: version,
      textSelection: {
        start: textSelection.start,
        end: textSelection.end,
        text: String(textSelection.text).slice(0, 10000),
      },
      type: TYPES.includes(type) ? type : 'claim',
      note: typeof note === 'string' ? note.slice(0, 2000) : '',
      assignedTo: assignedTo || null,
      createdBy: userId,
    });

    const populated = await FactCheck.findById(factCheck._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const story = await Story.findOne(storyQueryForWorkspace(req.params.storyId, req.workspaceId));
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const factCheck = await FactCheck.findOne({
      _id: req.params.factCheckId,
      storyId: req.params.storyId,
    });
    if (!factCheck) {
      return res.status(404).json({ error: 'Fact-check not found' });
    }

    const { status, note, assignedTo } = req.body;
    if (status !== undefined && STATUSES.includes(status)) {
      factCheck.status = status;
      if (status === 'verified' || status === 'disputed') {
        factCheck.verifiedBy = userId;
        factCheck.verifiedAt = new Date();
      }
    }
    if (note !== undefined) {
      factCheck.note = typeof note === 'string' ? note.slice(0, 2000) : '';
    }
    if (assignedTo !== undefined) {
      factCheck.assignedTo = assignedTo || null;
    }
    await factCheck.save();

    const populated = await FactCheck.findById(factCheck._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('verifiedBy', 'name email')
      .lean();
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

export const getComments = async (req, res, next) => {
  try {
    const story = await Story.findOne(storyQueryForWorkspace(req.params.storyId, req.workspaceId));
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const factCheck = await FactCheck.findOne({
      _id: req.params.factCheckId,
      storyId: req.params.storyId,
    });
    if (!factCheck) {
      return res.status(404).json({ error: 'Fact-check not found' });
    }
    const comments = await FactCheckComment.find({ factCheckId: factCheck._id })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 })
      .lean();
    res.json({ comments });
  } catch (err) {
    next(err);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const story = await Story.findOne(storyQueryForWorkspace(req.params.storyId, req.workspaceId));
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const factCheck = await FactCheck.findOne({
      _id: req.params.factCheckId,
      storyId: req.params.storyId,
    });
    if (!factCheck) {
      return res.status(404).json({ error: 'Fact-check not found' });
    }
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    const comment = await FactCheckComment.create({
      factCheckId: factCheck._id,
      userId,
      text: text.trim().slice(0, 5000),
    });
    const populated = await FactCheckComment.findById(comment._id)
      .populate('userId', 'name email')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};
