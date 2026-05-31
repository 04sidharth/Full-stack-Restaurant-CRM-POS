import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { reportsService } from './reports.service.js';
import { rangeQuery, type RangeQuery } from './reports.schema.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    res.json(await reportsService.dashboard(req.auth!.restaurantId));
  }),
);

reportsRouter.get(
  '/sales',
  validate(rangeQuery, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await reportsService.salesSummary(req.auth!.restaurantId, req.query as unknown as RangeQuery));
  }),
);

reportsRouter.get(
  '/items',
  validate(rangeQuery, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await reportsService.itemSales(req.auth!.restaurantId, req.query as unknown as RangeQuery));
  }),
);

reportsRouter.get(
  '/payments',
  validate(rangeQuery, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await reportsService.paymentMix(req.auth!.restaurantId, req.query as unknown as RangeQuery));
  }),
);

reportsRouter.get(
  '/gst',
  validate(rangeQuery, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await reportsService.gstSummary(req.auth!.restaurantId, req.query as unknown as RangeQuery));
  }),
);

reportsRouter.get(
  '/customers',
  validate(rangeQuery, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await reportsService.topCustomers(req.auth!.restaurantId, req.query as unknown as RangeQuery));
  }),
);
