import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';
import { communicationsApi, type CommType, type CommDirection } from '@/features/leads/leads-api';
import { customersApi } from '@/features/customers/customers-api';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const TYPE_CFG: Record<CommType, { icon: string; label: string; color: string; bg: string }> = {
  CALL:     { icon: '📞', label: 'Call',     color: 'text-blue-700',   bg: 'bg-blue-50'   },
  EMAIL:    { icon: '📧', label: 'Email',    color: 'text-indigo-700', bg: 'bg-indigo-50' },
  WHATSAPP: { icon: '💬', label: 'WhatsApp', color: 'text-green-700',  bg: 'bg-green-50'  },
  NOTE:     { icon: '📝', label: 'Note',     color: 'text-amber-700',  bg: 'bg-amber-50'  },
  MEETING:  { icon: '🤝', label: 'Meeting',  color: 'text-purple-700', bg: 'bg-purple-50' },
  SMS:      { icon: '📱', label: 'SMS',      color: 'text-gray-700',   bg: 'bg-gray-100'  },
};

const COMM_TYPES = (Object.keys(TYPE_CFG) as CommType[]);

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
}

export const CommunicationsPage = () => {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<CommType | 'ALL'>('ALL');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: 'NOTE' as CommType, direction: 'OUTBOUND' as CommDirection, body: '', subject: '', customerId: '' });

  const comms = useQuery({
    queryKey: ['all-comms', filterType],
    queryFn: () => communicationsApi.list({ type: filterType === 'ALL' ? undefined : filterType, limit: 200 }),
  });

  const customers = useQuery({ queryKey: ['customers', ''], queryFn: () => customersApi.list() });

  const create = useMutation({
    mutationFn: () => communicationsApi.create({ ...form, customerId: form.customerId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-comms'] }); setCreating(false); toast.success('Logged'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: communicationsApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-comms'] }); toast.success('Deleted'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  // Group by date
  const grouped: Record<string, typeof comms.data> = {};
  comms.data?.forEach((c) => {
    const key = new Date(c.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
    (grouped[key] = grouped[key] ?? []).push(c);
  });

  return (
    <div className="page-enter min-h-full flex flex-col" style={{ background: '#f5f3ef' }}>
      {/* Hero */}
      <div className="relative overflow-hidden px-6 py-6"
        style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Communications</h1>
            <p className="text-sm text-white/50">All interactions — calls, emails, notes, meetings</p>
          </div>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl gradient-orange px-4 py-2.5 text-sm font-bold text-white shadow-lg shimmer-effect">
            <Plus className="h-4 w-4" /> Log interaction
          </button>
        </div>

        {/* Type filter chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(['ALL', ...COMM_TYPES] as (CommType | 'ALL')[]).map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className={cn('rounded-full px-3 py-1 text-xs font-semibold transition-all border', filterType === t ? 'bg-white text-gray-900 border-white' : 'border-white/20 text-white/60 hover:border-white/50 hover:text-white')}>
              {t === 'ALL' ? '📋 All' : `${TYPE_CFG[t].icon} ${TYPE_CFG[t].label}`}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-6 max-w-3xl mx-auto w-full">
        {comms.isLoading ? (
          <div className="space-y-3">{Array.from({length:5}).map((_,i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200/60" />)}</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl float">📬</span>
            <p className="mt-4 font-bold text-gray-500">No interactions logged yet</p>
            <p className="text-xs text-gray-400 mt-1">Log calls, emails, notes, and meetings to track customer interactions</p>
            <button onClick={() => setCreating(true)} className="mt-4 rounded-xl gradient-orange px-5 py-2 text-sm font-bold text-white">Log first interaction</button>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

            {Object.entries(grouped).map(([date, items]) => (
              <div key={date} className="mb-6">
                {/* Date separator */}
                <div className="relative flex items-center gap-3 mb-4">
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-white text-xs font-bold shadow-md">📅</div>
                  <span className="text-sm font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">{date}</span>
                </div>

                <div className="ml-14 space-y-3">
                  {items!.map((c) => {
                    const cfg = TYPE_CFG[c.type];
                    return (
                      <div key={c.id} className="glass-card rounded-2xl p-4 group">
                        <div className="flex items-start gap-3">
                          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg', cfg.bg)}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={cn('text-xs font-bold uppercase tracking-wide', cfg.color)}>{cfg.label}</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className={cn('text-[10px] rounded-full px-2 py-0.5 font-medium', c.direction === 'INBOUND' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600')}>
                                {c.direction === 'INBOUND' ? '⬇ Inbound' : '⬆ Outbound'}
                              </span>
                              {c.customer && <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">👤 {c.customer.name ?? c.customer.phone}</span>}
                              {c.lead && <span className="text-xs font-medium text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">🎯 {c.lead.name}</span>}
                            </div>
                            {c.subject && <p className="text-sm font-semibold text-gray-900 mb-1">{c.subject}</p>}
                            <p className="text-sm text-gray-700 leading-relaxed">{c.body}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-[10px] text-gray-400">by {c.createdBy.name} · {timeAgo(c.createdAt)}</p>
                              <button onClick={() => remove.mutate(c.id)}
                                className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 spin-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">Log Interaction</h2>
              <button onClick={() => setCreating(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">Type</label>
                <div className="flex flex-wrap gap-2">
                  {COMM_TYPES.map((t) => (
                    <button key={t} onClick={() => setForm({ ...form, type: t })}
                      className={cn('rounded-xl px-3 py-1.5 text-xs font-bold', form.type === t ? 'gradient-orange text-white' : 'bg-gray-100 text-gray-600')}>
                      {TYPE_CFG[t].icon} {TYPE_CFG[t].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Direction</label>
                <div className="flex gap-2">
                  {(['OUTBOUND','INBOUND'] as CommDirection[]).map((d) => (
                    <button key={d} onClick={() => setForm({ ...form, direction: d })}
                      className={cn('flex-1 rounded-xl py-2 text-xs font-bold', form.direction === d ? 'gradient-orange text-white' : 'bg-gray-100 text-gray-600')}>
                      {d === 'OUTBOUND' ? '⬆ Outbound' : '⬇ Inbound'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Customer (optional)</label>
                <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">— Select customer —</option>
                  {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.phone}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Subject</label>
                <input placeholder="Brief subject…" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Notes *</label>
                <textarea rows={3} placeholder="What happened?" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600">Cancel</button>
              <button disabled={!form.body.trim() || create.isPending} onClick={() => create.mutate()}
                className="flex-1 rounded-xl gradient-orange py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {create.isPending ? 'Saving…' : 'Log interaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
