import { api } from './api';
import type { Piece } from '../types/piece';

export interface ListAllParams {
  state?: string;
  format?: string;
  storyId?: string;
  myStories?: boolean;
  /** When true, return only pieces with no linked stories (for Agenda Tracking “piece ideas”). */
  standalone?: boolean;
  /** When true, return only rejected piece ideas (for Archive "Rejected Piece Ideas"). */
  rejected?: boolean;
}

export const piecesApi = {
  /** List all pieces (for Board). Optional filters: state, format, storyId, myStories. */
  listAll: (params?: ListAllParams) => {
    const q = new URLSearchParams();
    if (params?.state) q.set('state', params.state);
    if (params?.format) q.set('format', params.format);
    if (params?.storyId) q.set('storyId', params.storyId);
    if (params?.myStories === true) q.set('myStories', 'true');
    if (params?.standalone === true) q.set('standalone', 'true');
    if (params?.rejected === true) q.set('rejected', 'true');
    const query = q.toString();
    return api.get<{ pieces: Piece[] }>(`/pieces${query ? `?${query}` : ''}`);
  },

  /** List pieces linked to a story. */
  list: (storyId: string) =>
    api.get<{ pieces: Piece[] }>(`/stories/${storyId}/pieces`),

  /** Get one piece by id. */
  get: (pieceId: string) => api.get<Piece>(`/pieces/${pieceId}`),

  /** Create piece from story context (links to that story). */
  create: (
    storyId: string,
    data: { format: string; headline: string; state?: string }
  ) =>
    api.post<Piece>(`/stories/${storyId}/pieces`, data),

  /** Create piece standalone (optional linkedStoryIds). */
  createStandalone: (data: {
    format: string;
    headline: string;
    state?: string;
    linkedStoryIds?: string[];
  }) => api.post<Piece>('/pieces', data),

  /** Update piece (by piece id only). */
  update: (
    pieceId: string,
    data: {
      headline?: string;
      state?: string;
      format?: string;
      linkedStoryIds?: string[];
      rejectedAt?: string | null;
      rejectionReason?: string | null;
      parkedUntil?: string | null;
      approved?: boolean;
      approvedBy?: string | null;
      approvedAt?: string | null;
    }
  ) =>
    api.patch<Piece>(`/pieces/${pieceId}`, data),

  /** Remove piece. */
  remove: (pieceId: string) => api.delete(`/pieces/${pieceId}`),
};
