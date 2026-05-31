import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authApi } from './auth-api';
import { useAuthStore } from '@/stores/auth-store';
import { apiErrorMessage } from '@/lib/api';

const FOOD_BG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=90&auto=format&fit=crop';

const STEPS = [
  { icon: '🍽️', title: 'Orders & POS', desc: 'Fast billing and KOT printing' },
  { icon: '📊', title: 'Analytics', desc: 'Revenue, GST, and item reports' },
  { icon: '👥', title: 'CRM', desc: 'Loyalty points and customer history' },
];

export const SignupPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.set);
  const [form, setForm] = useState({
    restaurantName: '', ownerName: '', email: '', phone: '',
    password: '', gstNumber: '', city: '', state: '',
  });

  const onChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const signup = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data) => {
      setAuth(data);
      toast.success('Restaurant account created 🎉');
      navigate('/');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not create account')),
  });

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${FOOD_BG})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/92 via-[#4a1942]/85 to-[#7c2d12]/80" />

      {/* Left panel */}
      <div className="relative z-10 hidden flex-col justify-between p-12 lg:flex lg:w-5/12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-2xl">
            🍽️
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-tight">Restaurant CRM</p>
            <p className="text-xs font-semibold tracking-[0.2em] text-orange-300 uppercase">Management Platform</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-black text-white leading-tight">
              Start serving customers<br />
              <span className="text-gradient-gold">smarter today.</span>
            </h1>
            <p className="mt-3 text-white/60 text-base leading-relaxed">
              Join thousands of restaurants managing everything from one powerful dashboard.
            </p>
          </div>

          <div className="space-y-4">
            {STEPS.map((s) => (
              <div key={s.title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-3xl">{s.icon}</div>
                <div>
                  <p className="text-sm font-bold text-white">{s.title}</p>
                  <p className="text-xs text-white/50">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-sm">Free to start · No credit card required</p>
      </div>

      {/* Right form card */}
      <div className="relative z-10 flex w-full items-center justify-center p-6 lg:w-7/12">
        <div className="glass-card w-full max-w-xl rounded-3xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900">Create your restaurant 🚀</h2>
            <p className="mt-1 text-sm text-gray-500">Get started in under 2 minutes</p>
          </div>

          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              signup.mutate({
                ...form,
                phone: form.phone || undefined,
                gstNumber: form.gstNumber || undefined,
                city: form.city || undefined,
                state: form.state || undefined,
              });
            }}
          >
            {[
              { k: 'restaurantName', label: 'Restaurant name', type: 'text', required: true, col2: true, placeholder: 'Spice Garden' },
              { k: 'ownerName',      label: 'Your name',        type: 'text', required: true, col2: false, placeholder: 'Rahul Sharma' },
              { k: 'email',          label: 'Email',            type: 'email', required: true, col2: false, placeholder: 'rahul@restaurant.com' },
              { k: 'phone',          label: 'Phone (optional)', type: 'tel', required: false, col2: false, placeholder: '98765 43210' },
              { k: 'password',       label: 'Password',         type: 'password', required: true, col2: false, placeholder: '••••••••' },
              { k: 'gstNumber',      label: 'GST number',       type: 'text', required: false, col2: false, placeholder: '27XXXXX (optional)' },
              { k: 'city',           label: 'City',             type: 'text', required: false, col2: false, placeholder: 'Mumbai' },
              { k: 'state',          label: 'State',            type: 'text', required: false, col2: false, placeholder: 'Maharashtra' },
            ].map((f) => (
              <div key={f.k} className={f.col2 ? 'md:col-span-2' : ''}>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={form[f.k as keyof typeof form]}
                  onChange={onChange(f.k as keyof typeof form)}
                  minLength={f.k === 'password' ? 8 : undefined}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                />
              </div>
            ))}

            <div className="md:col-span-2 pt-1">
              <button
                type="submit"
                disabled={signup.isPending}
                className="relative w-full overflow-hidden rounded-xl gradient-orange py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 shimmer-effect"
              >
                {signup.isPending ? 'Creating account…' : 'Create restaurant account →'}
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 md:col-span-2">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-orange-600 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
