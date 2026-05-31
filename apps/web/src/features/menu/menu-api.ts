import { api } from '@/lib/api';
import type { Category, MenuItem, ModifierGroup, FoodType } from './menu-types';

export interface CategoryInput {
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface VariantInput {
  id?: string;
  name: string;
  priceDelta: number;
  sortOrder?: number;
  active?: boolean;
}

export interface MenuItemInput {
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  taxRate?: number;
  foodType?: FoodType;
  available?: boolean;
  isRecommended?: boolean;
  sortOrder?: number;
  preparationMins?: number;
  variants?: VariantInput[];
  modifierGroups?: { groupId: string }[];
}

export interface ModifierInput {
  id?: string;
  name: string;
  priceDelta?: number;
  active?: boolean;
}

export interface ModifierGroupInput {
  name: string;
  minSelect?: number;
  maxSelect?: number;
  required?: boolean;
  options: ModifierInput[];
}

export const menuApi = {
  // categories
  listCategories: async (): Promise<Category[]> => (await api.get('/menu/categories')).data,
  createCategory: async (input: CategoryInput): Promise<Category> =>
    (await api.post('/menu/categories', input)).data,
  updateCategory: async (id: string, input: Partial<CategoryInput>): Promise<Category> =>
    (await api.patch(`/menu/categories/${id}`, input)).data,
  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/menu/categories/${id}`);
  },

  // items
  listItems: async (params?: { categoryId?: string; search?: string; available?: boolean }): Promise<MenuItem[]> =>
    (await api.get('/menu/items', { params })).data,
  getItem: async (id: string): Promise<MenuItem> => (await api.get(`/menu/items/${id}`)).data,
  createItem: async (input: MenuItemInput): Promise<MenuItem> =>
    (await api.post('/menu/items', input)).data,
  updateItem: async (id: string, input: Partial<MenuItemInput>): Promise<MenuItem> =>
    (await api.patch(`/menu/items/${id}`, input)).data,
  toggleAvailability: async (id: string, available: boolean): Promise<MenuItem> =>
    (await api.post(`/menu/items/${id}/availability`, { available })).data,
  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/menu/items/${id}`);
  },

  // modifier groups
  listModifierGroups: async (): Promise<ModifierGroup[]> => (await api.get('/menu/modifier-groups')).data,
  createModifierGroup: async (input: ModifierGroupInput): Promise<ModifierGroup> =>
    (await api.post('/menu/modifier-groups', input)).data,
  updateModifierGroup: async (id: string, input: Partial<ModifierGroupInput>): Promise<ModifierGroup> =>
    (await api.patch(`/menu/modifier-groups/${id}`, input)).data,
  deleteModifierGroup: async (id: string): Promise<void> => {
    await api.delete(`/menu/modifier-groups/${id}`);
  },
};
