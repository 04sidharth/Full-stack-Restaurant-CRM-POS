import { api } from '@/lib/api';

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'CREDIT' | 'OTHER';

export interface BillLine {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  taxRate: string;
  lineSubTotal: string;
  cgst: string;
  sgst: string;
  igst: string;
  lineTotal: string;
}

export interface BillTotals {
  subTotal: string;
  cgst: string;
  sgst: string;
  igst: string;
  taxTotal: string;
  serviceCharge: string;
  discount: string;
  grandTotal: string;
  paid: string;
  balance: string;
  roundOff: string;
}

export interface BillSummary {
  order: {
    id: string;
    orderNumber: string;
    type: string;
    status: string;
    tableId: string | null;
    customerId: string | null;
    discountAmount: string;
    discountReason: string | null;
    serviceCharge: string;
    notes: string | null;
    createdAt: string;
    table: { id: string; name: string } | null;
    customer: { id: string; name: string | null; phone: string } | null;
    payments: { id: string; method: PaymentMethod; amount: string; reference: string | null; receivedAt: string }[];
    invoice: { id: string; invoiceNumber: string; total: string } | null;
  };
  lines: BillLine[];
  totals: BillTotals;
  interState: boolean;
}

export interface Invoice {
  id: string;
  restaurantId: string;
  orderId: string;
  invoiceNumber: string;
  subTotal: string;
  discountAmount: string;
  cgst: string;
  sgst: string;
  igst: string;
  serviceCharge: string;
  roundOff: string;
  total: string;
  issuedAt: string;
}

export const billingApi = {
  summary: async (orderId: string, interState: boolean): Promise<BillSummary> =>
    (await api.get(`/billing/${orderId}/summary`, { params: { interState: interState ? 'true' : 'false' } })).data,
  addPayment: async (orderId: string, input: { method: PaymentMethod; amount: number; reference?: string }) =>
    (await api.post(`/billing/${orderId}/payments`, input)).data,
  removePayment: async (orderId: string, paymentId: string): Promise<void> => {
    await api.delete(`/billing/${orderId}/payments/${paymentId}`);
  },
  finalize: async (orderId: string, input: { interState: boolean; printInvoice?: boolean }): Promise<Invoice> =>
    (await api.post(`/billing/${orderId}/finalize`, input)).data,
};
