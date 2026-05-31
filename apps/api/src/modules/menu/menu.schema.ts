import { z } from 'zod';
import { FoodType } from '@prisma/client';

const cuid = z.string().min(1);

// ------------ Category ------------
export const createCategorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().max(500).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  active: z.boolean().optional(),
});

export const reorderCategoriesSchema = z.object({
  ids: z.array(cuid).min(1),
});

// ------------ Menu item ------------
const variantInput = z.object({
  id: cuid.optional(),
  name: z.string().min(1).max(40),
  priceDelta: z.coerce.number().min(-100000).max(100000),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

const modifierGroupLinkInput = z.object({ groupId: cuid });

export const createMenuItemSchema = z.object({
  categoryId: cuid,
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().max(500).optional(),
  basePrice: z.coerce.number().min(0).max(100000),
  taxRate: z.coerce.number().min(0).max(100).default(5),
  foodType: z.nativeEnum(FoodType).default(FoodType.VEG),
  available: z.boolean().default(true),
  isRecommended: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  preparationMins: z.number().int().min(0).max(600).optional(),
  variants: z.array(variantInput).default([]),
  modifierGroups: z.array(modifierGroupLinkInput).default([]),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const listMenuItemsQuery = z.object({
  categoryId: cuid.optional(),
  search: z.string().max(80).optional(),
  available: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
});

// ------------ Modifier groups ------------
const modifierInput = z.object({
  id: cuid.optional(),
  name: z.string().min(1).max(80),
  priceDelta: z.coerce.number().min(-100000).max(100000).default(0),
  active: z.boolean().default(true),
});

export const createModifierGroupSchema = z
  .object({
    name: z.string().min(1).max(80),
    minSelect: z.number().int().min(0).max(20).default(0),
    maxSelect: z.number().int().min(1).max(20).default(1),
    required: z.boolean().default(false),
    options: z.array(modifierInput).min(1),
  })
  .refine((d) => d.minSelect <= d.maxSelect, {
    message: 'minSelect cannot exceed maxSelect',
    path: ['minSelect'],
  });

export const updateModifierGroupSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    minSelect: z.number().int().min(0).max(20).optional(),
    maxSelect: z.number().int().min(1).max(20).optional(),
    required: z.boolean().optional(),
    options: z.array(modifierInput).optional(),
  })
  .refine((d) => d.minSelect === undefined || d.maxSelect === undefined || d.minSelect <= d.maxSelect, {
    message: 'minSelect cannot exceed maxSelect',
    path: ['minSelect'],
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type ListMenuItemsQuery = z.infer<typeof listMenuItemsQuery>;
export type CreateModifierGroupInput = z.infer<typeof createModifierGroupSchema>;
export type UpdateModifierGroupInput = z.infer<typeof updateModifierGroupSchema>;
