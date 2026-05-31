import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { reportsApi } from '../reports/reports-api';
import { useAuthStore } from '@/stores/auth-store';
import {
  TrendingUp, TrendingDown, ShoppingCart, LayoutGrid, AlertTriangle,
  ArrowRight, Soup, Receipt, Grid3x3, UtensilsCrossed, ChefHat,
  Users, Boxes, BarChart3,
} from 'lucide-react';

const FOOD_HERO = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&q=85&auto=format&fit=crop';

const isoDay  = (d: Date) => d.toISOString().slice(0, 10);
const ago     = (n: number) => isoDay(new Date(Date.now() - n * 86400000));
const toUTC   = (s: string, end = false) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0)).toISOString();
};

const METRIC_CFG = [
  { key: 'revenue', label: "Today's Revenue",   icon: TrendingUp,    grad: 'linear-gradient(135deg,#059669,#047857)', glow: 'rgba(5,150,105,0.3)'  },
  { key: 'orders',  label: 'Active Orders',      icon: ShoppingCart,  grad: 'linear-gradient(135deg,#3b82f6,#2563eb)', glow: 'rgba(59,130,246,0.3)' },
  { key: 'tables',  label: 'Tables in Use',      icon: LayoutGrid,    grad: 'linear-gradient(135deg,#7c3aed,#6d28d9)', glow: 'rgba(124,58,237,0.3)' },
  { key: 'stock',   label: 'Low Stock Items',     icon: AlertTriangle, grad: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: 'rgba(245,158,11,0.3)' },
];

