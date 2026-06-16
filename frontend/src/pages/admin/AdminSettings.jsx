import { useState, useEffect } from 'react';
import {
  Save, Globe, Mail, CreditCard, Key, Users, RefreshCw,
  CheckCircle, AlertCircle, Eye, EyeOff, Loader2, Zap,
  Server, DollarSign, ShieldCheck, Wifi, Moon, Sun, Palette,
} from 'lucide-react';
import { adminPanelAPI as adminAPI } from '../../services/adminApi';
import { useDarkMode } from '../../hooks/useDarkMode';

// ── Helpers ──────────────────────────────────────────────────────────────────
const isSet = (v) => v && String(v).trim() !== '' && !String(v).includes('placeholder') && !String(v).includes('sandbox_');

function SecretInput({ label, value, onChange, placeholder, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
        {isSet(value)
          ? <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">● Set</span>
          : <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">○ Not set</span>}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pr-9 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none font-mono"
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, hint, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none" />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function ModeToggle({ value, onChange, options }) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            value === o.value
              ? o.active + ' shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SectionCard({ icon: Icon, color, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 ${color}`}>
        <Icon className="w-5 h-5" />
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Defaults (shown when DB has no saved value) ───────────────────────────────
const DEFAULTS = {
  general: {
    siteName: 'Sambid', siteUrl: 'https://sambid.co',
    supportEmail: 'support@sambid.co', trackBaseUrl: '',
  },
  email: {
    smtpHost: 'smtp.hostinger.com', smtpPort: '465', smtpSecure: 'true',
    smtpUser: '', smtpPass: '',
    emailNoreply: 'noreply@sambid.co', emailSupport: 'support@sambid.co', emailBilling: 'billing@sambid.co',
  },
  api: {
    openaiApiKey: '', geminiApiKey: '', samApiKey: '',
    samApiUrl: 'https://api.sam.gov/opportunities/v2/search',
    usaspendingApiUrl: 'https://api.usaspending.gov/api/v2',
  },
  payment: {
    stripeSecretKey: '', stripePublicKey: '',
    paypalClientId: '', paypalClientSecret: '', paypalMode: 'sandbox',
    payoneerApiBase: 'https://api.sandbox.payoneer.com',
    payoneerClientId: '', payoneerClientSecret: '', payoneerProgramId: '',
  },
  limits: {
    freePlanMaxSaved: 10, freePlanMaxAlerts: 5,
    starterPlanMaxSaved: 100, starterPlanMaxAlerts: 50,
    proPlanMaxSaved: -1, proPlanMaxAlerts: -1,
  },
};

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg, setMsg]           = useState(null); // { text, type }
  const [isDark, setIsDark]     = useDarkMode('adminTheme');

  useEffect(() => {
    adminAPI.getSettings()
      .then(r => { if (r.data.success) setSettings(s => ({ ...s, ...r.data.data })); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (group, key, val) =>
    setSettings(s => ({ ...s, [group]: { ...s[group], [key]: val } }));

  const g = (group) => settings[group] || {};

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await adminAPI.updateSettings(settings);
      if (res.data.success) setMsg({ text: res.data.message || 'Settings saved and applied.', type: 'success' });
      else setMsg({ text: res.data.message || 'Save failed.', type: 'error' });
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Failed to save settings.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">All changes apply instantly — no server restart needed.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-colors shadow-sm shrink-0 self-start sm:self-auto">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save All Settings</>}
        </button>
      </div>

      {/* Status message */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* ── 0. Appearance ───────────────────────────────────────────────── */}
      <SectionCard icon={Palette} color="bg-pink-50 text-pink-700" title="Appearance">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50">
              {isDark ? <Moon className="w-5 h-5 text-indigo-600" /> : <Sun className="w-5 h-5 text-indigo-600" />}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Admin Panel Dark Mode</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isDark ? 'Currently using dark theme' : 'Currently using light theme'} — applies only to the admin panel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDark(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${isDark ? 'bg-indigo-600' : 'bg-gray-300'}`}
            aria-label="Toggle admin panel dark mode"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <p className="text-xs text-gray-400">This preference is saved on this device and is independent of the user dashboard's appearance setting.</p>
      </SectionCard>

      {/* ── 1. General ──────────────────────────────────────────────────── */}
      <SectionCard icon={Globe} color="bg-indigo-50 text-indigo-700" title="General">
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Platform Name" value={g('general').siteName || ''} onChange={v => set('general','siteName',v)} placeholder="Sambid" />
          <TextInput label="Site / Frontend URL" value={g('general').siteUrl || ''} onChange={v => set('general','siteUrl',v)} placeholder="https://sambid.co" />
          <TextInput label="Support Email" value={g('general').supportEmail || ''} onChange={v => set('general','supportEmail',v)} placeholder="support@sambid.co" />
          <TextInput label="Track Base URL" value={g('general').trackBaseUrl || ''} onChange={v => set('general','trackBaseUrl',v)}
            placeholder="https://yourdomain.com (for email tracking pixel)" hint="Leave blank to use Site URL. Set to ngrok URL for local testing." />
        </div>
      </SectionCard>

      {/* ── 2. Email / SMTP ─────────────────────────────────────────────── */}
      <SectionCard icon={Mail} color="bg-blue-50 text-blue-700" title="Email / SMTP (Hostinger)">
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="SMTP Host" value={g('email').smtpHost || ''} onChange={v => set('email','smtpHost',v)} placeholder="smtp.hostinger.com" />
          <TextInput label="SMTP Port" value={g('email').smtpPort || ''} onChange={v => set('email','smtpPort',v)} placeholder="465" type="number" />
          <TextInput label="SMTP User (auth)" value={g('email').smtpUser || ''} onChange={v => set('email','smtpUser',v)} placeholder="zia@sambid.co" hint="Hostinger account used for SMTP authentication." />
          <SecretInput label="SMTP Password" value={g('email').smtpPass || ''} onChange={v => set('email','smtpPass',v)} placeholder="••••••••" />
          <div>
            <ModeToggle
              value={g('email').smtpSecure || 'true'}
              onChange={v => set('email','smtpSecure',v)}
              options={[
                { value: 'true',  label: '🔒 SSL/TLS (port 465)',  active: 'bg-white text-green-700' },
                { value: 'false', label: '⚡ STARTTLS (port 587)', active: 'bg-white text-amber-700' },
              ]}
            />
            <p className="text-xs text-gray-400 mt-1.5">Hostinger recommends SSL/TLS on port 465.</p>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Sender Addresses — all route through SMTP credentials above</p>
          <div className="grid grid-cols-3 gap-4">
            <TextInput label="System / No-Reply" value={g('email').emailNoreply || ''} onChange={v => set('email','emailNoreply',v)} placeholder="noreply@sambid.co" hint="Password resets, alerts, digests." />
            <TextInput label="Support" value={g('email').emailSupport || ''} onChange={v => set('email','emailSupport',v)} placeholder="support@sambid.co" hint="Tickets, suggestions, enterprise inquiries." />
            <TextInput label="Billing" value={g('email').emailBilling || ''} onChange={v => set('email','emailBilling',v)} placeholder="billing@sambid.co" hint="Payments, invoices, plan activations." />
          </div>
        </div>
      </SectionCard>

      {/* ── 3. AI (OpenAI + Gemini) ─────────────────────────────────────── */}
      <SectionCard icon={Zap} color="bg-violet-50 text-violet-700" title="AI — OpenAI / Gemini">
        <SecretInput label="OpenAI API Key"
          value={g('api').openaiApiKey || ''}
          onChange={v => set('api','openaiApiKey',v)}
          placeholder="sk-proj-..."
          hint="Used for proposal builder, RFP analyzer, bid analysis, etc. Models: gpt-4o / gpt-4o-mini." />
        <SecretInput label="Gemini API Key"
          value={g('api').geminiApiKey || ''}
          onChange={v => set('api','geminiApiKey',v)}
          placeholder="AIzaSy..."
          hint="Used for AI Website Finder (Google Search grounding). Get from aistudio.google.com → API Keys." />
      </SectionCard>

      {/* ── 4. SAM.gov ──────────────────────────────────────────────────── */}
      <SectionCard icon={Server} color="bg-emerald-50 text-emerald-700" title="SAM.gov">
        <div className="grid grid-cols-2 gap-4">
          <SecretInput label="SAM.gov API Key"
            value={g('api').samApiKey || ''}
            onChange={v => set('api','samApiKey',v)}
            placeholder="SAM-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            hint="Get from sam.gov → My Profile → Developer → API Keys" />
          <TextInput label="SAM.gov API URL" value={g('api').samApiUrl || ''} onChange={v => set('api','samApiUrl',v)}
            placeholder="https://api.sam.gov/opportunities/v2/search" />
          <div className="col-span-2">
            <TextInput label="USASpending API URL" value={g('api').usaspendingApiUrl || ''} onChange={v => set('api','usaspendingApiUrl',v)}
              placeholder="https://api.usaspending.gov/api/v2" hint="Used for winning bids / past awards data." />
          </div>
        </div>
      </SectionCard>

      {/* ── 5. Stripe ───────────────────────────────────────────────────── */}
      <SectionCard icon={CreditCard} color="bg-purple-50 text-purple-700" title="Stripe">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Keys starting with <code>sk_test_</code> / <code>pk_test_</code> = test mode. Use <code>sk_live_</code> / <code>pk_live_</code> for production.</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SecretInput label="Secret Key (sk_...)" value={g('payment').stripeSecretKey || ''} onChange={v => set('payment','stripeSecretKey',v)}
            placeholder="sk_test_..." hint="Never expose this key on the frontend." />
          <SecretInput label="Publishable Key (pk_...)" value={g('payment').stripePublicKey || ''} onChange={v => set('payment','stripePublicKey',v)}
            placeholder="pk_test_..." hint="Safe to use on frontend." />
        </div>
      </SectionCard>

      {/* ── 6. PayPal ───────────────────────────────────────────────────── */}
      <SectionCard icon={DollarSign} color="bg-sky-50 text-sky-700" title="PayPal">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600">Environment</p>
          <ModeToggle value={g('payment').paypalMode || 'sandbox'}
            onChange={v => set('payment','paypalMode',v)}
            options={[
              { value: 'sandbox', label: '🧪 Sandbox',  active: 'bg-white text-amber-700' },
              { value: 'live',    label: '🚀 Live',      active: 'bg-white text-green-700' },
            ]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SecretInput label="Client ID" value={g('payment').paypalClientId || ''} onChange={v => set('payment','paypalClientId',v)}
            placeholder="AQRef..." hint="From PayPal Developer → My Apps" />
          <SecretInput label="Client Secret" value={g('payment').paypalClientSecret || ''} onChange={v => set('payment','paypalClientSecret',v)}
            placeholder="ELjS..." />
        </div>
      </SectionCard>

      {/* ── 7. Payoneer ─────────────────────────────────────────────────── */}
      <SectionCard icon={ShieldCheck} color="bg-orange-50 text-orange-700" title="Payoneer">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <TextInput label="API Base URL" value={g('payment').payoneerApiBase || ''} onChange={v => set('payment','payoneerApiBase',v)}
              placeholder="https://api.sandbox.payoneer.com"
              hint="Sandbox: api.sandbox.payoneer.com — Live: api.payoneer.com" />
          </div>
          <SecretInput label="Client ID" value={g('payment').payoneerClientId || ''} onChange={v => set('payment','payoneerClientId',v)} placeholder="payoneer_client_id" />
          <SecretInput label="Client Secret" value={g('payment').payoneerClientSecret || ''} onChange={v => set('payment','payoneerClientSecret',v)} placeholder="payoneer_client_secret" />
          <TextInput label="Program ID" value={g('payment').payoneerProgramId || ''} onChange={v => set('payment','payoneerProgramId',v)} placeholder="payoneer_program_id" />
        </div>
      </SectionCard>

      {/* ── 8. Plan Limits ──────────────────────────────────────────────── */}
      <SectionCard icon={Users} color="bg-gray-50 text-gray-700" title="Plan Limits">
        <div className="grid grid-cols-3 gap-4">
          {[
            { plan: 'Free',    savedKey: 'freePlanMaxSaved',    alertKey: 'freePlanMaxAlerts'    },
            { plan: 'Starter', savedKey: 'starterPlanMaxSaved', alertKey: 'starterPlanMaxAlerts' },
            { plan: 'Pro',     savedKey: 'proPlanMaxSaved',     alertKey: 'proPlanMaxAlerts'     },
          ].map(({ plan, savedKey, alertKey }) => (
            <div key={plan} className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-600">{plan} Plan</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max Saved Opps</label>
                <input type="number" value={g('limits')[savedKey] ?? ''}
                  onChange={e => set('limits', savedKey, parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max Alerts</label>
                <input type="number" value={g('limits')[alertKey] ?? ''}
                  onChange={e => set('limits', alertKey, parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none" />
              </div>
              {plan === 'Pro' && <p className="text-[10px] text-gray-400">Use -1 for unlimited</p>}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Sticky save bar */}
      <div className="fixed bottom-6 right-8 z-20">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl shadow-xl disabled:opacity-60 transition-colors">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Settings</>}
        </button>
      </div>

    </div>
  );
}
