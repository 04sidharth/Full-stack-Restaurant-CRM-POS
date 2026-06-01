import { z } from 'zod';
import { LoyaltyTxnType } from '@prisma/client';

const cuid = z.string().min(1);

export const createCustomerSchema = z.object({
  phone: z.string().min(7).max(20),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  dob: z.string().datetime().optional(),
  anniversary: z.string().datetime().optional(),
  gstNumber: z.string().max(20).optional(),
  addressLine1: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  pincode: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  active: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const customerSegments = ['ALL', 'NEW', 'REGULAR', 'VIP', 'AT_RISK', 'INACTIVE'] as const;
export type CustomerSegment = typeof customerSegments[number];

export const listCustomersQuery = z.object({
  search: z.string().max(80).optional(),
  segment: z.enum(customerSegments).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const loyaltyAdjustSchema = z.object({
  points: z.number().int().refine((n) => n !== 0, 'points cannot be 0'),
  type: z.nativeEnum(LoyaltyTxnType).default(LoyaltyTxnType.ADJUST),
  note: z.string().max(200).optional(),
  orderId: cuid.optional(),
});

export const feedbackSchema = z.object({
  customerId: cuid.optional(),
  orderId: cuid.optional(),
  rating: z.number().int().min(1).max(5),
  foodRating: z.number().int().min(1).max(5).optional(),
  serviceRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuery>;
export type LoyaltyAdjustInput = z.infer<typeof loyaltyAdjustSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
