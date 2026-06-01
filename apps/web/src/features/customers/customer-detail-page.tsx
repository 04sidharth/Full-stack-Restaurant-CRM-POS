import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { customersApi } from './customers-api';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/cn';

// ── Tier helper ────────────────────────────────────────────

function tier(totalSpend: number) {
  if (totalSpend >= 100000) return { icon: '💎', label: 'Diamond', color: 'text-cyan-700',   bg: 'bg-cyan-50'   };
  if (totalSpend >= 25000)  return { icon: '🥇', label: 'Gold',    color: 'text-yellow-700', bg: 'bg-yellow-50' };
  if (totalSpend >= 5000)   return { icon: '🥈', label: 'Silver',  color: 'text-gray-600',   bg: 'bg-gray-100'  };
  return                           { icon: '🥉', label: 'Bronze',  color: 'text-amber-700',  bg: 'bg-amber-50'  };
}

function visitFrequencyLabel(avgDays: number | null) {
  if (!avgDays) return null;
  if (avgDays <= 7)  return { text: 'Weekly visitor',     color: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (avgDays <= 15) return { text: 'Bi-weekly visitor',  color: 'text-blue-700',    bg: 'bg-blue-50'    };
  if (avgDays <= 35) return { text: 'Monthly visitor',    color: 'text-orange-700',  bg: 'bg-orange-50'  };
  return                    { text: 'Occasional visitor', color: 'text-gray-600',    bg: 'bg-gray-100'   };
}

// ── Common dietary / preference tags ──────────────────────

const PRESET_TAGS = ['Veg', 'Non-Veg', 'Vegan', 'Jain', 'No Onion', 'No Garlic', 'Spicy', 'Mild', 'Gluten-free', 'Nut allergy', 'Birthday', 'Anniversary', 'Corporate', 'Regular takeaway'];

// ── Tag editor ─────────────────────────────────────────────

const TagEditor = ({ tags, onSave, busy }: { tags: string[]; onSave: (t: string[]) => void; busy: boolean }) => {
  const [current, setCurrent] = useState<string[]>(tags);
  const [input, setInput] = useState('');

  const add = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !current.includes(trimmed)) setCurrent([...current, trimmed]);
    setInput('');
  };

  const remove = (tag: string) => setCurrent(current.filter((t) => t !== tag));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {current.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
            <Tag className="h-3 w-3" />{tag}
            <button onClick={() => remove(tag)} className="ml-0.5 hover:text-blue-600"><X className="h-3 w-3" /></button>
          </span>
        ))}
        {current.length === 0 && <p className="text-xs text-gray-400">No tags yet</p>}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400"
          placeholder="Type a tag and press Enter…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
        />
        <Button size="sm" variant="outline" onClick={() => add(input)} disabled={!input.trim()}>Add</Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {PRESET_TAGS.filter((t) => !current.includes(t)).map((t) => (
          <button key={t} onClick={() => add(t)}
            className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-colors">
            + {t}
          </button>
        ))}
      </div>

      <Button size="sm" onClick={() => onSave(current)} disabled={busy}>
        {busy ? 'Saving…' : 'Save tags'}
      </Button>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────

