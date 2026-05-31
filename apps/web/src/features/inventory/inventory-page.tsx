import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { inventoryApi, type StockItem, type StockItemInput, type StockMovementType, type StockUnit } from './inventory-api';
import { menuApi } from '../menu/menu-api';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const UNITS: StockUnit[] = ['KG', 'GRAM', 'LITRE', 'ML', 'PIECE', 'DOZEN', 'PACKET'];
const MOVEMENT_TYPES: StockMovementType[] = ['PURCHASE', 'ADJUSTMENT', 'WASTE', 'OPENING'];

export const InventoryPage = () => (
  <div className="container py-8">
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
      <p className="text-muted-foreground">Stock items, recipes, and movements.</p>
    </div>
    <Tabs defaultValue="items">
      <TabsList>
        <TabsTrigger value="items">Stock items</TabsTrigger>
        <TabsTrigger value="recipes">Recipes</TabsTrigger>
        <TabsTrigger value="movements">Movements</TabsTrigger>
      </TabsList>
      <TabsContent value="items">
        <StockItemsTab />
      </TabsContent>
      <TabsContent value="recipes">
        <RecipesTab />
      </TabsContent>
      <TabsContent value="movements">
        <MovementsTab />
      </TabsContent>
    </Tabs>
  </div>
);

const blankStockForm: StockItemInput = { name: '', unit: 'KG', currentQty: 0, minQty: 0, costPerUnit: 0 };

const StockItemsTab = () => {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.list });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [movementItem, setMovementItem] = useState<StockItem | null>(null);

  const create = useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-items'] });
      setCreating(false);
      toast.success('Stock item added');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<StockItemInput> }) => inventoryApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-items'] });
      setEditing(null);
      toast.success('Stock item updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: inventoryApi.remove,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['stock-items'] });
      toast.success(r.soft ? 'Item has history; deactivated instead' : 'Item deleted');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stock items</h3>
          <p className="text-sm text-muted-foreground">Raw materials and inventory items</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New stock item
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !list.data || list.data.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No stock items yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Stock Level</th>
                  <th className="px-4 py-3 text-right">Min Qty</th>
                  <th className="px-4 py-3 text-right">Cost/unit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((s) => {
                  const cur  = Number(s.currentQty);
                  const min  = Number(s.minQty);
                  const max  = Math.max(min * 4, cur * 1.2, 1);
                  const pct  = Math.min(100, (cur / max) * 100);
                  const out  = cur <= 0;
                  const low  = cur <= min && !out;
                  const warn = cur <= min * 2 && !low && !out;
                  const barColor = out ? 'bg-red-500' : low ? 'bg-red-400' : warn ? 'bg-amber-400' : 'bg-emerald-500';
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${barColor}`} />
                          <span className="font-semibold text-gray-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.unit}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold tabular-nums w-12 text-right ${out ? 'text-red-600' : low ? 'text-red-500' : warn ? 'text-amber-600' : 'text-gray-700'}`}>
                            {cur.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{min.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-xs">₹{Number(s.costPerUnit).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {!s.active ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : out ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">🚨 Out</span>
                        ) : low ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">⚠️ Low</span>
                        ) : warn ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">📉 Warn</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">✓ Good</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setMovementItem(s)}>
                            + Stock
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <ConfirmButton size="icon" variant="ghost" className="h-7 w-7" confirmMessage={`Delete "${s.name}"?`} onConfirm={async () => { await remove.mutateAsync(s.id); }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </ConfirmButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <StockItemDialog
        key={`create-${creating}`}
        open={creating}
        onOpenChange={setCreating}
        title="New stock item"
        initial={blankStockForm}
        busy={create.isPending}
        onSubmit={(input) => create.mutate(input)}
      />
      <StockItemDialog
        key={`edit-${editing?.id ?? 'none'}`}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit stock item"
        initial={
          editing
            ? {
                name: editing.name,
                unit: editing.unit,
                currentQty: Number(editing.currentQty),
                minQty: Number(editing.minQty),
                costPerUnit: Number(editing.costPerUnit),
                sku: editing.sku ?? '',
              }
            : blankStockForm
        }
        busy={update.isPending}
        onSubmit={(input) => editing && update.mutate({ id: editing.id, input })}
      />
      {movementItem && (
        <MovementDialog
          key={`move-${movementItem.id}`}
          item={movementItem}
          open={!!movementItem}
          onOpenChange={(o) => !o && setMovementItem(null)}
        />
      )}
    </div>
  );
};

interface StockItemDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial: StockItemInput;
  busy: boolean;
  onSubmit: (input: StockItemInput) => void;
}

