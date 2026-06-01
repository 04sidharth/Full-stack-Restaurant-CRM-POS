import { api } from '@/lib/api';

export type CampaignChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';
export type CampaignSegment = 'ALL' | 'NEW' | 'REGULAR' | 'VIP' | 'AT_RISK' | 'INACTIVE';
export type CampaignStatus = 'DRAFT' | 'SENT';

export interface Campaign {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  channel: CampaignChannel;
  targetSegment: CampaignSegment;
  messageBody: string;
  status: CampaignStatus;
  targetCount: number;
  sentCount: number;
  createdById: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
  _count: { logs: number };
}

export interface CampaignInput {
  name: string;
  description?: string;
  channel: CampaignChannel;
  targetSegment: CampaignSegment;
  messageBody: string;
}

export const campaignsApi = {
  list: async (status?: CampaignStatus): Promise<Campaign[]> =>
    (await api.get('/campaigns', { params: status ? { status } : {} })).data,

  get: async (id: string): Promise<Campaign> => (await api.get(`/campaigns/${id}`)).data,

  previewSegment: async (segment: CampaignSegment): Promise<{ segment: CampaignSegment; count: number }> =>
    (await api.get(`/campaigns/preview/${segment}`)).data,

  create: async (input: CampaignInput): Promise<Campaign> =>
    (await api.post('/campaigns', input)).data,

  execute: async (id: string): Promise<{ sent: number }> =>
    (await api.post(`/campaigns/${id}/execute`)).data,

  remove: async (id: string): Promise<void> => { await api.delete(`/campaigns/${id}`); },
};