export const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loyaltyDelta, setLoyaltyDelta] = useState('');
  const [loyaltyNote, setLoyaltyNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.get(id!),
    enabled: !!id,
  });

  const { data: insights } = useQuery({
    queryKey: ['customer-insights', id],
    queryFn: () => customersApi.insights(id!),
    enabled: !!id,
  });

  const updateTags = useMutation({
    mutationFn: (tags: string[]) => customersApi.update(id!, { tags }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Tags updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const adjustLoyalty = useMutation({
    mutationFn: () => customersApi.adjustLoyalty(id!, { points: Number(loyaltyDelta), type: 'ADJUST', note: loyaltyNote || undefined }),
    onSuccess: () => {
      setLoyaltyDelta(''); setLoyaltyNote('');
      qc.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Loyalty adjusted');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (!data) return <div className="p-8 text-sm text-gray-400">Customer not found.</div>;

  const t = tier(Number(data.totalSpend));
  const freq = visitFrequencyLabel(insights?.avgDaysBetweenVisits ?? null);

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b bg-white flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="rounded-xl p-2 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-lg font-black text-white shadow">
            {(data.name ?? data.phone).charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{data.name ?? data.phone}</h1>
            <p className="text-xs text-gray-500">{data.phone}{data.email ? ` · ${data.email}` : ''}</p>
          </div>
        </div>
        <div className="ml-4 flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold', t.bg, t.color)}>
            {t.icon} {t.label}
          </span>
          {freq && (
            <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold', freq.bg, freq.color)}>
              {freq.text}
            </span>
          )}
          {(data.tags ?? []).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              <Tag className="h-3 w-3" />{tag}
            </span>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-2 gap-3 border-b bg-gray-50 px-6 py-4 sm:grid-cols-4">
        {[
          { label: 'Total orders', value: data.totalOrders },
          { label: 'Total spend', value: `₹${Number(data.totalSpend).toFixed(0)}` },
          { label: 'Loyalty points', value: `⭐ ${data.loyaltyPoints}` },
          { label: 'Avg / visit', value: insights ? `₹${insights.avgSpendPerVisit.toFixed(0)}` : '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-xl font-black text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Tabs defaultValue="insights">
          <TabsList className="mb-4">
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="tags">Tags & Prefs</TabsTrigger>
          </TabsList>

          {/* ── Insights tab ─────────────────────────────── */}
          <TabsContent value="insights">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Favourite items */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="mb-3 text-sm font-bold text-gray-800">🍽️ Favourite Items</h3>
                  {!insights || insights.topItems.length === 0 ? (
                    <p className="text-sm text-gray-400">No order data yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {insights.topItems.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-orange-700">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-800">{item.name}</span>
                              <span className="text-xs text-gray-500">{item.quantity}×</span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500"
                                style={{ width: `${Math.min(100, (item.quantity / (insights.topItems[0]?.quantity ?? 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Visit pattern */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="mb-3 text-sm font-bold text-gray-800">📅 Visit Pattern</h3>
                  <div className="space-y-3">
                    {[
                      {
                        label: 'Completed orders',
                        value: insights?.totalCompletedOrders ?? data.totalOrders,
                        icon: '✅',
                      },
                      {
                        label: 'Avg days between visits',
                        value: insights?.avgDaysBetweenVisits
                          ? `${insights.avgDaysBetweenVisits.toFixed(1)} days`
                          : 'Not enough data',
                        icon: '📆',
                      },
                      {
                        label: 'Average spend per visit',
                        value: insights?.avgSpendPerVisit
                          ? `₹${insights.avgSpendPerVisit.toFixed(0)}`
                          : '—',
                        icon: '💰',
                      },
                      {
                        label: 'Last visit',
                        value: data.lastVisitAt
                          ? new Date(data.lastVisitAt).toLocaleDateString()
                          : 'Never',
                        icon: '🕐',
                      },
                      {
                        label: 'Customer since',
                        value: new Date(data.createdAt).toLocaleDateString(),
                        icon: '🗓️',
                      },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
                        <span className="text-base">{row.icon}</span>
                        <div className="flex-1">
                          <p className="text-[11px] text-gray-500">{row.label}</p>
                          <p className="text-sm font-semibold text-gray-800">{row.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {data.notes && (
                <Card className="md:col-span-2">
                  <CardContent className="p-5">
                    <h3 className="mb-2 text-sm font-bold text-gray-800">📝 Staff Notes</h3>
                    <p className="text-sm text-gray-600 italic">"{data.notes}"</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── Orders tab ───────────────────────────────── */}
          <TabsContent value="orders">
            <Card>
              <CardContent className="p-0">
                {data.orders.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">No orders yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50/80 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Table</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o) => (
                        <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(o.status === 'COMPLETED' ? `/billing/${o.id}` : `/pos?order=${o.id}`)}>
                          <td className="px-4 py-3 font-medium">#{o.orderNumber}</td>
                          <td className="px-4 py-3 text-xs">{o.type.replace('_', '-')}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{o.table?.name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <Badge variant={o.status === 'COMPLETED' ? 'success' : o.status === 'CANCELLED' ? 'destructive' : 'warning'}>
                              {o.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{new Date(o.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold">₹{Number(o.total).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Loyalty tab ──────────────────────────────── */}
          <TabsContent value="loyalty">
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Adjust points (+/-)</Label>
                    <Input type="number" value={loyaltyDelta} onChange={(e) => setLoyaltyDelta(e.target.value)} placeholder="+50 or -20" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Reason</Label>
                    <Input value={loyaltyNote} onChange={(e) => setLoyaltyNote(e.target.value)} placeholder="e.g. birthday bonus, promo" />
                  </div>
                </div>
                <Button onClick={() => adjustLoyalty.mutate()} disabled={!loyaltyDelta || Number(loyaltyDelta) === 0 || adjustLoyalty.isPending}>
                  Apply
                </Button>
                <hr />
                <ul className="space-y-2 text-sm">
                  {data.loyaltyTxns.length === 0 ? (
                    <li className="text-gray-400">No loyalty activity yet.</li>
                  ) : data.loyaltyTxns.map((t) => (
                    <li key={t.id} className="flex items-center justify-between border-b py-1.5 last:border-0">
                      <span>
                        <Badge variant="outline" className="mr-2 text-[10px]">{t.type}</Badge>
                        {t.note ?? '—'}
                      </span>
                      <span className={t.points >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>
                        {t.points > 0 ? '+' : ''}{t.points} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Feedback tab ─────────────────────────────── */}
          <TabsContent value="feedback">
            <Card>
              <CardContent className="space-y-3 p-6">
                {data.feedbacks.length === 0 ? (
                  <p className="text-sm text-gray-400">No feedback collected yet.</p>
                ) : data.feedbacks.map((f) => (
                  <div key={f.id} className="rounded-xl border p-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn('h-4 w-4', i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleString()}</span>
                    </div>
                    {f.comment && <p className="text-sm text-gray-700">{f.comment}</p>}
                    {(f.foodRating || f.serviceRating) && (
                      <div className="mt-1 flex gap-3 text-xs text-gray-400">
                        {f.foodRating && <span>🍽️ Food: {f.foodRating}/5</span>}
                        {f.serviceRating && <span>🙋 Service: {f.serviceRating}/5</span>}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tags & Preferences tab ───────────────────── */}
          <TabsContent value="tags">
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-1 text-sm font-bold text-gray-800">Dietary preferences & tags</h3>
                <p className="mb-4 text-xs text-gray-500">
                  Tag this customer for quick recognition by staff — dietary needs, preferences, occasion types.
                </p>
                <TagEditor
                  tags={data.tags ?? []}
                  onSave={(tags) => updateTags.mutate(tags)}
                  busy={updateTags.isPending}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
