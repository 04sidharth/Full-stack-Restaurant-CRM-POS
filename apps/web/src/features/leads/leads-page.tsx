import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus, Phone, Mail, Building2, ChevronRight,
  TrendingUp, Users, Target, Trophy, X, MessageCircle,
} from 'lucide-react';
import { leadsApi, communicationsApi, tasksApi, type Lead, type LeadStatus, type LeadSource, type CommType } from './leads-api';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

// ── Pipeline config ──────────────────────────────────────────

const STAGES: { status: LeadStatus; label: string; emoji: string; color: string; bg: string; border: string; headerBg: string }[] = [
  { status: 'NEW',       label: 'New Leads',    emoji: '🆕', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  headerBg: 'bg-blue-600'   },
  { status: 'CONTACTED', label: 'Contacted',    emoji: '📞', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200',headerBg: 'bg-violet-600' },
  { status: 'QUALIFIED', label: 'Qualified',    emoji: '✅', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200',headerBg: 'bg-indigo-600' },
  { status: 'PROPOSAL',  label: 'Proposal',     emoji: '📋', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', headerBg: 'bg-amber-500'  },
  { status: 'WON',       label: 'Won 🎉',        emoji: '🏆', color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200',headerBg:'bg-emerald-600'},
  { status: 'LOST',      label: 'Lost',         emoji: '❌', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   headerBg: 'bg-red-500'    },
];

const NEXT_STAGE: Partial<Record<LeadStatus, LeadStatus>> = {
  NEW: 'CONTACTED', CONTACTED: 'QUALIFIED', QUALIFIED: 'PROPOSAL', PROPOSAL: 'WON',
};

const SOURCES: LeadSource[] = ['WALK_IN','WEBSITE','REFERRAL','SOCIAL_MEDIA','PHONE','EMAIL','OTHER'];
const COMM_TYPES: { type: CommType; icon: string; label: string }[] = [
  { type: 'CALL',     icon: '📞', label: 'Call'      },
  { type: 'EMAIL',    icon: '📧', label: 'Email'     },
  { type: 'WHATSAPP', icon: '💬', label: 'WhatsApp'  },
  { type: 'NOTE',     icon: '📝', label: 'Note'      },
  { type: 'MEETING',  icon: '🤝', label: 'Meeting'   },
];

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`;
}

// ── Lead card ────────────────────────────────────────────────

const LeadCard = ({ lead, onSelect, onMove }: {
  lead: Lead;
  onSelect: (l: Lead) => void;
  onMove: (l: Lead, s: LeadStatus) => void;
}) => {
  const stage = STAGES.find((s) => s.status === lead.status)!;
  const next  = NEXT_STAGE[lead.status];

  return (
    <div
      className={cn('glass-card rounded-xl p-3.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md card-lift', stage.border, 'border')}
      onClick={() => onSelect(lead)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{lead.name}</p>
          {lead.company && <p className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.company}</p>}
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', stage.bg, stage.color)}>
          {lead.source.replace('_', ' ')}
        </span>
      </div>

      {/* Contact */}
      <div className="space-y-0.5 mb-3">
        {lead.phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="h-3 w-3" />{lead.phone}</p>}
        {lead.email && <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" />{lead.email}</p>}
      </div>

      {/* Value + meta */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-extrabold text-gray-900">₹{Number(lead.value).toLocaleString('en-IN')}</span>
        <span className="text-[10px] text-gray-400">{daysAgo(lead.createdAt)}</span>
      </div>

      {/* Counts */}
      <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-400">
        <span>💬 {lead._count.communications}</span>
        <span>✓ {lead._count.tasks} tasks</span>
        {lead.assignedTo && <span className="ml-auto">👤 {lead.assignedTo.name}</span>}
      </div>

      {/* Move button */}
      {next && (
        <button
          className={cn('w-full rounded-lg py-1.5 text-xs font-bold text-white transition-colors', stage.headerBg, 'hover:opacity-90')}
          onClick={(e) => { e.stopPropagation(); onMove(lead, next); }}
        >
          Move to {STAGES.find((s) => s.status === next)?.label} <ChevronRight className="inline h-3 w-3" />
        </button>
      )}
      {lead.status === 'PROPOSAL' && (
        <div className="flex gap-1 mt-1">
          <button
            className="flex-1 rounded-lg py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
            onClick={(e) => { e.stopPropagation(); onMove(lead, 'WON'); }}
          >
            🏆 Won
          </button>
          <button
            className="flex-1 rounded-lg py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600"
            onClick={(e) => { e.stopPropagation(); onMove(lead, 'LOST'); }}
          >
            ❌ Lost
          </button>
        </div>
      )}
    </div>
  );
};

// ── Create lead modal ────────────────────────────────────────

const CreateLeadModal = ({ onClose, defaultStatus }: { onClose: () => void; defaultStatus?: LeadStatus }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', value: '', source: 'OTHER' as LeadSource, status: defaultStatus ?? 'NEW' as LeadStatus, notes: '' });

  const create = useMutation({
    mutationFn: () => leadsApi.create({ ...form, value: Number(form.value) || 0 } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline'] }); toast.success('Lead created'); onClose(); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md rounded-2xl p-6 spin-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">New Lead 🎯</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="space-y-3">
          {[
            { k: 'name',    label: 'Name *',    type: 'text',   placeholder: 'Rahul Sharma' },
            { k: 'company', label: 'Company',   type: 'text',   placeholder: 'Acme Corp' },
            { k: 'phone',   label: 'Phone',     type: 'tel',    placeholder: '98765 43210' },
            { k: 'email',   label: 'Email',     type: 'email',  placeholder: 'rahul@company.com' },
            { k: 'value',   label: 'Deal Value (₹)', type: 'number', placeholder: '50000' },
          ].map((f) => (
            <div key={f.k}>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.k as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Source</label>
              <select className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}>
                {SOURCES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Stage</label>
              <select className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}>
                {STAGES.map((s) => <option key={s.status} value={s.status}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</label>
            <textarea rows={2} placeholder="Initial notes…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button disabled={!form.name.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="flex-1 rounded-xl gradient-orange py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create lead →'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Lead detail panel ────────────────────────────────────────

const LeadDetailPanel = ({ lead, onClose }: { lead: Lead; onClose: () => void }) => {
  const qc = useQueryClient();
  const [commForm, setCommForm] = useState({ type: 'NOTE' as CommType, body: '', subject: '' });
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');

  const comms = useQuery({ queryKey: ['comms', lead.id], queryFn: () => communicationsApi.list({ leadId: lead.id }) });
  const tasks = useQuery({ queryKey: ['tasks', lead.id], queryFn: () => tasksApi.list({ leadId: lead.id }) });

  const logComm = useMutation({
    mutationFn: () => communicationsApi.create({ leadId: lead.id, type: commForm.type, body: commForm.body, subject: commForm.subject }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comms', lead.id] }); qc.invalidateQueries({ queryKey: ['pipeline'] }); setCommForm({ type: 'NOTE', body: '', subject: '' }); toast.success('Logged'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const addTask = useMutation({
    mutationFn: () => tasksApi.create({ title: taskTitle, leadId: lead.id, dueDate: taskDue || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', lead.id] }); qc.invalidateQueries({ queryKey: ['pipeline'] }); setTaskTitle(''); setTaskDue(''); toast.success('Task added'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tasksApi.update(id, { status: status as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', lead.id] }),
  });

  const stage = STAGES.find((s) => s.status === lead.status)!;

  const COMM_ICONS: Record<CommType, string> = { CALL:'📞', EMAIL:'📧', WHATSAPP:'💬', NOTE:'📝', MEETING:'🤝', SMS:'📱' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={cn('px-5 py-4', stage.headerBg)}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">{stage.emoji} {stage.label}</p>
              <h2 className="text-xl font-black text-white mt-0.5">{lead.name}</h2>
              {lead.company && <p className="text-sm text-white/70 flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{lead.company}</p>}
            </div>
            <button onClick={onClose} className="rounded-xl p-2 text-white/70 hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-black text-white">₹{Number(lead.value).toLocaleString('en-IN')}</span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">{lead.source.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Contact info */}
          <div className="glass-card rounded-xl p-4 space-y-2">
            {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-orange-600"><Phone className="h-4 w-4 text-gray-400" />{lead.phone}</a>}
            {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-orange-600"><Mail className="h-4 w-4 text-gray-400" />{lead.email}</a>}
            {lead.notes && <p className="text-sm text-gray-500 italic mt-2">"{lead.notes}"</p>}
          </div>

          {/* Log communication */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Log Interaction</h3>
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                {COMM_TYPES.map((ct) => (
                  <button key={ct.type} onClick={() => setCommForm({ ...commForm, type: ct.type })}
                    className={cn('rounded-xl px-3 py-1.5 text-xs font-bold transition-all', commForm.type === ct.type ? 'gradient-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                    {ct.icon} {ct.label}
                  </button>
                ))}
              </div>
              <textarea rows={2} placeholder={`Add a ${commForm.type.toLowerCase()} note…`} value={commForm.body}
                onChange={(e) => setCommForm({ ...commForm, body: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" />
              <button disabled={!commForm.body.trim() || logComm.isPending} onClick={() => logComm.mutate()}
                className="w-full rounded-xl gradient-orange py-2 text-xs font-bold text-white disabled:opacity-50">
                {logComm.isPending ? 'Logging…' : 'Log interaction'}
              </button>
            </div>
          </div>

          {/* Tasks */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Follow-up Tasks</h3>
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                <input placeholder="Task title…" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-sm outline-none focus:border-orange-400" />
                <button disabled={!taskTitle.trim() || addTask.isPending} onClick={() => addTask.mutate()}
                  className="rounded-xl gradient-orange px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {tasks.data?.map((t) => (
                <div key={t.id} className={cn('flex items-center gap-2 rounded-lg px-3 py-2', t.status === 'DONE' ? 'bg-emerald-50' : 'bg-gray-50')}>
                  <button onClick={() => toggleTask.mutate({ id: t.id, status: t.status === 'DONE' ? 'PENDING' : 'DONE' })}
                    className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all', t.status === 'DONE' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 hover:border-orange-400')}>
                    {t.status === 'DONE' && <span className="text-[10px]">✓</span>}
                  </button>
                  <span className={cn('flex-1 text-sm', t.status === 'DONE' && 'line-through text-gray-400')}>{t.title}</span>
                  {t.dueDate && <span className="text-[10px] text-gray-400">{new Date(t.dueDate).toLocaleDateString()}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Communication timeline */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Activity Timeline</h3>
            {comms.data?.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No interactions logged yet</p>}
            <div className="space-y-3">
              {comms.data?.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base">
                    {COMM_ICONS[c.type]}
                  </div>
                  <div className="flex-1 rounded-xl bg-gray-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-gray-700">{c.type} · {c.direction}</span>
                      <span className="text-[10px] text-gray-400">{daysAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{c.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">by {c.createdBy.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────

export const LeadsPage = () => {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const { data } = useQuery({ queryKey: ['pipeline'], queryFn: leadsApi.pipeline });

  const moveLead = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => leadsApi.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline'] }); toast.success('Lead moved'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const totalValue   = data?.leads.filter((l) => l.status !== 'LOST').reduce((s, l) => s + Number(l.value), 0) ?? 0;
  const wonValue     = data?.leads.filter((l) => l.status === 'WON').reduce((s, l) => s + Number(l.value), 0) ?? 0;
  const totalLeads   = data?.leads.length ?? 0;
  const winRate      = totalLeads ? Math.round((data?.leads.filter((l) => l.status === 'WON').length ?? 0) / totalLeads * 100) : 0;

  return (
    <div className="page-enter min-h-full flex flex-col" style={{ background: '#f5f3ef' }}>

      {/* Hero */}
      <div className="relative overflow-hidden px-6 py-6"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 60%, #4a1942 100%)' }}>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Sales Pipeline</h1>
            <p className="text-sm text-white/50">Track leads, log interactions, close deals</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {/* KPI mini cards */}
            {[
              { icon: <Target className="h-4 w-4" />, label: 'Pipeline', value: `₹${(totalValue/1000).toFixed(0)}K` },
              { icon: <Trophy className="h-4 w-4" />, label: 'Won',      value: `₹${(wonValue/1000).toFixed(0)}K`   },
              { icon: <Users className="h-4 w-4" />,  label: 'Total',    value: totalLeads.toString()               },
              { icon: <TrendingUp className="h-4 w-4" />, label: 'Win%', value: `${winRate}%`                       },
            ].map((k) => (
              <div key={k.label} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur-sm">
                {k.icon}
                <div>
                  <p className="text-[10px] text-white/50">{k.label}</p>
                  <p className="text-sm font-black">{k.value}</p>
                </div>
              </div>
            ))}
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-xl gradient-orange px-4 py-2 text-sm font-bold text-white shadow-lg shimmer-effect">
              <Plus className="h-4 w-4" /> New Lead
            </button>
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 px-6 py-3 border-b bg-white">
        <div className="flex rounded-xl bg-gray-100 p-1">
          {['kanban','list'].map((v) => (
            <button key={v} onClick={() => setView(v as any)}
              className={cn('rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-all', view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
              {v === 'kanban' ? '🗂️ Board' : '📋 List'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-2">{totalLeads} leads total</span>
      </div>

      {/* Kanban board */}
      {view === 'kanban' ? (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 min-w-max">
            {STAGES.map((stage) => {
              const stageLeads = (data?.leads ?? []).filter((l) => l.status === stage.status);
              const stageValue = stageLeads.reduce((s, l) => s + Number(l.value), 0);
              return (
                <div key={stage.status} className="w-72 flex flex-col">
                  {/* Column header */}
                  <div className={cn('rounded-xl px-4 py-3 mb-3 text-white', stage.headerBg)}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{stage.emoji} {stage.label}</span>
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-black">{stageLeads.length}</span>
                    </div>
                    <p className="text-xs text-white/70 mt-0.5">₹{stageValue.toLocaleString('en-IN')}</p>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-3 flex-1">
                    {stageLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead}
                        onSelect={setSelected}
                        onMove={(l, s) => moveLead.mutate({ id: l.id, status: s })}
                      />
                    ))}
                    <button onClick={() => setCreating(true)}
                      className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-xs font-medium text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors">
                      + Add lead
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="flex-1 overflow-auto p-6">
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Lead</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {(data?.leads ?? []).map((lead) => {
                  const s = STAGES.find((st) => st.status === lead.status)!;
                  return (
                    <tr key={lead.id} onClick={() => setSelected(lead)}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900">{lead.name}</p>
                        {lead.company && <p className="text-xs text-gray-400">{lead.company}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{lead.phone || lead.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', s.bg, s.color)}>{s.emoji} {s.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">₹{Number(lead.value).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{lead.source.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{daysAgo(lead.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(data?.leads.length ?? 0) === 0 && (
              <div className="py-16 text-center">
                <span className="text-5xl float">🎯</span>
                <p className="mt-4 font-bold text-gray-500">No leads yet</p>
                <p className="text-xs text-gray-400 mt-1">Create your first lead to start tracking your pipeline</p>
              </div>
            )}
          </div>
        </div>
      )}

      {creating && <CreateLeadModal onClose={() => setCreating(false)} />}
      {selected && <LeadDetailPanel lead={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
