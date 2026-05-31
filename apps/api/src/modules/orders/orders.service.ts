import { Prisma, OrderStatus, OrderType, TableStatus } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import { round2, sumDecimal, toDecimal } from '../../lib/money.js';
import type {
  AddOrderItemInput,
  CreateOrderInput,
  ListOrdersQuery,
  UpdateOrderInput,
  UpdateOrderItemInput,
} from './orders.schema.js';

const ensureOwn = async <T extends { restaurantId: string } | null>(row: T, restaurantId: string): Promise<NonNullable<T>> => {
  if (!row || row.restaurantId !== restaurantId) throw HttpError.notFound();
  return row as NonNullable<T>;
};

const orderInclude = {
  table: { select: { id: true, name: true, sectionId: true, status: true } },
  customer: { select: { id: true, name: true, phone: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      menuItem: { select: { id: true, name: true, foodType: true } },
      variant: { select: { id: true, name: true } },
    },
  },
  payments: { orderBy: { receivedAt: 'asc' as const } },
  invoice: true,
};

const ORDER_NUMBER_PAD = 5;
const nextOrderNumber = async (tx: Prisma.TransactionClient, restaurantId: string): Promise<string> => {
  const rest = await tx.restaurant.update({
    where: { id: restaurantId },
    data: { nextOrderSeq: { increment: 1 } },
    select: { nextOrderSeq: true },
  });
  // Previously returned value is current - 1
  const seq = rest.nextOrderSeq - 1;
  return seq.toString().padStart(ORDER_NUMBER_PAD, '0');
};

interface PricedLine {
  unitPrice: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  nameSnapshot: string;
  variantId?: string | undefined;
  modifiers: { groupId: string; groupName: string; modifierId: string; name: string; priceDelta: number }[];
}

const priceLine = async (
  tx: Prisma.TransactionClient,
  restaurantId: string,
  input: AddOrderItemInput,
): Promise<PricedLine> => {
  const item = await tx.menuItem.findUnique({
    where: { id: input.menuItemId },
    include: { variants: true },
  });
  if (!item || item.restaurantId !== restaurantId) {
    throw HttpError.badRequest('Menu item not found');
  }
  if (!item.available) throw HttpError.badRequest(`${item.name} is currently unavailable`);

  let unitPrice = toDecimal(item.basePrice);
  let nameSnapshot = item.name;

  if (input.variantId) {
    const v = item.variants.find((x) => x.id === input.variantId);
    if (!v) throw HttpError.badRequest('Variant not found for this item');
    unitPrice = unitPrice.add(toDecimal(v.priceDelta));
    nameSnapshot = `${item.name} (${v.name})`;
  }

  for (const mod of input.modifiers) {
    unitPrice = unitPrice.add(toDecimal(mod.priceDelta));
  }

  return {
    unitPrice: round2(unitPrice),
    taxRate: toDecimal(item.taxRate),
    nameSnapshot,
    variantId: input.variantId,
    modifiers: input.modifiers,
  };
};

const recomputeOrderTotals = async (tx: Prisma.TransactionClient, orderId: string) => {
  const items = await tx.orderItem.findMany({
    where: { orderId, status: { not: 'CANCELLED' } },
  });
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });

  const subTotal = sumDecimal(items.map((i) => toDecimal(i.unitPrice).mul(i.quantity)));
  const taxAmount = sumDecimal(
    items.map((i) => round2(toDecimal(i.unitPrice).mul(i.quantity).mul(toDecimal(i.taxRate).div(100)))),
  );
  const discount = toDecimal(order.discountAmount);
  const serviceCharge = toDecimal(order.serviceCharge);
  const totalRaw = subTotal.sub(discount).add(serviceCharge).add(taxAmount);
  const total = round2(totalRaw);

  await tx.order.update({
    where: { id: orderId },
    data: {
      subTotal: round2(subTotal),
      taxAmount: round2(taxAmount),
      total,
    },
  });
};

