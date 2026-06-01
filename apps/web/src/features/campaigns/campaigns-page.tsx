import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Send, Trash2, X, Eye } from 'lucide-react';
import { campaignsApi, type Campaign, type CampaignChannel, type CampaignSegment } from './campaigns-api';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

// ── Config maps ────────────────────────────────────────────────────────

const CHANNEL_CFG: Record<CampaignChannel, { icon: string; label: string; color: string; bg: string }> = {
  SMS:      { icon: '📱', label: 'SMS',      color: 'text-gray-700',   bg: 'bg-gray-100'   },
  WHATSAPP: { icon: '💬', label: 'WhatsApp', color: 'text-green-700',  bg: 'bg-green-50'   },
  EMAIL:    { icon: '📧', label: 'Email',    color: 'text-indigo-700', bg: 'bg-indigo-50'  },
};

const SEGMENT_CFG: Record<CampaignSegment, { emoji: string; label: string; desc: string; color: string; bg: string }> = {
  ALL:      { emoji: '👥', label: 'All customers',      desc: 'Every active customer',            color: 'text-gray-700',   bg: 'bg-gray-100'   },
  NEW:      { emoji: '🆕', label: 'New customers',      desc: 'Joined in last 30 days',           color: 'text-blue-700',   bg: 'bg-blue-50'    },
  REGULAR:  { emoji: '🔄', label: 'Regular customers',  desc: '3+ orders placed',                 color: 'text-indigo-700', bg: 'bg-indigo-50'  },
  VIP:      { emoji: '👑', label: 'VIP customers',      desc: '₹25,000+ total spend',             color: 'text-yellow-700', bg: 'bg-yellow-50'  },
  AT_RISK:  { emoji: '⚠️',  label: 'At-Risk customers',  desc: 'No visit in 30+ days',             color: 'text-amber-700',  bg: 'bg-amber-50'   },
  INACTIVE: { emoji: '💤', label: 'Inactive customers', desc: 'No visit in 60+ days or no orders', color: 'text-red-700',    bg: 'bg-red-50'     },
};

const CHANNELS = Object.keys(CHANNEL_CFG) as CampaignChannel[];
const SEGMENTS = Object.keys(SEGMENT_CFG) as CampaignSegment[];

// ── Message templates per segment ─────────────────────────────────────

const TEMPLATES: Record<CampaignSegment, string[]> = {
  ALL:      [
    'Hi {name}! 🍽️ We\'re running a special offer this week at Demo Restaurant. Visit us and enjoy exclusive deals!',
    'Hello {name}! Thank you for being our valued customer. Come visit us and enjoy our new menu!',
  ],
  NEW:      [
    'Hi {name}! Welcome to Demo Restaurant 🎉 Enjoy 10% off your next visit. We can\'t wait to see you again!',
    'Hello {name}! We\'re so glad you visited us. As a welcome gift, show this message for a free dessert!',
  ],
  REGULAR:  [
    'Hi {name}! As one of our regulars, here\'s a special treat — buy 2 get 1 free this weekend! 🎁',
    'Hello {name}! We love having you. Enjoy priority seating on weekends — just mention this message!',
  ],
  VIP:      [
    'Hi {name}! You\'re one of our most valued guests 👑 We\'re holding an exclusive VIP dinner — you\'re invited!',
    'Hello {name}! As a Diamond member, enjoy complimentary dessert on your next visit. See you soon!',
  ],
  AT_RISK:  [
    'Hi {name}! We miss you! 😢 It\'s been a while. Come back this weekend and enjoy 15% off your bill!',
    'Hello {name}! We haven\'t seen you in a while. We\'d love to have you back — special discount just for you!',
  ],
  INACTIVE: [
    'Hi {name}! We\'ve added exciting new dishes! 🍜 Come taste what you\'ve been missing. Special offer inside!',
    'Hello {name}! Long time no see! We\'ve revamped our menu. Visit us and get a complimentary starter!',
  ],
};

// ── Create campaign modal ──────────────────────────────────────────────

