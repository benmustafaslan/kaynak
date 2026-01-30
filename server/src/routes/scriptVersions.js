import { Router } from 'express';
import {
  list,
  getCurrent,
  acquireLock,
  releaseLock,
  saveDraft,
  saveAsNewVersion,
} from '../controllers/scriptVersionsController.js';
import { authenticate } from '../middleware/auth.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router({ mergeParams: true });
router.use(authenticate);
router.use(sanitizeBody);

router.get('/', list);
router.get('/current', getCurrent);
router.post('/lock', acquireLock);
router.post('/unlock', releaseLock);
router.patch('/draft', saveDraft);
router.post('/new-version', saveAsNewVersion);

export default router;