const QUICK = [
  { to: '/pos',       label: 'POS',       desc: 'New order',        icon: Soup,           color: '#f97316' },
  { to: '/orders',    label: 'Orders',    desc: 'Manage orders',    icon: Receipt,        color: '#3b82f6' },
  { to: '/tables',    label: 'Tables',    desc: 'Floor view',       icon: Grid3x3,        color: '#7c3aed' },
  { to: '/menu',      label: 'Menu',      desc: 'Items & cats',     icon: UtensilsCrossed,color: '#059669' },
  { to: '/kds',       label: 'Kitchen',   desc: 'Display system',   icon: ChefHat,        color: '#e11d48' },
  { to: '/customers', label: 'Customers', desc: 'CRM & loyalty',    icon: Users,          color: '#0891b2' },
  { to: '/inventory', label: 'Inventory', desc: 'Stock tracking',   icon: Boxes,          color: '#7c2d12' },
  { to: '/reports',   label: 'Reports',   desc: 'Analytics',        icon: BarChart3,      color: '#4338ca' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-500 mb-0.5">{label}</p>
      <p className="font-bold text-gray-900">₹{Number(payload[0]?.value ?? 0).toFixed(0)}</p>
    </div>
  );
};

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const DashboardPage = () => {
  const { user, restaurant } = useAuthStore();
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: reportsApi.dashboard, refetchInterval: 30_000 });

  const today    = isoDay(new Date());
  const sevenAgo = ago(6);
  const yesterday = ago(1);

  const salesQ = useQuery({
    queryKey: ['report-sales', toUTC(sevenAgo), toUTC(today, true)],
    queryFn: () => reportsApi.sales(toUTC(sevenAgo), toUTC(today, true)),
  });
  const ydayQ = useQuery({
    queryKey: ['report-sales-yday', toUTC(yesterday), toUTC(yesterday, true)],
    queryFn: () => reportsApi.sales(toUTC(yesterday), toUTC(yesterday, true)),
  });

  const chartData = useMemo(
    () => (salesQ.data?.daily ?? []).map((d) => ({ date: d.date.slice(5), revenue: Number(d.revenue) })),
    [salesQ.data],
  );

  const todayRev = data ? Number(data.todaySales.revenue) : null;
  const ydayRev  = ydayQ.data ? Number(ydayQ.data.totals.revenue) : null;
  const delta    = todayRev !== null && ydayRev !== null && ydayRev > 0
    ? ((todayRev - ydayRev) / ydayRev) * 100 : null;

  const metricValues = [
    { value: data ? `₹${Number(data.todaySales.revenue).toFixed(0)}` : '—', sub: delta !== null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}% vs yesterday` : `${data?.todaySales.orders ?? 0} orders`, deltaPos: delta !== null ? delta >= 0 : null },
    { value: data?.activeOrders.toString() ?? '—', sub: 'In progress right now', deltaPos: null },
    { value: data?.occupiedTables.toString() ?? '—', sub: 'Occupied or billing',  deltaPos: null },
    { value: data?.lowStockItems.toString() ?? '—', sub: 'Below minimum level',   deltaPos: (data?.lowStockItems ?? 0) === 0 },
  ];

  const insights = useMemo(() => {
    if (!data) return [];
    const list: { to: string; text: string; sub: string; icon: typeof Soup; color: string }[] = [];
    if (data.occupiedTables > 0) list.push({ to: '/tables',    text: `${data.occupiedTables} table${data.occupiedTables > 1 ? 's' : ''} in use`,      sub: 'View floor →',        icon: Grid3x3,     color: '#7c3aed' });
    if (data.activeOrders > 0)   list.push({ to: '/orders',    text: `${data.activeOrders} active order${data.activeOrders > 1 ? 's' : ''}`,           sub: 'Check status →',      icon: Receipt,     color: '#3b82f6' });
    if (data.lowStockItems > 0)  list.push({ to: '/inventory', text: `${data.lowStockItems} item${data.lowStockItems > 1 ? 's' : ''} low on stock`,     sub: 'Review inventory →',  icon: AlertTriangle, color: '#e11d48' });
    if (data.todaySales.orders > 0) list.push({ to: '/reports', text: `${data.todaySales.orders} order${data.todaySales.orders > 1 ? 's' : ''} completed`, sub: 'View sales report →', icon: BarChart3,   color: '#059669' });
    if (list.length === 0) {
      list.push({ to: '/pos',  text: 'No active orders yet', sub: 'Start a new order →',    icon: Soup,     color: '#f97316' });
      list.push({ to: '/menu', text: 'Configure your menu',  sub: 'Add items & prices →',   icon: UtensilsCrossed, color: '#7c3aed' });
    }
    return list;
  }, [data]);

  return (
    <div className="page-enter min-h-full">

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${FOOD_HERO})` }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a1a2e/93, #4a1942/85, #7c2d12/80)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(26,26,46,0.93), rgba(74,25,66,0.85), rgba(124,45,18,0.80))' }} />

        {/* Decorative blobs */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />
        <div className="absolute -left-8 bottom-0 h-48 w-48 rounded-full opacity-15 blur-2xl"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />

        <div className="relative z-10 px-6 py-8 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-wide text-orange-300">{restaurant?.name}</p>
              <h1 className="mt-1 text-3xl font-black text-white md:text-4xl">
                {timeGreeting()}, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="mt-1.5 text-sm text-white/55">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/pos"
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 shimmer-effect"
                style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}
              >
                <Soup className="h-4 w-4" /> New order
              </Link>
              <Link
                to="/reports"
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <BarChart3 className="h-4 w-4" /> Reports
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 md:px-8 max-w-7xl mx-auto">

        {/* ── Metric Cards ──────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
          {METRIC_CFG.map((cfg, i) => {
            const Icon = cfg.icon;
            const m = metricValues[i]!;
            return (
              <div
                key={cfg.key}
                className="glass-card rounded-2xl p-5 card-lift"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{cfg.label}</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-gray-900">{m.value}</p>
                    {m.deltaPos !== null ? (
                      <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${m.deltaPos ? 'text-emerald-600' : 'text-red-500'}`}>
                        {m.deltaPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {m.sub}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">{m.sub}</p>
                    )}
                  </div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg"
                    style={{ background: cfg.grad, boxShadow: `0 4px 16px ${cfg.glow}` }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Revenue Chart ─────────────────────────────────── */}
        <div className="mb-6 glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Revenue · Last 7 days</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {chartData.length < 2 ? 'Collecting data — chart populates as orders roll in' : 'Daily sales trend'}
              </p>
            </div>
            <Link
              to="/reports"
              className="flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-200"
            >
              Full report <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revGrad2)" dot={false} activeDot={{ r: 5, fill: '#f97316', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
              <span className="text-4xl float">📈</span>
              <p className="text-sm text-gray-400">Not enough data yet</p>
              <p className="text-xs text-gray-300">Complete a few orders to see your trend</p>
            </div>
          )}
        </div>

        {/* ── Insights + Quick Links ─────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Live insights */}
          <div className="lg:col-span-3 glass-card rounded-2xl p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">What needs attention</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 stagger">
              {insights.map((ins) => {
                const Icon = ins.icon;
                return (
                  <Link
                    key={ins.to + ins.text}
                    to={ins.to}
                    className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white/60 p-3.5 shadow-sm transition-all hover:border-transparent hover:shadow-md hover:-translate-y-0.5"
                    style={{ '--hover-glow': ins.color } as React.CSSProperties}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-110"
                      style={{ background: ins.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-800 truncate">{ins.text}</p>
                      <p className="text-[10px] text-gray-400">{ins.sub}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick shortcuts grid */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Quick Access</h2>
            <div className="grid grid-cols-4 gap-2">
              {QUICK.map((q) => {
                const Icon = q.icon;
                return (
                  <Link
                    key={q.to}
                    to={q.to}
                    className="group flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition-all hover:-translate-y-1"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md transition-shadow group-hover:shadow-lg"
                      style={{ background: q.color }}
                    >
                      <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 leading-tight">{q.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
