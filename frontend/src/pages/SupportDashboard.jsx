import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Headphones, Copy, CheckCheck, DollarSign, Users, TrendingUp,
  LogOut, Loader2, AlertCircle, CheckCircle, Clock,
  CreditCard, Building2, Star, ArrowUpRight, Wallet, Gift,
  Trophy, Lock, Unlock, RefreshCw, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import adminApi from '../services/adminApi';

const PLAN_COLORS = {
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-800',
  free:       'bg-gray-100 text-gray-500',
};

const fmt = n => `$${(Number(n) || 0).toFixed(2)}`;

function StatusBadge({ status }) {
  const map = {
    first_purchased: 'bg-green-100 text-green-700',
    rewarded:        'bg-green-100 text-green-700',
    registered:      'bg-gray-100 text-gray-600',
  };
  const label = status === 'registered' ? 'Signed Up' : 'Purchased';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

function ReferralRow({ r }) {
  const [open, setOpen] = useState(false);
  const recurring = r.recurringCommissions || [];
  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50 transition">
        <td className="py-3 px-3">
          <p className="font-semibold text-gray-900">{r.user?.name || '—'}</p>
          <p className="text-xs text-gray-400">{r.user?.email || '—'}</p>
          {r.countsTowardTarget && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mt-0.5 inline-block">Counts to target</span>
          )}
        </td>
        <td className="py-3 px-3">
          {r.firstPurchasePlan ? (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[r.firstPurchasePlan] || PLAN_COLORS.free}`}>
              {r.firstPurchasePlan}
            </span>
          ) : <span className="text-xs text-gray-400">—</span>}
        </td>
        <td className="py-3 px-3">
          {r.firstCommission > 0
            ? <span className="font-bold text-emerald-600">{fmt(r.firstCommission)}</span>
            : <span className="text-xs text-gray-400">—</span>}
          <p className="text-xs text-gray-400">15% one-time</p>
        </td>
        <td className="py-3 px-3">
          {recurring.length > 0 ? (
            <div>
              <span className="font-bold text-violet-600">{fmt(r.totalRecurringEarned)}</span>
              <p className="text-xs text-gray-400">{recurring.length} renewals</p>
            </div>
          ) : <span className="text-xs text-gray-400">—</span>}
        </td>
        <td className="py-3 px-3">
          <StatusBadge status={r.status} />
        </td>
        <td className="py-3 px-3 text-xs text-gray-400">
          {r.user?.createdAt ? new Date(r.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </td>
        <td className="py-3 px-3">
          {recurring.length > 0 && (
            <button onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {open ? 'Hide' : 'Renewals'}
            </button>
          )}
        </td>
      </tr>
      {open && recurring.map((rc, i) => (
        <tr key={i} className="bg-violet-50 border-b border-violet-100 text-xs">
          <td colSpan={2} className="py-2 px-6 text-gray-500 italic">↳ Renewal #{i + 1}</td>
          <td className="py-2 px-3 text-gray-600 capitalize">{rc.plan}</td>
          <td className="py-2 px-3 font-semibold text-violet-700">{fmt(rc.commission)} (7.5%)</td>
          <td className="py-2 px-3 text-gray-500">paid: {fmt(rc.paidAmount)}</td>
          <td className="py-2 px-3 text-gray-400">{new Date(rc.earnedAt).toLocaleDateString()}</td>
          <td />
        </tr>
      ))}
    </>
  );
}

export default function SupportDashboard() {
  const navigate = useNavigate();
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [copied,      setCopied]      = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [wForm,       setWForm]       = useState({ amount: '', method: 'paypal', paypalEmail: '' });
  const [wMsg,        setWMsg]        = useState({ text: '', type: '' });
  const [showWForm,   setShowWForm]   = useState(false);

  const adminName = localStorage.getItem('adminName') || 'Support Member';
  const adminRole = localStorage.getItem('adminRole') || '';

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) { navigate('/support/login'); return; }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true); setError('');
    try {
      const res = await adminApi.get('/support/stats');
      setData(res.data.data);
    } catch (err) {
      if (err.response?.status === 401) { navigate('/support/login'); return; }
      setError(err.response?.data?.message || 'Failed to load stats');
    } finally { setLoading(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawing(true); setWMsg({ text: '', type: '' });
    try {
      await adminApi.post('/support/withdraw', {
        amount: parseFloat(wForm.amount),
        method: wForm.method,
        accountDetails: { email: wForm.paypalEmail },
      });
      setWMsg({ text: 'Withdrawal request submitted! Admin will process within 3–5 business days.', type: 'success' });
      setShowWForm(false);
      setWForm({ amount: '', method: 'paypal', paypalEmail: '' });
      fetchStats();
    } catch (err) {
      setWMsg({ text: err.response?.data?.message || 'Withdrawal failed.', type: 'error' });
    } finally { setWithdrawing(false); }
  };

  const handleLogout = () => {
    ['adminToken','adminName','adminEmail','adminRole'].forEach(k => localStorage.removeItem(k));
    navigate('/support/login');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-gray-700 mb-4">{error}</p>
        <button onClick={fetchStats} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">Retry</button>
      </div>
    </div>
  );

  const {
    referralLink, referralBalance, totalCommissionEarned,
    totalOneTimeEarned, totalRecurringEarned,
    canWithdraw, minWithdrawal,
    totalSignups, convertedCount, totalWithdrawn, pendingAmount,
    referrals, recentWithdrawals,
    proEnterpriseReferralCount, recurringUnlocked, targetGoal, targetProgress,
    firstPurchaseRate, recurringRate,
  } = data;

  const toWithdraw    = Math.max(0, minWithdrawal - referralBalance);
  const paidReferrals = (referrals || []).filter(r => r.status !== 'registered');

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Headphones className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{adminName}</p>
              <p className="text-xs text-emerald-600 capitalize">{adminRole} Member</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchStats}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── Referral Link ────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-emerald-200" />
            <p className="text-sm font-semibold">Your Referral Link</p>
          </div>
          <p className="text-xs text-emerald-200 mb-3">
            Companies signing up via your link get <strong>20% off</strong>.
            You earn <strong>15%</strong> on their first purchase — and <strong>7.5%</strong> on Pro/Enterprise renewals once you hit 100 Pro/Enterprise referrals.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono truncate">{referralLink}</div>
            <button onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition">
              {copied ? <><CheckCheck className="w-4 h-4 text-emerald-600" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <p className="text-xs text-emerald-200 mt-2">
            Code: <span className="font-mono font-bold text-white">{data.referralCode}</span>
          </p>
        </div>

        {/* ── Target Progress ───────────────────────────────────────────────── */}
        <div className={`rounded-2xl p-5 border-2 ${recurringUnlocked ? 'bg-gradient-to-r from-violet-600 to-indigo-600 border-transparent text-white' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-2">
              {recurringUnlocked
                ? <Unlock className="w-5 h-5 text-white" />
                : <Lock className="w-5 h-5 text-amber-500" />}
              <div>
                <p className={`font-bold text-base ${recurringUnlocked ? 'text-white' : 'text-gray-900'}`}>
                  {recurringUnlocked ? '🎉 Recurring Commissions UNLOCKED!' : 'Unlock Recurring Commissions'}
                </p>
                <p className={`text-xs ${recurringUnlocked ? 'text-violet-200' : 'text-gray-500'}`}>
                  {recurringUnlocked
                    ? 'You earn 7.5% every time your referred Pro/Enterprise companies renew'
                    : `Refer ${targetGoal} Pro or Enterprise companies to unlock 7.5% monthly recurring commissions`}
                </p>
              </div>
            </div>
            <div className={`text-center px-4 py-2 rounded-xl ${recurringUnlocked ? 'bg-white/20' : 'bg-gray-50'}`}>
              <p className={`text-2xl font-black ${recurringUnlocked ? 'text-white' : 'text-gray-900'}`}>
                {proEnterpriseReferralCount} <span className="text-sm font-semibold opacity-60">/ {targetGoal}</span>
              </p>
              <p className={`text-xs ${recurringUnlocked ? 'text-violet-200' : 'text-gray-500'}`}>Pro/Enterprise referrals</p>
            </div>
          </div>
          {!recurringUnlocked && (
            <>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${targetProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{proEnterpriseReferralCount} done</span>
                <span>{targetGoal - proEnterpriseReferralCount} to go</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Starter plan referrals do NOT count toward this target — only Pro and Enterprise purchases count.
              </p>
            </>
          )}
          {recurringUnlocked && (
            <div className="flex flex-wrap gap-3 mt-1">
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-lg font-black text-white">{fmt(totalRecurringEarned)}</p>
                <p className="text-xs text-violet-200">Total Recurring Earned</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-lg font-black text-white">{(recurringRate * 100).toFixed(1)}%</p>
                <p className="text-xs text-violet-200">Per Renewal Rate</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Earnings Summary ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Wallet,    label: 'Available Balance',   value: fmt(referralBalance),          color: 'bg-emerald-100 text-emerald-600' },
            { icon: TrendingUp,label: 'Total Earned',         value: fmt(totalCommissionEarned),    color: 'bg-blue-100 text-blue-600' },
            { icon: Star,      label: 'One-Time (15%)',       value: fmt(totalOneTimeEarned),       color: 'bg-amber-100 text-amber-600' },
            { icon: Trophy,    label: 'Recurring (7.5%)',     value: fmt(totalRecurringEarned),     color: 'bg-violet-100 text-violet-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Signups row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: 'Total Signups',    value: totalSignups   || 0, color: 'bg-purple-100 text-purple-600' },
            { icon: CheckCircle, label: 'Purchased',   value: convertedCount || 0, color: 'bg-green-100 text-green-600' },
            { icon: Building2, label: 'Pro/Enterprise', value: proEnterpriseReferralCount || 0, color: 'bg-indigo-100 text-indigo-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Withdrawal Card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Withdraw Earnings
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Minimum <strong>${minWithdrawal}</strong>
                {' · '}Available: <span className="font-semibold text-emerald-600">{fmt(referralBalance)}</span>
                {pendingAmount > 0 && <span className="text-yellow-600"> · Pending: {fmt(pendingAmount)}</span>}
              </p>
            </div>

            {canWithdraw ? (
              !showWForm && (
                <button onClick={() => setShowWForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                  <ArrowUpRight className="w-4 h-4" /> Request Withdrawal
                </button>
              )
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700 text-center min-w-[180px]">
                Earn <strong>{fmt(toWithdraw)}</strong> more to unlock withdrawal
                <div className="mt-1.5 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((referralBalance || 0) / minWithdrawal) * 100)}%` }} />
                </div>
                <p className="text-xs mt-1 text-amber-600">{fmt(referralBalance)} / ${minWithdrawal}</p>
              </div>
            )}
          </div>

          {wMsg.text && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-4 ${
              wMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {wMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {wMsg.text}
            </div>
          )}

          {showWForm && (
            <form onSubmit={handleWithdraw} className="space-y-3 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (USD)</label>
                  <input type="number" min={minWithdrawal} max={referralBalance} step="0.01"
                    value={wForm.amount} onChange={e => setWForm(f => ({ ...f, amount: e.target.value }))}
                    required placeholder={`Min $${minWithdrawal}`}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
                  <select value={wForm.method} onChange={e => setWForm(f => ({ ...f, method: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="paypal">PayPal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">PayPal Email</label>
                  <input type="email" value={wForm.paypalEmail}
                    onChange={e => setWForm(f => ({ ...f, paypalEmail: e.target.value }))}
                    required placeholder="you@paypal.com"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={withdrawing}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-60">
                  {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Submit Request
                </button>
                <button type="button" onClick={() => setShowWForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {recentWithdrawals?.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Withdrawal History</p>
              <div className="space-y-2">
                {recentWithdrawals.map(w => (
                  <div key={w._id} className={`rounded-xl px-3 py-3 border ${
                    w.status === 'paid'     ? 'bg-green-50 border-green-100'   :
                    w.status === 'approved' ? 'bg-blue-50 border-blue-100'     :
                    w.status === 'rejected' ? 'bg-red-50 border-red-100'       :
                    'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{fmt(w.amount)}</p>
                          <p className="text-xs text-gray-500 capitalize">{(w.method || '').replace(/_/g, ' ')} · {new Date(w.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        w.status === 'paid'     ? 'bg-green-100 text-green-700'  :
                        w.status === 'approved' ? 'bg-blue-100 text-blue-700'    :
                        w.status === 'rejected' ? 'bg-red-100 text-red-600'      :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{w.status}</span>
                    </div>
                    {/* Payment proof visible to support person */}
                    {(w.adminNote || w.paymentId || w.proofScreenshotUrl) && (
                      <div className="mt-2 ml-5 space-y-1">
                        {w.adminNote && (
                          <p className="text-xs text-gray-500 italic">Note: "{w.adminNote}"</p>
                        )}
                        {w.paymentId && (
                          <p className="text-xs text-gray-700">
                            Transaction ID: <span className="font-mono font-semibold text-gray-900">{w.paymentId}</span>
                          </p>
                        )}
                        {w.proofScreenshotUrl && (
                          <a href={w.proofScreenshotUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:underline font-medium">
                            <ExternalLink className="w-3 h-3" /> View Payment Proof
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Companies Table ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-gray-900">
              Companies via Your Link
              <span className="ml-2 text-sm font-normal text-gray-400">({referrals?.length || 0} total)</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Counts to target</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" /> Has recurring</span>
            </div>
          </div>

          {!referrals?.length ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">No companies yet</p>
              <p className="text-gray-400 text-xs mt-1">Share your referral link above to start earning commissions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Company', 'First Plan', '15% One-Time', '7.5% Recurring', 'Status', 'Joined', ''].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(r => <ReferralRow key={r._id} r={r} />)}
                </tbody>
              </table>
            </div>
          )}

          {paidReferrals.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm flex-wrap gap-2">
              <p className="text-gray-500">
                <strong className="text-gray-900">{paidReferrals.length}</strong> purchased · one-time: <strong className="text-emerald-600">{fmt(totalOneTimeEarned)}</strong>
                {totalRecurringEarned > 0 && <> · recurring: <strong className="text-violet-600">{fmt(totalRecurringEarned)}</strong></>}
              </p>
              {totalWithdrawn > 0 && <p className="text-gray-400 text-xs">Withdrawn: {fmt(totalWithdrawn)}</p>}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
