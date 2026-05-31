import { api } from '@/lib/api';

export interface Customer {
  id: string;
  restaurantId: string;
  phone: string;
  name: string | null;
  email: string | null;
  dob: string | null;
  anniversary: string | null;
  gstNumber: string | null;
  addressLine1: string | null;
  city: string | null;
  pincode: string | null;
  notes: string | null;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpend: string;
  lastVisitAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  orderId: string | null;
  type: 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE';
  points: number;
  note: string | null;
  createdAt: string;
}

export interface Feedback {
  id: string;
  customerId: string | null;
  orderId: string | null;
  rating: number;
  foodRating: number | null;
  serviceRating: number | null;
  comment: string | null;
  createdAt: string;
  customer?: { id: string; name: string | null; phone: string } | null;
  order?: { id: string; orderNumber: string } | null;
}

export interface CustomerDetail extends Customer {
  orders: Array<{
    id: string;
    orderNumber: string;
    type: string;
    status: string;
    total: string;
    createdAt: string;
    table: { id: string; name: string } | null;
    invoice: { id: string; invoiceNumber: string } | null;
  }>;
  loyaltyTxns: LoyaltyTransaction[];
  feedbacks: Feedback[];
}

export interface CustomerInput {
  phone: string;
  name?: string;
  email?: string;
  dob?: string;
  anniversary?: string;
  gstNumber?: string;
  addressLine1?: string;
  city?: string;
  pincode?: string;
  notes?: string;
}

export const customersApi = {
  list: async (search?: string): Promise<Customer[]> =>
    (await api.get('/customers', { params: { search } })).data,
  get: async (id: string): Promise<CustomerDetail> => (await api.get(`/customers/${id}`)).data,
  create: async (input: CustomerInput): Promise<Customer> => (await api.post('/customers', input)).data,
  update: async (id: string, input: Partial<CustomerInput> & { active?: boolean }): Promise<Customer> =>
    (await api.patch(`/customers/${id}`, input)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },
  adjustLoyalty: async (
    id: string,
    input: { points: number; type?: 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE'; note?: string; orderId?: string },
  ): Promise<Customer> => (await api.post(`/customers/${id}/loyalty`, input)).data,

  listFeedback: async (): Promise<Feedback[]> => (await api.get('/customers/feedback')).data,
  addFeedback: async (input: {
    customerId?: string;
    orderId?: string;
    rating: number;
    foodRating?: number;
    serviceRating?: number;
    comment?: string;
  }): Promise<Feedback> => (await api.post('/customers/feedback', input)).data,
};
