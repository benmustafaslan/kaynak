import { api } from './api';

interface ScriptCurrent {
  content: string;
  wordCount: number;
  editedBy?: { _id: string; name: string; email: string } | null;
  editedAt?: string | null;
}

function scriptBase(storyId: string, pieceId?: string) {
  if (pieceId) {
    return `/pieces/${pieceId}/script-versions`;
  }
  return `/stories/${storyId}/script-versions`;
}

export const scriptVersionsApi = {
  getCurrent: (storyId: string, pieceId?: string) =>
    api.get<ScriptCurrent>(`${scriptBase(storyId, pieceId)}/current`),

  saveDraft: (storyId: string, content: string, pieceId?: string) =>
    api.patch<{ saved: boolean }>(`${scriptBase(storyId, pieceId)}/draft`, { content }),
};
