import { api } from './api';

export interface StoryComment {
  _id: string;
  storyId: string;
  userId: { _id: string; name: string; email: string };
  text: string;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  comments: StoryComment[];
}

export const storyCommentsApi = {
  list: (storyId: string) => api.get<ListResponse>(`/stories/${storyId}/comments`),

  create: (storyId: string, data: { text: string }) =>
    api.post<StoryComment>(`/stories/${storyId}/comments`, data),
};
