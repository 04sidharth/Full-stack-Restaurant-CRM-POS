import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { leadsService } from './leads.service.js';

export const leadsRouter = Router();
leadsRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional(),
  status: z.enum(['NEW','CONTACTED','QUALIFIED','PROPOSAL','WON','LOST']).optional(),
  source: z.enum(['WALK_IN','WEBSITE','REFERRAL','SOCIAL_MEDIA','PHONE','EMAIL','OTHER']).optional(),
  value: z.number().min(0).optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
  expectedClose: z.string().optional(),
});

leadsRouter.get('/', asyncHandler(async (req, res) => {
  const q = req.query as Record<string, string>;
  res.json(await leadsService.list(req.auth!.restaurantId, { status: q.status as any, search: q.search, assignedToId: q.assignedToId }));
}));

leadsRouter.get('/pipeline', asyncHandler(async (req, res) => {
  res.json(await leadsService.pipeline(req.auth!.restaurantId));
}));

leadsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json(await leadsService.get(req.auth!.restaurantId, req.params.id));
}));

leadsRouter.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const lead = await leadsService.create(req.auth!.restaurantId, req.auth!.userId, req.body);
  res.status(201).json(lead);
}));

leadsRouter.patch('/:id', validate(createSchema.partial()), asyncHandler(async (req, res) => {
  res.json(await leadsService.update(req.auth!.restaurantId, req.params.id, req.body));
}));

leadsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await leadsService.remove(req.auth!.restaurantId, req.params.id);
  res.status(204).end();
}));
