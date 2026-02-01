import { Router } from 'express';
import { accept } from '../controllers/invitesController.js';
import { authenticate } from '../middleware/auth.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);
router.use(sanitizeBody);

router.post('/accept', accept);

export default router;
