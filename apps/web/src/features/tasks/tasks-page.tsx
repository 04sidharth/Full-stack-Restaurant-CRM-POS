import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, X, Calendar, AlertCircle } from 'lucide-react';
import { tasksApi, type Task, type TaskStatus, type TaskPriority } from '@/features/leads/leads-api';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const PRIORITY_CFG: Record<TaskPriority, { label: string; color: string; bg: string; dot: string }> = {
  LOW:    { label: 'Low',    color: 'text-gray-600',   bg: 'bg-gray-100',   dot: 'bg-gray-400'   },
  MEDIUM: { label: 'Medium', color: 'text-blue-700',   bg: 'bg-blue-50',    dot: 'bg-blue-500'   },
  HIGH:   { label: 'High',   color: 'text-amber-700',  bg: 'bg-amber-50',   dot: 'bg-amber-500'  },
  URGENT: { label: 'Urgent', color: 'text-red-700',    bg: 'bg-red-50',     dot: 'bg-red-500'    },
};

const STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  PENDING:     { label: 'Pending',     color: 'text-gray-700',   bg: 'bg-gray-100'   },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700',   bg: 'bg-blue-50'    },
  DONE:        { label: 'Done',        color: 'text-emerald-700',bg: 'bg-emerald-50' },
  CANCELLED:   { label: 'Cancelled',   color: 'text-red-700',    bg: 'bg-red-50'     },
};

function isOverdue(dueDate: string | null, status: TaskStatus) {
  if (!dueDate || status === 'DONE' || status === 'CANCELLED') return false;
  return new Date(dueDate) < new Date();
}

function dueDateLabel(dueDate: string | null) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const today = new Date(); today.setHours(0,0,0,0);
  const tom = new Date(today); tom.setDate(tom.getDate()+1);
  if (d < today) return { text: `Overdue · ${d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}`, overdue: true };
  if (d.toDateString() === today.toDateString()) return { text: 'Due today', overdue: false };
  if (d.toDateString() === tom.toDateString()) return { text: 'Due tomorrow', overdue: false };
  return { text: d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}), overdue: false };
}

export const TasksPage = () => {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'MEDIUM' as TaskPriority });

  const tasks = useQuery({
    queryKey: ['all-tasks', filterStatus, filterPriority],
    queryFn: () => tasksApi.list({
      status: filterStatus === 'ALL' ? undefined : filterStatus,
      priority: filterPriority === 'ALL' ? undefined : filterPriority,
    }),
    refetchInterval: 60_000,
  });

  const create = useMutation({
    mutationFn: () => tasksApi.create({ ...form, dueDate: form.dueDate || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-tasks'] }); setCreating(false); setForm({ title:'', description:'', dueDate:'', priority:'MEDIUM' }); toast.success('Task created'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => tasksApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-tasks'] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: tasksApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-tasks'] }); toast.success('Task deleted'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const overdueCount = tasks.data?.filter((t) => isOverdue(t.dueDate, t.status)).length ?? 0;
  const pendingCount = tasks.data?.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length ?? 0;
  const doneCount    = tasks.data?.filter((t) => t.status === 'DONE').length ?? 0;

  return (
    <div className="page-enter min-h-full flex flex-col" style={{ background: '#f5f3ef' }}>
      {/* Hero */}
      <div className="relative overflow-hidden px-6 py-6"
        style={{ background: 'linear-gradient(135deg, #134e5e, #71b280)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Task Manager</h1>
            <p className="text-sm text-white/50">Follow-up tasks, reminders, and to-dos</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Pending', value: pendingCount, color: 'bg-blue-500' },
              { label: 'Overdue', value: overdueCount, color: 'bg-red-500' },
              { label: 'Done',    value: doneCount,    color: 'bg-emerald-500' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur-sm">
                <div className={cn('h-2 w-2 rounded-full', s.color)} />
                <div>
                  <p className="text-[10px] text-white/50">{s.label}</p>
                  <p className="text-sm font-black">{s.value}</p>
                </div>
              </div>
            ))}
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-xl gradient-orange px-4 py-2.5 text-sm font-bold text-white shadow-lg shimmer-effect">
              <Plus className="h-4 w-4" /> New Task
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-white px-6 py-3">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {(['ALL','PENDING','IN_PROGRESS','DONE'] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn('rounded-lg px-3 py-1 text-xs font-bold capitalize transition-all', filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
              {s.replace('_',' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {(['ALL','URGENT','HIGH','MEDIUM','LOW'] as const).map((p) => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={cn('rounded-lg px-2.5 py-1 text-xs font-bold transition-all', filterPriority === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
              {p}
            </button>
          ))}
        </div>
        {overdueCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
            <AlertCircle className="h-3.5 w-3.5" /> {overdueCount} overdue
          </span>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-auto p-6">
        {tasks.isLoading ? (
          <div className="space-y-2">{Array.from({length:6}).map((_,i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200/60" />)}</div>
        ) : !tasks.data?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl float">✅</span>
            <p className="mt-4 font-bold text-gray-500">No tasks found</p>
            <p className="text-xs text-gray-400 mt-1">Create tasks to track follow-ups and reminders</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-2">
            {tasks.data.map((task) => {
              const pCfg    = PRIORITY_CFG[task.priority];
              const due     = dueDateLabel(task.dueDate);
              const overdue = isOverdue(task.dueDate, task.status);
              return (
                <div key={task.id}
                  className={cn('glass-card rounded-xl px-4 py-3 flex items-center gap-3 group transition-all', overdue && 'border-red-200 border')}>
                  {/* Check button */}
                  <button
                    onClick={() => update.mutate({ id: task.id, status: task.status === 'DONE' ? 'PENDING' : 'DONE' })}
                    className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all', task.status === 'DONE' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 hover:border-emerald-400')}>
                    {task.status === 'DONE' && <span className="text-[10px] text-white font-black">✓</span>}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold text-gray-900', task.status === 'DONE' && 'line-through text-gray-400')}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', pCfg.bg, pCfg.color)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', pCfg.dot)} />
                        {pCfg.label}
                      </span>
                      {due && (
                        <span className={cn('flex items-center gap-1 text-[10px] font-semibold', due.overdue ? 'text-red-600' : 'text-gray-500')}>
                          <Calendar className="h-3 w-3" /> {due.text}
                        </span>
                      )}
                      {task.lead && <span className="text-[10px] text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">🎯 {task.lead.name}</span>}
                      {task.customer && <span className="text-[10px] text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">👤 {task.customer.name ?? task.customer.phone}</span>}
                      {task.assignedTo && <span className="text-[10px] text-gray-400">· {task.assignedTo.name}</span>}
                    </div>
                  </div>

                  {/* Status selector */}
                  <select
                    value={task.status}
                    onChange={(e) => update.mutate({ id: task.id, status: e.target.value as TaskStatus })}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-1 outline-none focus:border-orange-400 hidden sm:block"
                  >
                    {(Object.keys(STATUS_CFG) as TaskStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => remove.mutate(task.id)}
                    className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 spin-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">New Task ✅</h2>
              <button onClick={() => setCreating(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Title *</label>
                <input placeholder="Follow up with Rahul about catering…" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Notes</label>
                <textarea rows={2} placeholder="Additional details…" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Due date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1 block">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value as TaskPriority})}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400">
                    {(['LOW','MEDIUM','HIGH','URGENT'] as TaskPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600">Cancel</button>
              <button disabled={!form.title.trim() || create.isPending} onClick={() => create.mutate()}
                className="flex-1 rounded-xl gradient-orange py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {create.isPending ? 'Creating…' : 'Create task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
