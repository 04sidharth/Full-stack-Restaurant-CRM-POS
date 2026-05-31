import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'OWNER' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'KITCHEN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  restaurantId: string;
}

export interface AuthRestaurant {
  id: string;
  name: string;
  currency: string;
  invoicePrefix: string;
  gstNumber?: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  restaurant: AuthRestaurant | null;
  set: (data: { token: string; user: AuthUser; restaurant: AuthRestaurant }) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      restaurant: null,
      set: (data) => set(data),
      clear: () => set({ token: null, user: null, restaurant: null }),
    }),
    { name: 'crm-auth' },
  ),
);
