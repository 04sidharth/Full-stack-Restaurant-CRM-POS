import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { menuApi, type ModifierGroupInput, type ModifierInput } from './menu-api';
import type { ModifierGroup } from './menu-types';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface GroupFormState {
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  options: ModifierInput[];
}

const emptyForm: GroupFormState = {
  name: '',
  minSelect: 0,
  maxSelect: 1,
  required: false,
  options: [{ name: '', priceDelta: 0, active: true }],
};

const groupToForm = (g: ModifierGroup): GroupFormState => ({
  name: g.name,
  minSelect: g.minSelect,
  maxSelect: g.maxSelect,
  required: g.required,
  options: g.options.map((o) => ({
    id: o.id,
    name: o.name,
    priceDelta: Number(o.priceDelta),
    active: o.active,
  })),
});

export const ModifierGroupsTab = () => {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['modifier-groups'], queryFn: menuApi.listModifierGroups });
  const [editing, setEditing] = useState<ModifierGroup | null>(null);
  const [creating, setCreating] = useState(false);

  const create = useMutation({
    mutationFn: menuApi.createModifierGroup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifier-groups'] });
      setCreating(false);
      toast.success('Modifier group created');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ModifierGroupInput> }) =>
      menuApi.updateModifierGroup(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifier-groups'] });
      setEditing(null);
      toast.success('Modifier group updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const del = useMutation({
    mutationFn: menuApi.deleteModifierGroup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifier-groups'] });
      toast.success('Modifier group deleted');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const submit = (form: GroupFormState) => {
    const payload: ModifierGroupInput = {
      name: form.name.trim(),
      minSelect: form.minSelect,
      maxSelect: form.maxSelect,
      required: form.required,
      options: form.options
        .filter((o) => o.name.trim().length > 0)
        .map((o) => ({
          ...o,
          name: o.name.trim(),
          priceDelta: Number(o.priceDelta ?? 0),
        })),
    };
    if (editing) update.mutate({ id: editing.id, input: payload });
    else create.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Modifier groups</h3>
          <p className="text-sm text-muted-foreground">Reusable add-ons like "Spice level" or "Extras"</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New group
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !list.data || list.data.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No modifier groups yet.</div>
          ) : (
            <ul className="divide-y">
              {list.data.map((g) => (
                <li key={g.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{g.name}</span>
                      {g.required && <Badge variant="warning">required</Badge>}
                      <span className="text-xs text-muted-foreground">
                        pick {g.minSelect}–{g.maxSelect}
                      </span>
                      {typeof g._count?.itemLinks === 'number' && g._count.itemLinks > 0 && (
                        <span className="text-xs text-muted-foreground">· used by {g._count.itemLinks} item(s)</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {g.options.map((o) => (
                        <span
                          key={o.id}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs"
                          title={Number(o.priceDelta) ? `+₹${Number(o.priceDelta).toFixed(2)}` : ''}
                        >
                          {o.name}
                          {Number(o.priceDelta) ? ` +₹${Number(o.priceDelta).toFixed(0)}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(g)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmButton
                      size="icon"
                      variant="ghost"
                      confirmMessage={`Delete modifier group "${g.name}"?`}
                      onConfirm={() => del.mutateAsync(g.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </ConfirmButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ModifierGroupDialog
        key={creating ? 'create' : `edit-${editing?.id ?? 'none'}`}
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        title={editing ? 'Edit modifier group' : 'New modifier group'}
        initial={editing ? groupToForm(editing) : emptyForm}
        busy={create.isPending || update.isPending}
        onSubmit={submit}
      />
    </div>
  );
};

interface ModifierGroupDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial: GroupFormState;
  busy: boolean;
  onSubmit: (form: GroupFormState) => void;
}

const ModifierGroupDialog = ({ open, onOpenChange, title, initial, busy, onSubmit }: ModifierGroupDialogProps) => {
  const [form, setForm] = useState<GroupFormState>(initial);

  const addOption = () =>
    setForm({ ...form, options: [...form.options, { name: '', priceDelta: 0, active: true }] });
  const updateOption = (i: number, patch: Partial<ModifierInput>) =>
    setForm({ ...form, options: form.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) });
  const removeOption = (i: number) =>
    setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
          <div className="space-y-2">
            <Label htmlFor="gname">Group name</Label>
            <Input id="gname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gmin">Min selections</Label>
              <Input
                id="gmin"
                type="number"
                min={0}
                value={form.minSelect}
                onChange={(e) => setForm({ ...form, minSelect: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gmax">Max selections</Label>
              <Input
                id="gmax"
                type="number"
                min={1}
                value={form.maxSelect}
                onChange={(e) => setForm({ ...form, maxSelect: Number(e.target.value) })}
              />
            </div>
            <label className="mt-7 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) => setForm({ ...form, required: e.target.checked })}
              />
              Required
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button type="button" size="sm" variant="outline" onClick={addOption}>
                <Plus className="h-3 w-3" /> Add option
              </Button>
            </div>
            <div className="space-y-2">
              {form.options.map((o, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-7"
                    placeholder="Option name"
                    value={o.name}
                    onChange={(e) => updateOption(idx, { name: e.target.value })}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={o.priceDelta ?? 0}
                    onChange={(e) => updateOption(idx, { priceDelta: Number(e.target.value) })}
                  />
                  <Button
                    className="col-span-2"
                    type="button"
                    variant="ghost"
                    onClick={() => removeOption(idx)}
                    disabled={form.options.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
