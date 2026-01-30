import { api } from './api';

export interface FeedItem {
  title: string;
  link: string;
  pubDate: string | null;
  contentSnippet: string;
}

export interface FeedResponse {
  title: string;
  items: FeedItem[];
}

export const feedApi = {
  getFeed: (url: string) =>
    api.get<FeedResponse>(`/feed?url=${encodeURIComponent(url)}`),
};
