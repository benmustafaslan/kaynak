import { Router } from 'express';
import { listByStory, createFromStory } from '../controllers/piecesController.js';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
router.use(requireWorkspace);
router.use(sanitizeBody);

router.get('/', listByStory);
router.post('/', createFromStory);

export default router;
