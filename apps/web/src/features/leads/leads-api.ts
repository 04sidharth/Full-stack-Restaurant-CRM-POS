import { api } from '@/lib/api';

export type LeadStatus   = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
export type LeadSource   = 'WALK_IN' | 'WEBSITE' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'PHONE' | 'EMAIL' | 'OTHER';
export type CommType     = 'CALL' | 'EMAIL' | 'WHATSAPP' | 'NOTE' | 'MEETING' | 'SMS';
export type CommDirection = 'INBOUND' | 'OUTBOUND';
export type TaskStatus   = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Lead {
  id: string; restaurantId: string;
  name: string; phone: string | null; email: string | null; company: string | null;
  status: LeadStatus; source: LeadSource;
  value: string; notes: string | null;
  assignedToId: string | null; createdById: string;
  expectedClose: string | null; wonAt: string | null; lostAt: string | null; lostReason: string | null;
  createdAt: string; updatedAt: string;
  assignedTo: { id: string; name: string } | null;
  createdBy:  { id: string; name: string };
  _count: { communications: number; tasks: number };
}

export interface Communication {
  id: string; restaurantId: string;
  customerId: string | null; leadId: string | null;
  type: CommType; direction: CommDirection;
  subject: string | null; body: string; durationMins: number | null;
  createdById: string; createdAt: string;
  createdBy: { id: string; name: string };
  customer: { id: string; name: string | null; phone: string } | null;
  lead:     { id: string; name: string; company: string | null } | null;
}

export interface Task {
  id: string; restaurantId: string;
  title: string; description: string | null;
  dueDate: string | null; status: TaskStatus; priority: TaskPriority;
  leadId: string | null; customerId: string | null; assignedToId: string | null;
  completedAt: string | null; createdAt: string; updatedAt: string;
  assignedTo: { id: string; name: string } | null;
  createdBy:  { id: string; name: string };
  lead:     { id: string; name: string; company: string | null } | null;
  customer: { id: string; name: string | null; phone: string } | null;
}

export interface PipelineData {
  leads: Lead[];
  summary: Record<LeadStatus, { count: number; value: string }>;
}

export const leadsApi = {
  pipeline: async (): Promise<PipelineData>     => (await api.get('/leads/pipeline')).data,
  list: async (params?: { status?: LeadStatus; search?: string }): Promise<Lead[]> => (await api.get('/leads', { params })).data,
  get:  async (id: string): Promise<Lead>        => (await api.get(`/leads/${id}`)).data,
  create: async (input: Partial<Lead> & { name: string }): Promise<Lead> => (await api.post('/leads', input)).data,
  update: async (id: string, input: Partial<Lead>): Promise<Lead> => (await api.patch(`/leads/${id}`, input)).data,
  remove: async (id: string): Promise<void>      => { await api.delete(`/leads/${id}`); },
};

export const communicationsApi = {
  list: async (params?: { customerId?: string; leadId?: string; type?: CommType; limit?: number }): Promise<Communication[]> =>
    (await api.get('/communications', { params })).data,
  create: async (input: { customerId?: string; leadId?: string; type: CommType; direction?: CommDirection; subject?: string; body: string; durationMins?: number }): Promise<Communication> =>
    (await api.post('/communications', input)).data,
  remove: async (id: string): Promise<void> => { await api.delete(`/communications/${id}`); },
};

export const tasksApi = {
  list: async (params?: { status?: TaskStatus; priority?: TaskPriority; leadId?: string; customerId?: string; overdue?: boolean }): Promise<Task[]> =>
    (await api.get('/tasks', { params })).data,
  create: async (input: { title: string; description?: string; dueDate?: string; priority?: TaskPriority; leadId?: string; customerId?: string; assignedToId?: string }): Promise<Task> =>
    (await api.post('/tasks', input)).data,
  update: async (id: string, input: Partial<Task>): Promise<Task> => (await api.patch(`/tasks/${id}`, input)).data,
  remove: async (id: string): Promise<void> => { await api.delete(`/tasks/${id}`); },
};
