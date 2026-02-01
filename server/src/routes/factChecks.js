import { Router } from 'express';
import {
  list,
  create,
  update,
  getComments,
  addComment,
} from '../controllers/factChecksController.js';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
router.use(requireWorkspace);
router.use(sanitizeBody);

router.get('/', list);
router.post('/', create);
router.patch('/:factCheckId', update);
router.get('/:factCheckId/comments', getComments);
router.post('/:factCheckId/comments', addComment);

export default router;