export const orderService = {
  list: async (restaurantId: string, q: ListOrdersQuery) => {
    const where: Prisma.OrderWhereInput = { restaurantId };
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;
    if (q.tableId) where.tableId = q.tableId;
    if (q.active) {
      where.status = { in: [OrderStatus.DRAFT, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED] };
    }
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    return prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: q.limit,
      include: orderInclude,
    });
  },

  get: async (restaurantId: string, id: string) => {
    const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
    return ensureOwn(order, restaurantId);
  },

  create: async (restaurantId: string, userId: string, input: CreateOrderInput) => {
    if (input.type === OrderType.DINE_IN && !input.tableId) {
      throw HttpError.badRequest('Dine-in orders need a table');
    }
    return prisma.$transaction(async (tx) => {
      let customerId = input.customerId ?? null;
      if (!customerId && input.customerPhone) {
        const customer = await tx.customer.upsert({
          where: { restaurantId_phone: { restaurantId, phone: input.customerPhone } },
          update: { name: input.customerName ?? undefined },
          create: { restaurantId, phone: input.customerPhone, name: input.customerName ?? null },
        });
        customerId = customer.id;
      }

      if (input.tableId) {
        const t = await tx.table.findUnique({ where: { id: input.tableId } });
        if (!t || t.restaurantId !== restaurantId) throw HttpError.badRequest('Table not found');
      }

      const orderNumber = await nextOrderNumber(tx, restaurantId);
      const order = await tx.order.create({
        data: {
          restaurantId,
          orderNumber,
          type: input.type,
          status: OrderStatus.DRAFT,
          tableId: input.tableId,
          customerId,
          createdById: userId,
          guestCount: input.guestCount,
          notes: input.notes,
        },
      });

      for (const itemInput of input.items) {
        const priced = await priceLine(tx, restaurantId, itemInput);
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: itemInput.menuItemId,
            variantId: priced.variantId,
            nameSnapshot: priced.nameSnapshot,
            unitPrice: priced.unitPrice,
            taxRate: priced.taxRate,
            quantity: itemInput.quantity,
            modifiers: priced.modifiers as unknown as Prisma.InputJsonValue,
            notes: itemInput.notes,
          },
        });
      }

      if (input.tableId && input.type === OrderType.DINE_IN) {
        await tx.table.update({ where: { id: input.tableId }, data: { status: TableStatus.OCCUPIED } });
      }

      await recomputeOrderTotals(tx, order.id);
      return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
    });
  },

  update: async (restaurantId: string, id: string, input: UpdateOrderInput) => {
    const existing = await prisma.order.findUnique({ where: { id } });
    await ensureOwn(existing, restaurantId);
    if (existing!.status === OrderStatus.COMPLETED || existing!.status === OrderStatus.CANCELLED) {
      throw HttpError.conflict('Cannot modify a completed or cancelled order');
    }

    return prisma.$transaction(async (tx) => {
      const data: Prisma.OrderUpdateInput = {
        guestCount: input.guestCount,
        notes: input.notes,
        discountAmount: input.discountAmount,
        discountReason: input.discountReason,
      };
      if (input.tableId !== undefined) data.table = input.tableId ? { connect: { id: input.tableId } } : { disconnect: true };
      if (input.customerId !== undefined)
        data.customer = input.customerId ? { connect: { id: input.customerId } } : { disconnect: true };

      if (input.serviceChargePct !== undefined) {
        // Re-compute service charge from subTotal × pct
        const items = await tx.orderItem.findMany({ where: { orderId: id, status: { not: 'CANCELLED' } } });
        const sub = sumDecimal(items.map((i) => toDecimal(i.unitPrice).mul(i.quantity)));
        data.serviceCharge = round2(sub.mul(input.serviceChargePct).div(100));
      }

      await tx.order.update({ where: { id }, data });
      await recomputeOrderTotals(tx, id);
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });
  },

  addItem: async (restaurantId: string, orderId: string, input: AddOrderItemInput) => {
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    await ensureOwn(existing, restaurantId);
    if (existing!.status === OrderStatus.COMPLETED || existing!.status === OrderStatus.CANCELLED) {
      throw HttpError.conflict('Cannot add items to a completed or cancelled order');
    }
    return prisma.$transaction(async (tx) => {
      const priced = await priceLine(tx, restaurantId, input);
      await tx.orderItem.create({
        data: {
          orderId,
          menuItemId: input.menuItemId,
          variantId: priced.variantId,
          nameSnapshot: priced.nameSnapshot,
          unitPrice: priced.unitPrice,
          taxRate: priced.taxRate,
          quantity: input.quantity,
          modifiers: priced.modifiers as unknown as Prisma.InputJsonValue,
          notes: input.notes,
        },
      });
      await recomputeOrderTotals(tx, orderId);
      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    });
  },

  updateItem: async (restaurantId: string, orderId: string, itemId: string, input: UpdateOrderItemInput) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    await ensureOwn(order, restaurantId);
    const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw HttpError.notFound();

    return prisma.$transaction(async (tx) => {
      if (input.quantity === 0) {
        await tx.orderItem.delete({ where: { id: itemId } });
      } else {
        await tx.orderItem.update({
          where: { id: itemId },
          data: {
            quantity: input.quantity,
            notes: input.notes,
            status: input.status,
          },
        });
      }
      await recomputeOrderTotals(tx, orderId);
      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    });
  },

  removeItem: async (restaurantId: string, orderId: string, itemId: string) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    await ensureOwn(order, restaurantId);
    const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw HttpError.notFound();

    return prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: itemId } });
      await recomputeOrderTotals(tx, orderId);
      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    });
  },

  // ----- Kitchen Display System -----
  kitchenQueue: (restaurantId: string) =>
    prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: [OrderStatus.PREPARING, OrderStatus.READY] },
        items: { some: { status: { in: ['PREPARING', 'READY'] } } },
      },
      orderBy: { kotPrintedAt: 'asc' },
      include: {
        table: { select: { id: true, name: true } },
        items: {
          where: { status: { in: ['PREPARING', 'READY', 'SERVED'] } },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            nameSnapshot: true,
            quantity: true,
            notes: true,
            status: true,
            modifiers: true,
          },
        },
      },
    }),

  setItemStatus: async (
    restaurantId: string,
    orderId: string,
    itemId: string,
    status: 'PREPARING' | 'READY' | 'SERVED',
  ) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    await ensureOwn(order, restaurantId);
    const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw HttpError.notFound();

    return prisma.$transaction(async (tx) => {
      await tx.orderItem.update({ where: { id: itemId }, data: { status } });

      // Recompute order status from its active items
      const items = await tx.orderItem.findMany({
        where: { orderId, status: { not: 'CANCELLED' } },
        select: { status: true },
      });
      if (items.length > 0) {
        const allServed = items.every((i) => i.status === 'SERVED');
        const allReadyOrServed = items.every((i) => i.status === 'READY' || i.status === 'SERVED');
        let next: OrderStatus | undefined;
        if (allServed) next = OrderStatus.SERVED;
        else if (allReadyOrServed) next = OrderStatus.READY;
        else next = OrderStatus.PREPARING;
        if (next && next !== order!.status && order!.status !== OrderStatus.COMPLETED) {
          await tx.order.update({ where: { id: orderId }, data: { status: next } });
        }
      }
      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    });
  },

  sendToKitchen: async (restaurantId: string, orderId: string) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    await ensureOwn(order, restaurantId);
    if (order!.status === OrderStatus.COMPLETED || order!.status === OrderStatus.CANCELLED) {
      throw HttpError.conflict('Order is not active');
    }
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status: 'PREPARING', kotPrintedAt: now },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PREPARING,
          kotPrintedAt: order!.kotPrintedAt ?? now,
        },
      });
      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    });
  },

  cancel: async (restaurantId: string, orderId: string, reason: string | undefined) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    await ensureOwn(order, restaurantId);
    if (order!.status === OrderStatus.COMPLETED) throw HttpError.conflict('Cannot cancel a completed order');
    return prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { orderId, status: { not: 'SERVED' } },
        data: { status: 'CANCELLED' },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelReason: reason,
          cancelledAt: new Date(),
        },
      });
      if (order!.tableId) {
        const activeOnTable = await tx.order.count({
          where: {
            tableId: order!.tableId,
            status: { in: [OrderStatus.DRAFT, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED] },
          },
        });
        if (activeOnTable === 0) {
          await tx.table.update({ where: { id: order!.tableId }, data: { status: TableStatus.FREE } });
        }
      }
      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    });
  },
};
