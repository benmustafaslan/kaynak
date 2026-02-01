import { Router } from 'express';
import {
  listMine,
  getById,
  getBySlug,
  create,
  listMembers,
  updateMemberRole,
  getCurrentInvite,
  createInvite,
  remove,
} from '../controllers/workspacesController.js';
import { authenticate } from '../middleware/auth.js';
import { sanitizeBody } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);
router.use(sanitizeBody);

router.get('/', listMine);
router.get('/by-slug/:slug', getBySlug);
router.get('/:id', getById);
router.get('/:id/members', listMembers);
router.get('/:id/invite', getCurrentInvite);
router.patch('/:id/members/:userId', updateMemberRole);
router.post('/:id/invites', createInvite);
router.delete('/:id', remove);
router.post('/', create);

export default router;
