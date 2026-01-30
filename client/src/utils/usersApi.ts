import { api } from './api';
import type { User } from '../types/user';

interface ListResponse {
  users: Pick<User, '_id' | 'name' | 'email' | 'role'>[];
}

export const usersApi = {
  list: () => api.get<ListResponse>('/users'),
};
