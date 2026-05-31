import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ordersApi, type KitchenTicket } from '../orders/orders-api';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

const minutesAgo = (iso: string | null) => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
};

const REFRESH_OPTIONS = [
  { label: '5s', value: 5_000 },
  { label: '8s', value: 8_000 },
  { label: '15s', value: 15_000 },
  { label: '30s', value: 30_000 },
];

export const KdsPage = () => {
  const qc = useQueryClient();
  const [refreshMs, setRefreshMs] = useState(8_000);

  const queue = useQuery({
    queryKey: ['kitchen-queue'],
    queryFn: ordersApi.kitchenQueue,
    refetchInterval: refreshMs,
  });

  const setStatus = useMutation({
    mutationFn: ({ orderId, itemId, status }: { orderId: string; itemId: string; status: 'PREPARING' | 'READY' | 'SERVED' }) =>
      ordersApi.setItemStatus(orderId, itemId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kitchen-queue'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const preparing = queue.data?.filter((t) => t.items.some((i) => i.status === 'PREPARING')).length ?? 0;
  const ready = queue.data?.filter((t) => t.items.some((i) => i.status === 'READY')).length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-900 p-5 text-zinc-100">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kitchen Display</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-zinc-400">
            {queue.data && queue.data.length > 0 && (
              <>
                {preparing > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    {preparing} cooking
                  </span>
                )}
                {ready > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {ready} ready
                  </span>
                )}
              </>
            )}
            {!queue.data?.length && <span>No active tickets</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh interval selector */}
          <div className="flex items-center gap-1 rounded-lg bg-zinc-800 p-1">
            <span className="px-2 text-xs text-zinc-500">Refresh</span>
            {REFRESH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  refreshMs === opt.value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200',
                )}
                onClick={() => setRefreshMs(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            onClick={() => queue.refetch()}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', queue.isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {queue.isLoading ? (
        <p className="text-zinc-400">Loading tickets…</p>
      ) : !queue.data || queue.data.length === 0 ? (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-10 w-10 text-emerald-400" />
            </div>
            <p className="text-xl font-semibold text-zinc-200">All caught up!</p>
            <p className="mt-1 text-sm text-zinc-400">No active kitchen tickets right now.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger">
          {queue.data.map((ticket) => (
            <KdsTicket
              key={ticket.id}
              ticket={ticket}
              onSet={(itemId, status) => setStatus.mutate({ orderId: ticket.id, itemId, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const KdsTicket = ({
  ticket,
  onSet,
}: {
  ticket: KitchenTicket;
  onSet: (itemId: string, status: 'READY' | 'SERVED') => void;
}) => {
  const age = minutesAgo(ticket.kotPrintedAt ?? ticket.createdAt);
  const isUrgent = age >= 15;
  const isWarning = age >= 8 && age < 15;

  const borderColor = isUrgent ? 'border-red-500' : isWarning ? 'border-amber-400' : 'border-zinc-700';
  const glowClass = isUrgent ? 'kds-urgent' : isWarning ? 'kds-warning' : '';
  const headerBg = isUrgent ? 'bg-red-900/30' : isWarning ? 'bg-amber-900/20' : '';
  const ageColor = isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-zinc-400';
  const stripeColor = isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-zinc-600';

  return (
    <div className={cn('flex flex-col rounded-xl border-2 bg-zinc-800 shadow-lg overflow-hidden transition-all', borderColor, glowClass)}>
      {/* Urgency stripe */}
      <div className={cn('h-1 w-full', stripeColor, (isUrgent || isWarning) && 'animate-pulse')} />
      {/* Ticket header */}
      <div className={cn('flex items-center justify-between px-4 py-3', headerBg)}>
        <div>
          <div className="text-lg font-bold tracking-tight">#{ticket.orderNumber}</div>
          <div className="text-xs text-zinc-400">
            {ticket.table ? `Table ${ticket.table.name}` : ticket.type.replace('_', '-')}
          </div>
        </div>
        <div className={cn('flex flex-col items-end gap-0.5', ageColor)}>
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Clock className="h-3.5 w-3.5" />
            {age}m
          </div>
          {isUrgent && <span className="text-[10px] font-bold uppercase tracking-wide">URGENT</span>}
          {isWarning && <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400">SLOW</span>}
        </div>
      </div>

      {/* Items */}
      <ul className="flex-1 divide-y divide-zinc-700/60">
        {ticket.items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tabular-nums">{item.quantity}×</span>
                  <span className={cn('text-sm font-medium', item.status === 'SERVED' && 'line-through opacity-40')}>
                    {item.nameSnapshot}
                  </span>
                </div>
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="mt-0.5 text-xs text-amber-300">{item.modifiers.map((m) => m.name).join(', ')}</div>
                )}
                {item.notes && <div className="mt-0.5 text-xs italic text-zinc-400">"{item.notes}"</div>}
              </div>
              <Badge
                variant={item.status === 'READY' ? 'success' : item.status === 'SERVED' ? 'secondary' : 'warning'}
                className="shrink-0 text-[10px]"
              >
                {item.status}
              </Badge>
            </div>
            {item.status !== 'SERVED' && (
              <div className="mt-2.5 flex gap-2">
                {item.status === 'PREPARING' && (
                  <Button
                    size="sm"
                    className="h-8 flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
                    onClick={() => onSet(item.id, 'READY')}
                  >
                    Mark ready
                  </Button>
                )}
                {item.status === 'READY' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 border-zinc-600 bg-zinc-700 text-zinc-100 hover:bg-zinc-600 text-xs font-semibold"
                    onClick={() => onSet(item.id, 'SERVED')}
                  >
                    Mark served
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
