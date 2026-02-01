import { Router } from 'express';
import { list, getById, getRelated, create, update, remove } from '../controllers/storiesController.js';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { sanitizeBody } from '../middleware/validate.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.use(authenticate);
router.use(requireWorkspace);
router.use(sanitizeBody);

router.get('/', list);
router.get('/:id/related', validateObjectId('id'), getRelated);
router.get('/:id', validateObjectId('id'), getById);
router.post('/', create);
router.patch('/:id', validateObjectId('id'), update);
router.delete('/:id', validateObjectId('id'), remove);

export default router;
