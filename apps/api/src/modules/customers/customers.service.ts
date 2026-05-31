import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type {
  CreateCustomerInput,
  FeedbackInput,
  ListCustomersQuery,
  LoyaltyAdjustInput,
  UpdateCustomerInput,
} from './customers.schema.js';

const ensureOwn = async <T extends { restaurantId: string } | null>(row: T, restaurantId: string): Promise<NonNullable<T>> => {
  if (!row || row.restaurantId !== restaurantId) throw HttpError.notFound();
  return row as NonNullable<T>;
};

export const customerService = {
  list: (restaurantId: string, q: ListCustomersQuery) => {
    const where: Prisma.CustomerWhereInput = { restaurantId };
    if (q.search) {
      where.OR = [
        { phone: { contains: q.search } },
        { name: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    return prisma.customer.findMany({
      where,
      orderBy: { lastVisitAt: { sort: 'desc', nulls: 'last' } },
      take: q.limit,
    });
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
