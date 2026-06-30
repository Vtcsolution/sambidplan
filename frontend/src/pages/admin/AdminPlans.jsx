import { useState, useEffect, useCallback } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import {
  Layers, Edit2, ToggleLeft, ToggleRight, RefreshCw, Save, X,
  CheckCircle, XCircle, DollarSign, TrendingDown, AlertCircle, Plus, Trash2, Sparkles, FileText,
} from 'lucide-react';
import { adminPanelAPI } from '../../services/adminApi';
import { invalidatePlanCache } from '../../hooks/usePlans';

const PLAN_COLORS = {
  free:       'bg-gray-100 text-gray-600',
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-indigo-100 text-indigo-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const BADGE_COLORS = {
  free:       'border-gray-200 text-gray-500',
  starter:    'border-blue-200 text-blue-600',
  pro:        'border-indigo-200 text-indigo-600',
  enterprise: 'border-purple-200 text-purple-600',
};

function fmt(n) {
  if (n === 0) return 'Free';
  return `$${Number(n).toLocaleString()}`;
}

function savingsPct(monthly, yearly) {
  const annualAtMonthly = monthly * 12;
  if (!annualAtMonthly) return null;
  const pct = Math.round(((annualAtMonthly - yearly) / annualAtMonthly) * 100);
  return pct > 0 ? pct : null;
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState({
    displayName:          plan.displayName || '',
    description:          plan.description || '',
    priceMonthly:         plan.priceMonthly ?? 0,
    priceYearly:          plan.priceYearly  ?? 0,
    aiCreditsPerMonth:    plan.aiCreditsPerMonth ?? 0,
    opportunitiesPerMonth: plan.opportunitiesPerMonth ?? 0,
    dailyLimit:           plan.dailyLimit ?? 0,
    order:                plan.order        ?? 0,
    features: (plan.features || []).map(f => ({ name: f.name, included: f.included })),
    limits: {
      maxSavedOpportunities: plan.limits?.maxSavedOpportunities ?? 10,
      maxAlerts:             plan.limits?.maxAlerts             ?? 5,
      aiProposals:           plan.limits?.aiProposals           ?? false,
      prioritySupport:       plan.limits?.prioritySupport       ?? false,
      apiAccess:             plan.limits?.apiAccess             ?? false,
    },
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const addFeature = () =>
    setForm(f => ({ ...f, features: [...f.features, { name: '', included: true }] }));

  const removeFeature = (i) =>
    setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));

  const updateFeatureName = (i, val) =>
    setForm(f => {
      const features = [...f.features];
      features[i] = { ...features[i], name: val };
      return { ...f, features };
    });

  const toggleFeature = (i) =>
    setForm(f => {
      const features = [...f.features];
      features[i] = { ...features[i], included: !features[i].included };
      return { ...f, features };
    });

  const set = (field) => (e) =>
    setForm(f => ({ ...f, [field]: ['priceMonthly', 'priceYearly', 'order', 'aiCreditsPerMonth', 'opportunitiesPerMonth', 'dailyLimit'].includes(field)
      ? Number(e.target.value)
      : e.target.value }));

  const setLimit = (field) => (e) =>
    setForm(f => ({
      ...f,
      limits: {
        ...f.limits,
        [field]: e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value),
      },
    }));

  const pct = savingsPct(form.priceMonthly, form.priceYearly);
  const annualIfMonthly = form.priceMonthly * 12;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await adminPanelAPI.updatePlan(plan._id, form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Plan</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${PLAN_COLORS[plan.name] || 'bg-gray-100 text-gray-600'}`}>
              {plan.name}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Pricing section */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Pricing</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Price ($)</label>
                <input
                  type="number" min="0" step="1"
                  value={form.priceMonthly}
                  onChange={set('priceMonthly')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {form.priceMonthly > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">${form.priceMonthly * 12}/yr if no discount</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Yearly Price ($)</label>
                <input
                  type="number" min="0" step="1"
                  value={form.priceYearly}
                  onChange={set('priceYearly')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {pct !== null && (
                  <p className="text-xs text-green-600 mt-0.5 font-semibold">Save {pct}% vs monthly</p>
                )}
              </div>
            </div>

            {form.priceMonthly > 0 && form.priceYearly > 0 && (
              <div className="bg-white rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-gray-400">Monthly rate</p>
                  <p className="font-bold text-gray-800">${form.priceMonthly}/mo</p>
                </div>
                <div>
                  <p className="text-gray-400">Yearly total</p>
                  <p className="font-bold text-indigo-700">${form.priceYearly}/yr</p>
                </div>
                <div>
                  <p className="text-gray-400">Customer saves</p>
                  <p className="font-bold text-green-600">${annualIfMonthly - form.priceYearly}/yr</p>
                </div>
              </div>
            )}
          </div>

          {/* Plan Limits */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Plan Limits</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly AI Credits</label>
                <input
                  type="number" min="0" step="1"
                  value={form.aiCreditsPerMonth}
                  onChange={set('aiCreditsPerMonth')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.aiCreditsPerMonth > 0 ? `~${Math.floor(form.aiCreditsPerMonth / 15)} AI calls/month` : 'No AI access'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Opportunities</label>
                <input
                  type="number" min="0" step="1"
                  value={form.opportunitiesPerMonth}
                  onChange={set('opportunitiesPerMonth')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.opportunitiesPerMonth > 0 ? `${form.opportunitiesPerMonth} contracts/month` : 'Unlimited'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Daily Limit (Trial / Free only)</label>
                <input
                  type="number" min="0" step="1"
                  value={form.dailyLimit}
                  onChange={set('dailyLimit')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.dailyLimit > 0 ? `${form.dailyLimit} matches/day — only applies to the "free" plan (covers Trial + Free)` : 'Not applicable'}
                </p>
              </div>
            </div>
          </div>

          {/* Display info */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Display Info</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
              <input
                value={form.displayName} onChange={set('displayName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                value={form.description} onChange={set('description')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
              <input
                type="number" min="0"
                value={form.order} onChange={set('order')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Features (shown on pricing page)</p>
              <button
                type="button"
                onClick={addFeature}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Feature
              </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {form.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFeature(i)}
                    title={feature.included ? 'Included — click to exclude' : 'Excluded — click to include'}
                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${
                      feature.included
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-gray-300 text-gray-300'
                    }`}
                  >
                    {feature.included ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  </button>
                  <input
                    value={feature.name}
                    onChange={e => updateFeatureName(i, e.target.value)}
                    placeholder="Feature description…"
                    className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(i)}
                    className="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {form.features.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No features yet — click "Add Feature" to add one.</p>
              )}
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Plan Limits</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Saved Opps (-1 = unlimited)</label>
                <input
                  type="number" min="-1"
                  value={form.limits.maxSavedOpportunities}
                  onChange={setLimit('maxSavedOpportunities')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Alerts (-1 = unlimited)</label>
                <input
                  type="number" min="-1"
                  value={form.limits.maxAlerts}
                  onChange={setLimit('maxAlerts')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {[
                { field: 'aiProposals',     label: 'AI Proposals' },
                { field: 'prioritySupport', label: 'Priority Support' },
                { field: 'apiAccess',       label: 'API Access' },
              ].map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.limits[field]}
                    onChange={setLimit(field)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Plan Modal ─────────────────────────────────────────────────────────
function CreateModal({ onClose, onSaved }) {
  const EMPTY = {
    name: '', displayName: '', description: '',
    priceMonthly: 0, priceYearly: 0, order: 0,
    features: [],
    limits: { maxSavedOpportunities: 10, maxAlerts: 5, aiProposals: false, prioritySupport: false, apiAccess: false },
  };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (field) => (e) =>
    setForm(f => ({ ...f, [field]: ['priceMonthly','priceYearly','order'].includes(field) ? Number(e.target.value) : e.target.value }));

  const setLimit = (field) => (e) =>
    setForm(f => ({ ...f, limits: { ...f.limits, [field]: e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value) } }));

  const addFeature    = () => setForm(f => ({ ...f, features: [...f.features, { name: '', included: true }] }));
  const removeFeature = (i) => setForm(f => ({ ...f, features: f.features.filter((_,idx) => idx !== i) }));
  const updateFName   = (i, val) => setForm(f => { const features = [...f.features]; features[i] = { ...features[i], name: val }; return { ...f, features }; });
  const toggleF       = (i) => setForm(f => { const features = [...f.features]; features[i] = { ...features[i], included: !features[i].included }; return { ...f, features }; });

  const handleSave = async () => {
    if (!form.name.trim())        return setError('Plan ID (name) is required.');
    if (!form.displayName.trim()) return setError('Display name is required.');
    if (!/^[a-z0-9_-]+$/.test(form.name.trim())) return setError('Plan ID must be lowercase letters, numbers, hyphens or underscores only.');
    setSaving(true); setError('');
    try {
      await adminPanelAPI.createPlan({ ...form, name: form.name.trim().toLowerCase() });
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create plan.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create New Plan</h2>
            <p className="text-xs text-gray-400 mt-0.5">This plan will appear on the public pricing page once active.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Identity */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Plan Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan ID <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={set('name')}
                  placeholder="e.g. growth"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                <p className="text-xs text-gray-400 mt-0.5">Lowercase, no spaces</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display Name <span className="text-red-500">*</span></label>
                <input value={form.displayName} onChange={set('displayName')}
                  placeholder="e.g. Growth"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input value={form.description} onChange={set('description')}
                placeholder="e.g. For mid-size contractors"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
              <input type="number" min="0" value={form.order} onChange={set('order')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-gray-400 mt-0.5">Lower = appears first (Free=1, Starter=2, Pro=3, Enterprise=4)</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Pricing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Price ($)</label>
                <input type="number" min="0" value={form.priceMonthly} onChange={set('priceMonthly')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Yearly Price ($)</label>
                <input type="number" min="0" value={form.priceYearly} onChange={set('priceYearly')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                {form.priceMonthly > 0 && form.priceYearly > 0 && (
                  <p className="text-xs text-green-600 mt-0.5 font-semibold">
                    Save {Math.round(((form.priceMonthly * 12 - form.priceYearly) / (form.priceMonthly * 12)) * 100)}% vs monthly
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Features</p>
              <button type="button" onClick={addFeature} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Feature
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {form.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => toggleF(i)}
                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${feature.included ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-300'}`}>
                    {feature.included ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  </button>
                  <input value={feature.name} onChange={e => updateFName(i, e.target.value)}
                    placeholder="Feature description…"
                    className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                  <button type="button" onClick={() => removeFeature(i)} className="shrink-0 p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {form.features.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">Click "Add Feature" to add plan highlights.</p>
              )}
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Plan Limits</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Saved Opps (-1 = unlimited)</label>
                <input type="number" min="-1" value={form.limits.maxSavedOpportunities} onChange={setLimit('maxSavedOpportunities')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Alerts (-1 = unlimited)</label>
                <input type="number" min="-1" value={form.limits.maxAlerts} onChange={setLimit('maxAlerts')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {[{ field: 'aiProposals', label: 'AI Proposals' }, { field: 'prioritySupport', label: 'Priority Support' }, { field: 'apiAccess', label: 'API Access' }].map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.limits[field]} onChange={setLimit(field)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Creating…' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPlans() {
  const [plans,    setPlans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [editPlan, setEditPlan] = useState(null);
  const [toast,    setToast]    = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminPanelAPI.getPlans();
      setPlans(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleToggle = async (plan) => {
    try {
      await adminPanelAPI.togglePlanStatus(plan._id);
      showToast(`${plan.displayName} ${plan.isActive ? 'deactivated' : 'activated'}.`);
      loadPlans();
    } catch {
      showToast('Failed to toggle plan status.');
    }
  };

  const handleSaved = () => {
    showToast('Plan updated successfully.');
    invalidatePlanCache();
    loadPlans();
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Plan Pricing<AdminHowItWorks page="plans" /></h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage subscription plans, monthly and yearly pricing, and plan limits.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button onClick={loadPlans} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Plus className="w-4 h-4" />
            Create Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Plans grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full mb-4" />
              <div className="h-10 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(plan => {
            const pct = savingsPct(plan.priceMonthly, plan.priceYearly);
            const annualIfMonthly = plan.priceMonthly * 12;

            return (
              <div key={plan._id}
                className={`bg-white rounded-2xl border-2 shadow-sm flex flex-col transition-all ${plan.isActive ? 'border-gray-100 hover:border-indigo-200 hover:shadow-md' : 'border-gray-100 opacity-60'}`}
              >
                {/* Top badge */}
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${PLAN_COLORS[plan.name] || 'bg-gray-100 text-gray-600'}`}>
                      {plan.name}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${plan.isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{plan.displayName}</h3>
                  <p className="text-gray-400 text-xs mt-0.5">{plan.description}</p>
                </div>

                {/* Pricing */}
                <div className="px-5 pb-4 space-y-2.5 flex-1">
                  {/* Monthly */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">Monthly</span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm">
                      {plan.priceMonthly === 0 ? 'Free' : `$${plan.priceMonthly}/mo`}
                    </span>
                  </div>

                  {/* Yearly */}
                  <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-3 py-2.5 relative">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-medium text-indigo-700">Yearly</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-indigo-700 text-sm">
                        {plan.priceYearly === 0 ? 'Free' : `$${plan.priceYearly}/yr`}
                      </span>
                      {plan.priceYearly > 0 && (
                        <p className="text-indigo-400 text-xs">~${Math.round(plan.priceYearly / 12)}/mo</p>
                      )}
                    </div>
                  </div>

                  {/* Savings */}
                  {pct !== null && (
                    <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-1.5 text-center">
                      <p className="text-xs text-green-700 font-semibold">
                        Save {pct}% yearly — customer saves ${annualIfMonthly - plan.priceYearly}/yr
                      </p>
                    </div>
                  )}

                  {/* Opportunities */}
                  <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700">Opportunities</span>
                    </div>
                    <span className="font-bold text-emerald-700 text-sm">
                      {(plan.opportunitiesPerMonth || 0) > 0 ? `${plan.opportunitiesPerMonth}/mo` : 'Unlimited'}
                    </span>
                  </div>

                  {/* AI Credits */}
                  <div className="flex items-center justify-between bg-violet-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                      <span className="text-xs font-medium text-violet-700">AI Credits</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-violet-700 text-sm">{plan.aiCreditsPerMonth || 0}/mo</span>
                      {(plan.aiCreditsPerMonth || 0) > 0 && <p className="text-violet-400 text-xs">~{Math.floor(plan.aiCreditsPerMonth / 15)} calls</p>}
                    </div>
                  </div>

                  {/* Limits summary */}
                  <div className="pt-1 space-y-1">
                    <p className="text-xs text-gray-400 font-medium">Limits</p>
                    <div className="flex flex-wrap gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${BADGE_COLORS[plan.name] || 'border-gray-200 text-gray-500'}`}>
                        {plan.limits?.maxSavedOpportunities === -1 ? '∞' : plan.limits?.maxSavedOpportunities} saved
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${BADGE_COLORS[plan.name] || 'border-gray-200 text-gray-500'}`}>
                        {plan.limits?.maxAlerts === -1 ? '∞' : plan.limits?.maxAlerts} alerts
                      </span>
                      {plan.limits?.aiProposals && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-purple-200 text-purple-600">AI</span>
                      )}
                      {plan.limits?.apiAccess && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-teal-200 text-teal-600">API</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-2">
                  <button
                    onClick={() => setEditPlan(plan)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Pricing
                  </button>
                  <button
                    onClick={() => handleToggle(plan)}
                    title={plan.isActive ? 'Deactivate' : 'Activate'}
                    className={`p-2 rounded-lg border transition ${plan.isActive
                      ? 'border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                      : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {plan.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pricing summary table */}
      {!loading && plans.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Pricing Summary</h2>
            <p className="text-xs text-gray-400 mt-0.5">Quick overview of all plan prices. Click "Edit Pricing" on any card above to modify.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">Plan</th>
                  <th className="px-6 py-3 text-right">Monthly</th>
                  <th className="px-6 py-3 text-right">Yearly Total</th>
                  <th className="px-6 py-3 text-right">Monthly Equiv.</th>
                  <th className="px-6 py-3 text-right">Discount</th>
                  <th className="px-6 py-3 text-right">Customer Saves</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plans.map(plan => {
                  const pct = savingsPct(plan.priceMonthly, plan.priceYearly);
                  const saves = plan.priceMonthly * 12 - plan.priceYearly;
                  return (
                    <tr key={plan._id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${plan.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="font-semibold text-gray-800">{plan.displayName}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${PLAN_COLORS[plan.name] || 'bg-gray-100 text-gray-500'}`}>{plan.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-800">
                        {plan.priceMonthly === 0 ? '—' : `$${plan.priceMonthly}/mo`}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-indigo-700">
                        {plan.priceYearly === 0 ? '—' : `$${plan.priceYearly}/yr`}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-500">
                        {plan.priceYearly > 0 ? `~$${Math.round(plan.priceYearly / 12)}/mo` : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {pct ? (
                          <span className="text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full">{pct}% off</span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {saves > 0 ? <span className="text-green-700 font-medium">${saves}/yr</span> : '—'}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {plan.isActive
                          ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Active</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Inactive</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editPlan && (
        <EditModal
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onSaved={handleSaved}
        />
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            showToast('New plan created successfully.');
            loadPlans();
          }}
        />
      )}
    </div>
  );
}
