import { z } from 'zod';
import { StockUnit, StockMovementType } from '@prisma/client';

const cuid = z.string().min(1);

export const createStockItemSchema = z.object({
  name: z.string().min(1).max(120),
  sku: z.string().max(60).optional(),
  unit: z.nativeEnum(StockUnit),
  currentQty: z.coerce.number().min(0).default(0),
  minQty: z.coerce.number().min(0).default(0),
  costPerUnit: z.coerce.number().min(0).default(0),
});

export const updateStockItemSchema = createStockItemSchema.partial().extend({
  active: z.boolean().optional(),
});

export const addStockMovementSchema = z
  .object({
    stockItemId: cuid,
    type: z.nativeEnum(StockMovementType),
    quantity: z.coerce.number().refine((n) => n !== 0, 'quantity cannot be 0'),
    unitCost: z.coerce.number().min(0).optional(),
    note: z.string().max(300).optional(),
  })
  .refine(
    (d) =>
      d.type === 'PURCHASE'
        ? d.quantity > 0
        : d.type === 'CONSUMPTION' || d.type === 'WASTE'
        ? d.quantity < 0 || true // allow either; we'll normalize on write
        : true,
    { message: 'invalid signed quantity for movement type' },
  );

export const upsertRecipeSchema = z.object({
  menuItemId: cuid,
  components: z
    .array(
      z.object({
        stockItemId: cuid,
        quantity: z.coerce.number().min(0).max(10000),
      }),
    )
    .default([]),
});

export const listMovementsQuery = z.object({
  stockItemId: cuid.optional(),
  type: z.nativeEnum(StockMovementType).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type CreateStockItemInput = z.infer<typeof createStockItemSchema>;
export type UpdateStockItemInput = z.infer<typeof updateStockItemSchema>;
export type AddStockMovementInput = z.infer<typeof addStockMovementSchema>;
export type UpsertRecipeInput = z.infer<typeof upsertRecipeSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuery>;
