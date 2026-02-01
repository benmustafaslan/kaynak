import { Router } from 'express';
import { listAll, create, getOne, update, remove } from '../controllers/piecesController.js';
import {
  getCurrent as getCurrentScript,
  saveDraft as saveScriptDraft,
} from '../controllers/scriptVersionsPieceController.js';
import {
  list as listFactChecks,
  create as createFactCheck,
  update as updateFactCheck,
  getComments as getFactCheckComments,
  addComment as addFactCheckComment,
} from '../controllers/factChecksPieceController.js';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);
router.use(requireWorkspace);
router.use(sanitizeBody);

router.get('/', listAll);
router.post('/', create);
router.get('/:pieceId/script-versions/current', getCurrentScript);
router.patch('/:pieceId/script-versions/draft', saveScriptDraft);
router.get('/:pieceId/fact-checks', listFactChecks);
router.post('/:pieceId/fact-checks', createFactCheck);
router.patch('/:pieceId/fact-checks/:factCheckId', updateFactCheck);
router.get('/:pieceId/fact-checks/:factCheckId/comments', getFactCheckComments);
router.post('/:pieceId/fact-checks/:factCheckId/comments', addFactCheckComment);
router.get('/:pieceId', getOne);
router.patch('/:pieceId', update);
router.delete('/:pieceId', remove);

export default router;
