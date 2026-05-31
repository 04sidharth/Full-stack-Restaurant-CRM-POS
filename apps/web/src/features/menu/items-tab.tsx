import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { menuApi, type MenuItemInput, type VariantInput } from './menu-api';
import type { FoodType, MenuItem } from './menu-types';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const FOOD_TYPES: FoodType[] = ['VEG', 'NONVEG', 'EGG', 'VEGAN'];
const foodColor: Record<FoodType, string> = {
  VEG: 'bg-emerald-500',
  NONVEG: 'bg-red-500',
  EGG: 'bg-amber-500',
  VEGAN: 'bg-green-700',
};

interface ItemFormState {
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: string;
  taxRate: string;
  foodType: FoodType;
  available: boolean;
  isRecommended: boolean;
  preparationMins: string;
  variants: VariantInput[];
  modifierGroupIds: string[];
}

const emptyForm = (categoryId: string = ''): ItemFormState => ({
  categoryId,
  name: '',
  description: '',
  imageUrl: '',
  basePrice: '',
  taxRate: '5',
  foodType: 'VEG',
  available: true,
  isRecommended: false,
  preparationMins: '',
  variants: [],
  modifierGroupIds: [],
});

const itemToForm = (item: MenuItem): ItemFormState => ({
  categoryId: item.categoryId,
  name: item.name,
  description: item.description ?? '',
  imageUrl: item.imageUrl ?? '',
  basePrice: item.basePrice.toString(),
  taxRate: item.taxRate.toString(),
  foodType: item.foodType,
  available: item.available,
  isRecommended: item.isRecommended,
  preparationMins: item.preparationMins?.toString() ?? '',
  variants: item.variants.map((v) => ({
    id: v.id,
    name: v.name,
    priceDelta: Number(v.priceDelta),
    sortOrder: v.sortOrder,
    active: v.active,
  })),
  modifierGroupIds: item.modifierLinks.map((l) => l.groupId),
});

