import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { tasksService } from './tasks.service.js';

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const createSchema = z.object({
  title:        z.string().min(1),
  description:  z.string().optional(),
  dueDate:      z.string().optional(),
  priority:     z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),
  leadId:       z.string().optional(),
  customerId:   z.string().optional(),
  assignedToId: z.string().optional(),
});

tasksRouter.get('/', asyncHandler(async (req, res) => {
  const q = req.query as Record<string, string>;
  res.json(await tasksService.list(req.auth!.restaurantId, {
    status: q.status as any, priority: q.priority as any,
    leadId: q.leadId, customerId: q.customerId,
    assignedToId: q.assignedToId, overdue: q.overdue === 'true',
  }));
}));

tasksRouter.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const task = await tasksService.create(req.auth!.restaurantId, req.auth!.userId, req.body);
  res.status(201).json(task);
}));

tasksRouter.patch('/:id', validate(createSchema.extend({ status: z.enum(['PENDING','IN_PROGRESS','DONE','CANCELLED']).optional() }).partial()), asyncHandler(async (req, res) => {
  res.json(await tasksService.update(req.auth!.restaurantId, req.params.id, req.body));
}));

tasksRouter.delete('/:id', asyncHandler(async (req, res) => {
  await tasksService.remove(req.auth!.restaurantId, req.params.id);
  res.status(204).end();
}));
