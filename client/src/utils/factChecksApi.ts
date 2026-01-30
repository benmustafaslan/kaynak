import { api } from './api';

export interface FactCheck {
  _id: string;
  storyId: string;
  scriptVersion: number;
  textSelection: { start: number; end: number; text: string };
  type: 'claim' | 'question' | 'source_needed';
  status: 'pending' | 'verified' | 'disputed';
  note: string;
  assignedTo?: { _id: string; name: string; email: string } | null;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
  verifiedBy?: { _id: string; name: string; email: string } | null;
  verifiedAt?: string | null;
}

export interface FactCheckComment {
  _id: string;
  factCheckId: string;
  userId: { _id: string; name: string; email: string };
  text: string;
  createdAt: string;
}

export const factChecksApi = {
  list: (storyId: string, scriptVersion?: number) => {
    const q = scriptVersion != null ? `?scriptVersion=${scriptVersion}` : '';
    return api.get<{ factChecks: FactCheck[] }>(`/stories/${storyId}/fact-checks${q}`);
  },

  create: (
    storyId: string,
    data: {
      scriptVersion?: number;
      textSelection: { start: number; end: number; text: string };
      type?: string;
      note?: string;
      assignedTo?: string | null;
    }
  ) => api.post<FactCheck>(`/stories/${storyId}/fact-checks`, data),

  update: (
    storyId: string,
    factCheckId: string,
    data: { status?: string; note?: string; assignedTo?: string | null }
  ) => api.patch<FactCheck>(`/stories/${storyId}/fact-checks/${factCheckId}`, data),

  getComments: (storyId: string, factCheckId: string) =>
    api.get<{ comments: FactCheckComment[] }>(`/stories/${storyId}/fact-checks/${factCheckId}/comments`),

  addComment: (storyId: string, factCheckId: string, text: string) =>
    api.post<FactCheckComment>(`/stories/${storyId}/fact-checks/${factCheckId}/comments`, { text }),
};