export const ItemsTab = () => {
  const qc = useQueryClient();
  const [filterCat, setFilterCat] = useState<string>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);

  const cats = useQuery({ queryKey: ['categories'], queryFn: menuApi.listCategories });
  const groups = useQuery({ queryKey: ['modifier-groups'], queryFn: menuApi.listModifierGroups });
  const items = useQuery({
    queryKey: ['menu-items', { categoryId: filterCat, search }],
    queryFn: () =>
      menuApi.listItems({
        categoryId: filterCat || undefined,
        search: search || undefined,
      }),
  });

  const create = useMutation({
    mutationFn: menuApi.createItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-items'] });
      setCreating(false);
      toast.success('Menu item created');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<MenuItemInput> }) => menuApi.updateItem(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-items'] });
      setEditing(null);
      toast.success('Menu item updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const toggle = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => menuApi.toggleAvailability(id, available),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-items'] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const del = useMutation({
    mutationFn: menuApi.deleteItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Item deleted');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const submit = (form: ItemFormState) => {
    const payload: MenuItemInput = {
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      basePrice: Number(form.basePrice),
      taxRate: Number(form.taxRate),
      foodType: form.foodType,
      available: form.available,
      isRecommended: form.isRecommended,
      preparationMins: form.preparationMins ? Number(form.preparationMins) : undefined,
      variants: form.variants.map((v) => ({
        ...v,
        priceDelta: Number(v.priceDelta),
      })),
      modifierGroups: form.modifierGroupIds.map((groupId) => ({ groupId })),
    };
    if (editing) update.mutate({ id: editing.id, input: payload });
    else create.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Menu items</h3>
          <p className="text-sm text-muted-foreground">All your dishes, drinks, and add-ons</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            <option value="">All categories</option>
            {cats.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Search…"
            className="w-48"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button onClick={() => setCreating(true)} disabled={!cats.data || cats.data.length === 0}>
            <Plus className="h-4 w-4" /> New item
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !items.data || items.data.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No menu items.{' '}
              {!cats.data || cats.data.length === 0 ? 'Create a category first.' : 'Click "New item" to add one.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-8 px-4 py-3" />
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Tax</th>
                  <th className="px-4 py-3">Variants</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.data.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <span
                        title={it.foodType}
                        className={`inline-block h-3 w-3 rounded-sm ${foodColor[it.foodType]}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {it.name}
                      {it.isRecommended && (
                        <Badge variant="warning" className="ml-2 text-[10px]">
                          Chef's pick
                        </Badge>
                      )}
                      {it.description && (
                        <div className="text-xs text-muted-foreground">{it.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{it.category.name}</td>
                    <td className="px-4 py-3">₹{Number(it.basePrice).toFixed(2)}</td>
                    <td className="px-4 py-3">{Number(it.taxRate).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {it.variants.length === 0 ? '—' : it.variants.map((v) => v.name).join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={it.available}
                          onChange={(e) => toggle.mutate({ id: it.id, available: e.target.checked })}
                        />
                        <span className="text-xs text-muted-foreground">
                          {it.available ? 'Yes' : 'No'}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(it)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmButton
                          size="icon"
                          variant="ghost"
                          confirmMessage={`Delete "${it.name}"? Items with past orders will be disabled instead.`}
                          onConfirm={() => del.mutateAsync(it.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ItemDialog
        key={creating ? 'create' : `edit-${editing?.id ?? 'none'}`}
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        title={editing ? 'Edit menu item' : 'New menu item'}
        initial={editing ? itemToForm(editing) : emptyForm(filterCat || cats.data?.[0]?.id || '')}
        categories={cats.data ?? []}
        groups={groups.data ?? []}
        busy={create.isPending || update.isPending}
        onSubmit={submit}
      />
    </div>
  );
};

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial: ItemFormState;
  categories: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  busy: boolean;
  onSubmit: (form: ItemFormState) => void;
}

const ItemDialog = ({ open, onOpenChange, title, initial, categories, groups, busy, onSubmit }: ItemDialogProps) => {
  const [form, setForm] = useState<ItemFormState>(initial);

  const addVariant = () =>
    setForm({
      ...form,
      variants: [...form.variants, { name: '', priceDelta: 0, sortOrder: form.variants.length, active: true }],
    });
  const updateVariant = (idx: number, patch: Partial<VariantInput>) => {
    setForm({
      ...form,
      variants: form.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    });
  };
  const removeVariant = (idx: number) =>
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== idx) });

  const toggleGroup = (gid: string) =>
    setForm({
      ...form,
      modifierGroupIds: form.modifierGroupIds.includes(gid)
        ? form.modifierGroupIds.filter((g) => g !== gid)
        : [...form.modifierGroupIds, gid],
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="iname">Name</Label>
              <Input id="iname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="idesc">Description</Label>
              <Textarea
                id="idesc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Food type</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.foodType}
                onChange={(e) => setForm({ ...form, foodType: e.target.value as FoodType })}
              >
                {FOOD_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="iprice">Base price (₹)</Label>
              <Input
                id="iprice"
                type="number"
                step="0.01"
                required
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itax">Tax rate (%)</Label>
              <Input
                id="itax"
                type="number"
                step="0.01"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iprep">Prep time (mins)</Label>
              <Input
                id="iprep"
                type="number"
                value={form.preparationMins}
                onChange={(e) => setForm({ ...form, preparationMins: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iimg">Image URL</Label>
              <Input
                id="iimg"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
              />
              Available for sale
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isRecommended}
                onChange={(e) => setForm({ ...form, isRecommended: e.target.checked })}
              />
              Chef's recommendation
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Variants (e.g. Half/Full)</Label>
              <Button type="button" size="sm" variant="outline" onClick={addVariant}>
                <Plus className="h-3 w-3" /> Add variant
              </Button>
            </div>
            {form.variants.length === 0 ? (
              <p className="text-xs text-muted-foreground">No variants. Base price applies to all orders.</p>
            ) : (
              <div className="space-y-2">
                {form.variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-6"
                      placeholder="Variant name"
                      value={v.name}
                      onChange={(e) => updateVariant(idx, { name: e.target.value })}
                    />
                    <Input
                      className="col-span-4"
                      type="number"
                      step="0.01"
                      placeholder="Price delta (₹)"
                      value={v.priceDelta}
                      onChange={(e) => updateVariant(idx, { priceDelta: Number(e.target.value) })}
                    />
                    <Button
                      className="col-span-2"
                      type="button"
                      variant="ghost"
                      onClick={() => removeVariant(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {groups.length > 0 && (
            <div className="space-y-2">
              <Label>Modifier groups</Label>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => {
                  const active = form.modifierGroupIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background hover:bg-accent'
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
