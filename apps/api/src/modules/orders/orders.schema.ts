import { z } from 'zod';
import { OrderItemStatus, OrderStatus, OrderType } from '@prisma/client';

const cuid = z.string().min(1);

export const orderItemModifierSchema = z.object({
  groupId: cuid,
  groupName: z.string().min(1).max(80),
  modifierId: cuid,
  name: z.string().min(1).max(80),
  priceDelta: z.coerce.number(),
});

export const addOrderItemSchema = z.object({
  menuItemId: cuid,
  variantId: cuid.optional(),
  quantity: z.number().int().min(1).max(99).default(1),
  modifiers: z.array(orderItemModifierSchema).default([]),
  notes: z.string().max(300).optional(),
});

export const createOrderSchema = z.object({
  type: z.nativeEnum(OrderType),
  tableId: cuid.optional(),
  customerId: cuid.optional(),
  customerPhone: z.string().max(20).optional(),
  customerName: z.string().max(120).optional(),
  guestCount: z.number().int().min(1).max(50).default(1),
  notes: z.string().max(500).optional(),
  items: z.array(addOrderItemSchema).default([]),
});

export const updateOrderSchema = z.object({
  tableId: cuid.nullable().optional(),
  customerId: cuid.nullable().optional(),
  guestCount: z.number().int().min(1).max(50).optional(),
  notes: z.string().max(500).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  discountReason: z.string().max(200).optional(),
  serviceChargePct: z.coerce.number().min(0).max(100).optional(),
});

export const updateOrderItemSchema = z.object({
  quantity: z.number().int().min(0).max(99).optional(),
  notes: z.string().max(300).optional(),
  status: z.nativeEnum(OrderItemStatus).optional(),
});

export const listOrdersQuery = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  type: z.nativeEnum(OrderType).optional(),
  tableId: cuid.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  active: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
