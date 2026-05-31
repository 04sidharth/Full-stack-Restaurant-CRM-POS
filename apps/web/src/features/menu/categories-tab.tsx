import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { menuApi, type CategoryInput } from './menu-api';
import type { Category } from './menu-types';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

const blank: CategoryInput = { name: '', description: '', imageUrl: '', sortOrder: 0 };

export const CategoriesTab = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: menuApi.listCategories });
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const create = useMutation({
    mutationFn: menuApi.createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setCreating(false);
      toast.success('Category created');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CategoryInput> }) =>
      menuApi.updateCategory(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setEditing(null);
      toast.success('Category updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const del = useMutation({
    mutationFn: menuApi.deleteCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Categories</h3>
          <p className="text-sm text-muted-foreground">Organize your menu items into sections</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !data || data.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No categories yet. Create one to start adding menu items.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Sort</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {c.name}
                      {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                    </td>
                    <td className="px-4 py-3">{c.sortOrder}</td>
                    <td className="px-4 py-3">{c.active ? 'Active' : 'Hidden'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmButton
                          size="icon"
                          variant="ghost"
                          confirmMessage={`Delete category "${c.name}"?`}
                          onConfirm={() => del.mutateAsync(c.id)}
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

      <CategoryDialog
        open={creating}
        onOpenChange={setCreating}
        title="New category"
        initial={blank}
        onSubmit={(input) => create.mutate(input)}
        busy={create.isPending}
      />
      <CategoryDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit category"
        initial={
          editing
            ? {
                name: editing.name,
                description: editing.description ?? '',
                imageUrl: editing.imageUrl ?? '',
                sortOrder: editing.sortOrder,
              }
            : blank
        }
        onSubmit={(input) => editing && update.mutate({ id: editing.id, input })}
        busy={update.isPending}
        extraField={
          editing && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked={editing.active}
                onChange={(e) => update.mutate({ id: editing.id, input: { active: e.target.checked } })}
              />
              Active
            </label>
          )
        }
      />
    </div>
  );
};

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial: CategoryInput;
  onSubmit: (input: CategoryInput) => void;
  busy: boolean;
  extraField?: React.ReactNode;
}

const CategoryDialog = ({ open, onOpenChange, title, initial, onSubmit, busy, extraField }: CategoryDialogProps) => {
  const [form, setForm] = useState(initial);
  // reset when initial changes via dialog reopen
  const key = `${open}-${initial.name}-${initial.sortOrder ?? 0}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={key} onOpenAutoFocus={() => setForm(initial)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Categories group related menu items together.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: form.name.trim(),
              description: form.description?.trim() || undefined,
              imageUrl: form.imageUrl?.trim() || undefined,
              sortOrder: form.sortOrder,
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cdesc">Description</Label>
            <Textarea id="cdesc" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="csort">Sort order</Label>
              <Input
                id="csort"
                type="number"
                value={form.sortOrder ?? 0}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cimg">Image URL</Label>
              <Input id="cimg" value={form.imageUrl ?? ''} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
          </div>
          {extraField}
          <DialogFooter className="gap-2">
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
