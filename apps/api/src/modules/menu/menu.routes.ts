import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { categoryService, menuItemService, modifierGroupService } from './menu.service.js';
import {
  createCategorySchema,
  createMenuItemSchema,
  createModifierGroupSchema,
  listMenuItemsQuery,
  reorderCategoriesSchema,
  updateCategorySchema,
  updateMenuItemSchema,
  updateModifierGroupSchema,
  type ListMenuItemsQuery,
} from './menu.schema.js';

export const menuRouter = Router();

const canEdit = requireRole(UserRole.OWNER, UserRole.MANAGER);

menuRouter.use(requireAuth);

const idParam = (req: { params: Record<string, string | undefined> | unknown }): string => {
  const params = req.params as Record<string, string | undefined>;
  const id = params.id;
  if (!id) throw new Error('Missing :id route param');
  return id;
};

// ----- Categories -----
menuRouter.get(
  '/categories',
  asyncHandler(async (req, res) => {
    res.json(await categoryService.list(req.auth!.restaurantId));
  }),
);

menuRouter.post(
  '/categories',
  canEdit,
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    const cat = await categoryService.create(req.auth!.restaurantId, req.body);
    res.status(201).json(cat);
  }),
);

menuRouter.patch(
  '/categories/:id',
  canEdit,
  validate(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const cat = await categoryService.update(req.auth!.restaurantId, idParam(req), req.body);
    res.json(cat);
  }),
);

menuRouter.delete(
  '/categories/:id',
  canEdit,
  asyncHandler(async (req, res) => {
    await categoryService.delete(req.auth!.restaurantId, idParam(req));
    res.status(204).end();
  }),
);

menuRouter.post(
  '/categories/reorder',
  canEdit,
  validate(reorderCategoriesSchema),
  asyncHandler(async (req, res) => {
    res.json(await categoryService.reorder(req.auth!.restaurantId, req.body));
  }),
);

// ----- Menu items -----
menuRouter.get(
  '/items',
  validate(listMenuItemsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as ListMenuItemsQuery;
    res.json(await menuItemService.list(req.auth!.restaurantId, q));
  }),
);

menuRouter.get(
  '/items/:id',
  asyncHandler(async (req, res) => {
    res.json(await menuItemService.get(req.auth!.restaurantId, idParam(req)));
  }),
);

menuRouter.post(
  '/items',
  canEdit,
  validate(createMenuItemSchema),
  asyncHandler(async (req, res) => {
    const item = await menuItemService.create(req.auth!.restaurantId, req.body);
    res.status(201).json(item);
  }),
);

menuRouter.patch(
  '/items/:id',
  canEdit,
  validate(updateMenuItemSchema),
  asyncHandler(async (req, res) => {
    const item = await menuItemService.update(req.auth!.restaurantId, idParam(req), req.body);
    res.json(item);
  }),
);

menuRouter.post(
  '/items/:id/availability',
  validate(z.object({ available: z.boolean() })),
  asyncHandler(async (req, res) => {
    const item = await menuItemService.toggleAvailability(
      req.auth!.restaurantId,
      idParam(req),
      req.body.available,
    );
    res.json(item);
  }),
);

menuRouter.delete(
  '/items/:id',
  canEdit,
  asyncHandler(async (req, res) => {
    await menuItemService.delete(req.auth!.restaurantId, idParam(req));
    res.status(204).end();
  }),
);

// ----- Modifier groups -----
menuRouter.get(
  '/modifier-groups',
  asyncHandler(async (req, res) => {
    res.json(await modifierGroupService.list(req.auth!.restaurantId));
  }),
);

menuRouter.post(
  '/modifier-groups',
  canEdit,
  validate(createModifierGroupSchema),
  asyncHandler(async (req, res) => {
    const group = await modifierGroupService.create(req.auth!.restaurantId, req.body);
    res.status(201).json(group);
  }),
);

menuRouter.patch(
  '/modifier-groups/:id',
  canEdit,
  validate(updateModifierGroupSchema),
  asyncHandler(async (req, res) => {
    const group = await modifierGroupService.update(req.auth!.restaurantId, idParam(req), req.body);
    res.json(group);
  }),
);

menuRouter.delete(
  '/modifier-groups/:id',
  canEdit,
  asyncHandler(async (req, res) => {
    await modifierGroupService.delete(req.auth!.restaurantId, idParam(req));
    res.status(204).end();
  }),
);
