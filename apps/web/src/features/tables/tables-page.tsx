import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Printer, Eye, Trash2, RefreshCw, Truck, ShoppingBag, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { tablesApi, type RestaurantTable, type Section, type TableStatus } from './tables-api';
import { ordersApi, type Order } from '../orders/orders-api';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';

/* ── Status config (Petpooja colours) ─────────────────────── */
const S = {
  FREE:     { bg: 'bg-white',        border: 'border border-dashed border-gray-300', text: 'text-gray-600', dot: 'bg-gray-300',   label: 'Blank Table'   },
  OCCUPIED: { bg: 'bg-blue-200',     border: 'border border-blue-300',               text: 'text-blue-900', dot: 'bg-blue-400',   label: 'Running Table' },
  BILLED:   { bg: 'bg-yellow-100',   border: 'border border-yellow-400',             text: 'text-yellow-800',dot: 'bg-yellow-400', label: 'Paid Table'    },
  RESERVED: { bg: 'bg-green-200',    border: 'border border-green-400',              text: 'text-green-900',dot: 'bg-green-500',   label: 'Printed Table' },
  CLEANING: { bg: 'bg-yellow-300',   border: 'border border-yellow-500',             text: 'text-yellow-900',dot: 'bg-yellow-500', label: 'Running KOT'   },
} as const;

