import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { staffApi, type Staff } from './staff-api';
import { apiErrorMessage } from '@/lib/api';
import type { Role } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ROLES: Role[] = ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'];

export const StaffPage = () => {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['staff'], queryFn: staffApi.list });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);

  const create = useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      setCreating(false);
      toast.success('Staff member added');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof staffApi.update>[1] }) =>
      staffApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      setEditing(null);
      toast.success('Staff member updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff & roles</h1>
          <p className="text-muted-foreground">Manage user accounts and their permissions.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Add staff
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !list.data || list.data.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No staff yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.role === 'OWNER' ? 'default' : 'secondary'}>{s.role}</Badge>
                    </td>
                    <td className="px-4 py-3">{s.active === false ? 'Inactive' : 'Active'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {creating && (
        <StaffCreateDialog
          open={creating}
          onOpenChange={setCreating}
          busy={create.isPending}
          onSubmit={(input) => create.mutate(input)}
        />
      )}
      {editing && (
        <StaffEditDialog
          key={editing.id}
          staff={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          busy={update.isPending}
          onSubmit={(input) => update.mutate({ id: editing.id, input })}
        />
      )}
    </div>
  );
};

interface CreateProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  busy: boolean;
  onSubmit: (input: { email: string; name: string; phone?: string; password: string; role: Role }) => void;
}

const StaffCreateDialog = ({ open, onOpenChange, busy, onSubmit }: CreateProps) => {
  const [form, setForm] = useState({ email: '', name: '', phone: '', password: '', role: 'WAITER' as Role });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              email: form.email.trim(),
              name: form.name.trim(),
              phone: form.phone.trim() || undefined,
              password: form.password,
              role: form.role,
            });
          }}
        >
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Temporary password</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <DialogFooter className="gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface EditProps {
  staff: Staff;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  busy: boolean;
  onSubmit: (input: { name?: string; phone?: string; role?: Role; active?: boolean; password?: string }) => void;
}

const StaffEditDialog = ({ staff, open, onOpenChange, busy, onSubmit }: EditProps) => {
  const [form, setForm] = useState({
    name: staff.name,
    phone: staff.phone ?? '',
    role: staff.role,
    active: staff.active !== false,
    password: '',
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {staff.name}</DialogTitle>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: form.name.trim(),
              phone: form.phone.trim() || undefined,
              role: form.role,
              active: form.active,
              password: form.password ? form.password : undefined,
            });
          }}
        >
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <label className="mt-7 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
          <div className="space-y-2 md:col-span-2">
            <Label>Reset password (optional)</Label>
            <Input
              type="password"
              placeholder="Leave blank to keep current"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
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
