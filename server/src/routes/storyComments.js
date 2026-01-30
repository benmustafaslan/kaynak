import { Router } from 'express';
import { list, create } from '../controllers/storyCommentsController.js';
import { authenticate } from '../middleware/auth.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
router.use(sanitizeBody);

router.get('/', list);
router.post('/', create);

export default router;
