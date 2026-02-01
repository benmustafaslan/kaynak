import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types/user';
import { api, setStoredToken } from '../utils/api';

const AUTH_STORAGE_KEY = 'kaynak-auth';

/** Wraps localStorage so invalid/corrupted JSON does not throw during rehydration. */
function safeAuthStorage() {
  return {
    getItem: (name: string): string | null => {
      try {
        const raw = localStorage.getItem(name);
        if (raw == null) return null;
        JSON.parse(raw);
        return raw;
      } catch {
        localStorage.removeItem(name);
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      localStorage.setItem(name, value);
    },
    removeItem: (name: string): void => {
      localStorage.removeItem(name);
    },
  };
}

interface AuthState {
  user: User | null;
  loading: boolean;
  checked: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      checked: false,

      login: async (email, password) => {
        set({ loading: true });
        try {
          const data = await api.post<{ user: User }>('/auth/login', { email, password });
          set({ user: data.user, loading: false });
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },

      register: async (email, password, name) => {
        set({ loading: true });
        try {
          const data = await api.post<{ user: User }>('/auth/register', {
            email,
            password,
            name,
          });
          set({ user: data.user, loading: false });
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } finally {
          setStoredToken(null);
          set({ user: null });
        }
      },

      fetchMe: async () => {
        if (get().checked) return;
        set({ loading: true, checked: true });
        const timeoutMs = 15000;
        const fetchWithTimeout = Promise.race([
          api.get<{ user: User }>('/auth/me'),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth check timed out')), timeoutMs)
          ),
        ]);
        try {
          const data = await fetchWithTimeout;
          set({ user: data.user, loading: false });
        } catch (err) {
          const status = (err as Error & { status?: number }).status;
          if (status === 401) {
            setStoredToken(null);
            set({ user: null, loading: false });
          } else {
            set({ loading: false });
          }
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(safeAuthStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => () => {},
    }
  )
);