export const TablesPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const sections = useQuery({ queryKey: ['sections'], queryFn: tablesApi.listSections });
  const activeOrders = useQuery({
    queryKey: ['orders', { active: true }],
    queryFn: () => ordersApi.list({ active: true, limit: 200 }),
    refetchInterval: 20_000,
  });

  const ordersByTable = new Map<string, Order>();
  activeOrders.data?.forEach((o) => { if (o.tableId) ordersByTable.set(o.tableId, o); });

  const [adminMode, setAdminMode] = useState(false);
  const [creatingSection, setCreatingSection] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [tableDialog, setTableDialog] = useState<{ sectionId: string; table?: RestaurantTable } | null>(null);

  /* mutations */
  const createSection = useMutation({ mutationFn: tablesApi.createSection, onSuccess: () => { qc.invalidateQueries({ queryKey: ['sections'] }); setCreatingSection(false); toast.success('Section created'); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const updateSection = useMutation({ mutationFn: ({ id, input }: { id: string; input: { name?: string; sortOrder?: number } }) => tablesApi.updateSection(id, input), onSuccess: () => { qc.invalidateQueries({ queryKey: ['sections'] }); setEditingSection(null); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const deleteSection = useMutation({ mutationFn: tablesApi.deleteSection, onSuccess: () => { qc.invalidateQueries({ queryKey: ['sections'] }); toast.success('Section deleted'); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const createTable  = useMutation({ mutationFn: tablesApi.createTable, onSuccess: () => { qc.invalidateQueries({ queryKey: ['sections'] }); setTableDialog(null); toast.success('Table added'); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const updateTable  = useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof tablesApi.updateTable>[1] }) => tablesApi.updateTable(id, input), onSuccess: () => { qc.invalidateQueries({ queryKey: ['sections'] }); setTableDialog(null); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const deleteTable  = useMutation({ mutationFn: tablesApi.deleteTable, onSuccess: () => { qc.invalidateQueries({ queryKey: ['sections'] }); toast.success('Table deleted'); }, onError: (e) => toast.error(apiErrorMessage(e)) });

  const setStatus = (t: RestaurantTable, status: TableStatus) => updateTable.mutate({ id: t.id, input: { status } });

  return (
    <div className="flex h-full flex-col bg-white">

      {/* ── Bar 1: Title + delivery buttons ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-2.5">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-gray-800">Table View</h1>
          <button
            className="rounded p-1 text-gray-400 hover:text-gray-600"
            onClick={() => { sections.refetch(); activeOrders.refetch(); }}
          >
            <RefreshCw className={cn('h-4 w-4', sections.isFetching && 'animate-spin')} />
          </button>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700">
            <Truck className="h-3.5 w-3.5" /> Delivery
          </button>
          <button className="flex items-center gap-1.5 rounded bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700">
            <ShoppingBag className="h-3.5 w-3.5" /> Take Away
          </button>
        </div>
      </div>

      {/* ── Bar 2: Actions + legend ──────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-gray-50 px-5 py-2">
        {/* Left actions */}
        <button
          className="flex items-center gap-1.5 rounded border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          onClick={() => setCreatingSection(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Table Section
        </button>
        <button
          className={cn('flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold transition-colors', adminMode ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-400 text-gray-600 hover:bg-gray-100')}
          onClick={() => setAdminMode((v) => !v)}
        >
          <Settings2 className="h-3.5 w-3.5" /> {adminMode ? 'Done Editing' : 'Manage Tables'}
        </button>

        {/* Move KOT toggle */}
        <div className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-500">
          <div className="h-4 w-8 rounded-full bg-gray-200 relative">
            <div className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow-sm" />
          </div>
          Move KOT / Items
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Legend */}
        <div className="flex items-center gap-3">
          {(Object.keys(S) as TableStatus[]).map((status) => (
            <span key={status} className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className={cn('h-3 w-3 rounded-sm border', S[status].bg, S[status].border)} />
              {S[status].label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Bar 3: Floor plan selector ───────────────────────── */}
      <div className="flex items-center gap-3 border-b bg-white px-5 py-1.5 text-xs text-gray-500">
        <span className="font-medium">Floor Plan</span>
        <select className="rounded border border-gray-200 bg-white px-2 py-1 text-xs">
          <option>Default Layout</option>
        </select>
      </div>

      {/* ── Main content: sections + tables ─────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-7">
        {sections.isLoading && <p className="text-sm text-gray-400">Loading floor plan…</p>}
        {!sections.data?.length && !sections.isLoading && (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-400 mb-3">No sections yet.</p>
            <button className="rounded border border-red-500 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => setCreatingSection(true)}>
              <Plus className="inline h-3.5 w-3.5 mr-1" /> Create first section
            </button>
          </div>
        )}

        {sections.data?.map((sec) => (
          <div key={sec.id}>
            {/* Section header */}
            <div className="mb-3 flex items-center gap-3">
              <span className="text-sm font-bold text-gray-800">{sec.name}</span>
              {adminMode && (
                <div className="flex gap-1">
                  <button className="rounded p-1 hover:bg-gray-100" onClick={() => setEditingSection(sec)}>
                    <Pencil className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                  <ConfirmButton size="icon" variant="ghost" className="h-6 w-6 rounded" confirmMessage={`Delete section "${sec.name}"?`} onConfirm={() => deleteSection.mutateAsync(sec.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </ConfirmButton>
                  <button className="rounded border border-gray-300 px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100" onClick={() => setTableDialog({ sectionId: sec.id })}>
                    <Plus className="inline h-3 w-3" /> Add
                  </button>
                </div>
              )}
            </div>

            {/* Table tiles */}
            {sec.tables.length === 0 ? (
              <p className="text-xs text-gray-400 ml-1">No tables yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {sec.tables.map((t) => {
                  const cfg = S[t.status];
                  const linked = ordersByTable.get(t.id);
                  const isActive = t.status !== 'FREE';

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (adminMode) return;
                        if (linked) navigate(`/pos?order=${linked.id}`);
                        else navigate('/pos');
                      }}
                      className={cn(
                        'relative flex flex-col items-center justify-between rounded p-2 transition-all select-none',
                        cfg.bg, cfg.border,
                        adminMode ? 'cursor-default' : 'cursor-pointer hover:brightness-95 hover:shadow-md',
                      )}
                      style={{ width: 96, minHeight: 80 }}
                    >
                      {/* Table name */}
                      <span className={cn('text-xs font-bold text-center leading-tight', cfg.text)}>
                        {t.name}
                      </span>

                      {/* Order amount */}
                      {linked && (
                        <span className="text-[11px] font-bold text-gray-700">
                          ₹{Number(linked.total).toFixed(0)}
                        </span>
                      )}

                      {/* Action icons (active tables) */}
                      {isActive && !adminMode && (
                        <div className="flex items-center gap-2.5 mt-1">
                          <Printer className="h-3.5 w-3.5 text-gray-600" />
                          <Eye className="h-3.5 w-3.5 text-gray-600" />
                        </div>
                      )}

                      {/* Admin controls */}
                      {adminMode && (
                        <div className="mt-1 w-full space-y-1" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={t.status}
                            onChange={(e) => setStatus(t, e.target.value as TableStatus)}
                            className="w-full rounded border bg-white/80 text-[10px] py-0.5 px-1"
                          >
                            {(['FREE','OCCUPIED','BILLED','RESERVED','CLEANING'] as TableStatus[]).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <div className="flex justify-center gap-1">
                            <button className="rounded p-0.5 hover:bg-white/60" onClick={() => setTableDialog({ sectionId: sec.id, table: t })}>
                              <Pencil className="h-3 w-3 text-gray-600" />
                            </button>
                            <ConfirmButton size="sm" variant="ghost" className="h-5 w-5 p-0" confirmMessage={`Delete "${t.name}"?`} onConfirm={() => deleteTable.mutateAsync(t.id)}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </ConfirmButton>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dialogs */}
      <SectionDialog key={`cs-${creatingSection}`} open={creatingSection} onOpenChange={setCreatingSection} title="New section" initial={{ name: '', sortOrder: (sections.data?.length ?? 0) + 1 }} busy={createSection.isPending} onSubmit={(i) => createSection.mutate(i)} />
      <SectionDialog key={`es-${editingSection?.id}`} open={!!editingSection} onOpenChange={(o) => !o && setEditingSection(null)} title="Edit section" initial={editingSection ? { name: editingSection.name, sortOrder: editingSection.sortOrder } : { name: '' }} busy={updateSection.isPending} onSubmit={(i) => editingSection && updateSection.mutate({ id: editingSection.id, input: i })} />
      {tableDialog && (
        <TableDialog key={`td-${tableDialog.table?.id ?? 'new'}`} open={!!tableDialog} onOpenChange={(o) => !o && setTableDialog(null)} title={tableDialog.table ? 'Edit table' : 'New table'} initial={tableDialog.table ? { name: tableDialog.table.name, capacity: tableDialog.table.capacity, sectionId: tableDialog.table.sectionId } : { name: '', capacity: 4, sectionId: tableDialog.sectionId }} sections={sections.data ?? []} busy={createTable.isPending || updateTable.isPending} onSubmit={(i) => { if (tableDialog.table) updateTable.mutate({ id: tableDialog.table.id, input: i }); else createTable.mutate(i); }} />
      )}
    </div>
  );
};

/* ── Dialogs ─────────────────────────────────────────────── */
const SectionDialog = ({ open, onOpenChange, title, initial, busy, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; initial: { name: string; sortOrder?: number }; busy: boolean; onSubmit: (i: { name: string; sortOrder?: number }) => void }) => {
  const [form, setForm] = useState(initial);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ name: form.name.trim(), sortOrder: form.sortOrder }); }}>
          <div className="space-y-2"><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div>
          <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TableDialog = ({ open, onOpenChange, title, initial, sections, busy, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; initial: { name: string; capacity: number; sectionId: string }; sections: Section[]; busy: boolean; onSubmit: (i: { name: string; capacity: number; sectionId: string }) => void }) => {
  const [form, setForm] = useState(initial);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ name: form.name.trim(), capacity: form.capacity, sectionId: form.sectionId }); }}>
          <div className="space-y-2"><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Capacity</Label><Input type="number" min={1} max={40} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label>Section</Label><select required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })}>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
