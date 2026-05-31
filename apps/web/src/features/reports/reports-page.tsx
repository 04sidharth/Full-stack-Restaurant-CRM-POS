import { useMemo, useState, type ElementType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { reportsApi } from './reports-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TrendingUp, ShoppingBag, Package, CreditCard, Calendar, Download } from 'lucide-react';

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]!);
  const lines = [keys.join(','), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const toUTCISO = (yyyyMmDd: string, end = false) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0)).toISOString();
};

function thisMonthRange(): [string, string] {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return [isoDay(from), isoDay(now)];
}
function lastMonthRange(): [string, string] {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return [isoDay(from), isoDay(to)];
}

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#10b981',
  CARD: '#3b82f6',
  UPI: '#8b5cf6',
  WALLET: '#f59e0b',
  CREDIT: '#ef4444',
  OTHER: '#6b7280',
};

const TYPE_COLORS = ['#f97316', '#3b82f6', '#10b981'];
const BAR_COLOR = '#f97316';

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md text-xs">
      {label && <p className="font-medium text-muted-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.name === 'revenue' || p.name === 'Revenue' || p.name === 'Total' ? `₹${Number(p.value).toFixed(0)}` : p.value}
        </p>
      ))}
    </div>
  );
};

const RADIAN = Math.PI / 180;
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const ReportsPage = () => {
  const todayStr = isoDay(new Date());
  const ago = (n: number) => isoDay(new Date(Date.now() - n * 86400000));

  const [from, setFrom] = useState(ago(7));
  const [to, setTo] = useState(todayStr);

  const fromIso = useMemo(() => toUTCISO(from, false), [from]);
  const toIso = useMemo(() => toUTCISO(to, true), [to]);

  const sales = useQuery({ queryKey: ['report-sales', fromIso, toIso], queryFn: () => reportsApi.sales(fromIso, toIso) });
  const items = useQuery({ queryKey: ['report-items', fromIso, toIso], queryFn: () => reportsApi.items(fromIso, toIso) });
  const payments = useQuery({ queryKey: ['report-payments', fromIso, toIso], queryFn: () => reportsApi.payments(fromIso, toIso) });
  const gst = useQuery({ queryKey: ['report-gst', fromIso, toIso], queryFn: () => reportsApi.gst(fromIso, toIso) });
  const customers = useQuery({ queryKey: ['report-customers', fromIso, toIso], queryFn: () => reportsApi.customers(fromIso, toIso) });

  const applyPreset = (days: number) => {
    setTo(todayStr);
    setFrom(ago(days));
  };

  const dailyChartData = useMemo(
    () => (sales.data?.daily ?? []).map((d) => ({ date: d.date.slice(5), revenue: Number(d.revenue), orders: d.orders })),
    [sales.data],
  );

  const paymentChartData = useMemo(
    () => (payments.data ?? []).map((p) => ({ name: p.method, value: Number(p.total), count: p.count })),
    [payments.data],
  );

  const itemChartData = useMemo(
    () =>
      (items.data ?? [])
        .slice(0, 8)
        .map((i) => ({ name: i.name.length > 16 ? i.name.slice(0, 16) + '…' : i.name, revenue: Number(i.revenue), qty: i.quantitySold })),
    [items.data],
  );

  const typeChartData = useMemo(() => {
    if (!sales.data) return [];
    const { DINE_IN, TAKEAWAY, DELIVERY } = sales.data.byType;
    return [
      { name: 'Dine-in', value: DINE_IN },
      { name: 'Takeaway', value: TAKEAWAY },
      { name: 'Delivery', value: DELIVERY },
    ].filter((d) => d.value > 0);
  }, [sales.data]);

  return (
    <div className="container max-w-7xl py-8 px-4 md:px-8 page-enter">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Sales, item performance, GST, and customer analytics.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36 text-sm" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm" variant="outline"
              className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => {
                const rows = (sales.data?.daily ?? []).map((d) => ({ Date: d.date, Orders: d.orders, Revenue: d.revenue }));
                downloadCSV(rows, `sales-report-${from}-to-${to}.csv`);
              }}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            {PRESETS.map((p) => (
              <Button key={p.label} size="sm" variant="outline" onClick={() => applyPreset(p.days)} className="text-xs">
                <Calendar className="mr-1 h-3 w-3" />
                {p.label}
              </Button>
            ))}
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { const [f, t] = thisMonthRange(); setFrom(f); setTo(t); }}>
              <Calendar className="mr-1 h-3 w-3" />
              This month
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { const [f, t] = lastMonthRange(); setFrom(f); setTo(t); }}>
              <Calendar className="mr-1 h-3 w-3" />
              Last month
            </Button>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
        <MetricCard
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Revenue"
          value={sales.data ? `₹${Number(sales.data.totals.revenue).toFixed(0)}` : '—'}
        />
        <MetricCard
          icon={ShoppingBag}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Orders"
          value={sales.data?.totals.orders.toString() ?? '—'}
        />
        <MetricCard
          icon={Package}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label="Items sold"
          value={sales.data?.totals.items.toString() ?? '—'}
        />
        <MetricCard
          icon={CreditCard}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="Avg. order"
          value={sales.data ? `₹${Number(sales.data.totals.avgOrderValue).toFixed(0)}` : '—'}
        />
      </div>

      {/* Charts row 1 */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily revenue area chart */}
        <Card className="border-0 shadow-sm ring-1 ring-border/60 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Revenue</CardTitle>
            <CardDescription>Revenue trend over selected period</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BAR_COLOR} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={BAR_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} width={54} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={BAR_COLOR} strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart height={220} />
            )}
          </CardContent>
        </Card>

        {/* Order type donut */}
        <Card className="border-0 shadow-sm ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Types</CardTitle>
            <CardDescription>Dine-in / Takeaway / Delivery</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-4">
            {typeChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={typeChartData} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false} label={PieLabel}>
                      {typeChartData.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                  {typeChartData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChart height={220} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top items bar chart */}
        <Card className="border-0 shadow-sm ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Items by Revenue</CardTitle>
            <CardDescription>Best performing menu items</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {itemChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={itemChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart height={260} />
            )}
          </CardContent>
        </Card>

        {/* Payment mix */}
        <Card className="border-0 shadow-sm ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment Mix</CardTitle>
            <CardDescription>Revenue by payment method</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {paymentChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={paymentChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" labelLine={false} label={PieLabel}>
                      {paymentChartData.map((p) => (
                        <Cell key={p.name} fill={PAYMENT_COLORS[p.name] ?? '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} formatter={(v: any) => `₹${Number(v).toFixed(0)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {paymentChartData.map((p) => (
                    <div key={p.name} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ background: PAYMENT_COLORS[p.name] ?? '#6b7280' }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">₹{Number(p.value).toFixed(0)} · {p.count} txn</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChart height={260} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: GST + Top customers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* GST summary */}
        <Card className="border-0 shadow-sm ring-1 ring-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">GST Summary</CardTitle>
            <CardDescription>{gst.data ? `${gst.data.invoices} invoices` : 'Loading…'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gst.data ? (
              <>
                <GstRow label="Taxable value" value={`₹${Number(gst.data.subTotal).toFixed(2)}`} />
                <GstRow label="CGST" value={`₹${Number(gst.data.cgst).toFixed(2)}`} />
                <GstRow label="SGST" value={`₹${Number(gst.data.sgst).toFixed(2)}`} />
                <GstRow label="IGST" value={`₹${Number(gst.data.igst).toFixed(2)}`} />
                <div className="border-t pt-3">
                  <GstRow label="Total tax" value={`₹${Number(gst.data.taxTotal).toFixed(2)}`} bold />
                  <GstRow label="Invoiced total" value={`₹${Number(gst.data.total).toFixed(2)}`} muted />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
          </CardContent>
        </Card>

        {/* Top customers */}
        <Card className="border-0 shadow-sm ring-1 ring-border/60 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Customers</CardTitle>
            <CardDescription>By spend in selected period</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3 text-right">Orders</th>
                    <th className="px-5 py-3 text-right">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {!customers.data?.length && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-sm text-muted-foreground">
                        No customer orders in this range.
                      </td>
                    </tr>
                  )}
                  {customers.data?.map((c, i) => (
                    <tr key={c.customerId} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-5 py-3 font-medium">{c.name ?? '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.phone}</td>
                      <td className="px-5 py-3 text-right">{c.orders}</td>
                      <td className="px-5 py-3 text-right font-medium">₹{Number(c.spend).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top items full table */}
      <Card className="mt-6 border-0 shadow-sm ring-1 ring-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Items — Sales Breakdown</CardTitle>
          <CardDescription>Full item performance for selected period</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">Qty sold</th>
                  <th className="px-5 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {!items.data?.length && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-muted-foreground">
                      No items sold in this range.
                    </td>
                  </tr>
                )}
                {items.data?.map((item, i) => (
                  <tr key={item.menuItemId} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-5 py-3 font-medium">{item.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{item.category}</td>
                    <td className="px-5 py-3 text-right">{item.quantitySold}</td>
                    <td className="px-5 py-3 text-right font-medium">₹{Number(item.revenue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const MetricCard = ({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: ElementType;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
}) => (
  <Card className="border-0 shadow-sm ring-1 ring-border/60">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const GstRow = ({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) => (
  <div className={`flex justify-between text-sm ${muted ? 'text-muted-foreground' : ''}`}>
    <span>{label}</span>
    <span className={bold ? 'font-semibold' : ''}>{value}</span>
  </div>
);

const EmptyChart = ({ height }: { height: number }) => (
  <div className={`flex items-center justify-center text-sm text-muted-foreground`} style={{ height }}>
    No data for this period
  </div>
);
