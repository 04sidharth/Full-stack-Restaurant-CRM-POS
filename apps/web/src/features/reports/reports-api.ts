import { api } from '@/lib/api';

export interface SalesSummary {
  from: string;
  to: string;
  totals: {
    orders: number;
    revenue: string;
    tax: string;
    discount: string;
    serviceCharge: string;
    items: number;
    avgOrderValue: string;
  };
  byType: { DINE_IN: number; TAKEAWAY: number; DELIVERY: number };
  daily: { date: string; orders: number; revenue: string }[];
}

export interface ItemSales {
  menuItemId: string;
  name: string;
  category: string;
  quantitySold: number;
  lineCount: number;
  revenue: string;
}

export interface PaymentMix {
  method: string;
  count: number;
  total: string;
}

export interface GstSummary {
  invoices: number;
  subTotal: string;
  cgst: string;
  sgst: string;
  igst: string;
  taxTotal: string;
  total: string;
}

export interface TopCustomer {
  customerId: string;
  name: string | null;
  phone: string;
  orders: number;
  spend: string;
}

export interface DashboardData {
  todaySales: { orders: number; revenue: string };
  activeOrders: number;
  occupiedTables: number;
  lowStockItems: number;
}

const params = (from?: string, to?: string) => ({ from, to });

export const reportsApi = {
  dashboard: async (): Promise<DashboardData> => (await api.get('/reports/dashboard')).data,
  sales: async (from?: string, to?: string): Promise<SalesSummary> =>
    (await api.get('/reports/sales', { params: params(from, to) })).data,
  items: async (from?: string, to?: string): Promise<ItemSales[]> =>
    (await api.get('/reports/items', { params: params(from, to) })).data,
  payments: async (from?: string, to?: string): Promise<PaymentMix[]> =>
    (await api.get('/reports/payments', { params: params(from, to) })).data,
  gst: async (from?: string, to?: string): Promise<GstSummary> =>
    (await api.get('/reports/gst', { params: params(from, to) })).data,
  customers: async (from?: string, to?: string): Promise<TopCustomer[]> =>
    (await api.get('/reports/customers', { params: params(from, to) })).data,
};
