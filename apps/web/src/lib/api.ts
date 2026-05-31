import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: { message?: string } }>) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clear();
    }
    return Promise.reject(err);
  },
);

export const apiErrorMessage = (err: unknown, fallback = 'Something went wrong') => {
  if (err instanceof AxiosError) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
};
