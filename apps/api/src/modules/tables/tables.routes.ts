import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { sectionService, tableService } from './tables.service.js';
import {
  createSectionSchema,
  createTableSchema,
  updateSectionSchema,
  updateTableSchema,
} from './tables.schema.js';

export const tableRouter = Router();
tableRouter.use(requireAuth);

const canEdit = requireRole(UserRole.OWNER, UserRole.MANAGER);

const idParam = (req: { params: unknown }): string => {
  const params = req.params as Record<string, string | undefined>;
  const id = params.id;
  if (!id) throw new Error('Missing :id route param');
  return id;
};

// Sections
tableRouter.get(
  '/sections',
  asyncHandler(async (req, res) => {
    res.json(await sectionService.list(req.auth!.restaurantId));
  }),
);

tableRouter.post(
  '/sections',
  canEdit,
  validate(createSectionSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await sectionService.create(req.auth!.restaurantId, req.body));
  }),
);

tableRouter.patch(
  '/sections/:id',
  canEdit,
  validate(updateSectionSchema),
  asyncHandler(async (req, res) => {
    res.json(await sectionService.update(req.auth!.restaurantId, idParam(req), req.body));
  }),
);

tableRouter.delete(
  '/sections/:id',
  canEdit,
  asyncHandler(async (req, res) => {
    await sectionService.delete(req.auth!.restaurantId, idParam(req));
    res.status(204).end();
  }),
);

// Tables
tableRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await tableService.list(req.auth!.restaurantId));
  }),
);

tableRouter.post(
  '/',
  canEdit,
  validate(createTableSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await tableService.create(req.auth!.restaurantId, req.body));
  }),
);

tableRouter.patch(
  '/:id',
  validate(updateTableSchema),
  asyncHandler(async (req, res) => {
    res.json(await tableService.update(req.auth!.restaurantId, idParam(req), req.body));
  }),
);

tableRouter.delete(
  '/:id',
  canEdit,
  asyncHandler(async (req, res) => {
    await tableService.delete(req.auth!.restaurantId, idParam(req));
    res.status(204).end();
  }),
);
