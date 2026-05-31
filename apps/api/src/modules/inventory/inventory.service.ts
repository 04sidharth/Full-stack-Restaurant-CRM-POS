import { Prisma, StockMovementType } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import { round2, toDecimal } from '../../lib/money.js';
import type {
  AddStockMovementInput,
  CreateStockItemInput,
  ListMovementsQuery,
  UpdateStockItemInput,
  UpsertRecipeInput,
} from './inventory.schema.js';

const ensureOwn = async <T extends { restaurantId: string } | null>(row: T, restaurantId: string): Promise<NonNullable<T>> => {
  if (!row || row.restaurantId !== restaurantId) throw HttpError.notFound();
  return row as NonNullable<T>;
};

// Normalize signed quantity based on type (additions positive, removals negative)
const normalizeMovement = (type: StockMovementType, qty: number): number => {
  const abs = Math.abs(qty);
  switch (type) {
    case 'PURCHASE':
    case 'OPENING':
      return abs;
    case 'CONSUMPTION':
    case 'WASTE':
      return -abs;
    case 'ADJUSTMENT':
      return qty; // user supplies sign
  }
};

export const stockService = {
  list: (restaurantId: string) =>
    prisma.stockItem.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    }),

  lowStock: (restaurantId: string) =>
    prisma.stockItem.findMany({
      where: { restaurantId, active: true, currentQty: { lte: prisma.stockItem.fields.minQty } },
      orderBy: { name: 'asc' },
    }),

  create: (restaurantId: string, input: CreateStockItemInput) =>
    prisma.stockItem.create({
      data: { restaurantId, ...input },
    }),

  update: async (restaurantId: string, id: string, input: UpdateStockItemInput) => {
    const existing = await prisma.stockItem.findUnique({ where: { id } });
    await ensureOwn(existing, restaurantId);
    return prisma.stockItem.update({ where: { id }, data: input });
  },

  delete: async (restaurantId: string, id: string) => {
    const existing = await prisma.stockItem.findUnique({
      where: { id },
      include: { _count: { select: { movements: true, recipes: true } } },
    });
    await ensureOwn(existing, restaurantId);
    if (existing!._count.movements > 0 || existing!._count.recipes > 0) {
      await prisma.stockItem.update({ where: { id }, data: { active: false } });
      return { soft: true };
    }
    await prisma.stockItem.delete({ where: { id } });
    return { soft: false };
  },

  addMovement: async (restaurantId: string, input: AddStockMovementInput) => {
    const stockItem = await prisma.stockItem.findUnique({ where: { id: input.stockItemId } });
    await ensureOwn(stockItem, restaurantId);

    const qty = normalizeMovement(input.type, input.quantity);
    return prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          restaurantId,
          stockItemId: input.stockItemId,
          type: input.type,
          quantity: qty,
          unitCost: input.unitCost,
          note: input.note,
        },
      });
      await tx.stockItem.update({
        where: { id: input.stockItemId },
        data: {
          currentQty: { increment: qty },
          ...(input.type === 'PURCHASE' && input.unitCost ? { costPerUnit: round2(input.unitCost) } : {}),
        },
      });
      return movement;
    });
  },

  listMovements: (restaurantId: string, q: ListMovementsQuery) => {
    const where: Prisma.StockMovementWhereInput = { restaurantId };
    if (q.stockItemId) where.stockItemId = q.stockItemId;
    if (q.type) where.type = q.type;
    return prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: q.limit,
      include: { stockItem: { select: { id: true, name: true, unit: true } } },
    });
  },
};

export const recipeService = {
  byMenuItem: async (restaurantId: string, menuItemId: string) => {
    const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    await ensureOwn(item, restaurantId);
    return prisma.recipe.findMany({
      where: { menuItemId },
      include: { stockItem: { select: { id: true, name: true, unit: true } } },
    });
  },

  upsert: async (restaurantId: string, input: UpsertRecipeInput) => {
    const item = await prisma.menuItem.findUnique({ where: { id: input.menuItemId } });
    await ensureOwn(item, restaurantId);

    if (input.components.length > 0) {
      const stockIds = input.components.map((c) => c.stockItemId);
      const found = await prisma.stockItem.findMany({
        where: { restaurantId, id: { in: stockIds } },
        select: { id: true },
      });
      if (found.length !== stockIds.length) throw HttpError.badRequest('Some stock items are invalid');
    }

    return prisma.$transaction(async (tx) => {
      await tx.recipe.deleteMany({ where: { menuItemId: input.menuItemId } });
      if (input.components.length > 0) {
        await tx.recipe.createMany({
          data: input.components.map((c) => ({
            menuItemId: input.menuItemId,
            stockItemId: c.stockItemId,
            quantity: c.quantity,
          })),
        });
      }
      return tx.recipe.findMany({
        where: { menuItemId: input.menuItemId },
        include: { stockItem: { select: { id: true, name: true, unit: true } } },
      });
    });
  },
};

/**
 * Auto-deduct stock based on recipes for an order's items.
 * Called from the billing finalize transaction.
 */
export const consumeRecipeStock = async (
  tx: Prisma.TransactionClient,
  restaurantId: string,
  orderId: string,
): Promise<void> => {
  const items = await tx.orderItem.findMany({
    where: { orderId, status: { not: 'CANCELLED' } },
  });

  // Aggregate stock usage across all order items
  const usage = new Map<string, Prisma.Decimal>();
  for (const item of items) {
    const recipes = await tx.recipe.findMany({ where: { menuItemId: item.menuItemId } });
    for (const r of recipes) {
      const totalNeeded = toDecimal(r.quantity).mul(item.quantity);
      usage.set(r.stockItemId, (usage.get(r.stockItemId) ?? new Prisma.Decimal(0)).add(totalNeeded));
    }
  }

  for (const [stockItemId, qty] of usage) {
    const consumed = qty.neg();
    await tx.stockMovement.create({
      data: {
        restaurantId,
        stockItemId,
        type: 'CONSUMPTION',
        quantity: consumed,
        orderId,
        note: 'Auto-consumed on order finalize',
      },
    });
    await tx.stockItem.update({
      where: { id: stockItemId },
      data: { currentQty: { increment: consumed } },
    });
  }
};
