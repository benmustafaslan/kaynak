import Story from '../models/Story.js';
import Piece from '../models/Piece.js';

function normalizeState(s) {
  if (typeof s !== 'string') return s;
  return s.toLowerCase();
}

/** List all pieces (for Board). Optional query: state, format, storyId, myStories, standalone, rejected. */
export const listAll = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { state, format, storyId, myStories, standalone, rejected } = req.query;
    const query = {};
    if (state && String(state).trim()) {
      query.state = normalizeState(String(state).trim());
    }
    if (format && String(format).trim()) {
      query.format = String(format).trim().toLowerCase();
    }
    if (storyId && String(storyId).trim()) {
      query.linkedStoryIds = String(storyId).trim();
    }
    if (standalone === 'true' || standalone === true) {
      query.$or = [{ linkedStoryIds: { $size: 0 } }, { linkedStoryIds: { $exists: false } }];
    }
    if (rejected === 'true') {
      query.rejectedAt = { $ne: null };
    }
    if (myStories === 'true' || myStories === true) {
      const stories = await Story.find(
        {
          deletedAt: null,
          $or: [
            { producer: userId },
            { editors: userId },
            { 'teamMembers.userId': userId },
          ],
        },
        { _id: 1 }
      ).lean();
      const storyIds = stories.map((s) => s._id);
      query.linkedStoryIds = { $in: storyIds };
    }
    const pieces = await Piece.find(query)
      .sort({ updatedAt: -1 })
      .populate('linkedStoryIds', 'headline researchNotes')
      .populate('createdBy', 'name email')
      .lean();
    res.json({ pieces });
  } catch (err) {
    next(err);
  }
};

/** List pieces linked to a story (GET /stories/:storyId/pieces). */
export const listByStory = async (req, res, next) => {
  try {
    const story = await Story.findOne({ _id: req.params.storyId, deletedAt: null });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const pieces = await Piece.find({ linkedStoryIds: req.params.storyId })
      .sort({ createdAt: 1 })
      .populate('linkedStoryIds', 'headline researchNotes')
      .populate('createdBy', 'name email')
      .lean();
    res.json({ pieces });
  } catch (err) {
    next(err);
  }
};

/** Get one piece by id (GET /pieces/:pieceId). */
export const getOne = async (req, res, next) => {
  try {
    const piece = await Piece.findById(req.params.pieceId)
      .populate('linkedStoryIds', 'headline researchNotes')
      .populate('createdBy', 'name email')
      .lean();
    if (!piece) {
      return res.status(404).json({ error: 'Piece not found' });
    }
    res.json(piece);
  } catch (err) {
    next(err);
  }
};

/** Create piece (standalone or with linkedStoryIds). POST /pieces. */
export const create = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { format, headline, state, linkedStoryIds } = req.body;
    const formatStr = format && String(format).trim();
    if (!formatStr || formatStr.length > 64) {
      return res.status(400).json({ error: 'format is required and must be 1–64 characters' });
    }
    if (!headline || typeof headline !== 'string' || headline.trim().length === 0) {
      return res.status(400).json({ error: 'headline is required' });
    }
    const linkIds = Array.isArray(linkedStoryIds)
      ? linkedStoryIds.filter((id) => id && String(id).trim()).map((id) => String(id).trim())
      : [];
    const piece = await Piece.create({
      linkedStoryIds: linkIds,
      format: formatStr.trim().toLowerCase().slice(0, 64),
      headline: headline.trim().slice(0, 500),
      state: state && ['scripting', 'multimedia', 'finalization', 'published', 'archived'].includes(normalizeState(state)) ? normalizeState(state) : 'scripting',
      createdBy: userId,
    });
    const populated = await Piece.findById(piece._id)
      .populate('linkedStoryIds', 'headline researchNotes')
      .populate('createdBy', 'name email')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

/** Create piece from story context (linked to that story). POST /stories/:storyId/pieces. */
export const createFromStory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const story = await Story.findOne({ _id: req.params.storyId, deletedAt: null });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const { format, headline, state } = req.body;
    const formatStr = format && String(format).trim();
    if (!formatStr || formatStr.length > 64) {
      return res.status(400).json({ error: 'format is required and must be 1–64 characters' });
    }
    if (!headline || typeof headline !== 'string' || headline.trim().length === 0) {
      return res.status(400).json({ error: 'headline is required' });
    }
    const storyIdStr = String(req.params.storyId);
    const piece = await Piece.create({
      linkedStoryIds: [storyIdStr],
      createdFromStoryId: storyIdStr,
      format: formatStr.trim().toLowerCase().slice(0, 64),
      headline: headline.trim().slice(0, 500),
      state: state && ['scripting', 'multimedia', 'finalization', 'published', 'archived'].includes(normalizeState(state)) ? normalizeState(state) : 'scripting',
      createdBy: userId,
    });
    const populated = await Piece.findById(piece._id)
      .populate('linkedStoryIds', 'headline researchNotes')
      .populate('createdBy', 'name email')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

/** Update piece. PATCH /pieces/:pieceId. */
export const update = async (req, res, next) => {
  try {
    const piece = await Piece.findById(req.params.pieceId);
    if (!piece) {
      return res.status(404).json({ error: 'Piece not found' });
    }
    const { headline, state, format, linkedStoryIds, rejectedAt, rejectionReason, parkedUntil, approved, approvedBy, approvedAt } = req.body;
    if (headline !== undefined && typeof headline === 'string') {
      piece.headline = headline.trim().slice(0, 500);
    }
    if (state !== undefined && ['scripting', 'multimedia', 'finalization', 'published', 'archived'].includes(normalizeState(state))) {
      piece.state = normalizeState(state);
    }
    if (format !== undefined && typeof format === 'string' && format.trim().length > 0 && format.trim().length <= 64) {
      piece.format = format.trim().toLowerCase().slice(0, 64);
    }
    if (linkedStoryIds !== undefined && Array.isArray(linkedStoryIds)) {
      piece.linkedStoryIds = linkedStoryIds.filter((id) => id && String(id).trim()).map((id) => String(id).trim());
    }
    if (rejectedAt !== undefined) piece.rejectedAt = rejectedAt ? new Date(rejectedAt) : null;
    if (rejectionReason !== undefined) piece.rejectionReason = typeof rejectionReason === 'string' ? rejectionReason.trim().slice(0, 500) : null;
    if (parkedUntil !== undefined) piece.parkedUntil = parkedUntil ? new Date(parkedUntil) : null;
    if (approved !== undefined) piece.approved = Boolean(approved);
    if (approvedBy !== undefined) piece.approvedBy = approvedBy || null;
    if (approvedAt !== undefined) piece.approvedAt = approvedAt ? new Date(approvedAt) : null;
    await piece.save();
    const populated = await Piece.findById(piece._id)
      .populate('linkedStoryIds', 'headline researchNotes')
      .populate('createdBy', 'name email')
      .lean();
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

/** Delete piece. DELETE /pieces/:pieceId. */
export const remove = async (req, res, next) => {
  try {
    const piece = await Piece.findByIdAndDelete(req.params.pieceId);
    if (!piece) {
      return res.status(404).json({ error: 'Piece not found' });
    }
    const ScriptVersion = (await import('../models/ScriptVersion.js')).default;
    const FactCheck = (await import('../models/FactCheck.js')).default;
    await ScriptVersion.deleteMany({ outputId: piece._id });
    await FactCheck.deleteMany({ outputId: piece._id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
