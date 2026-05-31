import { useMemo, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { MenuItem } from '../menu/menu-types';
import type { OrderItemModifier } from '../orders/orders-api';

export interface AddItemPayload {
  menuItemId: string;
  variantId?: string;
  quantity: number;
  notes?: string;
  modifiers: OrderItemModifier[];
}

interface Props {
  item: MenuItem;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (payload: AddItemPayload) => void;
}

export const ItemPickerDialog = ({ item, open, onOpenChange, onConfirm }: Props) => {
  const variants = item.variants ?? [];
  const groups = item.modifierLinks.map((l) => l.group);

  const [variantId, setVariantId] = useState<string | undefined>(variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  // groupId -> Set<modifierId>
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  const toggleMod = (groupId: string, modifierId: string, maxSelect: number) => {
    setSelected((prev) => {
      const current = new Set(prev[groupId] ?? []);
      if (current.has(modifierId)) {
        current.delete(modifierId);
      } else {
        if (maxSelect === 1) {
          current.clear();
        }
        if (current.size >= maxSelect) {
          // Drop oldest
          const first = current.values().next().value;
          if (first) current.delete(first);
        }
        current.add(modifierId);
      }
      return { ...prev, [groupId]: current };
    });
  };

  const flatMods: OrderItemModifier[] = useMemo(() => {
    const out: OrderItemModifier[] = [];
    for (const g of groups) {
      const picked = selected[g.id];
      if (!picked) continue;
      for (const mid of picked) {
        const mod = g.options.find((o) => o.id === mid);
        if (mod) {
          out.push({
            groupId: g.id,
            groupName: g.name,
            modifierId: mod.id,
            name: mod.name,
            priceDelta: Number(mod.priceDelta),
          });
        }
      }
    }
    return out;
  }, [selected, groups]);

  const variant = variants.find((v) => v.id === variantId);
  const lineUnit =
    Number(item.basePrice) + (variant ? Number(variant.priceDelta) : 0) + flatMods.reduce((s, m) => s + m.priceDelta, 0);

  const requirementsMet = groups.every((g) => (selected[g.id]?.size ?? 0) >= g.minSelect);

  const reset = () => {
    setVariantId(variants[0]?.id);
    setQuantity(1);
    setNotes('');
    setSelected({});
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
        </DialogHeader>

        {variants.length > 0 && (
          <div className="space-y-2">
            <Label>Variant</Label>
            <div className="flex flex-wrap gap-2">
              {variants
                .filter((v) => v.active)
                .map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      variantId === v.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background hover:bg-accent'
                    }`}
                  >
                    {v.name}
                    {Number(v.priceDelta) !== 0 && (
                      <span className="ml-2 text-xs">
                        {Number(v.priceDelta) > 0 ? '+' : ''}₹{Number(v.priceDelta).toFixed(0)}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        )}

        {groups.length > 0 && (
          <div className="space-y-3">
            {groups.map((g) => {
              const picked = selected[g.id] ?? new Set<string>();
              const needsMore = picked.size < g.minSelect;
              return (
                <div key={g.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      {g.name}
                      {g.required && <Badge variant="warning">required</Badge>}
                    </Label>
                    <span className={`text-xs ${needsMore ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {picked.size}/{g.maxSelect} (min {g.minSelect})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.options
                      .filter((o) => o.active)
                      .map((o) => {
                        const isPicked = picked.has(o.id);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => toggleMod(g.id, o.id, g.maxSelect)}
                            className={`rounded-full border px-3 py-1 text-xs ${
                              isPicked
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input bg-background hover:bg-accent'
                            }`}
                          >
                            {o.name}
                            {Number(o.priceDelta) !== 0 && (
                              <span className="ml-1">
                                {Number(o.priceDelta) > 0 ? '+' : ''}₹{Number(o.priceDelta).toFixed(0)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Less spicy, no onion…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button type="button" size="icon" variant="outline" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-medium">{quantity}</span>
            <Button type="button" size="icon" variant="outline" onClick={() => setQuantity(quantity + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-lg font-semibold">₹{(lineUnit * quantity).toFixed(2)}</div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!requirementsMet}
            onClick={() => {
              onConfirm({
                menuItemId: item.id,
                variantId,
                quantity,
                notes: notes.trim() || undefined,
                modifiers: flatMods,
              });
              reset();
              onOpenChange(false);
            }}
          >
            Add to order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
