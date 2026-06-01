import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Menu, X,
  LayoutDashboard, Soup, Receipt, Grid3x3, UtensilsCrossed,
  ChefHat, Users, Boxes, BarChart3, UserCog,
  Bell, LogOut, ChevronDown, Activity, Settings,
  Target, MessageSquare, CheckSquare, Megaphone,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Role } from '@/stores/auth-store';
import { useAuthStore } from '@/stores/auth-store';
import { reportsApi } from '@/features/reports/reports-api';
import { cn } from '@/lib/cn';

const CENTER_NAV: { to: string; label: string; icon: typeof LayoutDashboard; roles?: Role[] }[] = [
  { to: '/pos',       label: 'POS',       icon: Soup            },
  { to: '/tables',    label: 'Tables',    icon: Grid3x3         },
  { to: '/orders',    label: 'Live View', icon: Activity        },
  { to: '/kds',       label: 'Kitchen',   icon: ChefHat         },
  { to: '/menu',      label: 'Menu',      icon: UtensilsCrossed },
  { to: '/customers', label: 'Customers', icon: Users           },
  { to: '/inventory', label: 'Inventory', icon: Boxes           },
  { to: '/reports',   label: 'Reports',   icon: BarChart3       },
  { to: '/staff',          label: 'Staff',   icon: UserCog,       roles: ['OWNER', 'MANAGER'] },
  { to: '/campaigns',      label: 'Campaigns', icon: Megaphone      },
  { to: '/leads',          label: 'Leads',     icon: Target         },
  { to: '/communications', label: 'Comms',     icon: MessageSquare  },
  { to: '/tasks',          label: 'Tasks',     icon: CheckSquare    },
];

export const AppShell = () => {
  const { user, restaurant, clear } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const visibleNav = CENTER_NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));

  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportsApi.dashboard,
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled: !!user,
  });

  const navBadges: Record<string, { count: number; color: string }> = {};
  if ((dash?.lowStockItems ?? 0) > 0) navBadges['/inventory'] = { count: dash!.lowStockItems, color: 'bg-red-500' };
  if ((dash?.activeOrders ?? 0) > 0)  navBadges['/orders']    = { count: dash!.activeOrders,  color: 'bg-blue-500' };

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: '#f5f3ef' }}>

      {/* ── Top Navigation ─────────────────────────────────── */}
      <header
        className="relative z-30 flex h-14 shrink-0 items-center"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #4a1942 100%)' }}
      >
        {/* Shimmer stripe */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'gradient-flow 4s linear infinite' }} />
        </div>

        {/* LEFT: Hamburger + Logo + New Order + Search */}
        <div className="flex items-center gap-2 border-r border-white/10 px-3 pr-4">
          <button
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-lg backdrop-blur-sm transition-all group-hover:bg-white/20">
              🍽️
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-black tracking-[0.15em] text-white uppercase leading-none">Restaurant</p>
              <p className="text-[9px] font-semibold tracking-[0.25em] text-orange-300 uppercase leading-none mt-0.5">POSS</p>
            </div>
          </Link>

          {/* New Order */}
          <button
            onClick={() => navigate('/pos')}
            className="relative hidden overflow-hidden rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5 sm:flex items-center gap-1.5 shimmer-effect"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            <span className="text-sm leading-none">+</span> New Order
          </button>

          {/* Bill search */}
          <div className="hidden items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-2.5 py-1.5 text-xs text-white/40 md:flex">
            <Receipt className="h-3.5 w-3.5 shrink-0" />
            <span>Bill No</span>
          </div>
        </div>

        {/* CENTER: Nav icons */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 overflow-x-auto px-2 md:flex">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group relative flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 transition-all duration-150 whitespace-nowrap',
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/50 hover:bg-white/10 hover:text-white/90',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon className={cn('h-[18px] w-[18px] transition-transform', isActive && 'scale-110')} />
                      {navBadges[item.to] && (
                        <span className={`absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-black text-white ${navBadges[item.to]!.color} shadow-md`}>
                          {navBadges[item.to]!.count}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* RIGHT: Dashboard + Alerts + User */}
        <div className="flex items-center gap-1 border-l border-white/10 px-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-all text-[10px] font-semibold',
                isActive ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white/90')
            }
          >
            <LayoutDashboard className="h-[18px] w-[18px]" />
            <span>Home</span>
          </NavLink>

          <button className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-white/50 transition-all hover:bg-white/10 hover:text-white/90">
            <Bell className="h-[18px] w-[18px]" />
            <span>Alerts</span>
          </button>

          {/* User avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all hover:bg-white/10"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #f97316, #e11d48)' }}
              >
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <ChevronDown className="h-3 w-3 text-white/40" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d1b69)' }}>
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-sm font-bold text-white">{user?.name}</p>
                    <p className="text-xs text-white/40 capitalize">{user?.role?.toLowerCase()} · {restaurant?.name}</p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/5"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    onClick={() => { setUserMenuOpen(false); clear(); }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-white/5"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile drawer overlay ──────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 shadow-2xl transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #2d1b69 50%, #4a1942 100%)' }}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            <p className="text-sm font-bold text-white">Restaurant CRM</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-white/50 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 overflow-y-auto p-3">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                    isActive ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white/80')
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
          <div className="mt-2 border-t border-white/10 pt-2">
            <button
              onClick={clear}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-400 transition-all hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </nav>
      </aside>

      {/* ── Page content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