const StockItemDialog = ({ open, onOpenChange, title, initial, busy, onSubmit }: StockItemDialogProps) => {
  const [form, setForm] = useState<StockItemInput>(initial);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: form.name.trim(),
              sku: form.sku?.trim() || undefined,
              unit: form.unit,
              currentQty: form.currentQty,
              minQty: form.minQty,
              costPerUnit: form.costPerUnit,
            });
          }}
        >
          <div className="space-y-2 md:col-span-2">
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input value={form.sku ?? ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value as StockUnit })}
            >
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Current qty</Label>
            <Input type="number" step="0.001" value={form.currentQty ?? 0} onChange={(e) => setForm({ ...form, currentQty: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Min qty</Label>
            <Input type="number" step="0.001" value={form.minQty ?? 0} onChange={(e) => setForm({ ...form, minQty: Number(e.target.value) })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Cost per unit (₹)</Label>
            <Input type="number" step="0.01" value={form.costPerUnit ?? 0} onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) })} />
          </div>
          <DialogFooter className="gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface MovementDialogProps {
  item: StockItem;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const MovementDialog = ({ item, open, onOpenChange }: MovementDialogProps) => {
  const qc = useQueryClient();
  const [type, setType] = useState<StockMovementType>('PURCHASE');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [note, setNote] = useState('');

  const add = useMutation({
    mutationFn: () =>
      inventoryApi.addMovement({
        stockItemId: item.id,
        type,
        quantity: Number(quantity),
        unitCost: unitCost ? Number(unitCost) : undefined,
        note: note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-items'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Movement recorded');
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add stock movement</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {item.name} · current: {Number(item.currentQty).toFixed(3)} {item.unit}
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as StockMovementType)}
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {type === 'PURCHASE'
                ? 'Adds to stock'
                : type === 'WASTE'
                ? 'Removes from stock (wasted)'
                : type === 'ADJUSTMENT'
                ? 'Use a signed quantity (+/-)'
                : 'Set opening balance'}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Quantity ({item.unit})</Label>
            <Input type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          {(type === 'PURCHASE' || type === 'OPENING') && (
            <div className="space-y-2">
              <Label>Unit cost (₹)</Label>
              <Input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => add.mutate()} disabled={!quantity || Number(quantity) === 0 || add.isPending}>
            {add.isPending ? 'Saving…' : 'Record movement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RecipesTab = () => {
  const qc = useQueryClient();
  const [selectedMenuId, setSelectedMenuId] = useState<string>('');

  const items = useQuery({ queryKey: ['menu-items-all'], queryFn: () => menuApi.listItems() });
  const stocks = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.list });
  const recipe = useQuery({
    queryKey: ['recipe', selectedMenuId],
    queryFn: () => inventoryApi.getRecipe(selectedMenuId),
    enabled: !!selectedMenuId,
  });

  const [components, setComponents] = useState<{ stockItemId: string; quantity: number }[]>([]);

  // Sync from server when selection or data changes
  const serverRecipeKey = recipe.data?.map((r) => r.id).join(',') ?? '';
  if (serverRecipeKey && components.length === 0 && recipe.data?.length) {
    // initial population
    setComponents(recipe.data.map((r) => ({ stockItemId: r.stockItemId, quantity: Number(r.quantity) })));
  }

  const save = useMutation({
    mutationFn: () =>
      inventoryApi.upsertRecipe({
        menuItemId: selectedMenuId,
        components: components.filter((c) => c.stockItemId && c.quantity > 0),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', selectedMenuId] });
      toast.success('Recipe saved');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const selectMenuItem = (id: string) => {
    setSelectedMenuId(id);
    setComponents([]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-4">
          <Label>Menu item</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedMenuId}
            onChange={(e) => selectMenuItem(e.target.value)}
          >
            <option value="">Select a menu item…</option>
            {items.data?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.category.name} — {i.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedMenuId && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Components</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setComponents([...components, { stockItemId: '', quantity: 0 }])}
              >
                <Plus className="h-3 w-3" /> Add component
              </Button>
            </div>
            {components.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No components. Add some to enable auto-deduction when this item is ordered.
              </p>
            ) : (
              <div className="space-y-2">
                {components.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <select
                      className="col-span-7 h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={c.stockItemId}
                      onChange={(e) => {
                        const copy = [...components];
                        copy[idx] = { ...copy[idx]!, stockItemId: e.target.value };
                        setComponents(copy);
                      }}
                    >
                      <option value="">Stock item…</option>
                      {stocks.data?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.unit})
                        </option>
                      ))}
                    </select>
                    <Input
                      className="col-span-3"
                      type="number"
                      step="0.001"
                      placeholder="Qty"
                      value={c.quantity}
                      onChange={(e) => {
                        const copy = [...components];
                        copy[idx] = { ...copy[idx]!, quantity: Number(e.target.value) };
                        setComponents(copy);
                      }}
                    />
                    <Button
                      className="col-span-2"
                      variant="ghost"
                      onClick={() => setComponents(components.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save recipe'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const MovementsTab = () => {
  const list = useQuery({ queryKey: ['stock-movements'], queryFn: () => inventoryApi.listMovements({ limit: 200 }) });
  return (
    <Card>
      <CardContent className="p-0">
        {list.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : !list.data || list.data.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No stock movements yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{m.stockItem.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={Number(m.quantity) > 0 ? 'success' : 'destructive'} className="text-[10px]">
                      {m.type}
                    </Badge>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${Number(m.quantity) < 0 ? 'text-destructive' : ''}`}>
                    {Number(m.quantity) > 0 ? '+' : ''}
                    {Number(m.quantity).toFixed(3)} {m.stockItem.unit}
                  </td>
                  <td className="px-4 py-3 text-right">{m.unitCost ? `₹${Number(m.unitCost).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};
