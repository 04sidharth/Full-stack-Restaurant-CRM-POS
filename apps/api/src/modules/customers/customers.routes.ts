import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { customerService } from './customers.service.js';
import {
  createCustomerSchema,
  feedbackSchema,
  listCustomersQuery,
  loyaltyAdjustSchema,
  updateCustomerSchema,
  type ListCustomersQuery,
} from './customers.schema.js';

export const customerRouter = Router();
customerRouter.use(requireAuth);

const idParam = (req: { params: unknown }): string => {
  const params = req.params as Record<string, string | undefined>;
  const id = params.id;
  if (!id) throw new Error('Missing :id route param');
  return id;
};

customerRouter.get(
  '/',
  validate(listCustomersQuery, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await customerService.list(req.auth!.restaurantId, req.query as unknown as ListCustomersQuery));
  }),
);

customerRouter.get(
  '/segments/counts',
  asyncHandler(async (req, res) => {
    res.json(await customerService.segmentCounts(req.auth!.restaurantId));
  }),
);

customerRouter.get(
  '/feedback',
  asyncHandler(async (req, res) => {
    res.json(await customerService.listFeedback(req.auth!.restaurantId));
  }),
);

customerRouter.post(
  '/feedback',
  validate(feedbackSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await customerService.addFeedback(req.auth!.restaurantId, req.body));
  }),
);

customerRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await customerService.get(req.auth!.restaurantId, idParam(req)));
  }),
);

customerRouter.post(
  '/',
  validate(createCustomerSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await customerService.create(req.auth!.restaurantId, req.body));
  }),
);

customerRouter.patch(
  '/:id',
  validate(updateCustomerSchema),
  asyncHandler(async (req, res) => {
    res.json(await customerService.update(req.auth!.restaurantId, idParam(req), req.body));
  }),
);

customerRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await customerService.delete(req.auth!.restaurantId, idParam(req)));
  }),
);

customerRouter.get(
  '/:id/insights',
  asyncHandler(async (req, res) => {
    res.json(await customerService.insights(req.auth!.restaurantId, idParam(req)));
  }),
);

customerRouter.post(
  '/:id/loyalty',
  validate(loyaltyAdjustSchema),
  asyncHandler(async (req, res) => {
    res.json(await customerService.adjustLoyalty(req.auth!.restaurantId, idParam(req), req.body));
  }),
);
