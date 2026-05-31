import { api } from '@/lib/api';
import type { Role } from '@/stores/auth-store';

export interface Staff {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  active?: boolean;
  restaurantId: string;
}

export const staffApi = {
  list: async (): Promise<Staff[]> => (await api.get('/auth/staff')).data,
  create: async (input: { email: string; name: string; phone?: string; password: string; role: Role }): Promise<Staff> =>
    (await api.post('/auth/staff', input)).data,
  update: async (
    id: string,
    input: { name?: string; phone?: string; role?: Role; active?: boolean; password?: string },
  ): Promise<Staff> => (await api.patch(`/auth/staff/${id}`, input)).data,
};
