import { Router } from 'express';
import { register, login, logout, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router();

router.use(sanitizeBody);
router.use('/login', authLimiter);
router.use('/register', authLimiter);

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
