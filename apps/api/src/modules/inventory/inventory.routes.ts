import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { recipeService, stockService } from './inventory.service.js';
import {
  addStockMovementSchema,
  createStockItemSchema,
  listMovementsQuery,
  updateStockItemSchema,
  upsertRecipeSchema,
  type ListMovementsQuery,
} from './inventory.schema.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

const canEdit = requireRole(UserRole.OWNER, UserRole.MANAGER);

const idParam = (req: { params: unknown }): string => {
  const params = req.params as Record<string, string | undefined>;
  const id = params.id;
  if (!id) throw new Error('Missing :id route param');
  return id;
};

// Stock items
inventoryRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await stockService.list(req.auth!.restaurantId));
  }),
);

inventoryRouter.get(
  '/low-stock',
  asyncHandler(async (req, res) => {
    res.json(await stockService.lowStock(req.auth!.restaurantId));
  }),
);

inventoryRouter.post(
  '/',
  canEdit,
  validate(createStockItemSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await stockService.create(req.auth!.restaurantId, req.body));
  }),
);

inventoryRouter.patch(
  '/:id',
  canEdit,
  validate(updateStockItemSchema),
  asyncHandler(async (req, res) => {
    res.json(await stockService.update(req.auth!.restaurantId, idParam(req), req.body));
  }),
);

inventoryRouter.delete(
  '/:id',
  canEdit,
  asyncHandler(async (req, res) => {
    res.json(await stockService.delete(req.auth!.restaurantId, idParam(req)));
  }),
);

// Stock movements
inventoryRouter.get(
  '/movements',
  validate(listMovementsQuery, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await stockService.listMovements(req.auth!.restaurantId, req.query as unknown as ListMovementsQuery));
  }),
);

inventoryRouter.post(
  '/movements',
  canEdit,
  validate(addStockMovementSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await stockService.addMovement(req.auth!.restaurantId, req.body));
  }),
);

// Recipes
inventoryRouter.get(
  '/recipes/:id',
  asyncHandler(async (req, res) => {
    res.json(await recipeService.byMenuItem(req.auth!.restaurantId, idParam(req)));
  }),
);

inventoryRouter.put(
  '/recipes',
  canEdit,
  validate(upsertRecipeSchema),
  asyncHandler(async (req, res) => {
    res.json(await recipeService.upsert(req.auth!.restaurantId, req.body));
  }),
);
