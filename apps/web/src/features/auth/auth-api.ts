import { api } from '@/lib/api';
import type { AuthRestaurant, AuthUser } from '@/stores/auth-store';

interface AuthResponse {
  token: string;
  user: AuthUser;
  restaurant: AuthRestaurant;
}

export const authApi = {
  signup: async (input: {
    restaurantName: string;
    ownerName: string;
    email: string;
    password: string;
    phone?: string;
    gstNumber?: string;
    city?: string;
    state?: string;
  }): Promise<AuthResponse> => (await api.post('/auth/signup', input)).data,

  login: async (input: { email: string; password: string }): Promise<AuthResponse> =>
    (await api.post('/auth/login', input)).data,

  me: async () => (await api.get('/auth/me')).data,
};
