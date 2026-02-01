import { Router } from 'express';
import { listByStory, createFromStory } from '../controllers/piecesController.js';
import { authenticate } from '../middleware/auth.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
router.use(sanitizeBody);

router.get('/', listByStory);
router.post('/', createFromStory);

export default router;
