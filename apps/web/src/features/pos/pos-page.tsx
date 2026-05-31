import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Search, Send, Trash2, X, Users, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { menuApi } from '../menu/menu-api';
import type { MenuItem, FoodType } from '../menu/menu-types';
import { tablesApi } from '../tables/tables-api';
import { ordersApi, type Order, type OrderType, type AddItemInput, type OrderItemModifier } from '../orders/orders-api';
import { apiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { ItemPickerDialog, type AddItemPayload } from './item-picker-dialog';
import { cn } from '@/lib/cn';

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'DINE_IN',   label: 'Dine In'  },
  { value: 'DELIVERY',  label: 'Delivery' },
  { value: 'TAKEAWAY',  label: 'Pick Up'  },
];

const PAYMENT_METHODS = ['Cash', 'Card', 'Due', 'Other', 'Part'] as const;

/* Food type indicator */
const FoodDot = ({ type }: { type: FoodType }) => {
  const cfg: Record<FoodType, { border: string; dot: string }> = {
    VEG:    { border: 'border-green-600', dot: 'bg-green-600' },
    NONVEG: { border: 'border-red-600',   dot: 'bg-red-600'   },
    EGG:    { border: 'border-amber-500', dot: 'bg-amber-500' },
    VEGAN:  { border: 'border-green-700', dot: 'bg-green-700' },
  };
  const c = cfg[type];
  return (
    <span className={cn('inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border-2', c.border)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
    </span>
  );
};

export const PosPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editOrderId = searchParams.get('order');

  const cats    = useQuery({ queryKey: ['categories'],    queryFn: menuApi.listCategories });
  const items   = useQuery({ queryKey: ['menu-items-all'], queryFn: () => menuApi.listItems() });
  const sections = useQuery({ queryKey: ['sections'],     queryFn: tablesApi.listSections });
  const existingOrder = useQuery({
    queryKey: ['order', editOrderId],
    queryFn: () => (editOrderId ? ordersApi.get(editOrderId) : Promise.resolve(null)),
    enabled: !!editOrderId,
  });

  /* State */
  const [type, setType]               = useState<OrderType>('DINE_IN');
  const [tableId, setTableId]         = useState('');
  const [customerPhone, setPhone]     = useState('');
  const [customerName, setName]       = useState('');
  const [guestCount, setGuests]       = useState(2);
  const [draftItems, setDraftItems]   = useState<AddItemInput[]>([]);
  const [selCat, setSelCat]           = useState('');
  const [search, setSearch]           = useState('');
  const [picker, setPicker]           = useState<MenuItem | null>(null);
  const [payMethod, setPayMethod]     = useState<typeof PAYMENT_METHODS[number]>('Cash');
  const [isPaid, setIsPaid]           = useState(false);
  const [isComp, setIsComp]           = useState(false);

  const order: Order | null = existingOrder.data ?? null;
  const editing = !!order;

  const visibleItems = useMemo(() => {
    if (!items.data) return [];
    let list = items.data.filter((i) => i.available);
    if (selCat) list = list.filter((i) => i.categoryId === selCat);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((i) => i.name.toLowerCase().includes(q)); }
    return list;
  }, [items.data, selCat, search]);

  /* ── Mutations ──────────────────────────────────────────── */
  const createOrder = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: (o) => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['sections'] }); navigate(`/pos?order=${o.id}`); toast.success(`Order #${o.orderNumber} created`); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const addToOrder = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddItemInput }) => ordersApi.addItem(id, input),
    onSuccess: (o) => qc.setQueryData(['order', o.id], o),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const updateItem = useMutation({
    mutationFn: ({ id, itemId, input }: { id: string; itemId: string; input: { quantity?: number } }) => ordersApi.updateItem(id, itemId, input),
    onSuccess: (o) => qc.setQueryData(['order', o.id], o),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const removeItem = useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) => ordersApi.removeItem(id, itemId),
    onSuccess: (o) => qc.setQueryData(['order', o.id], o),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const sendToKitchen = useMutation({
    mutationFn: ordersApi.sendToKitchen,
    onSuccess: (o) => { qc.setQueryData(['order', o.id], o); qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('KOT sent!'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const cancelOrder = useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['sections'] }); navigate('/pos'); toast.success('Order cancelled'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  /* ── Item handlers ──────────────────────────────────────── */
  const handlePickItem = (item: MenuItem) => {
    const needsPicker = (item.variants?.length ?? 0) > 0 || (item.modifierLinks?.length ?? 0) > 0;
    if (needsPicker) { setPicker(item); return; }
    const payload: AddItemInput = { menuItemId: item.id, quantity: 1, modifiers: [] };
    if (editing && order) addToOrder.mutate({ id: order.id, input: payload });
    else setDraftItems((prev) => mergeDraft(prev, payload));
  };
  const handlePickerConfirm = (p: AddItemPayload) => {
    const input: AddItemInput = { menuItemId: p.menuItemId, variantId: p.variantId, quantity: p.quantity, notes: p.notes, modifiers: p.modifiers };
    if (editing && order) addToOrder.mutate({ id: order.id, input });
    else setDraftItems((prev) => [...prev, input]);
  };
  const updateDraftQty = (idx: number, delta: number) => {
    setDraftItems((prev) => {
      const next = [...prev]; const cur = next[idx];
      if (!cur) return prev;
      const q = (cur.quantity ?? 1) + delta;
      if (q <= 0) next.splice(idx, 1); else next[idx] = { ...cur, quantity: q };
      return next;
    });
  };
  const handleCreate = () => {
    if (draftItems.length === 0) { toast.error('Add at least one item'); return; }
    if (type === 'DINE_IN' && !tableId) { toast.error('Select a table for dine-in'); return; }
    createOrder.mutate({ type, tableId: type === 'DINE_IN' ? tableId : undefined, customerPhone: customerPhone.trim() || undefined, customerName: customerName.trim() || undefined, guestCount: type === 'DINE_IN' ? guestCount : undefined, items: draftItems });
  };

  /* ── Cart lines ─────────────────────────────────────────── */
  const lines = editing
    ? order!.items.filter((i) => i.status !== 'CANCELLED').map((i) => ({ id: i.id, idx: undefined as number | undefined, name: i.nameSnapshot, unitPrice: Number(i.unitPrice), quantity: i.quantity, taxRate: Number(i.taxRate), modifiers: i.modifiers ?? [], notes: i.notes }))
    : draftItems.map((di, idx) => {
        const item = items.data?.find((x) => x.id === di.menuItemId);
        const variant = item?.variants.find((v) => v.id === di.variantId);
        const unit = Number(item?.basePrice ?? 0) + Number(variant?.priceDelta ?? 0) + (di.modifiers ?? []).reduce((s, m) => s + m.priceDelta, 0);
        return { id: `d${idx}`, idx, name: item ? (variant ? `${item.name} (${variant.name})` : item.name) : '?', unitPrice: unit, quantity: di.quantity ?? 1, taxRate: Number(item?.taxRate ?? 0), modifiers: di.modifiers ?? [], notes: di.notes };
      });

  const subTotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const taxAmt   = lines.reduce((s, l) => s + (l.unitPrice * l.quantity * l.taxRate) / 100, 0);
  const grandTotal = editing ? Number(order!.total) : subTotal + taxAmt;

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">

      {/* ── LEFT: Category sidebar ─────────────────────────── */}
      <div className="flex w-32 shrink-0 flex-col border-r bg-white overflow-y-auto">
        <button
          className={cn('w-full border-b px-3 py-3 text-left text-xs font-semibold transition-colors', selCat === '' ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-50')}
          onClick={() => setSelCat('')}
        >
          All Items
        </button>
        {cats.data?.map((c) => (
          <button
            key={c.id}
            className={cn('w-full border-b px-3 py-3 text-left text-xs font-semibold leading-tight transition-colors', selCat === c.id ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-50')}
            onClick={() => setSelCat(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* ── CENTER: Search + Items ─────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Search bar row */}
        <div className="flex gap-2 border-b bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-1 items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400"
              placeholder="Search item…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5 text-gray-400" /></button>}
          </div>
          <div className="flex flex-1 items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <input className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400" placeholder="Short Code…" />
          </div>
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {items.isLoading ? (
            <p className="p-4 text-sm text-gray-400">Loading menu…</p>
          ) : visibleItems.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No items.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {visibleItems.map((it) => (
                <button
                  key={it.id}
                  onClick={() => handlePickItem(it)}
                  className="relative rounded border border-gray-200 bg-white p-2.5 text-left shadow-sm transition-all hover:border-red-300 hover:shadow-md active:scale-[0.98]"
                >
                  {/* VEG dot – top right */}
                  <span className="absolute right-2 top-2">
                    <FoodDot type={it.foodType} />
                  </span>
                  <p className="pr-5 text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{it.name}</p>
                  <p className="mt-2 text-xs font-bold text-gray-900">₹{Number(it.basePrice).toFixed(0)}</p>
                  {(it.variants.length > 0 || it.modifierLinks.length > 0) && (
                    <div className="mt-1 flex gap-1">
                      {it.variants.length > 0 && <span className="rounded bg-blue-50 px-1 text-[9px] font-medium text-blue-600">variants</span>}
                      {it.modifierLinks.length > 0 && <span className="rounded bg-amber-50 px-1 text-[9px] font-medium text-amber-600">add-ons</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Order panel ────────────────────────────── */}
      <div className="flex w-80 shrink-0 flex-col border-l bg-white xl:w-96">

        {/* Order type tabs */}
        {!editing ? (
          <div className="grid grid-cols-3 border-b">
            {ORDER_TYPES.map((t) => (
              <button
                key={t.value}
                className={cn('py-3 text-xs font-bold uppercase tracking-wide transition-colors border-r last:border-r-0', type === t.value ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
                onClick={() => setType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
            <div>
              <p className="text-[10px] uppercase text-gray-400">{order!.type.replace('_', ' ')}</p>
              <p className="text-sm font-bold">
                #{order!.orderNumber}
                {order!.table && <span className="ml-1 text-xs font-normal text-gray-500">· Table {order!.table.name}</span>}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={order!.status === 'COMPLETED' ? 'success' : order!.status === 'CANCELLED' ? 'destructive' : 'warning'} className="text-[10px]">{order!.status}</Badge>
              <button onClick={() => navigate('/pos')} className="ml-1 rounded p-1 hover:bg-gray-200"><X className="h-3.5 w-3.5 text-gray-500" /></button>
            </div>
          </div>
        )}

        {/* Table / section selector tabs + customer */}
        {!editing && type === 'DINE_IN' && (
          <div className="border-b bg-gray-50 px-3 py-2 space-y-2">
            <div className="flex items-center gap-2">
              <select
                className="flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
              >
                <option value="">Select table…</option>
                {sections.data?.flatMap((s) =>
                  s.tables.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.status === 'OCCUPIED' || t.status === 'BILLED'}>
                      {s.name} — {t.name} {t.status !== 'FREE' ? `(${t.status})` : ''}
                    </option>
                  )),
                )}
              </select>
              <div className="flex items-center gap-1 rounded border bg-white px-2 py-1.5">
                <Users className="h-3 w-3 text-gray-400" />
                <input type="number" min={1} max={50} className="w-8 bg-transparent text-xs text-center outline-none" value={guestCount} onChange={(e) => setGuests(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2">
              <input placeholder="Phone" className="flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none" value={customerPhone} onChange={(e) => setPhone(e.target.value)} />
              <input placeholder="Name" className="flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none" value={customerName} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto">
          {lines.length > 0 && (
            <div className="grid grid-cols-[1.25rem_1fr_5.5rem_3.5rem] gap-x-1 border-b bg-gray-100 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">
              <span />
              <span>Items</span>
              <span className="text-center">QTY.</span>
              <span className="text-right">Price</span>
            </div>
          )}

          {lines.length === 0 ? (
            <div className="flex h-28 items-center justify-center text-xs text-gray-400">
              No items added yet
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lines.map((l, i) => {
                const itemId = editing ? l.id : undefined;
                const draftIdx = !editing ? l.idx : undefined;
                return (
                  <li key={l.id + i} className="grid grid-cols-[1.25rem_1fr_5.5rem_3.5rem] items-start gap-x-1 px-3 py-2">
                    {/* Remove X */}
                    <button
                      className="mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                      style={{ height: 18, width: 18 }}
                      onClick={() => {
                        if (editing && itemId) removeItem.mutate({ id: order!.id, itemId });
                        else if (draftIdx !== undefined) setDraftItems((p) => p.filter((_, x) => x !== draftIdx));
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>

                    {/* Name */}
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold leading-tight text-gray-800 truncate">{l.name}</p>
                      {(l.modifiers as OrderItemModifier[]).length > 0 && (
                        <p className="text-[10px] text-amber-600 truncate">{(l.modifiers as OrderItemModifier[]).map((m) => m.name).join(', ')}</p>
                      )}
                      {l.notes && <p className="text-[10px] italic text-gray-400 truncate">"{l.notes}"</p>}
                    </div>

                    {/* Qty */}
                    <div className="flex items-center justify-center gap-1">
                      <button className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                        onClick={() => { if (editing && itemId) updateItem.mutate({ id: order!.id, itemId, input: { quantity: l.quantity - 1 } }); else if (draftIdx !== undefined) updateDraftQty(draftIdx, -1); }}>
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{l.quantity}</span>
                      <button className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                        onClick={() => { if (editing && itemId) updateItem.mutate({ id: order!.id, itemId, input: { quantity: l.quantity + 1 } }); else if (draftIdx !== undefined) updateDraftQty(draftIdx, 1); }}>
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    {/* Price */}
                    <p className="text-right text-[11px] font-bold text-gray-800">
                      ₹{(l.unitPrice * l.quantity).toFixed(0)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Bottom: Payment + Totals + Buttons ──────────── */}
        <div className="border-t bg-white">

          {/* Complimentary + total row */}
          <div className="flex items-center gap-3 border-b px-3 py-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 rounded border px-2 py-1 text-[11px] text-gray-600">
                Split <span className="text-gray-400">▾</span>
              </div>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" className="h-3 w-3 accent-red-600" checked={isComp} onChange={(e) => setIsComp(e.target.checked)} />
              <span className="text-[11px] text-gray-600">Complimentary</span>
            </label>
            <div className="flex-1" />
            <span className="text-xs text-gray-500">Total</span>
            <span className="text-lg font-extrabold text-gray-900">₹{grandTotal.toFixed(0)}</span>
          </div>

          {/* Payment method */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2">
            {PAYMENT_METHODS.map((m) => (
              <label key={m} className="flex items-center gap-1 cursor-pointer">
                <div className={cn('h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center', payMethod === m ? 'border-red-600' : 'border-gray-300')}>
                  {payMethod === m && <div className="h-1.5 w-1.5 rounded-full bg-red-600" />}
                </div>
                <input type="radio" className="sr-only" checked={payMethod === m} onChange={() => setPayMethod(m)} />
                <span className="text-[11px] text-gray-700">{m}</span>
              </label>
            ))}
          </div>

          {/* Is paid / loyalty */}
          <div className="flex items-center gap-4 border-b px-3 py-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" className="h-3 w-3 accent-red-600" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
              <span className="text-[11px] text-gray-600">It's Paid</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" className="h-3 w-3 accent-red-600" defaultChecked />
              <span className="text-[11px] text-gray-600">Loyalty</span>
            </label>
          </div>

          {/* Action buttons */}
          {editing && order ? (
            <div className="grid grid-cols-5 divide-x border-b">
              <button
                className="bg-green-600 py-3 text-[11px] font-bold text-white hover:bg-green-700 transition-colors"
                onClick={() => navigate(`/billing/${order.id}`)}
              >
                Save
              </button>
              <button
                className="bg-gray-700 py-3 text-[11px] font-bold text-white hover:bg-gray-800 transition-colors col-span-1"
                onClick={() => navigate(`/billing/${order.id}`)}
              >
                Print & eBill
              </button>
              <button
                disabled={sendToKitchen.isPending || order.status === 'COMPLETED'}
                className="bg-amber-500 py-3 text-[11px] font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                onClick={() => sendToKitchen.mutate(order.id)}
              >
                KOT
              </button>
              <button
                disabled={order.status === 'COMPLETED'}
                className="bg-blue-700 py-3 text-[11px] font-bold text-white hover:bg-blue-800 transition-colors disabled:opacity-50"
                onClick={() => { sendToKitchen.mutateAsync(order.id).then(() => navigate(`/billing/${order.id}`)); }}
              >
                KOT & Print
              </button>
              <button
                className="bg-purple-600 py-3 text-[11px] font-bold text-white hover:bg-purple-700 transition-colors"
                onClick={() => toast.info('Order held')}
              >
                Hold
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 divide-x border-b">
              <button
                disabled={createOrder.isPending}
                onClick={handleCreate}
                className="bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors col-span-2"
              >
                {createOrder.isPending ? 'Creating…' : '+ Create Order'}
              </button>
            </div>
          )}

          {/* Tax summary */}
          {lines.length > 0 && (
            <div className="flex justify-between px-3 py-1.5 text-[10px] text-gray-400">
              <span>Subtotal ₹{subTotal.toFixed(2)}</span>
              <span>Tax ₹{taxAmt.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {picker && (
        <ItemPickerDialog item={picker} open={!!picker} onOpenChange={(o) => !o && setPicker(null)} onConfirm={handlePickerConfirm} />
      )}
    </div>
  );
};

const mergeDraft = (prev: AddItemInput[], next: AddItemInput): AddItemInput[] => {
  const idx = prev.findIndex((p) => p.menuItemId === next.menuItemId && p.variantId === next.variantId && !p.notes && !next.notes && (p.modifiers?.length ?? 0) === 0 && (next.modifiers?.length ?? 0) === 0);
  if (idx === -1) return [...prev, next];
  const copy = [...prev]; const cur = copy[idx];
  if (!cur) return [...prev, next];
  copy[idx] = { ...cur, quantity: (cur.quantity ?? 1) + (next.quantity ?? 1) };
  return copy;
};
