const API_BASE =
  typeof import.meta.env?.VITE_API_URL === 'string'
    ? import.meta.env.VITE_API_URL
    : '/api';

const AUTH_TOKEN_KEY = 'auth_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/** Get token from localStorage, or from cookie if localStorage is empty (e.g. after refresh in some cases). */
export function getStoredToken(): string | null {
  const fromStorage = localStorage.getItem(AUTH_TOKEN_KEY);
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/token=([^;]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }
  return null;
}

/** Set token in localStorage and in a same-origin cookie so it survives refresh (proxy can break server Set-Cookie). */
export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    document.cookie = 'token=; path=/; max-age=0';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, ...init } = options;
  const headers: HeadersInit = { ...(init.headers as HeadersInit) };
  if (json !== undefined) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  const token = getStoredToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
    ...(json !== undefined && { body: JSON.stringify(json) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error ?? res.statusText ?? 'Request failed') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, json?: unknown) => request<T>(path, { method: 'POST', json }),
  patch: <T>(path: string, json?: unknown) => request<T>(path, { method: 'PATCH', json }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
