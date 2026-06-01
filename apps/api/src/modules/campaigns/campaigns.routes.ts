import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { campaignService } from './campaigns.service.js';
import { createCampaignSchema, listCampaignsQuery, type ListCampaignsQuery } from './campaigns.schema.js';
import type { CampaignSegment } from '@prisma/client';

export const campaignRouter = Router();
campaignRouter.use(requireAuth);

const idParam = (req: { params: unknown }): string => {
  const p = req.params as Record<string, string | undefined>;
  if (!p.id) throw new Error('Missing :id');
  return p.id;
};

campaignRouter.get(
  '/',
  validate(listCampaignsQuery, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await campaignService.list(req.auth!.restaurantId, req.query as unknown as ListCampaignsQuery));
  }),
);

campaignRouter.get(
  '/preview/:segment',
  asyncHandler(async (req, res) => {
    const { segment } = req.params as { segment: string };
    res.json(await campaignService.previewSegment(req.auth!.restaurantId, segment as CampaignSegment));
  }),
);

campaignRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await campaignService.get(req.auth!.restaurantId, idParam(req)));
  }),
);

campaignRouter.post(
  '/',
  validate(createCampaignSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(
      await campaignService.create(req.auth!.restaurantId, req.auth!.userId, req.body),
    );
  }),
);

campaignRouter.post(
  '/:id/execute',
  asyncHandler(async (req, res) => {
    res.json(await campaignService.execute(req.auth!.restaurantId, idParam(req)));
  }),
);

campaignRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await campaignService.delete(req.auth!.restaurantId, idParam(req)));
  }),
);
