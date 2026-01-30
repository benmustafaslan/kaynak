import { api } from './api';

interface ScriptVersionCurrent {
  content: string;
  version: number;
  wordCount: number;
  locked: boolean;
  lockedBy?: { _id: string; name: string; email: string } | null;
  lockExpires?: string | null;
  editedBy?: { _id: string; name: string; email: string } | null;
  editedAt?: string | null;
}

interface VersionItem {
  _id: string;
  storyId: string;
  version: number;
  content: string;
  wordCount: number;
  editedBy?: { _id: string; name: string; email: string } | null;
  editedAt?: string | null;
}

export const scriptVersionsApi = {
  getCurrent: (storyId: string) =>
    api.get<ScriptVersionCurrent>(`/stories/${storyId}/script-versions/current`),

  list: (storyId: string) =>
    api.get<{ versions: VersionItem[] }>(`/stories/${storyId}/script-versions`),

  acquireLock: (storyId: string) =>
    api.post<{ locked: boolean; lockExpires: string; lockedBy: { _id: string; name: string; email: string } }>(
      `/stories/${storyId}/script-versions/lock`
    ),

  releaseLock: (storyId: string) =>
    api.post<{ message: string }>(`/stories/${storyId}/script-versions/unlock`),

  saveDraft: (storyId: string, content: string) =>
    api.patch<{ version: number; saved: boolean }>(`/stories/${storyId}/script-versions/draft`, { content }),

  saveAsNewVersion: (storyId: string, content: string) =>
    api.post<{ version: number; saved: boolean }>(`/stories/${storyId}/script-versions/new-version`, { content }),
};
