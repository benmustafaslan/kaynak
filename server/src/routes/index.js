import { Router } from 'express';
import authRoutes from './auth.js';
import storiesRoutes from './stories.js';
import usersRoutes from './users.js';
import scriptVersionsRoutes from './scriptVersions.js';
import factChecksRoutes from './factChecks.js';
import activityRoutes from './activity.js';
import storyCommentsRoutes from './storyComments.js';
import { getRecent } from '../controllers/activityLogController.js';
import { getFeed } from '../controllers/feedController.js';
import { exportDocx, exportHtml } from '../controllers/exportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.get('/activity/recent', authenticate, getRecent);
router.get('/feed', authenticate, getFeed);
router.get('/stories/:storyId/export', authenticate, (req, res, next) => {
  if (req.query.format === 'docx') return exportDocx(req, res, next);
  if (req.query.format === 'html') return exportHtml(req, res, next);
  res.status(400).json({ error: 'Use ?format=docx or ?format=html' });
});
router.use('/stories', storiesRoutes);
router.use('/stories/:storyId/script-versions', scriptVersionsRoutes);
router.use('/stories/:storyId/fact-checks', factChecksRoutes);
router.use('/stories/:storyId/comments', storyCommentsRoutes);
router.use('/stories/:storyId/activity', activityRoutes);

export default router;
