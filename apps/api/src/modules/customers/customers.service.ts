import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type {
  CreateCustomerInput,
  CustomerSegment,
  FeedbackInput,
  ListCustomersQuery,
  LoyaltyAdjustInput,
  UpdateCustomerInput,
} from './customers.schema.js';

function buildSegmentWhere(restaurantId: string, segment?: CustomerSegment): Prisma.CustomerWhereInput {
  const now = new Date();
  const base: Prisma.CustomerWhereInput = { restaurantId };

  switch (segment) {
    case 'NEW': {
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
      return { ...base, createdAt: { gte: cutoff } };
    }
    case 'REGULAR':
      return { ...base, totalOrders: { gte: 3 } };
    case 'VIP':
      return { ...base, totalSpend: { gte: 25000 } };
    case 'AT_RISK': {
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
      return { ...base, totalOrders: { gte: 1 }, lastVisitAt: { lt: cutoff } };
    }
    case 'INACTIVE': {
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 60);
      return { ...base, OR: [{ totalOrders: 0 }, { lastVisitAt: { lt: cutoff } }] };
    }
    default:
      return base;
  }
}

const ensureOwn = async <T extends { restaurantId: string } | null>(row: T, restaurantId: string): Promise<NonNullable<T>> => {
  if (!row || row.restaurantId !== restaurantId) throw HttpError.notFound();
  return row as NonNullable<T>;
};

export const customerService = {
  list: (restaurantId: string, q: ListCustomersQuery) => {
    const where: Prisma.CustomerWhereInput = buildSegmentWhere(restaurantId, q.segment);
    if (q.search) {
      where.AND = [
        {
          OR: [
            { phone: { contains: q.search } },
            { name: { contains: q.search, mode: 'insensitive' } },
            { email: { contains: q.search, mode: 'insensitive' } },
          ],
        },
      ];
    }
    return prisma.customer.findMany({
      where,
      orderBy: { lastVisitAt: { sort: 'desc', nulls: 'last' } },
      take: q.limit,
    });
  },

  segmentCounts: async (restaurantId: string) => {
    const now = new Date();
    const cutoff30 = new Date(now); cutoff30.setDate(cutoff30.getDate() - 30);
    const cutoff60 = new Date(now); cutoff60.setDate(cutoff60.getDate() - 60);
    const [total, newC, regular, vip, atRisk, inactive] = await Promise.all([
      prisma.customer.count({ where: { restaurantId } }),
      prisma.customer.count({ where: { restaurantId, createdAt: { gte: cutoff30 } } }),
      prisma.customer.count({ where: { restaurantId, totalOrders: { gte: 3 } } }),
      prisma.customer.count({ where: { restaurantId, totalSpend: { gte: 25000 } } }),
      prisma.customer.count({ where: { restaurantId, totalOrders: { gte: 1 }, lastVisitAt: { lt: cutoff30 } } }),
      prisma.customer.count({ where: { restaurantId, OR: [{ totalOrders: 0 }, { lastVisitAt: { lt: cutoff60 } }] } }),
    ]);
    return { ALL: total, NEW: newC, REGULAR: regular, VIP: vip, AT_RISK: atRisk, INACTIVE: inactive };
  },

  insights: async (restaurantId: string, id: string) => {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer || customer.restaurantId !== restaurantId) throw HttpError.notFound();

    // Top ordered items
    const topItems = await prisma.orderItem.groupBy({
      by: ['nameSnapshot'],
      where: { order: { restaurantId, customerId: id, status: 'COMPLETED' } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    // Visit frequency: avg days between orders
    const completedOrders = await prisma.order.findMany({
      where: { restaurantId, customerId: id, status: 'COMPLETED' },
      select: { completedAt: true, total: true },
      orderBy: { completedAt: 'asc' },
    });

    let avgDaysBetweenVisits: number | null = null;
    if (completedOrders.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < completedOrders.length; i++) {
        const a = completedOrders[i - 1].completedAt!.getTime();
        const b = completedOrders[i].completedAt!.getTime();
        gaps.push((b - a) / 86400000);
      }
      avgDaysBetweenVisits = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    }

    const avgSpendPerVisit =
      completedOrders.length > 0
        ? completedOrders.reduce((s, o) => s + Number(o.total), 0) / completedOrders.length
        : 0;

    return {
      topItems: topItems.map((i) => ({ name: i.nameSnapshot, quantity: i._sum.quantity ?? 0 })),
      avgDaysBetweenVisits,
      avgSpendPerVisit,
      totalCompletedOrders: completedOrders.length,
    };
  },

  get: async (restaurantId: string, id: string) => {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            table: { select: { id: true, name: true } },
            invoice: true,
          },
        },
        loyaltyTxns: { orderBy: { createdAt: 'desc' }, take: 50 },
        feedbacks: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    return ensureOwn(customer, restaurantId);
  },

  create: async (restaurantId: string, input: CreateCustomerInput) => {
    const existing = await prisma.customer.findUnique({
      where: { restaurantId_phone: { restaurantId, phone: input.phone } },
    });
    if (existing) throw HttpError.conflict('A customer with this phone already exists');
    return prisma.customer.create({
      data: {
        ...input,
        dob: input.dob ? new Date(input.dob) : undefined,
        anniversary: input.anniversary ? new Date(input.anniversary) : undefined,
        restaurantId,
      },
    });
  },

  update: async (restaurantId: string, id: string, input: UpdateCustomerInput) => {
    const existing = await prisma.customer.findUnique({ where: { id } });
    await ensureOwn(existing, restaurantId);
    return prisma.customer.update({
      where: { id },
      data: {
        ...input,
        dob: input.dob ? new Date(input.dob) : undefined,
        anniversary: input.anniversary ? new Date(input.anniversary) : undefined,
      },
    });
  },

  delete: async (restaurantId: string, id: string) => {
    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    await ensureOwn(existing, restaurantId);
    if (existing!._count.orders > 0) {
      // Soft delete (deactivate)
      await prisma.customer.update({ where: { id }, data: { active: false } });
      return { soft: true };
    }
    await prisma.customer.delete({ where: { id } });
    return { soft: false };
  },

  adjustLoyalty: async (restaurantId: string, id: string, input: LoyaltyAdjustInput) => {
    const customer = await prisma.customer.findUnique({ where: { id } });
    await ensureOwn(customer, restaurantId);
    return prisma.$transaction(async (tx) => {
      await tx.loyaltyTransaction.create({
        data: {
          restaurantId,
          customerId: id,
          type: input.type,
          points: input.points,
          note: input.note,
          orderId: input.orderId,
        },
      });
      return tx.customer.update({
        where: { id },
        data: { loyaltyPoints: { increment: input.points } },
      });
    });
  },

  addFeedback: async (restaurantId: string, input: FeedbackInput) => {
    if (input.orderId) {
      const order = await prisma.order.findUnique({ where: { id: input.orderId } });
      if (!order || order.restaurantId !== restaurantId) throw HttpError.notFound('Order not found');
    }
    if (input.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
      if (!customer || customer.restaurantId !== restaurantId) throw HttpError.notFound('Customer not found');
    }
    return prisma.feedback.create({
      data: { restaurantId, ...input },
    });
  },

  listFeedback: (restaurantId: string) =>
    prisma.feedback.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
};
