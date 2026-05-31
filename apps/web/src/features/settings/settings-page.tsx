import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import {
  Store, Receipt, Gift, Clock, Bell, Palette,
  ChevronRight, Check, Sparkles, Shield, Globe,
} from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const defaultHours = DAYS.map((d) => ({ day: d, open: !['Sunday'].includes(d), from: '09:00', to: '23:00' }));

const THEMES = [
  { name: 'Default',   colors: ['#f97316','#ea580c'] },
  { name: 'Ocean',     colors: ['#0891b2','#0e7490'] },
  { name: 'Forest',    colors: ['#059669','#047857'] },
  { name: 'Royal',     colors: ['#7c3aed','#6d28d9'] },
  { name: 'Crimson',   colors: ['#e11d48','#be123c'] },
];

const Section = ({ icon: Icon, title, desc, children }: { icon: typeof Store; title: string; desc: string; children: React.ReactNode }) => (
  <div className="glass-card rounded-2xl overflow-hidden">
    <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-orange shadow-md shadow-orange-200">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Field = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
    <input
      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200"
      defaultValue={value}
    />
    {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
  </div>
);

export const SettingsPage = () => {
  const { restaurant, user } = useAuthStore();
  const [hours, setHours] = useState(defaultHours);
  const [loyalty, setLoyalty] = useState({ pointsPerRupee: 1, redemptionRate: 100 });
  const [notifications, setNotifications] = useState({ lowStock: true, newOrder: false, dailyReport: true });
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    toast.success('Settings saved successfully ✓');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-enter min-h-full" style={{ background: '#f5f3ef' }}>

      {/* Hero */}
      <div className="relative overflow-hidden px-6 py-8"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 60%, #4a1942 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        <div className="relative max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Restaurant Settings</h1>
            <p className="mt-1 text-sm text-white/50">Configure your profile, loyalty program, and preferences</p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl backdrop-blur-sm">
            ⚙️
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-6">

        {/* Restaurant Profile */}
        <Section icon={Store} title="Restaurant Profile" desc="Business identity and tax information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-4xl shadow-inner"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                🍽️
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{restaurant?.name}</p>
                <p className="text-xs text-gray-400">Restaurant logo (coming soon)</p>
                <button className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100">
                  Upload logo
                </button>
              </div>
            </div>
            <Field label="Restaurant Name" value={restaurant?.name ?? ''} />
            <Field label="GST Number" value={restaurant?.gstNumber ?? ''} hint="Used on tax invoices" />
            <Field label="Invoice Prefix" value={restaurant?.invoicePrefix ?? 'INV'} hint="e.g. INV/2025-26/00001" />
            <Field label="Currency" value={restaurant?.currency ?? 'INR'} />
            <Field label="City" value="" />
            <Field label="State" value="" />
            <div className="md:col-span-2">
              <Field label="Invoice Footer Message" value="Thank you for your visit! We look forward to serving you again." />
            </div>
          </div>
        </Section>

        {/* Loyalty Program */}
        <Section icon={Gift} title="Loyalty Program" desc="Reward your regular customers with points">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <p className="text-sm font-bold text-gray-900">Points earned</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1} max={10}
                  value={loyalty.pointsPerRupee}
                  onChange={(e) => setLoyalty({ ...loyalty, pointsPerRupee: Number(e.target.value) })}
                  className="w-20 rounded-xl border border-orange-200 bg-white px-3 py-2 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-orange-300"
                />
                <p className="text-sm text-gray-600">point(s) per ₹1 spent</p>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">💳</span>
                <p className="text-sm font-bold text-gray-900">Redemption rate</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={10} max={1000}
                  value={loyalty.redemptionRate}
                  onChange={(e) => setLoyalty({ ...loyalty, redemptionRate: Number(e.target.value) })}
                  className="w-24 rounded-xl border border-purple-200 bg-white px-3 py-2 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-purple-300"
                />
                <p className="text-sm text-gray-600">points = ₹1 off</p>
              </div>
            </div>

            {/* Tier preview */}
            <div className="md:col-span-2">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Loyalty Tiers</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  { icon: '🥉', name: 'Bronze', range: '₹0 – ₹5K',   color: '#cd7f32', bg: 'bg-amber-50'  },
                  { icon: '🥈', name: 'Silver', range: '₹5K – ₹25K', color: '#9ca3af', bg: 'bg-gray-50'   },
                  { icon: '🥇', name: 'Gold',   range: '₹25K – ₹1L', color: '#f59e0b', bg: 'bg-yellow-50' },
                  { icon: '💎', name: 'Diamond', range: '₹1L+',       color: '#06b6d4', bg: 'bg-cyan-50'   },
                ].map((t) => (
                  <div key={t.name} className={`flex items-center gap-2 rounded-xl border p-3 ${t.bg}`}>
                    <span className="text-xl">{t.icon}</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: t.color }}>{t.name}</p>
                      <p className="text-[10px] text-gray-400">{t.range}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Working Hours */}
        <Section icon={Clock} title="Working Hours" desc="Set your restaurant's operating schedule">
          <div className="space-y-2">
            {hours.map((h, i) => (
              <div key={h.day} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                <button
                  onClick={() => setHours(hours.map((x, j) => j === i ? { ...x, open: !x.open } : x))}
                  className={`flex h-6 w-11 items-center rounded-full transition-colors ${h.open ? 'bg-green-500' : 'bg-gray-200'}`}
                >
                  <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${h.open ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="w-24 text-sm font-semibold text-gray-700">{h.day}</span>
                {h.open ? (
                  <>
                    <input type="time" value={h.from}
                      onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, from: e.target.value } : x))}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-orange-400" />
                    <span className="text-xs text-gray-400">to</span>
                    <input type="time" value={h.to}
                      onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, to: e.target.value } : x))}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-orange-400" />
                  </>
                ) : (
                  <span className="text-xs font-medium text-red-400">Closed</span>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="Notifications" desc="Control what alerts you receive">
          <div className="space-y-3">
            {[
              { key: 'lowStock',    label: 'Low stock alerts',      desc: 'When an item falls below minimum threshold', icon: '📦' },
              { key: 'newOrder',    label: 'New order sound',        desc: 'Play a sound when an order is created',      icon: '🔔' },
              { key: 'dailyReport', label: 'Daily summary digest',   desc: 'End-of-day revenue and order summary',       icon: '📊' },
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{n.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{n.label}</p>
                    <p className="text-xs text-gray-400">{n.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications({ ...notifications, [n.key]: !notifications[n.key as keyof typeof notifications] })}
                  className={`flex h-6 w-11 items-center rounded-full transition-all ${notifications[n.key as keyof typeof notifications] ? 'bg-green-500' : 'bg-gray-200'}`}
                >
                  <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${notifications[n.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* Theme */}
        <Section icon={Palette} title="App Theme" desc="Choose your brand colour accent">
          <div className="flex flex-wrap gap-3">
            {THEMES.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setSelectedTheme(i)}
                className={`relative flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 transition-all ${selectedTheme === i ? 'border-gray-700 shadow-md' : 'border-transparent bg-gray-50 hover:border-gray-200'}`}
              >
                <div className="flex gap-1">
                  {t.colors.map((c, j) => (
                    <div key={j} className="h-4 w-4 rounded-full shadow-sm" style={{ background: c }} />
                  ))}
                </div>
                <span className="text-xs font-semibold text-gray-700">{t.name}</span>
                {selectedTheme === i && <Check className="h-3.5 w-3.5 text-gray-700" />}
              </button>
            ))}
          </div>
        </Section>

        {/* Account info */}
        <Section icon={Shield} title="Account" desc="Your owner profile and security">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Owner Name" value={user?.name ?? ''} />
            <Field label="Email" value={user?.email ?? ''} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Role</label>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="text-lg">👑</span>
                <span className="text-sm font-semibold capitalize text-gray-800">{user?.role?.toLowerCase()}</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Password</label>
              <button className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-100 flex items-center justify-between">
                Change password <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Section>

        {/* Save button */}
        <div className="flex justify-end gap-3 pb-4">
          <button className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Discard
          </button>
          <button
            onClick={handleSave}
            className={`relative flex items-center gap-2 overflow-hidden rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 shimmer-effect ${saved ? 'bg-emerald-500' : 'gradient-orange shadow-orange-200'}`}
          >
            {saved ? <><Check className="h-4 w-4" /> Saved!</> : <><Sparkles className="h-4 w-4" /> Save all settings</>}
          </button>
        </div>
      </div>
    </div>
  );
};
