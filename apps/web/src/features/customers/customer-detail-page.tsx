import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star } from 'lucide-react';
import { toast } from 'sonner';
import { customersApi } from './customers-api';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const adjustLoyalty = useMutation({
    mutationFn: () =>
      customersApi.adjustLoyalty(id!, {
        points: Number(loyaltyDelta),
        type: 'ADJUST',
        note: loyaltyNote || undefined,
      }),
    onSuccess: () => {
      setLoyaltyDelta('');
      setLoyaltyNote('');
      qc.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Loyalty adjusted');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-8 text-sm text-muted-foreground">Customer not found.</div>;

  return (
    <div className="container py-8">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/customers')}>
        <ArrowLeft className="h-4 w-4" /> All customers
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-3 p-6">
            <div>
              <h2 className="text-xl font-semibold">{data.name ?? '—'}</h2>
              <p className="text-sm text-muted-foreground">{data.phone}</p>
              {data.email && <p className="text-sm text-muted-foreground">{data.email}</p>}
              {data.city && <p className="text-sm text-muted-foreground">{data.city}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Orders</div>
                <div className="text-2xl font-bold">{data.totalOrders}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Spend</div>
                <div className="text-2xl font-bold">₹{Number(data.totalSpend).toFixed(0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Points</div>
                <div className="text-2xl font-bold">{data.loyaltyPoints}</div>
              </div>
            </div>
            {data.lastVisitAt && (
              <p className="text-xs text-muted-foreground">
                Last visit: {new Date(data.lastVisitAt).toLocaleDateString()}
              </p>
            )}
            {data.notes && <p className="text-sm">{data.notes}</p>}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
            </TabsList>
            <TabsContent value="orders">
              <Card>
                <CardContent className="p-0">
                  {data.orders.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">No orders yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.orders.map((o) => (
                          <tr
                            key={o.id}
                            className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                            onClick={() => navigate(o.status === 'COMPLETED' ? `/billing/${o.id}` : `/pos?order=${o.id}`)}
                          >
                            <td className="px-4 py-3 font-medium">#{o.orderNumber}</td>
                            <td className="px-4 py-3">{o.type.replace('_', '-')}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  o.status === 'COMPLETED' ? 'success' : o.status === 'CANCELLED' ? 'destructive' : 'warning'
                                }
                              >
                                {o.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {new Date(o.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">₹{Number(o.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="loyalty">
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Adjust points (+/-)</Label>
                      <Input
                        type="number"
                        value={loyaltyDelta}
                        onChange={(e) => setLoyaltyDelta(e.target.value)}
                        placeholder="+50 or -20"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Reason</Label>
                      <Input value={loyaltyNote} onChange={(e) => setLoyaltyNote(e.target.value)} placeholder="e.g. promo bonus" />
                    </div>
                  </div>
                  <Button
                    onClick={() => adjustLoyalty.mutate()}
                    disabled={!loyaltyDelta || Number(loyaltyDelta) === 0 || adjustLoyalty.isPending}
                  >
                    Apply
                  </Button>
                  <hr />
                  <ul className="space-y-2 text-sm">
                    {data.loyaltyTxns.length === 0 ? (
                      <li className="text-muted-foreground">No loyalty activity yet.</li>
                    ) : (
                      data.loyaltyTxns.map((t) => (
                        <li key={t.id} className="flex items-center justify-between border-b py-1 last:border-0">
                          <span>
                            <Badge variant="outline" className="mr-2 text-[10px]">
                              {t.type}
                            </Badge>
                            {t.note ?? '—'}
                          </span>
                          <span className={t.points >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                            {t.points > 0 ? '+' : ''}
                            {t.points} pts
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="feedback">
              <Card>
                <CardContent className="space-y-3 p-6">
                  {data.feedbacks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No feedback collected yet.</p>
                  ) : (
                    data.feedbacks.map((f) => (
                      <div key={f.id} className="rounded-md border p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(f.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {f.comment && <p className="text-sm">{f.comment}</p>}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
