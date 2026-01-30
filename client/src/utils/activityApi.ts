import { api } from './api';

export interface ActivityStoryRef {
  _id: string;
  headline?: string;
  state?: string;
  deletedAt?: string | null;
}

export interface ActivityItem {
  _id: string;
  storyId: string | ActivityStoryRef;
  userId: { _id: string; name: string; email: string };
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityItemWithStory extends ActivityItem {
  storyId: string | ActivityStoryRef;
}

export const activityApi = {
  getByStoryId: (storyId: string) =>
    api.get<{ activity: ActivityItem[] }>(`/stories/${storyId}/activity`),

  getRecent: (limit?: number) => {
    const q = limit != null ? `?limit=${limit}` : '';
    return api.get<{ activity: ActivityItemWithStory[] }>(`/activity/recent${q}`);
  },
};
