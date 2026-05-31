import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { billingService } from './billing.service.js';
import { addPaymentSchema, finalizeBillSchema } from './billing.schema.js';

export const billingRouter = Router();
billingRouter.use(requireAuth);

const orderIdParam = (req: { params: unknown }): string => {
  const params = req.params as Record<string, string | undefined>;
  const id = params.orderId;
  if (!id) throw new Error('Missing :orderId route param');
  return id;
};
const paymentIdParam = (req: { params: unknown }): string => {
  const params = req.params as Record<string, string | undefined>;
  const id = params.paymentId;
  if (!id) throw new Error('Missing :paymentId route param');
  return id;
};

billingRouter.get(
  '/:orderId/summary',
  validate(z.object({ interState: z.union([z.literal('true'), z.literal('false')]).optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const inter = (req.query as { interState?: string }).interState === 'true';
    res.json(await billingService.summary(req.auth!.restaurantId, orderIdParam(req), inter));
  }),
);

billingRouter.post(
  '/:orderId/payments',
  validate(addPaymentSchema),
  asyncHandler(async (req, res) => {
    const p = await billingService.addPayment(req.auth!.restaurantId, req.auth!.userId, orderIdParam(req), req.body);
    res.status(201).json(p);
  }),
);

billingRouter.delete(
  '/:orderId/payments/:paymentId',
  asyncHandler(async (req, res) => {
    await billingService.removePayment(req.auth!.restaurantId, orderIdParam(req), paymentIdParam(req));
    res.status(204).end();
  }),
);

billingRouter.post(
  '/:orderId/finalize',
  validate(finalizeBillSchema),
  asyncHandler(async (req, res) => {
    const invoice = await billingService.finalize(req.auth!.restaurantId, orderIdParam(req), req.body);
    res.status(201).json(invoice);
  }),
);

