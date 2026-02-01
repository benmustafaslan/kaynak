import mongoose from 'mongoose';
import Piece from '../models/Piece.js';
import ScriptVersion from '../models/ScriptVersion.js';

const CURRENT_VERSION = 0;

function isValidPieceId(id) {
  return id && String(id).trim() !== '' && mongoose.Types.ObjectId.isValid(id);
}

function pieceQueryForWorkspace(pieceId, workspaceId) {
  const q = { _id: pieceId };
  if (workspaceId) {
    q.workspaceId = workspaceId;
  }
  return q;
}

export const getCurrent = async (req, res, next) => {
  try {
    if (!isValidPieceId(req.params.pieceId)) {
      return res.status(404).json({ error: 'Piece not found' });
    }
    const piece = await Piece.findOne(pieceQueryForWorkspace(req.params.pieceId, req.workspaceId));
    if (!piece) {
      return res.status(404).json({ error: 'Piece not found' });
    }
    const version = await ScriptVersion.findOne({
      outputId: req.params.pieceId,
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
    if (!isValidPieceId(req.params.pieceId)) {
      return res.status(404).json({ error: 'Piece not found' });
    }
    const userId = req.user._id;
    const { content } = req.body;
    const piece = await Piece.findOne(pieceQueryForWorkspace(req.params.pieceId, req.workspaceId));
    if (!piece) {
      return res.status(404).json({ error: 'Piece not found' });
    }

    let current = await ScriptVersion.findOne({
      outputId: req.params.pieceId,
      version: CURRENT_VERSION,
    });
    if (!current) {
      current = await ScriptVersion.create({
        outputId: piece._id,
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
