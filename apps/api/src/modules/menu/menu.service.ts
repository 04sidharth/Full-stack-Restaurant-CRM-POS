import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type {
  CreateCategoryInput,
  CreateMenuItemInput,
  CreateModifierGroupInput,
  ListMenuItemsQuery,
  ReorderCategoriesInput,
  UpdateCategoryInput,
  UpdateMenuItemInput,
  UpdateModifierGroupInput,
} from './menu.schema.js';

const ensureOwn = async <T extends { restaurantId: string } | null>(row: T, restaurantId: string): Promise<NonNullable<T>> => {
  if (!row || row.restaurantId !== restaurantId) throw HttpError.notFound();
  return row as NonNullable<T>;
};

// ============================== Categories ==============================

export const categoryService = {
  list: (restaurantId: string) =>
    prisma.category.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),

  create: (restaurantId: string, input: CreateCategoryInput) =>
    prisma.category.create({
      data: { ...input, restaurantId },
    }),

  update: async (restaurantId: string, id: string, input: UpdateCategoryInput) => {
    const existing = await prisma.category.findUnique({ where: { id } });
    await ensureOwn(existing, restaurantId);
    return prisma.category.update({ where: { id }, data: input });
  },

  delete: async (restaurantId: string, id: string) => {
    const existing = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
    await ensureOwn(existing, restaurantId);
    if (existing && existing._count.items > 0) {
      throw HttpError.conflict('Category has menu items. Move or delete them first.');
    }
    await prisma.category.delete({ where: { id } });
  },

  reorder: async (restaurantId: string, input: ReorderCategoriesInput) => {
    // Ensure all IDs belong to this restaurant
    const owned = await prisma.category.findMany({
      where: { restaurantId, id: { in: input.ids } },
      select: { id: true },
    });
    if (owned.length !== input.ids.length) {
      throw HttpError.badRequest('Some category IDs are invalid');
    }
    await prisma.$transaction(
      input.ids.map((id, idx) =>
        prisma.category.update({ where: { id }, data: { sortOrder: idx + 1 } }),
      ),
    );
    return categoryService.list(restaurantId);
  },
};

// ============================== Menu items ==============================

const menuItemInclude = {
  category: { select: { id: true, name: true } },
  variants: { orderBy: { sortOrder: 'asc' } as const },
  modifierLinks: {
    include: {
      group: {
        include: { options: { where: { active: true } } },
      },
    },
  },
};

export const menuItemService = {
  list: (restaurantId: string, q: ListMenuItemsQuery) => {
    const where: Prisma.MenuItemWhereInput = { restaurantId };
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.available !== undefined) where.available = q.available;
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    return prisma.menuItem.findMany({
      where,
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: menuItemInclude,
    });
  },

  get: async (restaurantId: string, id: string) => {
    const item = await prisma.menuItem.findUnique({ where: { id }, include: menuItemInclude });
    return ensureOwn(item, restaurantId);
  },

  create: async (restaurantId: string, input: CreateMenuItemInput) => {
    // Verify category belongs to this tenant
    const cat = await prisma.category.findUnique({ where: { id: input.categoryId } });
    await ensureOwn(cat, restaurantId);

    // Verify modifier groups belong to this tenant
    if (input.modifierGroups.length > 0) {
      const groupIds = input.modifierGroups.map((m) => m.groupId);
      const found = await prisma.modifierGroup.findMany({
        where: { restaurantId, id: { in: groupIds } },
        select: { id: true },
      });
      if (found.length !== groupIds.length) {
        throw HttpError.badRequest('Some modifier groups are invalid');
      }
    }

    return prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        basePrice: input.basePrice,
        taxRate: input.taxRate,
        foodType: input.foodType,
        available: input.available,
        isRecommended: input.isRecommended,
        sortOrder: input.sortOrder,
        preparationMins: input.preparationMins,
        variants: {
          create: input.variants.map(({ id: _id, ...v }) => v),
        },
        modifierLinks: {
          create: input.modifierGroups.map((m) => ({ groupId: m.groupId })),
        },
      },
      include: menuItemInclude,
    });
  },

  update: async (restaurantId: string, id: string, input: UpdateMenuItemInput) => {
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    await ensureOwn(existing, restaurantId);

    if (input.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: input.categoryId } });
      await ensureOwn(cat, restaurantId);
    }

    if (input.modifierGroups) {
      const groupIds = input.modifierGroups.map((m) => m.groupId);
      if (groupIds.length > 0) {
        const found = await prisma.modifierGroup.findMany({
          where: { restaurantId, id: { in: groupIds } },
          select: { id: true },
        });
        if (found.length !== groupIds.length) {
          throw HttpError.badRequest('Some modifier groups are invalid');
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      await tx.menuItem.update({
        where: { id },
        data: {
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
          basePrice: input.basePrice,
          taxRate: input.taxRate,
          foodType: input.foodType,
          available: input.available,
          isRecommended: input.isRecommended,
          sortOrder: input.sortOrder,
          preparationMins: input.preparationMins,
        },
      });

      if (input.variants) {
        const incomingIds = input.variants.filter((v) => v.id).map((v) => v.id!);
        // Delete removed variants
        await tx.variant.deleteMany({
          where: { menuItemId: id, NOT: { id: { in: incomingIds.length > 0 ? incomingIds : ['__none__'] } } },
        });
        // Upsert each variant
        for (const v of input.variants) {
          if (v.id) {
            await tx.variant.update({
              where: { id: v.id },
              data: {
                name: v.name,
                priceDelta: v.priceDelta,
                sortOrder: v.sortOrder,
                active: v.active,
              },
            });
          } else {
            await tx.variant.create({
              data: {
                menuItemId: id,
                name: v.name,
                priceDelta: v.priceDelta,
                sortOrder: v.sortOrder,
                active: v.active,
              },
            });
          }
        }
      }

      if (input.modifierGroups) {
        await tx.menuItemModifierGroup.deleteMany({ where: { menuItemId: id } });
        if (input.modifierGroups.length > 0) {
          await tx.menuItemModifierGroup.createMany({
            data: input.modifierGroups.map((m) => ({ menuItemId: id, groupId: m.groupId })),
          });
        }
      }

      return tx.menuItem.findUniqueOrThrow({ where: { id }, include: menuItemInclude });
    });
  },

  toggleAvailability: async (restaurantId: string, id: string, available: boolean) => {
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    await ensureOwn(existing, restaurantId);
    return prisma.menuItem.update({ where: { id }, data: { available } });
  },

  delete: async (restaurantId: string, id: string) => {
    const existing = await prisma.menuItem.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });
    await ensureOwn(existing, restaurantId);
    if (existing && existing._count.orderItems > 0) {
      // Soft-disable instead of hard delete to preserve order history
      await prisma.menuItem.update({ where: { id }, data: { available: false } });
      throw HttpError.conflict('Item has past orders. It was disabled instead of deleted.');
    }
    await prisma.menuItem.delete({ where: { id } });
  },
};

