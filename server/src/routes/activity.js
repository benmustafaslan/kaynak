import { Router } from 'express';
import { getByStoryId } from '../controllers/activityLogController.js';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
router.use(requireWorkspace);

router.get('/', getByStoryId);

export default router;
