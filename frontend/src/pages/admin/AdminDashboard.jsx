// frontend/src/pages/admin/AdminDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, TrendingUp, Clock, CreditCard, FileText, DollarSign,
  Eye, RefreshCw, Bookmark, BookmarkCheck, Database,
  Activity, Download, CheckCircle, AlertCircle, Loader2, Zap,
  Wallet, Copy, CheckCheck, Gift, Star, ArrowUpRight, CreditCard as CardIcon
} from 'lucide-react';
import { adminPanelAPI as adminAPI, supportAPI } from '../../services/adminApi';

const StatCard = ({ title, value, sub, icon: Icon, color, border }) => (
  <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 border-l-4 ${border}`}>
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
      </div>
      <div className={`${color} p-2.5 sm:p-3 rounded-xl shrink-0`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
    </div>
  </div>
);

const Badge = ({ status }) => {
  const map = {
    paid:      'bg-green-100 text-green-700',
    pending:   'bg-yellow-100 text-yellow-700',
    expired:   'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
    refunded:  'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const fmtTime = (date) => {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleString();
};

const timeSince = (date) => {
  if (!date) return null;
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

// ── Support Member Dashboard ──────────────────────────────────────────────────
const PLAN_COLORS = {
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-800',
  free:       'bg-gray-100 text-gray-500',
};

function SupportDashboard() {
  const adminName = localStorage.getItem('adminName') || 'Support Member';
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await supportAPI.getStats();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-gray-600 text-sm">{error}</p>
      <button onClick={fetchStats} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Retry</button>
    </div>
  );

  const {
    referralLink, referralCode, referralBalance, totalCommissionEarned,
    totalSignups, minWithdrawal, canWithdraw, referrals = [], recentWithdrawals = [],
  } = data;

  const paidRefs     = referrals.filter(r => r.status === 'rewarded');
  const pendingRefs  = referrals.filter(r => r.status !== 'rewarded');

  return (
    <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Welcome back, {adminName} — here's your referral overview.</p>
          </div>
          <button onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm shrink-0 self-start sm:self-auto">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Referral link banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-indigo-200" />
            <p className="text-sm font-semibold">Your Referral Link</p>
          </div>
          <p className="text-xs text-indigo-200 mb-3">
            Companies who sign up via your link get <strong>20% off</strong> their plan.
            You earn <strong>20% commission</strong> on every payment they make.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono truncate">{referralLink}</div>
            <button onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition">
              {copied ? <><CheckCheck className="w-4 h-4 text-green-600" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <p className="text-xs text-indigo-200 mt-2">
            Code: <span className="font-mono font-bold text-white">{referralCode}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Available Balance',  value: `$${(referralBalance || 0).toFixed(2)}`,       icon: Wallet,    border: 'border-emerald-500', iconBg: 'bg-emerald-500', sub: canWithdraw ? 'Ready to withdraw' : `$${Math.max(0, minWithdrawal - referralBalance).toFixed(2)} more to unlock` },
            { label: 'Total Earned',        value: `$${(totalCommissionEarned || 0).toFixed(2)}`, icon: TrendingUp, border: 'border-blue-500',    iconBg: 'bg-blue-500',    sub: 'All-time commissions' },
            { label: 'Total Signups',       value: totalSignups || 0,                             icon: Users,     border: 'border-purple-500',  iconBg: 'bg-purple-500',  sub: 'Via your referral link' },
            { label: 'Paying Companies',    value: paidRefs.length,                               icon: Star,      border: 'border-amber-500',   iconBg: 'bg-amber-500',   sub: `${pendingRefs.length} signed up, not yet paid` },
          ].map(({ label, value, icon: Icon, border, iconBg, sub }) => (
            <div key={label} className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 border-l-4 ${border}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
                  {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
                </div>
                <div className={`${iconBg} p-2.5 sm:p-3 rounded-xl shrink-0`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/admin/my-earnings"
            className="flex items-center gap-4 bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-indigo-300 hover:shadow-md transition group">
            <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition">
              <Wallet className="w-5 h-5 text-indigo-600 group-hover:text-white transition" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">Referral Earnings</p>
              <p className="text-xs text-gray-500">Full stats, withdrawal history &amp; request payout</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 ml-auto shrink-0 transition" />
          </Link>

          <div className={`flex items-center gap-4 bg-white rounded-xl shadow-sm p-5 border ${canWithdraw ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100'}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${canWithdraw ? 'bg-emerald-500' : 'bg-gray-100'}`}>
              <CardIcon className={`w-5 h-5 ${canWithdraw ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{canWithdraw ? 'Withdrawal Available!' : 'Keep earning…'}</p>
              {canWithdraw
                ? <p className="text-xs text-emerald-700">Balance <strong>${(referralBalance || 0).toFixed(2)}</strong> — go to Referral Earnings to request</p>
                : (
                  <div className="mt-1">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden w-full max-w-[180px]">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, ((referralBalance || 0) / minWithdrawal) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">${(referralBalance || 0).toFixed(2)} / ${minWithdrawal} minimum</p>
                  </div>
                )
              }
            </div>
          </div>
        </div>

        {/* Referred companies table */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Referred Companies
              <span className="ml-2 text-sm font-normal text-gray-400">({referrals.length})</span>
            </h2>
            {referrals.length > 5 && (
              <Link to="/admin/my-earnings" className="text-sm text-indigo-600 hover:underline">View all</Link>
            )}
          </div>

          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">No companies yet</p>
              <p className="text-gray-400 text-xs mt-1">Share your referral link to start earning commissions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    {['Company', 'Plan', 'Amount Paid', 'Your Commission', 'Status', 'Joined'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {referrals.slice(0, 10).map(r => (
                    <tr key={r._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{r.user?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{r.user?.email || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {r.planPurchased
                          ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[r.planPurchased] || PLAN_COLORS.free}`}>{r.planPurchased}</span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.paidAmount > 0
                          ? <div>
                              <span className="font-medium text-gray-700">${r.paidAmount.toFixed(2)}</span>
                              {r.discountAmount > 0 && <p className="text-xs text-emerald-600">saved ${r.discountAmount.toFixed(2)}</p>}
                            </div>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.commissionAmount > 0
                          ? <span className="font-bold text-emerald-600">${r.commissionAmount.toFixed(2)}</span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.status === 'rewarded'   ? 'bg-green-100 text-green-700'  :
                          r.status === 'converted'  ? 'bg-blue-100 text-blue-700'    :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {r.status === 'rewarded' ? 'Paid' : r.status === 'converted' ? 'Upgraded' : 'Signed Up'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {r.user?.createdAt ? new Date(r.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {paidRefs.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm flex-wrap gap-2">
              <p className="text-gray-500">
                <strong className="text-gray-900">{paidRefs.length}</strong> paying {paidRefs.length === 1 ? 'company' : 'companies'}
                {' · '}Total commission: <strong className="text-emerald-600">${paidRefs.reduce((s, r) => s + (r.commissionAmount || 0), 0).toFixed(2)}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Recent withdrawal history (if any) */}
        {recentWithdrawals.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Withdrawals</h2>
            <div className="space-y-2">
              {recentWithdrawals.slice(0, 5).map(w => (
                <div key={w._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">${w.amount.toFixed(2)} via {w.method?.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400">{new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    w.status === 'paid'     ? 'bg-green-100 text-green-700'  :
                    w.status === 'approved' ? 'bg-blue-100 text-blue-700'    :
                    w.status === 'rejected' ? 'bg-red-100 text-red-600'      :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{w.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

    </div>
  );
}

// ── Admin / Super Admin Dashboard ─────────────────────────────────────────────
function AdminMainDashboard() {
  const adminRole = localStorage.getItem('adminRole') || '';
  const isSuperAdmin = adminRole === 'super_admin';

  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [activityFeed, setActivityFeed]     = useState([]);
  const [fetching, setFetching]     = useState(false);
  const [fetchMsg, setFetchMsg]     = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    loadAll();
    // Auto-refresh stats every 30 seconds to reflect live fetch progress
    pollRef.current = setInterval(() => loadStats(), 30000);
    return () => clearInterval(pollRef.current);
  }, []);

  const loadStats = async () => {
    try {
      const r = await adminAPI.getStats();
      if (r.data.success) {
        setStats(r.data.data);
        if (r.data.data.recentInvoices) setRecentInvoices(r.data.data.recentInvoices);
      }
    } catch {}
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await loadStats();
      const [reqRes, actRes] = await Promise.all([
        adminAPI.getPlanRequests({ status: 'all', limit: 5 }),
        adminAPI.getRecentActivity(),
      ]);
      if (reqRes.data.success)  setRecentRequests(reqRes.data.data);
      if (actRes.data.success)  setActivityFeed(actRes.data.data.slice(0, 6));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerFetch = async () => {
    setFetching(true);
    setFetchMsg('');
    try {
      const r = await adminAPI.triggerFetch();
      setFetchMsg(r.data.message || 'Fetch started');
      // Refresh stats after 5 seconds to pick up new counts
      setTimeout(() => loadStats(), 5000);
    } catch (err) {
      setFetchMsg(err.response?.data?.message || 'Failed to trigger fetch');
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const sf = stats?.samFetch || {};

  return (
    <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1 truncate">
              Auto-refreshes every 30s &nbsp;·&nbsp; Last loaded: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={loadAll}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* ── Row 1: Core KPIs ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Users"        value={stats?.totalUsers || 0}                    sub={`${stats?.trialUsers || 0} on trial`}            icon={Users}         color="bg-blue-500"   border="border-blue-500" />
          <StatCard title="Pending Requests"   value={stats?.pendingRequests || 0}               sub={stats?.pendingRequests > 0 ? 'Action needed' : 'All clear'} icon={Clock} color="bg-yellow-500" border="border-yellow-500" />
          {isSuperAdmin ? (
            <StatCard title="Revenue (30 days)"  value={`$${(stats?.monthlyRevenue || 0).toLocaleString()}`} sub={`All-time: $${(stats?.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} color="bg-green-500" border="border-green-500" />
          ) : (
            <StatCard title="Active Plans"  value={(stats?.starterUsers || 0) + (stats?.proUsers || 0) + (stats?.enterpriseUsers || 0)} sub="Paid subscribers" icon={DollarSign} color="bg-green-500" border="border-green-500" />
          )}
          <StatCard title="Pro + Enterprise"   value={(stats?.proUsers || 0) + (stats?.enterpriseUsers || 0)} sub={`${stats?.starterUsers || 0} Starter, ${stats?.freeUsers || 0} Free`} icon={TrendingUp} color="bg-purple-500" border="border-purple-500" />
        </div>

        {/* ── Row 2: Saved Opps + Opportunity Store ──────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Saved Opps (Lifetime)" value={(stats?.totalSavedLifetime || 0).toLocaleString()} sub="All users, all time"        icon={Bookmark}      color="bg-emerald-500" border="border-emerald-500" />
          <StatCard title="Saved Opps (Today)"    value={stats?.dailySaved || 0}                           sub="Saved since midnight"      icon={BookmarkCheck} color="bg-teal-500"    border="border-teal-500" />
          <StatCard title="Master Opp Store"      value={(stats?.masterOpportunityCount || 0).toLocaleString()} sub={`${stats?.todayFetchedCount || 0} fetched today`} icon={Database} color="bg-indigo-500" border="border-indigo-500" />
          <StatCard title="User Opp Feeds"        value={(stats?.userOpportunityCount || 0).toLocaleString()}   sub="Total assignments"         icon={Activity}      color="bg-pink-500"    border="border-pink-500" />
        </div>

        {/* ── SAM.gov Fetch Control ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">SAM.gov Auto-Fetch</h2>
              {sf.isFetching && (
                <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" /> Fetching…
                </span>
              )}
            </div>
            <button
              onClick={handleTriggerFetch}
              disabled={fetching || sf.isFetching}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {fetching ? 'Starting…' : 'Fetch Now'}
            </button>
          </div>

          {fetchMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
              fetchMsg.toLowerCase().includes('fail') || fetchMsg.toLowerCase().includes('error')
                ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {fetchMsg.toLowerCase().includes('fail') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              {fetchMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs font-medium uppercase mb-1">Last Master Fetch</p>
              <p className="font-semibold text-gray-800">{timeSince(sf.lastFetchAt) || 'Never'}</p>
              <p className="text-gray-400 text-xs mt-0.5">{fmtTime(sf.lastFetchAt)}</p>
              <p className="text-indigo-600 font-medium mt-1">{sf.lastFetchCount || 0} records processed</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs font-medium uppercase mb-1">Last User Distribution</p>
              <p className="font-semibold text-gray-800">{timeSince(sf.lastDistributionAt) || 'Never'}</p>
              <p className="text-gray-400 text-xs mt-0.5">{fmtTime(sf.lastDistributionAt)}</p>
              <p className="text-emerald-600 font-medium mt-1">{sf.lastDistributionCount || 0} new assignments</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs font-medium uppercase mb-1">Fetch Schedule</p>
              <ul className="space-y-1 text-gray-600 text-xs mt-1">
                <li>🕕 <strong>6 AM daily</strong> — full fetch + distribute</li>
                <li>🔄 <strong>Every 30 min</strong> — master store refresh</li>
                <li>⏰ <strong>Every hour</strong> — user distribution</li>
                <li>🌙 <strong>Midnight</strong> — daily counter reset</li>
              </ul>
              <p className="text-gray-400 text-xs mt-2">Total runs this session: {sf.totalFetchRuns || 0}</p>
            </div>
          </div>
        </div>

        {/* ── Row 3: Plan Distribution + Recent Requests ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Plan Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h2>
            {[
              { label: 'Trial',      value: stats?.trialUsers || 0,      color: 'bg-gray-400' },
              { label: 'Free',       value: stats?.freeUsers || 0,       color: 'bg-gray-500' },
              { label: 'Starter',    value: stats?.starterUsers || 0,    color: 'bg-blue-500' },
              { label: 'Pro',        value: stats?.proUsers || 0,        color: 'bg-purple-500' },
              { label: 'Enterprise', value: stats?.enterpriseUsers || 0, color: 'bg-amber-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`${color} h-2 rounded-full transition-all`}
                    style={{ width: `${((value) / Math.max(stats?.totalUsers || 1, 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Recent Plan Requests */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Plan Requests</h2>
              <Link to="/admin/plan-requests" className="text-sm text-indigo-600 hover:underline">View all</Link>
            </div>
            {recentRequests.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm">No recent requests</p>
            ) : (
              <div className="space-y-3">
                {recentRequests.map(r => (
                  <div key={r._id} className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{r.userName}</p>
                      <p className="text-xs text-gray-500 truncate">{r.userEmail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        r.status === 'pending'   ? 'bg-yellow-100 text-yellow-700' :
                        r.status === 'approved'  ? 'bg-blue-100 text-blue-700' :
                        r.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>{r.status}</span>
                      <p className="text-xs text-gray-400 mt-1 capitalize">{r.requestedPlan}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Invoices — super_admin only ───────────────────────────── */}
        {isSuperAdmin && <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
            <Link to="/admin/invoices" className="text-sm text-indigo-600 hover:underline">View all</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No invoices yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Invoice #', 'User', 'Plan', 'Amount', 'Status', 'Date', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentInvoices.map(inv => (
                    <tr key={inv._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{inv.user?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-400">{inv.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 capitalize font-medium text-purple-600">{inv.plan}</td>
                      <td className="px-4 py-3 font-semibold">${inv.amount}</td>
                      <td className="px-4 py-3"><Badge status={inv.status} /></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Link to="/admin/invoices" className="text-indigo-500 hover:text-indigo-700">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>}

        {/* ── Recent Activity ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {activityFeed.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activityFeed.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    a.type === 'payment'     ? 'bg-green-500' :
                    a.type === 'user_signup' ? 'bg-blue-500'  : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500 truncate">{a.message}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {timeSince(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { to: '/admin/plan-requests?status=pending', icon: Clock,     label: 'Pending',      sub: `${stats?.pendingRequests || 0} requests`, bg: 'bg-yellow-50 hover:bg-yellow-100', txt: 'text-yellow-700', itxt: 'text-yellow-600' },
              { to: '/admin/users',                        icon: Users,     label: 'Users',         sub: 'Manage all',    bg: 'bg-blue-50 hover:bg-blue-100',    txt: 'text-blue-700',   itxt: 'text-blue-600' },
              { to: '/admin/invoices',                     icon: CreditCard,label: 'Invoices',      sub: 'View all',      bg: 'bg-green-50 hover:bg-green-100',  txt: 'text-green-700',  itxt: 'text-green-600' },
              { to: '/admin/opportunities',                icon: Database,  label: 'Opportunities', sub: `${(stats?.masterOpportunityCount || 0).toLocaleString()} in store`, bg: 'bg-indigo-50 hover:bg-indigo-100', txt: 'text-indigo-700', itxt: 'text-indigo-600' },
            ].map(({ to, icon: Icon, label, sub, bg, txt, itxt }) => (
              <Link key={to} to={to} className={`flex items-center gap-3 p-3 ${bg} rounded-lg transition-colors`}>
                <Icon className={`w-5 h-5 ${itxt}`} />
                <div>
                  <p className={`font-medium text-sm ${txt}`}>{label}</p>
                  <p className={`text-xs ${itxt}`}>{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

    </div>
  );
}

export default function AdminDashboard() {
  const adminRole = localStorage.getItem('adminRole') || '';
  return adminRole === 'support' ? <SupportDashboard /> : <AdminMainDashboard />;
}
