import { Router } from 'express';
import { accept } from '../controllers/invitesController.js';
import { authenticate } from '../middleware/auth.js';
import { sanitizeBody } from '../middleware/validate.js';
import { inviteAcceptLimiter } from '../middleware/rateLimit.js';

const router = Router();
router.use(authenticate);
router.use(sanitizeBody);

router.post('/accept', inviteAcceptLimiter, accept);

export default router;
