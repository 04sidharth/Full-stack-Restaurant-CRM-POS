import { CommType, CommDirection } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';

const include = {
  createdBy: { select: { id: true, name: true } },
  customer:  { select: { id: true, name: true, phone: true } },
  lead:      { select: { id: true, name: true, company: true } },
};

export const communicationsService = {
  list: async (restaurantId: string, params: { customerId?: string; leadId?: string; type?: CommType; limit?: number }) => {
    return prisma.communication.findMany({
      where: {
        restaurantId,
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.leadId     ? { leadId:     params.leadId }     : {}),
        ...(params.type       ? { type:       params.type }       : {}),
      },
      include,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 100,
    });
  },

  create: async (restaurantId: string, userId: string, input: {
    customerId?: string; leadId?: string; type: CommType; direction?: CommDirection;
    subject?: string; body: string; durationMins?: number;
  }) => {
    if (!input.customerId && !input.leadId) throw HttpError.badRequest('Provide customerId or leadId');
    return prisma.communication.create({
      data: {
        restaurantId,
        createdById: userId,
        customerId: input.customerId,
        leadId: input.leadId,
        type: input.type,
        direction: input.direction ?? 'OUTBOUND',
        subject: input.subject,
        body: input.body,
        durationMins: input.durationMins,
      },
      include,
    });
  },

  remove: async (restaurantId: string, id: string) => {
    const c = await prisma.communication.findUnique({ where: { id } });
    if (!c || c.restaurantId !== restaurantId) throw HttpError.notFound();
    await prisma.communication.delete({ where: { id } });
  },
};