// ============================== Modifier groups ==============================

const modifierGroupInclude = {
  options: { orderBy: { name: 'asc' } as const },
  _count: { select: { itemLinks: true } },
};

export const modifierGroupService = {
  list: (restaurantId: string) =>
    prisma.modifierGroup.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
      include: modifierGroupInclude,
    }),

  get: async (restaurantId: string, id: string) => {
    const group = await prisma.modifierGroup.findUnique({ where: { id }, include: modifierGroupInclude });
    return ensureOwn(group, restaurantId);
  },

  create: (restaurantId: string, input: CreateModifierGroupInput) =>
    prisma.modifierGroup.create({
      data: {
        restaurantId,
        name: input.name,
        minSelect: input.minSelect,
        maxSelect: input.maxSelect,
        required: input.required,
        options: {
          create: input.options.map(({ id: _id, ...opt }) => opt),
        },
      },
      include: modifierGroupInclude,
    }),

  update: async (restaurantId: string, id: string, input: UpdateModifierGroupInput) => {
    const existing = await prisma.modifierGroup.findUnique({ where: { id } });
    await ensureOwn(existing, restaurantId);

    return prisma.$transaction(async (tx) => {
      await tx.modifierGroup.update({
        where: { id },
        data: {
          name: input.name,
          minSelect: input.minSelect,
          maxSelect: input.maxSelect,
          required: input.required,
        },
      });

      if (input.options) {
        const incomingIds = input.options.filter((o) => o.id).map((o) => o.id!);
        await tx.modifier.deleteMany({
          where: { groupId: id, NOT: { id: { in: incomingIds.length > 0 ? incomingIds : ['__none__'] } } },
        });
        for (const o of input.options) {
          if (o.id) {
            await tx.modifier.update({
              where: { id: o.id },
              data: { name: o.name, priceDelta: o.priceDelta, active: o.active },
            });
          } else {
            await tx.modifier.create({
              data: { groupId: id, name: o.name, priceDelta: o.priceDelta, active: o.active },
            });
          }
        }
      }

      return tx.modifierGroup.findUniqueOrThrow({ where: { id }, include: modifierGroupInclude });
    });
  },

  delete: async (restaurantId: string, id: string) => {
    const existing = await prisma.modifierGroup.findUnique({
      where: { id },
      include: { _count: { select: { itemLinks: true } } },
    });
    await ensureOwn(existing, restaurantId);
    if (existing && existing._count.itemLinks > 0) {
      throw HttpError.conflict('This modifier group is attached to menu items. Unlink them first.');
    }
    await prisma.modifierGroup.delete({ where: { id } });
  },
};
