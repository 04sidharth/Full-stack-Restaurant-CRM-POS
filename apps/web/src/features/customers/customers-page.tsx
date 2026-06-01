import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Star, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { customersApi, type CustomerInput, type CustomerSegment } from './customers-api';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';

// ── Tier helper ────────────────────────────────────────────────────────

function tier(totalSpend: number) {
  if (totalSpend >= 100000) return { icon: '💎', label: 'Diamond', color: 'text-cyan-600',   bg: 'bg-cyan-50'   };
  if (totalSpend >= 25000)  return { icon: '🥇', label: 'Gold',    color: 'text-yellow-600', bg: 'bg-yellow-50' };
  if (totalSpend >= 5000)   return { icon: '🥈', label: 'Silver',  color: 'text-gray-500',   bg: 'bg-gray-100'  };
  return                           { icon: '🥉', label: 'Bronze',  color: 'text-amber-700',  bg: 'bg-amber-50'  };
}

// ── Segment config ─────────────────────────────────────────────────────

type Seg = CustomerSegment | 'ALL';

const SEGMENTS: { id: Seg; label: string; emoji: string; desc: string }[] = [
  { id: 'ALL',      label: 'All',       emoji: '👥', desc: 'Every customer' },
  { id: 'NEW',      label: 'New',       emoji: '🆕', desc: 'Joined in last 30 days' },
  { id: 'REGULAR',  label: 'Regular',   emoji: '🔄', desc: '3+ orders placed' },
  { id: 'VIP',      label: 'VIP',       emoji: '👑', desc: '₹25,000+ total spend' },
  { id: 'AT_RISK',  label: 'At-Risk',   emoji: '⚠️',  desc: 'No visit in 30+ days' },
  { id: 'INACTIVE', label: 'Inactive',  emoji: '💤', desc: 'No visit in 60+ days or no orders' },
];

const blank: CustomerInput = { phone: '', name: '', email: '' };

// ── Page ───────────────────────────────────────────────────────────────

export const CustomersPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<Seg>('ALL');
  const [creating, setCreating] = useState(false);

  const { data: counts } = useQuery({
    queryKey: ['customer-segment-counts'],
    queryFn: customersApi.segmentCounts,
    staleTime: 30_000,
  });

  const list = useQuery({
    queryKey: ['customers', search, segment],
    queryFn: () => customersApi.list(search || undefined, segment === 'ALL' ? undefined : segment),
  });

  const create = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer-segment-counts'] });
      setCreating(false);
      toast.success('Customer added');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div className="flex h-full flex-col">
      {/* Hero */}
      <div className="shrink-0 px-6 py-5"
        style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-black text-white">Customers</h1>
            <p className="text-sm text-white/50">Customer database, loyalty, segmentation & feedback</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/feedback')}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              <Star className="h-4 w-4" /> Feedback
            </button>
            <button
              onClick={() => navigate('/campaigns')}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              📣 Campaigns
            </button>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-xl gradient-orange px-4 py-2 text-sm font-bold text-white shadow-lg shimmer-effect"
            >
              <Plus className="h-4 w-4" /> New customer
            </button>
          </div>
        </div>

        {/* Segment pills */}
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => {
            const count = counts?.[s.id as keyof typeof counts] ?? null;
            return (
              <button
                key={s.id}
                onClick={() => setSegment(s.id)}
                title={s.desc}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all border',
                  segment === s.id
                    ? 'bg-white text-gray-900 border-white shadow-md'
                    : 'border-white/20 text-white/70 hover:border-white/50 hover:text-white',
                )}
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
                {count !== null && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none',
                    segment === s.id ? 'bg-gray-900 text-white' : 'bg-white/20 text-white',
                  )}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 border-b bg-white px-6 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            placeholder="Search by phone, name, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Segment description */}
      {segment !== 'ALL' && (
        <div className="shrink-0 border-b bg-amber-50 px-6 py-2">
          <p className="text-xs text-amber-700 font-medium">
            {SEGMENTS.find((s) => s.id === segment)?.emoji}{' '}
            <strong>{SEGMENTS.find((s) => s.id === segment)?.label}:</strong>{' '}
            {SEGMENTS.find((s) => s.id === segment)?.desc}
          </p>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Spend</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Last visit</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : !list.data?.length ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">👥</span>
                    <p className="font-semibold text-gray-500">No customers in this segment</p>
                    <p className="text-xs text-gray-400">
                      {segment === 'ALL' ? 'Add your first customer to get started' : 'Try a different segment or search'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              list.data.map((c) => {
                const t = tier(Number(c.totalSpend));
                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b last:border-0 hover:bg-orange-50/50 transition-colors"
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-xs font-black text-white shadow-sm">
                          {(c.name ?? c.phone).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{c.name ?? '—'}</p>
                          {c.email && <p className="text-[11px] text-gray-400">{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                    <td className="px-4 py-3 text-right font-medium">{c.totalOrders}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{Number(c.totalSpend).toFixed(0)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', t.bg, t.color)}>
                        {t.icon} {t.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
                        ⭐ {c.loyaltyPoints} pts
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            <Tag className="h-2.5 w-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', c.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400')}>
                        {c.active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CustomerDialog
        key={`create-${creating}`}
        open={creating}
        onOpenChange={setCreating}
        title="New customer"
        initial={blank}
        busy={create.isPending}
        onSubmit={(input) => create.mutate(input)}
      />
    </div>
  );
};

// ── Create dialog ─────────────────────────────────────────────────────

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial: CustomerInput;
  busy: boolean;
  onSubmit: (input: CustomerInput) => void;
}

const CustomerDialog = ({ open, onOpenChange, title, initial, busy, onSubmit }: CustomerDialogProps) => {
  const [form, setForm] = useState(initial);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              phone: form.phone.trim(),
              name: form.name?.trim() || undefined,
              email: form.email?.trim() || undefined,
              city: form.city?.trim() || undefined,
              notes: form.notes?.trim() || undefined,
              gstNumber: form.gstNumber?.trim() || undefined,
            });
          }}
        >
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>GST number</Label>
            <Input value={form.gstNumber ?? ''} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Input value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter className="gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
