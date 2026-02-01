import { Router } from 'express';
import { list, getById, getRelated, create, update, remove } from '../controllers/storiesController.js';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);
router.use(requireWorkspace);
router.use(sanitizeBody);

router.get('/', list);
router.get('/:id/related', getRelated);
router.get('/:id', getById);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
