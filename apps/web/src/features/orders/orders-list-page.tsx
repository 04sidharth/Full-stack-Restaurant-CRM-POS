import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt, ChevronDown, ChevronRight } from 'lucide-react';
import { ordersApi, type OrderStatus, type OrderType, type Order } from './orders-api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUSES: ('ALL' | OrderStatus)[] = ['ALL', 'DRAFT', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];
const TYPES: ('ALL' | OrderType)[] = ['ALL', 'DINE_IN', 'TAKEAWAY', 'DELIVERY'];

const statusBadge = (s: OrderStatus) => {
  switch (s) {
    case 'COMPLETED': return 'success';
    case 'CANCELLED': return 'destructive';
    case 'DRAFT':     return 'secondary';
    default:          return 'warning';
  }
};

function elapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d`;
}

function elapsedColor(iso: string, status: OrderStatus): string {
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'text-muted-foreground';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins > 45) return 'text-red-600 font-semibold';
  if (mins > 20) return 'text-amber-600 font-medium';
  return 'text-muted-foreground';
}

export const OrdersListPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [type, setType] = useState<(typeof TYPES)[number]>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { status, type }],
    queryFn: () => ordersApi.list({ status: status === 'ALL' ? undefined : status, type: type === 'ALL' ? undefined : type, limit: 100 }),
  });

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="container max-w-7xl py-8 px-4 md:px-8 page-enter">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">All orders, active and historical</p>
        </div>
        <Button size="sm" onClick={() => navigate('/pos')}>New order</Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${status === s ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
          {TYPES.map((t) => (
            <button
              key={t}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${type === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setType(t)}
            >
              {t.replace('_', '-')}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            ) : !data || data.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No orders found.</div>
            ) : (
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 w-8"></th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Table / Customer</th>
                    <th className="px-4 py-3 text-center">Items</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Age</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((o: Order, i: number) => (
                    <>
                      <tr
                        key={o.id}
                        className={`border-b last:border-0 hover:bg-muted/20 cursor-pointer ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}
                        onClick={() => toggleExpand(o.id)}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {expandedId === o.id
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </td>
                        <td className="px-4 py-3 font-semibold">#{o.orderNumber}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs">{o.type.replace('_', '-')}</span>
                        </td>
                        <td className="px-4 py-3">
                          {o.table ? `Table ${o.table.name}` : o.customer ? (o.customer.name ?? o.customer.phone) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">{o.items.length}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{Number(o.total).toFixed(0)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadge(o.status)}>{o.status}</Badge>
                        </td>
                        <td className={`px-4 py-3 text-xs ${elapsedColor(o.createdAt, o.status)}`}>
                          {elapsed(o.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/pos?order=${o.id}`)}>
                                Open
                              </Button>
                            )}
                            {['PREPARING', 'READY', 'SERVED', 'DRAFT'].includes(o.status) && (
                              <Button size="sm" className="h-7 text-xs" onClick={() => navigate(`/billing/${o.id}`)}>
                                <Receipt className="mr-1 h-3 w-3" />Bill
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === o.id && (
                        <tr key={`${o.id}-expand`} className="border-b bg-muted/20 row-expand">
                          <td colSpan={9} className="px-8 py-3">
                            <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Items</div>
                            <div className="flex flex-wrap gap-2">
                              {o.items.filter((it) => it.status !== 'CANCELLED').map((it) => (
                                <span key={it.id} className="inline-flex items-center gap-1 rounded-md bg-background border px-2 py-1 text-xs shadow-sm">
                                  <span className="font-semibold">{it.quantity}×</span>
                                  {it.nameSnapshot}
                                  {it.variant && <span className="text-muted-foreground">({it.variant.name})</span>}
                                  <span className="text-muted-foreground">₹{(Number(it.unitPrice) * it.quantity).toFixed(0)}</span>
                                </span>
                              ))}
                            </div>
                            {o.notes && (
                              <p className="mt-2 text-xs text-muted-foreground italic">Note: {o.notes}</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
