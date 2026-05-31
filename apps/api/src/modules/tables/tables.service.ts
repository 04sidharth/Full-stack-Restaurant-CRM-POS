import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type {
  CreateSectionInput,
  CreateTableInput,
  UpdateSectionInput,
  UpdateTableInput,
} from './tables.schema.js';

const ensureOwn = async <T extends { restaurantId: string } | null>(row: T, restaurantId: string): Promise<NonNullable<T>> => {
  if (!row || row.restaurantId !== restaurantId) throw HttpError.notFound();
  return row as NonNullable<T>;
};

export const sectionService = {
  list: (restaurantId: string) =>
    prisma.section.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        tables: {
          orderBy: { name: 'asc' },
        },
      },
    }),

  create: (restaurantId: string, input: CreateSectionInput) =>
    prisma.section.create({ data: { ...input, restaurantId } }),

  update: async (restaurantId: string, id: string, input: UpdateSectionInput) => {
    const existing = await prisma.section.findUnique({ where: { id } });
    await ensureOwn(existing, restaurantId);
    return prisma.section.update({ where: { id }, data: input });
  },

  delete: async (restaurantId: string, id: string) => {
    const existing = await prisma.section.findUnique({
      where: { id },
      include: { _count: { select: { tables: true } } },
    });
    await ensureOwn(existing, restaurantId);
    if (existing && existing._count.tables > 0) {
      throw HttpError.conflict('This section has tables. Move or delete them first.');
    }
    await prisma.section.delete({ where: { id } });
  },
};

export const tableService = {
  list: (restaurantId: string) =>
    prisma.table.findMany({
      where: { restaurantId },
      orderBy: [{ section: { sortOrder: 'asc' } }, { name: 'asc' }],
      include: {
        section: { select: { id: true, name: true } },
      },
    }),

  create: async (restaurantId: string, input: CreateTableInput) => {
    const section = await prisma.section.findUnique({ where: { id: input.sectionId } });
    await ensureOwn(section, restaurantId);
    return prisma.table.create({
      data: {
        restaurantId,
        sectionId: input.sectionId,
        name: input.name,
        capacity: input.capacity,
      },
      include: { section: { select: { id: true, name: true } } },
    });
  },

  update: async (restaurantId: string, id: string, input: UpdateTableInput) => {
    const existing = await prisma.table.findUnique({ where: { id } });
    await ensureOwn(existing, restaurantId);
    if (input.sectionId && input.sectionId !== existing!.sectionId) {
      const section = await prisma.section.findUnique({ where: { id: input.sectionId } });
      await ensureOwn(section, restaurantId);
    }
    return prisma.table.update({
      where: { id },
      data: input,
      include: { section: { select: { id: true, name: true } } },
    });
  },

  delete: async (restaurantId: string, id: string) => {
    const existing = await prisma.table.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    await ensureOwn(existing, restaurantId);
    if (existing && existing._count.orders > 0) {
      throw HttpError.conflict('This table has past orders. It cannot be deleted.');
    }
    await prisma.table.delete({ where: { id } });
  },
};
