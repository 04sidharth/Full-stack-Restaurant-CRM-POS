import { api } from '@/lib/api';

export type TableStatus = 'FREE' | 'OCCUPIED' | 'BILLED' | 'RESERVED' | 'CLEANING';

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  sectionId: string;
  name: string;
  capacity: number;
  status: TableStatus;
  section: { id: string; name: string };
}

export interface Section {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  tables: RestaurantTable[];
}

export const tablesApi = {
  listSections: async (): Promise<Section[]> => (await api.get('/tables/sections')).data,
  createSection: async (input: { name: string; sortOrder?: number }): Promise<Section> =>
    (await api.post('/tables/sections', input)).data,
  updateSection: async (id: string, input: { name?: string; sortOrder?: number }): Promise<Section> =>
    (await api.patch(`/tables/sections/${id}`, input)).data,
  deleteSection: async (id: string): Promise<void> => {
    await api.delete(`/tables/sections/${id}`);
  },

  listTables: async (): Promise<RestaurantTable[]> => (await api.get('/tables')).data,
  createTable: async (input: { sectionId: string; name: string; capacity?: number }): Promise<RestaurantTable> =>
    (await api.post('/tables', input)).data,
  updateTable: async (
    id: string,
    input: { sectionId?: string; name?: string; capacity?: number; status?: TableStatus },
  ): Promise<RestaurantTable> => (await api.patch(`/tables/${id}`, input)).data,
  deleteTable: async (id: string): Promise<void> => {
    await api.delete(`/tables/${id}`);
  },
};
