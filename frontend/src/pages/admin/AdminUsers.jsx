import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, RefreshCw, ChevronDown, ChevronUp,
  Shield, Crown, Zap, Sparkles, User, Mail, Calendar,
  Activity, DollarSign, Bookmark, CheckCircle, XCircle,
  Clock, Edit3, X, Loader2, AlertTriangle, TrendingUp
} from 'lucide-react';
import { adminPanelAPI } from '../../services/adminApi';

// ── Plan badge ────────────────────────────────────────────────────────────────
const PLAN_STYLES = {
  enterprise: { bg: 'bg-amber-100  text-amber-800',  icon: Crown    },
  pro:        { bg: 'bg-indigo-100 text-indigo-800', icon: Sparkles },
  starter:    { bg: 'bg-blue-100   text-blue-800',   icon: Zap      },
  trial:      { bg: 'bg-green-100  text-green-800',  icon: Activity },
  free:       { bg: 'bg-gray-100   text-gray-600',   icon: User     },
  expired:    { bg: 'bg-red-100    text-red-700',    icon: XCircle  },
};

function PlanBadge({ plan }) {
  const s = PLAN_STYLES[plan] || PLAN_STYLES.free;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg}`}>
      <Icon className="w-3 h-3" />{plan?.charAt(0).toUpperCase() + plan?.slice(1) || 'Free'}
    </span>
  );
}

// ── Days-left chip ────────────────────────────────────────────────────────────
function DaysChip({ days, plan }) {
  if (plan === 'free' || days === null) return <span className="text-gray-400 text-xs">—</span>;
  if (days < 0)  return <span className="text-xs text-red-600 font-semibold">Expired</span>;
  if (days <= 7) return <span className="text-xs text-orange-600 font-semibold">{days}d left</span>;
  return <span className="text-xs text-gray-500">{days}d left</span>;
}

// ── Inline plan-change form ───────────────────────────────────────────────────
function PlanEditor({ user, onSave, onCancel }) {
  const [plan, setPlan] = useState(user.plan || 'free');
  const [expires, setExpires] = useState(
    user.planExpiresAt ? new Date(user.planExpiresAt).toISOString().split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await adminPanelAPI.updateUserPlan(user._id, { plan, expiresAt: expires || null });
      onSave(plan, expires);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
      <select value={plan} onChange={e => setPlan(e.target.value)}
        className="text-sm border border-indigo-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none">
        {['free','trial','starter','pro','enterprise','expired'].map(p => (
          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
        ))}
      </select>
      {['starter','pro','enterprise'].includes(plan) && (
        <input type="date" value={expires} onChange={e => setExpires(e.target.value)}
          className="text-sm border border-indigo-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          placeholder="Expires" />
      )}
      <button onClick={submit} disabled={saving}
        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        Save
      </button>
      <button onClick={onCancel} className="px-2 py-1.5 text-gray-500 hover:text-gray-700 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Expanded user detail row ──────────────────────────────────────────────────
function UserDetail({ userId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminPanelAPI.getUserById(userId)
      .then(r => { if (r.data.success) setData(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="p-6 flex justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
    </div>
  );
  if (!data) return <p className="p-4 text-sm text-gray-400">Could not load details.</p>;

  return (
    <div className="px-6 pb-5 pt-2 bg-gray-50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* Usage stats */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Usage</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Matches this month</span><span className="font-medium">{data.monthlyMatchesUsed ?? 0}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">AI generations (mo)</span><span className="font-medium">{data.monthlyAIGenerationsUsed ?? 0}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Saved opportunities</span><span className="font-medium">{data.savedCount ?? 0}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">NAICS codes</span><span className="font-medium">{(data.naicsCodes || []).length}</span></div>
        </div>
        {(data.naicsCodes || []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {(data.naicsCodes || []).map(c => (
              <span key={c} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded font-mono">{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* Billing summary */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Billing</p>
        <div className="space-y-2 text-sm mb-3">
          <div className="flex justify-between"><span className="text-gray-500">Total spend</span><span className="font-semibold text-green-600">${(data.totalSpend || 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Invoices</span><span className="font-medium">{(data.invoices || []).length}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Referral balance</span><span className="font-medium">${(data.referralBalance || 0).toFixed(2)}</span></div>
        </div>
        {(data.invoices || []).slice(0, 3).map(inv => (
          <div key={inv._id} className="flex justify-between items-center text-xs py-1 border-t border-gray-50">
            <span className={`px-1.5 rounded ${inv.status === 'paid' ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-50'}`}>{inv.status}</span>
            <span className="text-gray-600">{inv.plan}</span>
            <span className="font-medium">${(inv.amount || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Account info */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Account</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Email verified</span>
            {data.isEmailVerified
              ? <CheckCircle className="w-4 h-4 text-green-500" />
              : <XCircle className="w-4 h-4 text-red-400" />}
          </div>
          <div className="flex justify-between"><span className="text-gray-500">Alerts enabled</span>
            {data.emailAlertsEnabled
              ? <CheckCircle className="w-4 h-4 text-green-500" />
              : <XCircle className="w-4 h-4 text-red-400" />}
          </div>
          <div className="flex justify-between"><span className="text-gray-500">Onboarded</span>
            {data.onboardingCompleted
              ? <CheckCircle className="w-4 h-4 text-green-500" />
              : <XCircle className="w-4 h-4 text-gray-300" />}
          </div>
          <div className="flex justify-between"><span className="text-gray-500">Business type</span><span className="font-medium capitalize">{data.businessType || '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Referral code</span><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{data.referralCode || '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Joined</span><span className="text-xs">{data.createdAt ? new Date(data.createdAt).toLocaleDateString() : '—'}</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const PLANS = ['all','free','trial','starter','pro','enterprise','expired'];

export default function AdminUsers() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [sortKey,  setSortKey]  = useState('createdAt');
  const [sortDir,  setSortDir]  = useState('desc');
  const [expanded, setExpanded] = useState(null);
  const [editing,  setEditing]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminPanelAPI.getAllUsers();
      if (r.data.success) setUsers(r.data.data);
    } catch (e) {
      console.error('Load users error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handlePlanSave = (userId, newPlan, newExpires) => {
    setUsers(prev => prev.map(u => u._id === userId
      ? { ...u, plan: newPlan, planExpiresAt: newExpires || null, daysLeft: newExpires ? Math.ceil((new Date(newExpires) - new Date()) / 86400000) : null }
      : u
    ));
    setEditing(null);
  };

  // Filter + sort
  const filtered = users
    .filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.businessName?.toLowerCase().includes(q);
      const matchPlan = planFilter === 'all' || u.plan === planFilter;
      return matchSearch && matchPlan;
    })
    .sort((a, b) => {
      let aV = a[sortKey], bV = b[sortKey];
      if (sortKey === 'createdAt' || sortKey === 'planExpiresAt') {
        aV = aV ? new Date(aV).getTime() : 0;
        bV = bV ? new Date(bV).getTime() : 0;
      }
      if (aV == null) aV = '';
      if (bV == null) bV = '';
      if (aV < bV) return sortDir === 'asc' ? -1 : 1;
      if (aV > bV) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)
    : <ChevronDown className="w-3.5 h-3.5 text-gray-300" />;

  // Plan distribution summary
  const planCounts = PLANS.slice(1).reduce((acc, p) => ({ ...acc, [p]: users.filter(u => u.plan === p).length }), {});

  return (
    <div className="space-y-6">
      <div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" />
              All Users
            </h1>
            <p className="text-sm text-gray-500 mt-1">{users.length} total users registered</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm transition-colors shrink-0 self-start sm:self-auto">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Plan distribution chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(planCounts).map(([p, count]) => (
            count > 0 && (
              <button key={p} onClick={() => setPlanFilter(planFilter === p ? 'all' : p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${planFilter === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}`}>
                <PlanBadge plan={p} />
                <span>{count}</span>
              </button>
            )
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or company…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {PLANS.map(p => <option key={p} value={p}>{p === 'all' ? 'All Plans' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No users match your search.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      { key: 'name',           label: 'User'          },
                      { key: 'plan',           label: 'Plan'          },
                      { key: 'planExpiresAt',  label: 'Expires'       },
                      { key: 'monthlyMatchesUsed', label: 'Matches/mo' },
                      { key: 'createdAt',      label: 'Joined'        },
                    ].map(col => (
                      <th key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap">
                        <span className="flex items-center gap-1">{col.label}<SortIcon k={col.key} /></span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <>
                      <tr key={user._id}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${expanded === user._id ? 'bg-indigo-50/30' : ''}`}>

                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <span className="text-indigo-700 text-xs font-bold">{(user.name || user.email || '?')[0].toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-[160px]">{user.name || '—'}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[160px]">{user.email}</p>
                              {user.businessName && <p className="text-xs text-indigo-500 truncate max-w-[160px]">{user.businessName}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="px-4 py-3">
                          {editing === user._id ? (
                            <PlanEditor user={user}
                              onSave={(p, e) => handlePlanSave(user._id, p, e)}
                              onCancel={() => setEditing(null)} />
                          ) : (
                            <PlanBadge plan={user.plan} />
                          )}
                        </td>

                        {/* Expires */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <DaysChip days={user.daysLeft} plan={user.plan} />
                        </td>

                        {/* Matches */}
                        <td className="px-4 py-3 text-gray-600 text-center">
                          {user.monthlyMatchesUsed ?? 0}
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditing(editing === user._id ? null : user._id)}
                              title="Change plan"
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setExpanded(expanded === user._id ? null : user._id)}
                              title="View details"
                              className={`p-1.5 rounded-lg transition-colors ${expanded === user._id ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                              {expanded === user._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expanded === user._id && (
                        <tr key={`${user._id}-detail`}>
                          <td colSpan={6} className="p-0">
                            <UserDetail userId={user._id} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
              <p className="text-xs text-gray-400">Showing {filtered.length} of {users.length} users</p>
              <p className="text-xs text-gray-400">Click any row's <span className="font-medium">↓</span> to expand full profile</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
