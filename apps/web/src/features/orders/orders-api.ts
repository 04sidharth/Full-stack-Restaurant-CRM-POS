import { api } from '@/lib/api';

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
export type OrderItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export interface OrderItemModifier {
  groupId: string;
  groupName: string;
  modifierId: string;
  name: string;
  priceDelta: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  variantId: string | null;
  nameSnapshot: string;
  unitPrice: string;
  taxRate: string;
  quantity: number;
  modifiers: OrderItemModifier[] | null;
  notes: string | null;
  status: OrderItemStatus;
  kotPrintedAt: string | null;
  menuItem: { id: string; name: string; foodType: string };
  variant: { id: string; name: string } | null;
}

export interface OrderCustomer {
  id: string;
  name: string | null;
  phone: string;
}

export interface OrderTable {
  id: string;
  name: string;
  sectionId: string;
  status: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  restaurantId: string;
  type: OrderType;
  status: OrderStatus;
  tableId: string | null;
  customerId: string | null;
  createdById: string;
  guestCount: number;
  notes: string | null;
  subTotal: string;
  discountAmount: string;
  discountReason: string | null;
  serviceCharge: string;
  taxAmount: string;
  roundOff: string;
  total: string;
  kotPrintedAt: string | null;
  billedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  table: OrderTable | null;
  customer: OrderCustomer | null;
  createdBy: { id: string; name: string };
  items: OrderItem[];
  payments: { id: string; method: string; amount: string; reference: string | null; receivedAt: string }[];
  invoice: { id: string; invoiceNumber: string; total: string } | null;
}

export interface AddItemInput {
  menuItemId: string;
  variantId?: string;
  quantity?: number;
  modifiers?: OrderItemModifier[];
  notes?: string;
}

export interface CreateOrderInput {
  type: OrderType;
  tableId?: string;
  customerId?: string;
  customerPhone?: string;
  customerName?: string;
  guestCount?: number;
  notes?: string;
  items?: AddItemInput[];
}

export const ordersApi = {
  list: async (params?: {
    status?: OrderStatus;
    type?: OrderType;
    tableId?: string;
    active?: boolean;
    limit?: number;
  }): Promise<Order[]> => (await api.get('/orders', { params })).data,
  get: async (id: string): Promise<Order> => (await api.get(`/orders/${id}`)).data,
  create: async (input: CreateOrderInput): Promise<Order> => (await api.post('/orders', input)).data,
  update: async (
    id: string,
    input: {
      tableId?: string | null;
      customerId?: string | null;
      guestCount?: number;
      notes?: string;
      discountAmount?: number;
      discountReason?: string;
      serviceChargePct?: number;
    },
  ): Promise<Order> => (await api.patch(`/orders/${id}`, input)).data,
  addItem: async (id: string, input: AddItemInput): Promise<Order> =>
    (await api.post(`/orders/${id}/items`, input)).data,
  updateItem: async (
    id: string,
    itemId: string,
    input: { quantity?: number; notes?: string; status?: OrderItemStatus },
  ): Promise<Order> => (await api.patch(`/orders/${id}/items/${itemId}`, input)).data,
  removeItem: async (id: string, itemId: string): Promise<Order> =>
    (await api.delete(`/orders/${id}/items/${itemId}`)).data,
  sendToKitchen: async (id: string): Promise<Order> => (await api.post(`/orders/${id}/send-to-kitchen`)).data,
  cancel: async (id: string, reason?: string): Promise<Order> =>
    (await api.post(`/orders/${id}/cancel`, { reason })).data,
  kitchenQueue: async (): Promise<KitchenTicket[]> => (await api.get('/orders/kitchen-queue')).data,
  setItemStatus: async (id: string, itemId: string, status: 'PREPARING' | 'READY' | 'SERVED'): Promise<Order> =>
    (await api.post(`/orders/${id}/items/${itemId}/status`, { status })).data,
};

export interface KitchenTicketItem {
  id: string;
  nameSnapshot: string;
  quantity: number;
  notes: string | null;
  status: OrderItemStatus;
  modifiers: OrderItemModifier[] | null;
}

export interface KitchenTicket {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  kotPrintedAt: string | null;
  createdAt: string;
  table: { id: string; name: string } | null;
  items: KitchenTicketItem[];
}
