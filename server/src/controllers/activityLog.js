import ActivityLog from '../models/ActivityLog.js';

export async function logActivity(storyId, userId, action, details = {}) {
  await ActivityLog.create({ storyId, userId, action, details });
}
