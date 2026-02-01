import Story from '../models/Story.js';
import { logActivity } from './activityLog.js';

const STATES = ['idea', 'visible', 'archived'];

/** Normalize state to lowercase for API/DB; supports legacy uppercase values. */
function normalizeState(s) {
  if (typeof s !== 'string') return s;
  return s.toLowerCase();
}
function normalizeStoryState(story) {
  if (!story) return;
  if (story.state) story.state = normalizeState(story.state);
  if (Array.isArray(story.stateHistory)) {
    story.stateHistory.forEach((e) => {
      if (e.state) e.state = normalizeState(e.state);
    });
  }
}

export const list = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { myStories, overdue, category, search, page = 1, limit = 50, approved, state, stateNe, sort, rejected } = req.query;

    const query = { deletedAt: null };
    if (req.workspaceId) {
      query.workspaceId = req.workspaceId;
    }

    // Parents (story packages) are only returned when explicitly requested; they are shown in a separate area, not as board cards
    if (req.query.kind === 'parent') {
      query.kind = 'parent';
    } else {
      query.$or = [{ kind: { $ne: 'parent' } }, { kind: { $exists: false } }];
    }

    // Archive: rejected ideas (stories with rejectedAt set)
    if (rejected === 'true') {
      query.rejectedAt = { $ne: null };
    }

    // Board view: stateNe 'idea' means "all workflow stories" — show non-idea regardless of approved flag
    if (approved === 'true' && stateNe !== 'idea') {
      query.approved = true;
    } else if (approved === 'false') {
      query.$and = [
        { $or: [{ approved: false }, { approved: { $exists: false } }] },
        { rejectedAt: null },
        { $or: [{ parkedUntil: null }, { parkedUntil: { $lte: new Date() } }] },
      ];
    }
    if (state && state.trim()) {
      const s = state.trim();
      query.state = { $in: [s, s.toLowerCase(), s.toUpperCase()] };
    }
    if (stateNe && stateNe.trim()) {
      const s = stateNe.trim();
      query.state = { $nin: [s, s.toLowerCase(), s.toUpperCase()] };
    }

    if (myStories === 'true') {
      query.ownerId = userId;
    }
    if (category && category.trim()) {
      query.categories = category.trim();
    }
    const MAX_SEARCH_LENGTH = 200;
    if (search && search.trim()) {
      const raw = search.trim();
      const term = raw.slice(0, MAX_SEARCH_LENGTH).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchOr = [
        { headline: new RegExp(term, 'i') },
        { description: new RegExp(term, 'i') },
      ];
      query.$and = query.$and || [];
      query.$and.push({ $or: searchOr });
    }

    const baseQuery = { ...query };

    const skip = Math.max(0, (Number(page) || 1) - 1) * Math.min(50, Math.max(1, Number(limit) || 50));
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 50));

    let sortOption = { updatedAt: -1 };
    if (sort === 'updatedAtAsc') sortOption = { updatedAt: 1 };
    else if (sort === 'createdAtDesc') sortOption = { createdAt: -1 };
    else if (sort === 'createdAtAsc') sortOption = { createdAt: 1 };

    const [rawStories, total] = await Promise.all([
      Story.find(baseQuery)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .populate('ownerId', 'name email')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('parentStoryId', 'headline')
        .lean(),
      Story.countDocuments(baseQuery),
    ]);
    // Dedupe by _id (Mongoose find returns unique docs; this guards against any edge case)
    const seen = new Set();
    const stories = rawStories.filter((s) => {
      const id = s._id?.toString?.() ?? String(s._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    stories.forEach(normalizeStoryState);

    res.json({ stories, total, page: Number(page) || 1, limit: limitNum });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const storyQuery = { _id: req.params.id, deletedAt: null };
    if (req.workspaceId) {
      storyQuery.workspaceId = req.workspaceId;
    }
    const story = await Story.findOne(storyQuery)
      .populate('ownerId', 'name email')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    normalizeStoryState(story);
    res.json(story);
  } catch (err) {
    next(err);
  }
};

/**
 * Get related stories: when the given id is a child story, returns siblings and parent;
 * when it is a parent (series), returns its children so the Ongoing Series page can show them.
 */
export const getRelated = async (req, res, next) => {
  try {
    const storyId = req.params.id;
    const storyQuery = { _id: storyId, deletedAt: null };
    if (req.workspaceId) {
      storyQuery.workspaceId = req.workspaceId;
    }
    const story = await Story.findOne(storyQuery).lean();
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Parent (series): return this story as parentStory and its children as relatedStories
    if (story.kind === 'parent') {
      const childrenQuery = { parentStoryId: storyId, deletedAt: null };
    if (req.workspaceId) {
      childrenQuery.workspaceId = req.workspaceId;
    }
    const children = await Story.find(childrenQuery)
        .populate('ownerId', 'name email')
        .sort({ createdAt: 1 })
        .lean();

      const orderIds = (story.childOrder || []).map((id) => id.toString());
      const sorted = [...children].sort((a, b) => {
        const ai = orderIds.indexOf(a._id.toString());
        const bi = orderIds.indexOf(b._id.toString());
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      normalizeStoryState(story);
      sorted.forEach(normalizeStoryState);
      return res.json({ parentStory: story, relatedStories: sorted });
    }

    // Child story: return parent and siblings
    if (!story.parentStoryId) {
      return res.json({ parentStory: null, relatedStories: [] });
    }

    const parentQuery = { _id: story.parentStoryId, deletedAt: null };
    if (req.workspaceId) {
      parentQuery.workspaceId = req.workspaceId;
    }
    const parentStory = await Story.findOne(parentQuery)
      .populate('createdBy', 'name email')
      .lean();

    const siblingsQuery = { parentStoryId: story.parentStoryId, deletedAt: null };
    if (req.workspaceId) {
      siblingsQuery.workspaceId = req.workspaceId;
    }
    const siblings = await Story.find(siblingsQuery)
      .populate('ownerId', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    const orderIds = (parentStory?.childOrder || []).map((id) => id.toString());
    const sorted = [...siblings].sort((a, b) => {
      const ai = orderIds.indexOf(a._id.toString());
      const bi = orderIds.indexOf(b._id.toString());
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    normalizeStoryState(story);
    if (parentStory) normalizeStoryState(parentStory);
    sorted.forEach(normalizeStoryState);
    res.json({ parentStory: parentStory || null, relatedStories: sorted });
  } catch (err) {
    next(err);
  }
};

const PARENT_DESCRIPTION_PLACEHOLDER =
  'Story package – no script or long description. Use this to group related stories (e.g. Update, Educational follow-up, Commentary). Minimum length for schema.';

export const create = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { headline, description, state: requestedState, categories, kind: requestedKind, parentStoryId: requestedParentId } = req.body;

    if (!headline || typeof headline !== 'string' || headline.trim().length === 0) {
      return res.status(400).json({ error: 'Headline is required' });
    }

    const isParent = requestedKind === 'parent';
    let descriptionValue =
      typeof description === 'string' ? description.trim().slice(0, 50000) : '';
    if (isParent) {
      if (descriptionValue.length < 3) {
        descriptionValue = PARENT_DESCRIPTION_PLACEHOLDER;
      }
    } else {
      if (descriptionValue.length < 3) {
        return res.status(400).json({ error: 'Description is required and must be at least 3 characters' });
      }
    }

    const normalizedRequested = requestedState ? normalizeState(String(requestedState)) : null;
    const initialState =
      isParent ? 'idea' : normalizedRequested && STATES.includes(normalizedRequested) ? normalizedRequested : 'idea';
    const isVisibleOrArchived = !isParent && (initialState === 'visible' || initialState === 'archived');
    const now = new Date();

    let parentStoryId = null;
    if (!isParent && requestedParentId && String(requestedParentId).trim()) {
      const parentQuery = { _id: requestedParentId.trim(), deletedAt: null };
      if (req.workspaceId) {
        parentQuery.workspaceId = req.workspaceId;
      }
      const parent = await Story.findOne(parentQuery);
      if (!parent) {
        return res.status(400).json({ error: 'Parent story not found' });
      }
      if (parent.kind !== 'parent') {
        return res.status(400).json({ error: 'Parent story must be a series (kind: parent)' });
      }
      parentStoryId = parent._id;
    }

    const story = await Story.create({
      workspaceId: req.workspaceId || undefined,
      headline: headline.trim().slice(0, 500),
      description: descriptionValue,
      state: initialState,
      kind: isParent ? 'parent' : 'story',
      ownerId: userId,
      approved: isVisibleOrArchived,
      approvedBy: isVisibleOrArchived ? userId : null,
      approvedAt: isVisibleOrArchived ? now : null,
      categories: Array.isArray(categories) ? categories.filter((c) => typeof c === 'string').slice(0, 20) : [],
      createdBy: userId,
      parentStoryId: parentStoryId || undefined,
      stateHistory: isVisibleOrArchived
        ? [{ state: initialState, enteredAt: now, exitedAt: null, durationDays: null }]
        : undefined,
      stateChangedAt: isVisibleOrArchived ? now : null,
    });

    if (parentStoryId) {
      const parent = await Story.findById(parentStoryId);
      if (parent) {
        const order = parent.childOrder || [];
        if (!order.some((id) => id.toString() === story._id.toString())) {
          parent.childOrder = [...order, story._id];
          await parent.save();
        }
      }
    }

    await logActivity(story._id, userId, 'created', { headline: story.headline });

    const populated = await Story.findById(story._id)
      .populate('ownerId', 'name email')
      .populate('createdBy', 'name email')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const storyQuery = { _id: req.params.id, deletedAt: null };
    if (req.workspaceId) {
      storyQuery.workspaceId = req.workspaceId;
    }
    const story = await Story.findOne(storyQuery);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const {
      headline,
      description,
      state,
      categories,
      checklist,
      researchNotes,
      isBlocked,
      blockReason,
      approved,
      approvedBy,
      approvedAt,
      ownerId,
      stateHistory,
      rejectedAt,
      rejectionReason,
      parkedUntil,
      parentStoryId,
    } = req.body;

    if (headline !== undefined) {
      if (typeof headline !== 'string' || headline.trim().length === 0) {
        return res.status(400).json({ error: 'Headline cannot be empty' });
      }
      story.headline = headline.trim().slice(0, 500);
    }
    if (description !== undefined) {
      const desc = typeof description === 'string' ? description.trim().slice(0, 50000) : '';
      if (story.kind === 'parent') {
        story.description = desc.length >= 3 ? desc : PARENT_DESCRIPTION_PLACEHOLDER;
      } else {
        if (desc.length < 3) {
          return res.status(400).json({ error: 'Description must be at least 3 characters' });
        }
        story.description = desc;
      }
    }
    const requestedState = state !== undefined ? normalizeState(state) : undefined;
    if (requestedState !== undefined && STATES.includes(requestedState)) {
      const prevState = normalizeState(String(story.state));
      const now = new Date();
      if (prevState !== requestedState) {
        // Update state history: close current entry
        if (story.stateHistory && story.stateHistory.length > 0) {
          const currentEntry = story.stateHistory[story.stateHistory.length - 1];
          currentEntry.exitedAt = now;
          currentEntry.durationDays = Math.floor(
            (now - currentEntry.enteredAt) / (1000 * 60 * 60 * 24)
          );
        }
        // Add new state entry
        story.stateHistory = story.stateHistory || [];
        story.stateHistory.push({
          state: requestedState,
          enteredAt: now,
          exitedAt: null,
          durationDays: null,
        });
        story.state = requestedState;
        story.stateChangedAt = now;
        if (requestedState === 'visible') {
          story.publishedAt = now;
          story.cycleTimeDays = Math.floor(
            (now - story.createdAt) / (1000 * 60 * 60 * 24)
          );
        }
        if (requestedState === 'archived') {
          story.archivedAt = now;
        } else if (prevState === 'archived') {
          story.archivedAt = null;
        }
        await logActivity(story._id, userId, 'moved', { from: prevState, to: requestedState });
      }
    }
    if (categories !== undefined && Array.isArray(categories)) {
      story.categories = categories.filter((c) => typeof c === 'string').slice(0, 20);
    }
    if (checklist !== undefined && Array.isArray(checklist)) {
      story.checklist = checklist.map((c, i) => ({
        text: String(c.text || '').slice(0, 500),
        completed: Boolean(c.completed),
        order: typeof c.order === 'number' ? c.order : i,
      }));
    }
    if (researchNotes !== undefined) {
      story.researchNotes = typeof researchNotes === 'string' ? researchNotes.slice(0, 50000) : '';
    }
    if (isBlocked !== undefined) {
      story.isBlocked = Boolean(isBlocked);
      if (story.isBlocked) {
        story.blockedAt = new Date();
        story.blockedBy = userId;
        story.blockReason = typeof blockReason === 'string' ? blockReason.trim().slice(0, 500) : '';
      } else {
        story.blockedAt = null;
        story.blockedBy = null;
        story.blockReason = null;
      }
    } else if (blockReason !== undefined && story.isBlocked) {
      story.blockReason = typeof blockReason === 'string' ? blockReason.trim().slice(0, 500) : '';
    }
    if (approved !== undefined) {
      story.approved = Boolean(approved);
      if (story.approved) {
        story.approvedBy = userId;
        story.approvedAt = new Date();
        story.rejectedAt = null;
        story.rejectionReason = null;
      }
    }
    if (approvedBy !== undefined) story.approvedBy = approvedBy || null;
    if (approvedAt !== undefined) story.approvedAt = approvedAt ? new Date(approvedAt) : null;
    if (ownerId !== undefined) story.ownerId = ownerId || null;
    if (stateHistory !== undefined && Array.isArray(stateHistory)) {
      story.stateHistory = stateHistory.map((e) => ({
        state: String(e.state || ''),
        enteredAt: e.enteredAt ? new Date(e.enteredAt) : new Date(),
        exitedAt: e.exitedAt ? new Date(e.exitedAt) : null,
        durationDays: typeof e.durationDays === 'number' ? e.durationDays : null,
      }));
    }
    if (parentStoryId !== undefined) {
      const newParentId = parentStoryId ? String(parentStoryId).trim() || null : null;
      if (newParentId) {
        const parentQuery = { _id: newParentId, deletedAt: null };
        if (req.workspaceId) {
          parentQuery.workspaceId = req.workspaceId;
        }
        const parent = await Story.findOne(parentQuery);
        if (!parent) {
          return res.status(400).json({ error: 'Parent story not found' });
        }
        if (parent.kind !== 'parent') {
          return res.status(400).json({ error: 'Parent story must have kind "parent"' });
        }
        story.parentStoryId = parent._id;
        const order = parent.childOrder || [];
        if (!order.some((id) => id.toString() === story._id.toString())) {
          parent.childOrder = [...order, story._id];
          await parent.save();
        }
      } else {
        const oldParentId = story.parentStoryId;
        story.parentStoryId = null;
        if (oldParentId) {
          const oldParentQuery = { _id: oldParentId, deletedAt: null };
        if (req.workspaceId) {
          oldParentQuery.workspaceId = req.workspaceId;
        }
        const oldParent = await Story.findOne(oldParentQuery);
          if (oldParent?.childOrder?.length) {
            oldParent.childOrder = oldParent.childOrder.filter(
              (id) => id.toString() !== story._id.toString()
            );
            await oldParent.save();
          }
        }
      }
    }
    if (rejectedAt !== undefined) story.rejectedAt = rejectedAt ? new Date(rejectedAt) : null;
    if (rejectionReason !== undefined) story.rejectionReason = typeof rejectionReason === 'string' ? rejectionReason.trim().slice(0, 500) : null;
    if (parkedUntil !== undefined) story.parkedUntil = parkedUntil ? new Date(parkedUntil) : null;

    normalizeStoryState(story);
    await story.save();
    const populated = await Story.findById(story._id)
      .populate('ownerId', 'name email')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();
    normalizeStoryState(populated);
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const storyQuery = { _id: req.params.id, deletedAt: null };
    if (req.workspaceId) {
      storyQuery.workspaceId = req.workspaceId;
    }
    const story = await Story.findOne(storyQuery);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    if (story.kind === 'parent') {
      await Story.updateMany(
        { parentStoryId: story._id, deletedAt: null },
        { $set: { parentStoryId: null } }
      );
      story.childOrder = [];
    }
    story.deletedAt = new Date();
    normalizeStoryState(story);
    await story.save();
    await logActivity(story._id, userId, 'deleted', {});
    res.json({ message: 'Story moved to trash' });
  } catch (err) {
    next(err);
  }
};
