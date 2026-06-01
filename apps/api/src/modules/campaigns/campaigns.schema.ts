import { z } from 'zod';

export const campaignChannels = ['SMS', 'WHATSAPP', 'EMAIL'] as const;
export const campaignSegments = ['ALL', 'NEW', 'REGULAR', 'VIP', 'AT_RISK', 'INACTIVE'] as const;

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  channel: z.enum(campaignChannels),
  targetSegment: z.enum(campaignSegments),
  messageBody: z.string().min(1).max(1600),
});

export const listCampaignsQuery = z.object({
  status: z.enum(['DRAFT', 'SENT']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuery>;
