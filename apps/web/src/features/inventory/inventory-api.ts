import { api } from '@/lib/api';

export type StockUnit = 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'PIECE' | 'DOZEN' | 'PACKET';
export type StockMovementType = 'PURCHASE' | 'CONSUMPTION' | 'ADJUSTMENT' | 'WASTE' | 'OPENING';

export interface StockItem {
  id: string;
  name: string;
  sku: string | null;
  unit: StockUnit;
  currentQty: string;
  minQty: string;
  costPerUnit: string;
  active: boolean;
}

export interface StockMovement {
  id: string;
  stockItemId: string;
  type: StockMovementType;
  quantity: string;
  unitCost: string | null;
  note: string | null;
  createdAt: string;
  stockItem: { id: string; name: string; unit: StockUnit };
  orderId: string | null;
}

export interface RecipeComponent {
  id: string;
  menuItemId: string;
  stockItemId: string;
  quantity: string;
  stockItem: { id: string; name: string; unit: StockUnit };
}

export interface StockItemInput {
  name: string;
  sku?: string;
  unit: StockUnit;
  currentQty?: number;
  minQty?: number;
  costPerUnit?: number;
}

export const inventoryApi = {
  list: async (): Promise<StockItem[]> => (await api.get('/inventory')).data,
  lowStock: async (): Promise<StockItem[]> => (await api.get('/inventory/low-stock')).data,
  create: async (input: StockItemInput): Promise<StockItem> => (await api.post('/inventory', input)).data,
  update: async (id: string, input: Partial<StockItemInput> & { active?: boolean }): Promise<StockItem> =>
    (await api.patch(`/inventory/${id}`, input)).data,
  remove: async (id: string): Promise<{ soft: boolean }> => (await api.delete(`/inventory/${id}`)).data,

  listMovements: async (params?: { stockItemId?: string; type?: StockMovementType; limit?: number }): Promise<StockMovement[]> =>
    (await api.get('/inventory/movements', { params })).data,
  addMovement: async (input: {
    stockItemId: string;
    type: StockMovementType;
    quantity: number;
    unitCost?: number;
    note?: string;
  }): Promise<StockMovement> => (await api.post('/inventory/movements', input)).data,

  getRecipe: async (menuItemId: string): Promise<RecipeComponent[]> =>
    (await api.get(`/inventory/recipes/${menuItemId}`)).data,
  upsertRecipe: async (input: {
    menuItemId: string;
    components: { stockItemId: string; quantity: number }[];
  }): Promise<RecipeComponent[]> => (await api.put('/inventory/recipes', input)).data,
};
