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

function factChecksBase(storyId: string, pieceId?: string) {
  if (pieceId) {
    return `/pieces/${pieceId}/fact-checks`;
  }
  return `/stories/${storyId}/fact-checks`;
}

export const factChecksApi = {
  list: (storyId: string, scriptVersion?: number, pieceId?: string) => {
    const q = scriptVersion != null ? `?scriptVersion=${scriptVersion}` : '';
    return api.get<{ factChecks: FactCheck[] }>(`${factChecksBase(storyId, pieceId)}${q}`);
  },

  create: (
    storyId: string,
    data: {
      scriptVersion?: number;
      textSelection: { start: number; end: number; text: string };
      type?: string;
      note?: string;
      assignedTo?: string | null;
    },
    pieceId?: string
  ) => api.post<FactCheck>(factChecksBase(storyId, pieceId), data),

  update: (
    storyId: string,
    factCheckId: string,
    data: { status?: string; note?: string; assignedTo?: string | null },
    pieceId?: string
  ) => api.patch<FactCheck>(`${factChecksBase(storyId, pieceId)}/${factCheckId}`, data),

  getComments: (storyId: string, factCheckId: string, pieceId?: string) =>
    api.get<{ comments: FactCheckComment[] }>(`${factChecksBase(storyId, pieceId)}/${factCheckId}/comments`),

  addComment: (storyId: string, factCheckId: string, text: string, pieceId?: string) =>
    api.post<FactCheckComment>(`${factChecksBase(storyId, pieceId)}/${factCheckId}/comments`, { text }),
};
