import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

const cuid = z.string().min(1);

export const addPaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.coerce.number().min(0.01),
  reference: z.string().max(80).optional(),
});

export const finalizeBillSchema = z.object({
  interState: z.boolean().default(false),
  printInvoice: z.boolean().default(true),
});

export const updateBillDiscountSchema = z.object({
  discountAmount: z.coerce.number().min(0).optional(),
  discountReason: z.string().max(200).optional(),
  serviceChargePct: z.coerce.number().min(0).max(100).optional(),
});

export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
export type FinalizeBillInput = z.infer<typeof finalizeBillSchema>;
export type UpdateBillDiscountInput = z.infer<typeof updateBillDiscountSchema>;

export const billingParam = z.object({ orderId: cuid });
export const paymentParam = z.object({ orderId: cuid, paymentId: cuid });
