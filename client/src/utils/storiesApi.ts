import { api } from './api';
import type { Story } from '../types/story';

interface ListParams {
  myStories?: boolean;
  overdue?: boolean;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'updatedAtDesc' | 'updatedAtAsc' | 'createdAtDesc' | 'createdAtAsc';
  approved?: boolean;
  state?: string;
  stateNe?: string;
  /** When 'parent', returns only story packages (parents). Otherwise parents are excluded from list. */
  kind?: 'parent';
  /** When true, returns only stories that were rejected (rejectedAt set). Used for Archive "Rejected Ideas". */
  rejected?: boolean;
}

interface ListResponse {
  stories: Story[];
  total: number;
  page: number;
  limit: number;
}

export const storiesApi = {
  list: (params?: ListParams) => {
    const sp = new URLSearchParams();
    if (params?.myStories) sp.set('myStories', 'true');
    if (params?.overdue) sp.set('overdue', 'true');
    if (params?.category) sp.set('category', params.category);
    if (params?.search) sp.set('search', params.search);
    if (params?.page != null) sp.set('page', String(params.page));
    if (params?.limit != null) sp.set('limit', String(params.limit));
    if (params?.sort) sp.set('sort', params.sort);
    if (params?.approved === true) sp.set('approved', 'true');
    if (params?.approved === false) sp.set('approved', 'false');
    if (params?.state) sp.set('state', params.state);
    if (params?.stateNe) sp.set('stateNe', params.stateNe);
    if (params?.kind === 'parent') sp.set('kind', 'parent');
    if (params?.rejected === true) sp.set('rejected', 'true');
    const q = sp.toString();
    return api.get<ListResponse>(`/stories${q ? `?${q}` : ''}`);
  },

  getById: (id: string) => api.get<Story>(`/stories/${id}`),

  /** Related stories under the same parent (siblings). Includes published, archived, and unpublished. */
  getRelated: (id: string) =>
    api.get<{ parentStory: Story | null; relatedStories: Story[] }>(`/stories/${id}/related`),

  create: (data: {
    headline: string;
    description: string;
    state?: string;
    categories?: string[];
    kind?: 'story' | 'parent';
    parentStoryId?: string;
  }) => api.post<Story>('/stories', data),

  update: (
    id: string,
    data: Partial<
      Pick<
        Story,
        | 'headline'
        | 'description'
        | 'state'
        | 'categories'
        | 'deadlines'
        | 'checklist'
        | 'researchNotes'
        | 'isBlocked'
        | 'blockReason'
        | 'approved'
        | 'approvedBy'
        | 'approvedAt'
        | 'producer'
        | 'editors'
        | 'teamMembers'
        | 'stateHistory'
        | 'rejectedAt'
        | 'rejectionReason'
        | 'parkedUntil'
        | 'parentStoryId'
      >
    > & { stateHistory?: { state: string; enteredAt: string; exitedAt?: string; durationDays?: number }[] }
  ) => api.patch<Story>(`/stories/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/stories/${id}`),
};
