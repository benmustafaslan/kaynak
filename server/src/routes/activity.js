import { Router } from 'express';
import { getByStoryId } from '../controllers/activityLogController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/', getByStoryId);

export default router;
