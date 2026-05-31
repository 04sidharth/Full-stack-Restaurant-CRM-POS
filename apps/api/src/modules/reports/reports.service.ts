import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type { RangeQuery } from './reports.schema.js';

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const range = (q: RangeQuery): { from: Date; to: Date } => {
  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from, to };
};

export const reportsService = {
  salesSummary: async (restaurantId: string, q: RangeQuery) => {
    const { from, to } = range(q);

    const completed = await prisma.order.findMany({
      where: {
        restaurantId,
        status: 'COMPLETED',
        completedAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        type: true,
        completedAt: true,
        subTotal: true,
        taxAmount: true,
        discountAmount: true,
        serviceCharge: true,
        total: true,
        items: { select: { quantity: true } },
      },
    });

    const ordersByDay = new Map<string, { orders: number; revenue: number }>();
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalServiceCharge = 0;
    let totalItems = 0;
    const byType = { DINE_IN: 0, TAKEAWAY: 0, DELIVERY: 0 };

    for (const o of completed) {
      totalOrders += 1;
      totalRevenue += Number(o.total);
      totalTax += Number(o.taxAmount);
      totalDiscount += Number(o.discountAmount);
      totalServiceCharge += Number(o.serviceCharge);
      totalItems += o.items.reduce((s, i) => s + i.quantity, 0);
      byType[o.type] = (byType[o.type] ?? 0) + 1;
      const key = (o.completedAt ?? new Date()).toISOString().slice(0, 10);
      const bucket = ordersByDay.get(key) ?? { orders: 0, revenue: 0 };
      bucket.orders += 1;
      bucket.revenue += Number(o.total);
      ordersByDay.set(key, bucket);
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        orders: totalOrders,
        revenue: totalRevenue.toFixed(2),
        tax: totalTax.toFixed(2),
        discount: totalDiscount.toFixed(2),
        serviceCharge: totalServiceCharge.toFixed(2),
        items: totalItems,
        avgOrderValue: (totalOrders ? totalRevenue / totalOrders : 0).toFixed(2),
      },
      byType,
      daily: Array.from(ordersByDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, orders: v.orders, revenue: v.revenue.toFixed(2) })),
    };
  },

  itemSales: async (restaurantId: string, q: RangeQuery) => {
    const { from, to } = range(q);
    const rows = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: { restaurantId, status: 'COMPLETED', completedAt: { gte: from, lte: to } },
        status: { not: 'CANCELLED' },
      },
      _sum: { quantity: true },
      _count: { _all: true },
    });
    const ids = rows.map((r) => r.menuItemId);
    const items = await prisma.menuItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, basePrice: true, category: { select: { name: true } } },
    });
    const map = new Map(items.map((i) => [i.id, i]));

    // Also compute revenue per item (have to do this separately since group by can't include unitPrice * qty)
    const lineRows = await prisma.orderItem.findMany({
      where: {
        order: { restaurantId, status: 'COMPLETED', completedAt: { gte: from, lte: to } },
        status: { not: 'CANCELLED' },
      },
      select: { menuItemId: true, quantity: true, unitPrice: true },
    });
    const revenue = new Map<string, number>();
    for (const l of lineRows) {
      revenue.set(l.menuItemId, (revenue.get(l.menuItemId) ?? 0) + Number(l.unitPrice) * l.quantity);
    }

    return rows
      .map((r) => ({
        menuItemId: r.menuItemId,
        name: map.get(r.menuItemId)?.name ?? '(deleted item)',
        category: map.get(r.menuItemId)?.category.name ?? '—',
        quantitySold: r._sum.quantity ?? 0,
        lineCount: r._count._all,
        revenue: (revenue.get(r.menuItemId) ?? 0).toFixed(2),
      }))
      .sort((a, b) => Number(b.revenue) - Number(a.revenue));
  },

  paymentMix: async (restaurantId: string, q: RangeQuery) => {
    const { from, to } = range(q);
    const rows = await prisma.payment.groupBy({
      by: ['method'],
      where: { restaurantId, receivedAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    return rows
      .map((r) => ({
        method: r.method,
        count: r._count._all,
        total: Number(r._sum.amount ?? 0).toFixed(2),
      }))
      .sort((a, b) => Number(b.total) - Number(a.total));
  },

  gstSummary: async (restaurantId: string, q: RangeQuery) => {
    const { from, to } = range(q);
    const invoices = await prisma.invoice.findMany({
      where: { restaurantId, issuedAt: { gte: from, lte: to } },
      select: { cgst: true, sgst: true, igst: true, subTotal: true, total: true },
    });
    let subTotal = new Prisma.Decimal(0);
    let cgst = new Prisma.Decimal(0);
    let sgst = new Prisma.Decimal(0);
    let igst = new Prisma.Decimal(0);
    let total = new Prisma.Decimal(0);
    for (const inv of invoices) {
      subTotal = subTotal.add(inv.subTotal);
      cgst = cgst.add(inv.cgst);
      sgst = sgst.add(inv.sgst);
      igst = igst.add(inv.igst);
      total = total.add(inv.total);
    }
    return {
      invoices: invoices.length,
      subTotal: subTotal.toString(),
      cgst: cgst.toString(),
      sgst: sgst.toString(),
      igst: igst.toString(),
      taxTotal: cgst.add(sgst).add(igst).toString(),
      total: total.toString(),
    };
  },

  topCustomers: async (restaurantId: string, q: RangeQuery, limit = 10) => {
    const { from, to } = range(q);
    const rows = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        restaurantId,
        status: 'COMPLETED',
        completedAt: { gte: from, lte: to },
        customerId: { not: null },
      },
      _sum: { total: true },
      _count: { _all: true },
    });
    const ids = rows
      .map((r) => r.customerId)
      .filter((x): x is string => !!x);
    const customers = await prisma.customer.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, phone: true },
    });
    const map = new Map(customers.map((c) => [c.id, c]));
    return rows
      .map((r) => ({
        customerId: r.customerId!,
        name: map.get(r.customerId!)?.name ?? null,
        phone: map.get(r.customerId!)?.phone ?? '—',
        orders: r._count._all,
        spend: Number(r._sum.total ?? 0).toFixed(2),
      }))
      .sort((a, b) => Number(b.spend) - Number(a.spend))
      .slice(0, limit);
  },

  dashboard: async (restaurantId: string) => {
    const todayStart = startOfDay(new Date());
    const tomorrow = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [todaySales, activeOrders, occupiedTables, lowStock] = await Promise.all([
      prisma.order.aggregate({
        where: {
          restaurantId,
          status: 'COMPLETED',
          completedAt: { gte: todayStart, lt: tomorrow },
        },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: {
          restaurantId,
          status: { in: ['DRAFT', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'] },
        },
      }),
      prisma.table.count({
        where: { restaurantId, status: { in: ['OCCUPIED', 'BILLED'] } },
      }),
      prisma.stockItem.count({
        where: { restaurantId, active: true, currentQty: { lte: prisma.stockItem.fields.minQty } },
      }),
    ]);

    return {
      todaySales: {
        orders: todaySales._count._all,
        revenue: Number(todaySales._sum.total ?? 0).toFixed(2),
      },
      activeOrders,
      occupiedTables,
      lowStockItems: lowStock,
    };
  },
};
