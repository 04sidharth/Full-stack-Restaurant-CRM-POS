import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authApi } from './auth-api';
import { useAuthStore } from '@/stores/auth-store';
import { apiErrorMessage } from '@/lib/api';

const FOOD_BG = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=90&auto=format&fit=crop';

const FLOATING_ITEMS = [
  { emoji: '🍕', top: '8%',  left: '6%',  size: '2.8rem', delay: 0    },
  { emoji: '🍜', top: '15%', left: '82%', size: '2.2rem', delay: 1    },
  { emoji: '🥗', top: '55%', left: '5%',  size: '2rem',   delay: 2    },
  { emoji: '🍣', top: '70%', left: '88%', size: '2.4rem', delay: 0.5  },
  { emoji: '🍔', top: '85%', left: '12%', size: '2rem',   delay: 1.5  },
  { emoji: '☕', top: '40%', left: '91%', size: '1.8rem', delay: 3    },
  { emoji: '🥩', top: '28%', left: '3%',  size: '2rem',   delay: 2.5  },
  { emoji: '🍰', top: '78%', left: '75%', size: '2.2rem', delay: 1.2  },
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.set);
  const [email, setEmail] = useState('owner@demo.test');
  const [password, setPassword] = useState('Password@123');
  const [showPwd, setShowPwd] = useState(false);

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data);
      toast.success(`Welcome back, ${data.user.name} 👋`);
      navigate('/');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Login failed')),
  });

  return (
    <div className="relative flex min-h-screen overflow-hidden">

      {/* ── Background food photo ─────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-[10s] hover:scale-100"
        style={{ backgroundImage: `url(${FOOD_BG})` }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29]/90 via-[#302b63]/80 to-[#24243e]/85" />

      {/* Animated grain */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      {/* Floating food emojis */}
      {FLOATING_ITEMS.map((item, i) => (
        <div
          key={i}
          className="absolute select-none pointer-events-none"
          style={{
            top: item.top,
            left: item.left,
            fontSize: item.size,
            animation: `float 6s ease-in-out ${item.delay}s infinite`,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            opacity: 0.75,
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* ── Left branding panel (desktop) ──────────────────── */}
      <div className="relative z-10 hidden flex-col justify-between p-12 lg:flex lg:w-1/2">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-2xl shadow-lg">
            🍽️
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-tight">Restaurant</p>
            <p className="text-xs font-semibold tracking-[0.2em] text-orange-300 uppercase">CRM & POS</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-5xl font-black text-white leading-[1.1]">
              Run your restaurant<br />
              <span className="text-gradient-gold">smarter.</span>
            </h1>
            <p className="text-lg text-white/60 leading-relaxed max-w-sm">
              Orders, tables, billing, inventory and CRM — all in one beautiful platform.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['⚡ Live KDS', '📊 Analytics', '💳 Billing', '🛒 POS', '👥 CRM'].map((f) => (
              <span key={f} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <p className="text-sm text-white/30 italic">
          "The best restaurants run on the best systems."
        </p>
      </div>

      {/* ── Right login card ────────────────────────────────── */}
      <div className="relative z-10 flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="glass-card w-full max-w-md rounded-3xl p-8 spin-in">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-orange text-xl shadow-lg">
              🍽️
            </div>
            <p className="text-lg font-bold text-gray-800">Restaurant CRM</p>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-3xl font-black text-gray-900">Welcome back 👋</h2>
            <p className="mt-1.5 text-sm text-gray-500">Sign in to manage your restaurant</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); login.mutate({ email, password }); }}
          >
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                placeholder="you@restaurant.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 pr-12 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={login.isPending}
              className="relative w-full overflow-hidden rounded-xl gradient-orange py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed shimmer-effect"
            >
              {login.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in to dashboard →'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">New to the platform?</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <Link
            to="/signup"
            className="block w-full rounded-xl border-2 border-gray-200 py-3 text-center text-sm font-semibold text-gray-700 transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
          >
            Create a restaurant account
          </Link>
        </div>
      </div>
    </div>
  );
};
