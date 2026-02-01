import { Router } from 'express';
import { getCurrent, saveDraft } from '../controllers/scriptVersionsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
router.use(requireWorkspace);
router.use(sanitizeBody);

router.get('/current', getCurrent);
router.patch('/draft', saveDraft);

export default router;
