import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { communicationsService } from './communications.service.js';

export const communicationsRouter = Router();
communicationsRouter.use(requireAuth);

const createSchema = z.object({
  customerId:   z.string().optional(),
  leadId:       z.string().optional(),
  type:         z.enum(['CALL','EMAIL','WHATSAPP','NOTE','MEETING','SMS']),
  direction:    z.enum(['INBOUND','OUTBOUND']).optional(),
  subject:      z.string().optional(),
  body:         z.string().min(1),
  durationMins: z.number().int().positive().optional(),
});

communicationsRouter.get('/', asyncHandler(async (req, res) => {
  const q = req.query as Record<string, string>;
  res.json(await communicationsService.list(req.auth!.restaurantId, {
    customerId: q.customerId, leadId: q.leadId, type: q.type as any,
    limit: q.limit ? Number(q.limit) : undefined,
  }));
}));

communicationsRouter.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const comm = await communicationsService.create(req.auth!.restaurantId, req.auth!.userId, req.body);
  res.status(201).json(comm);
}));

communicationsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await communicationsService.remove(req.auth!.restaurantId, req.params.id);
  res.status(204).end();
}));
