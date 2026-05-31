import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Printer, Trash2, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { billingApi, type PaymentMethod } from './billing-api';
import { ordersApi } from '../orders/orders-api';
import { useAuthStore } from '@/stores/auth-store';
import { apiErrorMessage } from '@/lib/api';
import { sendWhatsAppBill } from '@/lib/whatsapp';
import { Confetti } from '@/components/ui/confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'UPI', 'WALLET', 'CREDIT', 'OTHER'];

export const BillingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { restaurant } = useAuthStore();

  const [interState, setInterState] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [discount, setDiscount] = useState<string>('0');
  const [discountReason, setDiscountReason] = useState('');
  const [servicePct, setServicePct] = useState('0');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');

  const summary = useQuery({
    queryKey: ['bill-summary', orderId, interState],
    queryFn: () => billingApi.summary(orderId!, interState),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (summary.data?.order) {
      setDiscount(summary.data.order.discountAmount ?? '0');
      setDiscountReason(summary.data.order.discountReason ?? '');
      const sub = Number(summary.data.totals.subTotal);
      const sc = Number(summary.data.order.serviceCharge);
      setServicePct(sub > 0 ? ((sc / sub) * 100).toFixed(2) : '0');
    }
  }, [summary.data?.order.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['bill-summary'] });
    qc.invalidateQueries({ queryKey: ['order', orderId] });
  };

  const updateOrder = useMutation({
    mutationFn: (input: { discountAmount?: number; discountReason?: string; serviceChargePct?: number }) =>
      ordersApi.update(orderId!, input),
    onSuccess: () => {
      refresh();
      toast.success('Charges updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const addPayment = useMutation({
    mutationFn: () =>
      billingApi.addPayment(orderId!, {
        method: payMethod,
        amount: Number(payAmount),
        reference: payRef.trim() || undefined,
      }),
    onSuccess: () => {
      setPayAmount('');
      setPayRef('');
      refresh();
      toast.success('Payment added');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const removePayment = useMutation({
    mutationFn: (paymentId: string) => billingApi.removePayment(orderId!, paymentId),
    onSuccess: () => {
      refresh();
      toast.success('Payment removed');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const finalize = useMutation({
    mutationFn: () => billingApi.finalize(orderId!, { interState }),
    onSuccess: (inv) => {
      refresh();
      setConfetti(true);
      toast.success(`🎉 Invoice ${inv.invoiceNumber} generated!`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['sections'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (!orderId) return null;
  if (summary.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading bill…</div>;
  if (!summary.data) return <div className="p-8 text-sm text-muted-foreground">Bill not found.</div>;

  const { order, lines, totals } = summary.data;
  const completed = order.status === 'COMPLETED';
  const balance = Number(totals.balance);

  const whatsappParams = {
    restaurantName: restaurant?.name ?? 'Restaurant',
    gstNumber: restaurant?.gstNumber,
    orderNumber: order.orderNumber,
    orderType: order.type,
    tableName: order.table?.name,
    customerName: order.customer?.name,
    createdAt: order.createdAt,
    invoiceNumber: order.invoice?.invoiceNumber,
    lines,
    totals,
    interState: summary.data.interState,
  };

  const handleSendWhatsApp = (phone?: string) => {
    const p = phone ?? order.customer?.phone ?? '';
    if (!p.trim()) { setWaModalOpen(true); return; }
    sendWhatsAppBill(p, whatsappParams);
    toast.success('WhatsApp opened — tap Send to deliver the bill!');
  };

  return (
    <div className="container max-w-5xl py-8">
      <Confetti active={confetti} onDone={() => setConfetti(false)} />
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate('/orders')}>
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 border-green-500 text-green-700 hover:bg-green-50"
            onClick={() => handleSendWhatsApp()}
          >
            <MessageCircle className="h-4 w-4" />
            Send on WhatsApp
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* WhatsApp phone modal */}
      {waModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden">
          <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Send e-bill on WhatsApp</h3>
                  <p className="text-xs text-gray-500">Enter the customer's WhatsApp number</p>
                </div>
              </div>
              <button onClick={() => setWaModalOpen(false)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="wa-phone" className="text-sm">Phone number</Label>
                <div className="mt-1 flex gap-2">
                  <div className="flex h-10 items-center rounded-l-md border border-r-0 bg-gray-50 px-3 text-sm text-gray-500">
                    🇮🇳 +91
                  </div>
                  <Input
                    id="wa-phone"
                    type="tel"
                    placeholder="98765 43210"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    className="rounded-l-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && waPhone.trim()) {
                        setWaModalOpen(false);
                        handleSendWhatsApp(waPhone.trim());
                      }
                    }}
                    autoFocus
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  WhatsApp will open with the bill pre-filled. Just tap Send.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { setWaModalOpen(false); setWaPhone(''); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  disabled={!waPhone.trim()}
                  onClick={() => {
                    const p = waPhone.trim();
                    setWaModalOpen(false);
                    setWaPhone('');
                    handleSendWhatsApp(p);
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Open WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 print:grid-cols-1">
        {/* Bill preview */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold">{restaurant?.name ?? 'Restaurant'}</h2>
              {restaurant?.gstNumber && <p className="text-xs text-muted-foreground">GSTIN: {restaurant.gstNumber}</p>}
              <p className="mt-1 text-xs uppercase text-muted-foreground">Tax invoice</p>
            </div>

            <div className="mb-4 flex flex-wrap items-start justify-between gap-2 text-sm">
              <div>
                <div className="font-medium">Order #{order.orderNumber}</div>
                {order.table && <div className="text-muted-foreground">Table {order.table.name}</div>}
                {order.customer && (
                  <div className="text-muted-foreground">
                    {order.customer.name ?? '—'} · {order.customer.phone}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</div>
                {order.invoice && <div className="font-medium">Invoice: {order.invoice.invoiceNumber}</div>}
                <Badge variant={completed ? 'success' : 'warning'}>{order.status}</Badge>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Tax%</th>
                  <th className="py-2 text-right">Tax</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2">{l.name}</td>
                    <td className="py-2 text-right">{l.quantity}</td>
                    <td className="py-2 text-right">₹{Number(l.unitPrice).toFixed(2)}</td>
                    <td className="py-2 text-right">{Number(l.taxRate).toFixed(0)}%</td>
                    <td className="py-2 text-right">
                      ₹{(Number(l.cgst) + Number(l.sgst) + Number(l.igst)).toFixed(2)}
                    </td>
                    <td className="py-2 text-right">₹{Number(l.lineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{Number(totals.subTotal).toFixed(2)}</span>
              </div>
              {Number(totals.discount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-₹{Number(totals.discount).toFixed(2)}</span>
                </div>
              )}
              {Number(totals.serviceCharge) > 0 && (
                <div className="flex justify-between">
                  <span>Service charge</span>
                  <span>₹{Number(totals.serviceCharge).toFixed(2)}</span>
                </div>
              )}
              {interState ? (
                <div className="flex justify-between">
                  <span>IGST</span>
                  <span>₹{Number(totals.igst).toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>CGST</span>
                    <span>₹{Number(totals.cgst).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST</span>
                    <span>₹{Number(totals.sgst).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Grand total</span>
                <span>₹{Number(totals.grandTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Paid</span>
                <span>₹{Number(totals.paid).toFixed(2)}</span>
              </div>
              <div className={`flex justify-between font-medium ${balance > 0 ? 'text-destructive' : ''}`}>
                <span>Balance</span>
                <span>₹{balance.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls + payments */}
        <div className="space-y-4 print:hidden">
          {!completed && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="font-semibold">Adjustments</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={interState}
                    onChange={(e) => setInterState(e.target.checked)}
                  />
                  Inter-state customer (apply IGST)
                </label>
                <div className="space-y-2">
                  <Label htmlFor="disc">Discount (₹)</Label>
                  <Input id="disc" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discr">Discount reason</Label>
                  <Input id="discr" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc">Service charge (%)</Label>
                  <Input id="svc" type="number" step="0.01" value={servicePct} onChange={(e) => setServicePct(e.target.value)} />
                </div>
                <Button
                  className="w-full"
                  onClick={() =>
                    updateOrder.mutate({
                      discountAmount: Number(discount) || 0,
                      discountReason: discountReason || undefined,
                      serviceChargePct: Number(servicePct) || 0,
                    })
                  }
                  disabled={updateOrder.isPending}
                >
                  Apply adjustments
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="font-semibold">Payments</h3>
              {order.payments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payments yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {order.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span>
                        {p.method} {p.reference && <span className="text-muted-foreground">({p.reference})</span>}
                      </span>
                      <span className="flex items-center gap-2 font-medium">
                        ₹{Number(p.amount).toFixed(2)}
                        {!completed && (
                          <button
                            onClick={() => {
                              if (window.confirm('Remove this payment?')) removePayment.mutate(p.id);
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {!completed && (
                <div className="space-y-2 border-t pt-3">
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={`Amount (balance ₹${balance.toFixed(2)})`}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                  <Input placeholder="Reference (optional)" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => addPayment.mutate()}
                    disabled={!payAmount || Number(payAmount) <= 0 || addPayment.isPending}
                  >
                    <Plus className="h-4 w-4" /> Add payment
                  </Button>
                  {balance > 0 && (
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => setPayAmount(balance.toFixed(2))}
                    >
                      Pay balance ₹{balance.toFixed(2)}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {!completed && (
            <Button
              size="lg"
              className="w-full"
              disabled={balance > 0 || finalize.isPending}
              onClick={() => finalize.mutate()}
            >
              {finalize.isPending ? 'Finalising…' : balance > 0 ? `₹${balance.toFixed(2)} unpaid` : 'Finalize & print invoice'}
            </Button>
          )}
          {completed && order.invoice && (
            <div className="space-y-2">
              <div className="rounded-md bg-emerald-50 p-3 text-center text-sm text-emerald-800">
                Invoice <b>{order.invoice.invoiceNumber}</b> issued
              </div>
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => handleSendWhatsApp()}
              >
                <MessageCircle className="h-4 w-4" />
                Send e-bill on WhatsApp
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
