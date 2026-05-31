import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { orderService } from './orders.service.js';
import {
  addOrderItemSchema,
  createOrderSchema,
  listOrdersQuery,
  updateOrderItemSchema,
  updateOrderSchema,
  type ListOrdersQuery,
} from './orders.schema.js';

export const orderRouter = Router();
orderRouter.use(requireAuth);

const idParam = (req: { params: unknown }): string => {
  const params = req.params as Record<string, string | undefined>;
  const id = params.id;
  if (!id) throw new Error('Missing :id route param');
  return id;
};
const itemIdParam = (req: { params: unknown }): string => {
  const params = req.params as Record<string, string | undefined>;
  const id = params.itemId;
  if (!id) throw new Error('Missing :itemId route param');
  return id;
};

orderRouter.get(
  '/',
  validate(listOrdersQuery, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await orderService.list(req.auth!.restaurantId, req.query as unknown as ListOrdersQuery));
  }),
);

orderRouter.get(
  '/kitchen-queue',
  asyncHandler(async (req, res) => {
    res.json(await orderService.kitchenQueue(req.auth!.restaurantId));
  }),
);

orderRouter.post(
  '/:id/items/:itemId/status',
  validate(z.object({ status: z.enum(['PREPARING', 'READY', 'SERVED']) })),
  asyncHandler(async (req, res) => {
    res.json(await orderService.setItemStatus(req.auth!.restaurantId, idParam(req), itemIdParam(req), req.body.status));
  }),
);

orderRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await orderService.get(req.auth!.restaurantId, idParam(req)));
  }),
);

orderRouter.post(
  '/',
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await orderService.create(req.auth!.restaurantId, req.auth!.userId, req.body));
  }),
);

orderRouter.patch(
  '/:id',
  validate(updateOrderSchema),
  asyncHandler(async (req, res) => {
    res.json(await orderService.update(req.auth!.restaurantId, idParam(req), req.body));
  }),
);

orderRouter.post(
  '/:id/items',
  validate(addOrderItemSchema),
  asyncHandler(async (req, res) => {
    res.json(await orderService.addItem(req.auth!.restaurantId, idParam(req), req.body));
  }),
);

orderRouter.patch(
  '/:id/items/:itemId',
  validate(updateOrderItemSchema),
  asyncHandler(async (req, res) => {
    res.json(await orderService.updateItem(req.auth!.restaurantId, idParam(req), itemIdParam(req), req.body));
  }),
);

orderRouter.delete(
  '/:id/items/:itemId',
  asyncHandler(async (req, res) => {
    res.json(await orderService.removeItem(req.auth!.restaurantId, idParam(req), itemIdParam(req)));
  }),
);

orderRouter.post(
  '/:id/send-to-kitchen',
  asyncHandler(async (req, res) => {
    res.json(await orderService.sendToKitchen(req.auth!.restaurantId, idParam(req)));
  }),
);

orderRouter.post(
  '/:id/cancel',
  validate(z.object({ reason: z.string().max(200).optional() })),
  asyncHandler(async (req, res) => {
    res.json(await orderService.cancel(req.auth!.restaurantId, idParam(req), req.body.reason));
  }),
);
