import axios from 'axios';
import { queryClient } from './queryClient.ts';

export const TOKEN_KEY = 'jfms_token';

// In production the API may live on a different host (e.g. Render). In development
// VITE_API_URL is unset and the Vite dev server proxies /api to the backend.
const apiBaseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      queryClient.clear();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    if (body?.message) return body.message;
    if (body?.errors) {
      const first = Object.values(body.errors)[0]?.[0];
      if (first) return first;
    }
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
    return fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export default api;