const CreateModal = ({ onClose }: { onClose: () => void }) => {
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    name: '',
    description: '',
    channel: 'WHATSAPP' as CampaignChannel,
    targetSegment: 'ALL' as CampaignSegment,
    messageBody: '',
  });

  const { data: preview, isFetching: previewing } = useQuery({
    queryKey: ['campaign-preview', form.targetSegment],
    queryFn: () => campaignsApi.previewSegment(form.targetSegment),
    staleTime: 30_000,
    enabled: step >= 2,
  });

  const create = useMutation({
    mutationFn: () => campaignsApi.create({
      name: form.name,
      description: form.description || undefined,
      channel: form.channel,
      targetSegment: form.targetSegment,
      messageBody: form.messageBody,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const seg = SEGMENT_CFG[form.targetSegment];
  const ch = CHANNEL_CFG[form.channel];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-xl rounded-2xl shadow-2xl spin-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">New Campaign 📣</h2>
            <p className="text-xs text-gray-500">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        <div className="p-6 space-y-4">
          {/* Step 1: Basic info */}
          {step === 1 && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5 block">Campaign name *</label>
                <input
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
                  placeholder="e.g. Weekend Paneer Offer"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5 block">Description</label>
                <input
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
                  placeholder="Internal notes about this campaign…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 block">Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {CHANNELS.map((ch) => {
                    const cfg = CHANNEL_CFG[ch];
                    return (
                      <button key={ch} onClick={() => setForm({ ...form, channel: ch })}
                        className={cn('rounded-xl border-2 p-3 text-center transition-all', form.channel === ch ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300')}>
                        <div className="text-2xl mb-1">{cfg.icon}</div>
                        <div className="text-xs font-bold text-gray-700">{cfg.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Step 2: Target segment */}
          {step === 2 && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 block">Target segment</label>
                <div className="grid grid-cols-2 gap-2">
                  {SEGMENTS.map((s) => {
                    const cfg = SEGMENT_CFG[s];
                    return (
                      <button key={s} onClick={() => setForm({ ...form, targetSegment: s })}
                        className={cn('rounded-xl border-2 p-3 text-left transition-all', form.targetSegment === s ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300')}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{cfg.emoji}</span>
                          <span className="text-xs font-bold text-gray-800">{cfg.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-500">{cfg.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {preview && (
                <div className={cn('rounded-xl border-2 px-4 py-3 flex items-center gap-3', seg.bg, 'border-transparent')}>
                  <span className="text-2xl">{seg.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {previewing ? 'Counting…' : `${preview.count} customer${preview.count !== 1 ? 's' : ''} will receive this campaign`}
                    </p>
                    <p className="text-xs text-gray-500">{seg.desc}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 3: Message */}
          {step === 3 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Message body *</label>
                  <span className="text-xs text-gray-400">{form.messageBody.length}/1600</span>
                </div>
                <textarea
                  rows={5}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 resize-none"
                  placeholder="Write your message… Use {name} to personalize."
                  value={form.messageBody}
                  onChange={(e) => setForm({ ...form, messageBody: e.target.value })}
                />
                <p className="text-[11px] text-gray-400 mt-1">Use <code className="bg-gray-100 px-1 rounded">{'{name}'}</code> to insert the customer's name.</p>
              </div>

              {/* Quick template buttons */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 block">Quick templates</label>
                <div className="space-y-2">
                  {TEMPLATES[form.targetSegment].map((tpl, i) => (
                    <button key={i} onClick={() => setForm({ ...form, messageBody: tpl })}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-600 hover:border-orange-300 hover:bg-orange-50 transition-colors line-clamp-2">
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className={cn('rounded-xl p-4 border', ch.bg, 'border-transparent')}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{ch.icon}</span>
                  <span className={cn('text-xs font-bold', ch.color)}>Preview — {ch.label}</span>
                  <span className="ml-auto text-xs text-gray-400">{preview?.count ?? 0} recipients</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {form.messageBody.replace('{name}', 'Rahul') || <span className="italic text-gray-400">Your message will appear here…</span>}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <button onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : onClose()}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 && !form.name.trim()}
              className="rounded-xl gradient-orange px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
              Next →
            </button>
          ) : (
            <button
              onClick={() => create.mutate()}
              disabled={!form.messageBody.trim() || create.isPending}
              className="flex items-center gap-2 rounded-xl gradient-orange px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
              <Send className="h-4 w-4" /> {create.isPending ? 'Creating…' : 'Save campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Campaign card ──────────────────────────────────────────────────────

const CampaignCard = ({ campaign, onExecute, onDelete }: {
  campaign: Campaign;
  onExecute: () => void;
  onDelete: () => void;
}) => {
  const seg = SEGMENT_CFG[campaign.targetSegment];
  const ch = CHANNEL_CFG[campaign.channel];
  const isDraft = campaign.status === 'DRAFT';

  return (
    <div className={cn('glass-card rounded-2xl overflow-hidden transition-all hover:shadow-md', isDraft ? 'border-2 border-dashed border-orange-200' : '')}>
      {/* Top strip */}
      <div className={cn('px-4 py-2 flex items-center gap-2', isDraft ? 'bg-orange-50' : 'bg-emerald-50')}>
        <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-black', isDraft ? 'bg-orange-200 text-orange-800' : 'bg-emerald-200 text-emerald-800')}>
          {isDraft ? 'DRAFT' : '✓ SENT'}
        </span>
        <span className={cn('text-xs font-semibold', ch.color)}>{ch.icon} {ch.label}</span>
        <span className="ml-auto text-[10px] text-gray-400">
          {isDraft ? `Created ${new Date(campaign.createdAt).toLocaleDateString()}` : `Sent ${campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString() : '—'}`}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-gray-900">{campaign.name}</h3>
            {campaign.description && <p className="text-xs text-gray-500 mt-0.5">{campaign.description}</p>}
          </div>
          <span className={cn('shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', seg.bg, seg.color)}>
            {seg.emoji} {seg.label}
          </span>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-4 bg-gray-50 rounded-xl px-3 py-2">
          {campaign.messageBody}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>🎯 {campaign.targetCount} targeted</span>
            {!isDraft && <span>✅ {campaign.sentCount} sent</span>}
            <span>by {campaign.createdBy.name}</span>
          </div>
          <div className="flex gap-2">
            {isDraft && (
              <>
                <button onClick={onDelete}
                  className="rounded-xl border border-gray-200 p-2 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={onExecute}
                  className="flex items-center gap-1.5 rounded-xl gradient-orange px-3 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md transition-all">
                  <Send className="h-3.5 w-3.5" /> Send now
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────

export const CampaignsPage = () => {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DRAFT' | 'SENT'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', filterStatus],
    queryFn: () => campaignsApi.list(filterStatus === 'ALL' ? undefined : filterStatus),
  });

  const execute = useMutation({
    mutationFn: campaignsApi.execute,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`Campaign sent to ${res.sent} customers! 🚀`);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: campaignsApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign deleted'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const total   = data?.length ?? 0;
  const drafts  = data?.filter((c) => c.status === 'DRAFT').length ?? 0;
  const sent    = data?.filter((c) => c.status === 'SENT').length ?? 0;
  const reached = data?.filter((c) => c.status === 'SENT').reduce((s, c) => s + c.sentCount, 0) ?? 0;

  return (
    <div className="page-enter flex h-full flex-col" style={{ background: '#f5f3ef' }}>
      {/* Hero */}
      <div className="shrink-0 overflow-hidden px-6 py-6"
        style={{ background: 'linear-gradient(135deg, #4a1942, #7b2d6b, #b35095)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-black text-white">Marketing Campaigns</h1>
            <p className="text-sm text-white/50">Send targeted SMS, WhatsApp & email to customer segments</p>
          </div>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl gradient-orange px-4 py-2.5 text-sm font-bold text-white shadow-lg shimmer-effect">
            <Plus className="h-4 w-4" /> New campaign
          </button>
        </div>

        {/* KPI chips */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total',   value: total,   icon: '📋' },
            { label: 'Drafts',  value: drafts,  icon: '✏️' },
            { label: 'Sent',    value: sent,    icon: '✅' },
            { label: 'Reached', value: reached, icon: '👥' },
          ].map((k) => (
            <div key={k.label} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur-sm">
              <span>{k.icon}</span>
              <div>
                <p className="text-[10px] text-white/50">{k.label}</p>
                <p className="text-sm font-black">{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="shrink-0 border-b bg-white px-6 py-3">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          {(['ALL', 'DRAFT', 'SENT'] as const).map((f) => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={cn('rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-all', filterStatus === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {f === 'ALL' ? 'All' : f === 'DRAFT' ? '✏️ Drafts' : '✅ Sent'}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-200/60" />)}</div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl float">📣</span>
            <p className="mt-4 font-bold text-gray-500">No campaigns yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first campaign to reach customers at scale</p>
            <button onClick={() => setCreating(true)}
              className="mt-5 flex items-center gap-2 rounded-xl gradient-orange px-5 py-2.5 text-sm font-bold text-white shadow-md">
              <Plus className="h-4 w-4" /> Create first campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onExecute={() => {
                  if (confirm(`Send "${campaign.name}" to ${campaign.targetCount} customer${campaign.targetCount !== 1 ? 's' : ''}?`)) {
                    execute.mutate(campaign.id);
                  }
                }}
                onDelete={() => {
                  if (confirm('Delete this draft campaign?')) remove.mutate(campaign.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {creating && <CreateModal onClose={() => setCreating(false)} />}
    </div>
  );
};
