import { Router } from 'express';
import { list, create } from '../controllers/storyCommentsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { sanitizeBody } from '../middleware/validate.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
router.use(requireWorkspace);
router.use(sanitizeBody);
router.use(validateObjectId('storyId'));

router.get('/', list);
router.post('/', create);

export default router;
