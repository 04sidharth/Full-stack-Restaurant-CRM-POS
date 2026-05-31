import { TaskStatus, TaskPriority } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';

const include = {
  assignedTo: { select: { id: true, name: true } },
  createdBy:  { select: { id: true, name: true } },
  lead:       { select: { id: true, name: true, company: true } },
  customer:   { select: { id: true, name: true, phone: true } },
};

export const tasksService = {
  list: async (restaurantId: string, params: { status?: TaskStatus; priority?: TaskPriority; leadId?: string; customerId?: string; assignedToId?: string; overdue?: boolean }) => {
    const now = new Date();
    return prisma.task.findMany({
      where: {
        restaurantId,
        ...(params.status       ? { status: params.status }                      : {}),
        ...(params.priority     ? { priority: params.priority }                  : {}),
        ...(params.leadId       ? { leadId: params.leadId }                      : {}),
        ...(params.customerId   ? { customerId: params.customerId }              : {}),
        ...(params.assignedToId ? { assignedToId: params.assignedToId }          : {}),
        ...(params.overdue      ? { dueDate: { lt: now }, status: { in: ['PENDING','IN_PROGRESS'] } } : {}),
      },
      include,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  },

  create: async (restaurantId: string, userId: string, input: {
    title: string; description?: string; dueDate?: string; priority?: TaskPriority;
    leadId?: string; customerId?: string; assignedToId?: string;
  }) => {
    return prisma.task.create({
      data: {
        restaurantId,
        createdById: userId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        priority: input.priority ?? 'MEDIUM',
        leadId: input.leadId,
        customerId: input.customerId,
        assignedToId: input.assignedToId,
      },
      include,
    });
  },

  update: async (restaurantId: string, id: string, input: {
    title?: string; description?: string; dueDate?: string; status?: TaskStatus;
    priority?: TaskPriority; assignedToId?: string;
  }) => {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.restaurantId !== restaurantId) throw HttpError.notFound();
    const completedAt = input.status === 'DONE' && existing.status !== 'DONE' ? new Date() : undefined;
    return prisma.task.update({
      where: { id },
      data: {
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        ...(completedAt ? { completedAt } : {}),
      },
      include,
    });
  },

  remove: async (restaurantId: string, id: string) => {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.restaurantId !== restaurantId) throw HttpError.notFound();
    await prisma.task.delete({ where: { id } });
  },
};
