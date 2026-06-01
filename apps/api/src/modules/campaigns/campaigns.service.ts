import { Prisma, type CampaignSegment, type CampaignChannel } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type { CreateCampaignInput, ListCampaignsQuery } from './campaigns.schema.js';

// Segment criteria (in days for last-visit cutoffs)
const SEGMENT_THRESHOLDS = {
  NEW_DAYS: 30,       // created within 30 days
  AT_RISK_DAYS: 30,   // no visit in 30+ days but previously visited
  INACTIVE_DAYS: 60,  // no visit in 60+ days OR no orders at all
  REGULAR_ORDERS: 3,  // 3+ orders = regular
  VIP_SPEND: 25000,   // ₹25,000+ total spend = VIP
};

function segmentWhere(restaurantId: string, segment: CampaignSegment): Prisma.CustomerWhereInput {
  const now = new Date();
  const base: Prisma.CustomerWhereInput = { restaurantId, active: true };

  switch (segment) {
    case 'ALL':
      return base;
    case 'NEW': {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - SEGMENT_THRESHOLDS.NEW_DAYS);
      return { ...base, createdAt: { gte: cutoff } };
    }
    case 'REGULAR':
      return { ...base, totalOrders: { gte: SEGMENT_THRESHOLDS.REGULAR_ORDERS } };
    case 'VIP':
      return { ...base, totalSpend: { gte: SEGMENT_THRESHOLDS.VIP_SPEND } };
    case 'AT_RISK': {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - SEGMENT_THRESHOLDS.AT_RISK_DAYS);
      return {
        ...base,
        totalOrders: { gte: 1 },
        lastVisitAt: { lt: cutoff },
      };
    }
    case 'INACTIVE': {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - SEGMENT_THRESHOLDS.INACTIVE_DAYS);
      return {
        ...base,
        OR: [
          { totalOrders: 0 },
          { lastVisitAt: { lt: cutoff } },
        ],
      };
    }
  }
}

export const campaignService = {
  list: (restaurantId: string, q: ListCampaignsQuery) =>
    prisma.campaign.findMany({
      where: {
        restaurantId,
        ...(q.status ? { status: q.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: q.limit,
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { logs: true } },
      },
    }),

  get: async (restaurantId: string, id: string) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        logs: {
          take: 100,
          orderBy: { sentAt: 'desc' },
          include: { customer: { select: { id: true, name: true, phone: true } } },
        },
      },
    });
    if (!campaign || campaign.restaurantId !== restaurantId) throw HttpError.notFound();
    return campaign;
  },

  // Preview how many customers a segment targets
  previewSegment: async (restaurantId: string, segment: CampaignSegment) => {
    const count = await prisma.customer.count({ where: segmentWhere(restaurantId, segment) });
    return { segment, count };
  },

  create: async (restaurantId: string, createdById: string, input: CreateCampaignInput) => {
    const targetCount = await prisma.customer.count({
      where: segmentWhere(restaurantId, input.targetSegment as CampaignSegment),
    });
    return prisma.campaign.create({
      data: {
        restaurantId,
        createdById,
        targetCount,
        ...input,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  },

  // Execute campaign: mark as SENT and create log entries + communication records
  execute: async (restaurantId: string, id: string) => {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.restaurantId !== restaurantId) throw HttpError.notFound();
    if (campaign.status === 'SENT') throw HttpError.conflict('Campaign already sent');

    const customers = await prisma.customer.findMany({
      where: segmentWhere(restaurantId, campaign.targetSegment as CampaignSegment),
      select: { id: true, phone: true, name: true },
    });

    const commTypeMap: Record<CampaignChannel, 'SMS' | 'WHATSAPP' | 'EMAIL'> = {
      SMS: 'SMS',
      WHATSAPP: 'WHATSAPP',
      EMAIL: 'EMAIL',
    };

    await prisma.$transaction(async (tx) => {
      // Create campaign log entries
      await tx.campaignLog.createMany({
        data: customers.map((c) => ({
          campaignId: id,
          customerId: c.id,
          channel: campaign.channel,
          status: 'SENT',
        })),
      });

      // Create communication records for each customer
      await tx.communication.createMany({
        data: customers.map((c) => ({
          restaurantId,
          customerId: c.id,
          type: commTypeMap[campaign.channel as CampaignChannel],
          direction: 'OUTBOUND' as const,
          subject: `Campaign: ${campaign.name}`,
          body: campaign.messageBody,
          createdById: campaign.createdById,
        })),
      });

      // Mark campaign as sent
      await tx.campaign.update({
        where: { id },
        data: { status: 'SENT', sentAt: new Date(), sentCount: customers.length },
      });
    });

    return { sent: customers.length };
  },

  delete: async (restaurantId: string, id: string) => {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.restaurantId !== restaurantId) throw HttpError.notFound();
    if (campaign.status === 'SENT') throw HttpError.conflict('Cannot delete a sent campaign');
    await prisma.campaign.delete({ where: { id } });
    return { deleted: true };
  },
};
