import { Router } from 'express';
import { list } from '../controllers/usersController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/', list);

export default router;
