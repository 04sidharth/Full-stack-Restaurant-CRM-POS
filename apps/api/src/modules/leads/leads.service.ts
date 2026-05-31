import { LeadStatus, LeadSource } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';

const include = {
  assignedTo: { select: { id: true, name: true } },
  createdBy:  { select: { id: true, name: true } },
  _count:     { select: { communications: true, tasks: true } },
};

export const leadsService = {
  list: async (restaurantId: string, params: { status?: LeadStatus; search?: string; assignedToId?: string }) => {
    return prisma.lead.findMany({
      where: {
        restaurantId,
        ...(params.status ? { status: params.status } : {}),
        ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
        ...(params.search ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { company: { contains: params.search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include,
      orderBy: { createdAt: 'desc' },
    });
  },

  pipeline: async (restaurantId: string) => {
    const statuses: LeadStatus[] = ['NEW','CONTACTED','QUALIFIED','PROPOSAL','WON','LOST'];
    const [leads, counts] = await Promise.all([
      prisma.lead.findMany({ where: { restaurantId }, include, orderBy: { createdAt: 'desc' } }),
      prisma.lead.groupBy({
        by: ['status'],
        where: { restaurantId },
        _count: { id: true },
        _sum:   { value: true },
      }),
    ]);
    const summary = Object.fromEntries(statuses.map((s) => [s, { count: 0, value: '0' }]));
    counts.forEach((c) => {
      summary[c.status] = { count: c._count.id, value: c._sum.value?.toString() ?? '0' };
    });
    return { leads, summary };
  },

  get: async (restaurantId: string, id: string) => {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        ...include,
        communications: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        tasks:          { include: { assignedTo: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lead || lead.restaurantId !== restaurantId) throw HttpError.notFound();
    return lead;
  },

  create: async (restaurantId: string, userId: string, input: {
    name: string; phone?: string; email?: string; company?: string;
    status?: LeadStatus; source?: LeadSource; value?: number; notes?: string;
    assignedToId?: string; expectedClose?: string;
  }) => {
    return prisma.lead.create({
      data: {
        restaurantId,
        createdById: userId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        company: input.company,
        status: input.status ?? 'NEW',
        source: input.source ?? 'OTHER',
        value: input.value ?? 0,
        notes: input.notes,
        assignedToId: input.assignedToId,
        expectedClose: input.expectedClose ? new Date(input.expectedClose) : undefined,
      },
      include,
    });
  },

  update: async (restaurantId: string, id: string, input: {
    name?: string; phone?: string; email?: string; company?: string;
    status?: LeadStatus; source?: LeadSource; value?: number; notes?: string;
    assignedToId?: string; expectedClose?: string; lostReason?: string;
  }) => {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing || existing.restaurantId !== restaurantId) throw HttpError.notFound();

    const now = new Date();
    const wonAt  = input.status === 'WON'  && existing.status !== 'WON'  ? now : undefined;
    const lostAt = input.status === 'LOST' && existing.status !== 'LOST' ? now : undefined;

    return prisma.lead.update({
      where: { id },
      data: {
        ...input,
        expectedClose: input.expectedClose ? new Date(input.expectedClose) : undefined,
        ...(wonAt  ? { wonAt  } : {}),
        ...(lostAt ? { lostAt } : {}),
      },
      include,
    });
  },

  remove: async (restaurantId: string, id: string) => {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing || existing.restaurantId !== restaurantId) throw HttpError.notFound();
    await prisma.lead.delete({ where: { id } });
  },
};
