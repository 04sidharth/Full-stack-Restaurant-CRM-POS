import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Star } from 'lucide-react';
import { toast } from 'sonner';
import { customersApi, type CustomerInput } from './customers-api';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const blank: CustomerInput = { phone: '', name: '', email: '' };

export const CustomersPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list(search || undefined),
  });

  const create = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setCreating(false);
      toast.success('Customer added');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer base, loyalty, and feedback.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/feedback')}>
            <Star className="h-4 w-4" /> Feedback
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New customer
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="flex items-center gap-2 p-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone, name, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !list.data || list.data.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No customers found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Spend</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3 text-right">Points</th>
                  <th className="px-4 py-3">Last visit</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((c) => {
                  const spend = Number(c.totalSpend);
                  const tier = spend >= 100000 ? { icon: '💎', label: 'Diamond', color: 'text-cyan-600',   bg: 'bg-cyan-50'   }
                             : spend >= 25000  ? { icon: '🥇', label: 'Gold',    color: 'text-yellow-600', bg: 'bg-yellow-50' }
                             : spend >= 5000   ? { icon: '🥈', label: 'Silver',  color: 'text-gray-500',   bg: 'bg-gray-100'  }
                             :                   { icon: '🥉', label: 'Bronze',  color: 'text-amber-700',  bg: 'bg-amber-50'  };
                  return (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-xs font-black text-white shadow-sm">
                          {(c.name ?? c.phone).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-800">{c.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-3 text-right font-medium">{c.totalOrders}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{Number(c.totalSpend).toFixed(0)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tier.bg} ${tier.color}`}>
                        {tier.icon} {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
                        ⭐ {c.loyaltyPoints} pts
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {c.active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <CustomerDialog
        key={`create-${creating}`}
        open={creating}
        onOpenChange={setCreating}
        title="New customer"
        initial={blank}
        busy={create.isPending}
        onSubmit={(input) => create.mutate(input)}
      />
    </div>
  );
};

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial: CustomerInput;
  busy: boolean;
  onSubmit: (input: CustomerInput) => void;
}

const CustomerDialog = ({ open, onOpenChange, title, initial, busy, onSubmit }: CustomerDialogProps) => {
  const [form, setForm] = useState(initial);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              phone: form.phone.trim(),
              name: form.name?.trim() || undefined,
              email: form.email?.trim() || undefined,
              city: form.city?.trim() || undefined,
              notes: form.notes?.trim() || undefined,
              gstNumber: form.gstNumber?.trim() || undefined,
            });
          }}
        >
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>GST number</Label>
            <Input value={form.gstNumber ?? ''} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Input value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
