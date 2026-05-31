import { Prisma, OrderStatus, TableStatus } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import { computeLineTax, round2, sumDecimal, toDecimal } from '../../lib/money.js';
import { consumeRecipeStock } from '../inventory/inventory.service.js';
import type { AddPaymentInput, FinalizeBillInput } from './billing.schema.js';

const ensureOwn = async <T extends { restaurantId: string } | null>(row: T, restaurantId: string): Promise<NonNullable<T>> => {
  if (!row || row.restaurantId !== restaurantId) throw HttpError.notFound();
  return row as NonNullable<T>;
};

const orderInclude = {
  table: true,
  customer: true,
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

export interface BillSummary {
  order: Awaited<ReturnType<typeof prisma.order.findFirstOrThrow>> & {
    items: Awaited<ReturnType<typeof prisma.orderItem.findMany>>;
    payments: Awaited<ReturnType<typeof prisma.payment.findMany>>;
  };
  lines: Array<{
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
  }>;
  totals: {
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
  };
  interState: boolean;
}

export const billingService = {
  summary: async (restaurantId: string, orderId: string, interState: boolean): Promise<BillSummary> => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    await ensureOwn(order, restaurantId);

    const activeItems = order!.items.filter((i) => i.status !== 'CANCELLED');
    const lines = activeItems.map((i) => {
      const qty = i.quantity;
      const lineSub = round2(toDecimal(i.unitPrice).mul(qty));
      const tax = computeLineTax(lineSub, i.taxRate, interState);
      const lineTotal = round2(lineSub.add(tax.total));
      return {
        id: i.id,
        name: i.nameSnapshot,
        quantity: qty,
        unitPrice: i.unitPrice.toString(),
        taxRate: i.taxRate.toString(),
        lineSubTotal: lineSub.toString(),
        cgst: tax.cgst.toString(),
        sgst: tax.sgst.toString(),
        igst: tax.igst.toString(),
        lineTotal: lineTotal.toString(),
      };
    });

    const subTotal = sumDecimal(lines.map((l) => l.lineSubTotal));
    const cgst = sumDecimal(lines.map((l) => l.cgst));
    const sgst = sumDecimal(lines.map((l) => l.sgst));
    const igst = sumDecimal(lines.map((l) => l.igst));
    const taxTotal = cgst.add(sgst).add(igst);
    const discount = toDecimal(order!.discountAmount);
    const serviceCharge = toDecimal(order!.serviceCharge);
    const grandRaw = subTotal.sub(discount).add(serviceCharge).add(taxTotal);
    const grandTotal = round2(grandRaw);
    const roundOff = round2(grandTotal.sub(grandRaw));
    const paid = sumDecimal(order!.payments.map((p) => p.amount));
    const balance = round2(grandTotal.sub(paid));

    return {
      order: order as never,
      lines,
      totals: {
        subTotal: round2(subTotal).toString(),
        cgst: round2(cgst).toString(),
        sgst: round2(sgst).toString(),
        igst: round2(igst).toString(),
        taxTotal: round2(taxTotal).toString(),
        serviceCharge: round2(serviceCharge).toString(),
        discount: round2(discount).toString(),
        grandTotal: grandTotal.toString(),
        paid: round2(paid).toString(),
        balance: balance.toString(),
        roundOff: roundOff.toString(),
      },
      interState,
    };
  },

  addPayment: async (
    restaurantId: string,
    userId: string,
    orderId: string,
    input: AddPaymentInput,
  ) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    await ensureOwn(order, restaurantId);
    if (order!.status === OrderStatus.COMPLETED || order!.status === OrderStatus.CANCELLED) {
      throw HttpError.conflict('Order is already finalized');
    }
    return prisma.payment.create({
      data: {
        restaurantId,
        orderId,
        method: input.method,
        amount: input.amount,
        reference: input.reference,
        receivedById: userId,
      },
    });
  },

  removePayment: async (restaurantId: string, orderId: string, paymentId: string) => {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.restaurantId !== restaurantId || payment.orderId !== orderId) {
      throw HttpError.notFound();
    }
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order?.status === OrderStatus.COMPLETED) {
      throw HttpError.conflict('Cannot remove payment from a completed order');
    }
    await prisma.payment.delete({ where: { id: paymentId } });
  },

  finalize: async (restaurantId: string, orderId: string, input: FinalizeBillInput) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true, customer: true },
    });
    await ensureOwn(order, restaurantId);
    if (order!.status === OrderStatus.COMPLETED) {
      throw HttpError.conflict('Order is already completed');
    }
    if (order!.status === OrderStatus.CANCELLED) throw HttpError.conflict('Order is cancelled');

    // Compute totals deterministically
    const summary = await billingService.summary(restaurantId, orderId, input.interState);
    const balance = toDecimal(summary.totals.balance);
    if (balance.gt(0)) {
      throw HttpError.badRequest(`Payment is short by ₹${balance.toString()}. Add a payment first.`);
    }

    const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const seq = await tx.restaurant.update({
        where: { id: restaurantId },
        data: { nextInvoiceSeq: { increment: 1 } },
        select: { nextInvoiceSeq: true },
      });
      const seqNum = seq.nextInvoiceSeq - 1;
      const fy = now.getMonth() + 1 >= 4 ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}` : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(-2)}`;
      const invoiceNumber = `${restaurant.invoicePrefix}/${fy}/${seqNum.toString().padStart(5, '0')}`;

      await tx.invoice.create({
        data: {
          restaurantId,
          orderId,
          invoiceNumber,
          subTotal: summary.totals.subTotal,
          discountAmount: summary.totals.discount,
          cgst: summary.totals.cgst,
          sgst: summary.totals.sgst,
          igst: summary.totals.igst,
          serviceCharge: summary.totals.serviceCharge,
          roundOff: summary.totals.roundOff,
          total: summary.totals.grandTotal,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.COMPLETED,
          billedAt: order!.billedAt ?? now,
          completedAt: now,
          taxAmount: summary.totals.taxTotal,
          total: summary.totals.grandTotal,
          roundOff: summary.totals.roundOff,
        },
      });

      // Update customer rollups and award loyalty (1 point per ₹100)
      if (order!.customerId) {
        const earnedPoints = Math.floor(Number(summary.totals.grandTotal) / 100);
        await tx.customer.update({
          where: { id: order!.customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpend: { increment: new Prisma.Decimal(summary.totals.grandTotal) },
            lastVisitAt: now,
            loyaltyPoints: { increment: earnedPoints },
          },
        });
        if (earnedPoints > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              restaurantId,
              customerId: order!.customerId,
              orderId,
              type: 'EARN',
              points: earnedPoints,
              note: `Earned on order #${order!.orderNumber}`,
            },
          });
        }
      }

      // Auto-deduct stock based on recipes for this order
      await consumeRecipeStock(tx, restaurantId, orderId);

      // Free up the table if no other active orders on it
      if (order!.tableId) {
        const remaining = await tx.order.count({
          where: {
            tableId: order!.tableId,
            status: { in: [OrderStatus.DRAFT, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED] },
          },
        });
        if (remaining === 0) {
          await tx.table.update({ where: { id: order!.tableId }, data: { status: TableStatus.FREE } });
        }
      }

      return tx.invoice.findUniqueOrThrow({ where: { orderId } });
    });
  },
};
