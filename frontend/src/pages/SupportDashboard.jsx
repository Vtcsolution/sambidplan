import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Headphones, Copy, CheckCheck, DollarSign, Users, TrendingUp,
  LogOut, Loader2, AlertCircle, CheckCircle, Clock,
  CreditCard, Building2, Star, ArrowUpRight, Wallet, Gift
} from 'lucide-react';
import adminApi from '../services/adminApi';

const PLAN_COLORS = {
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-800',
  free:       'bg-gray-100 text-gray-500',
};

const StatusBadge = ({ status }) => {
  const map = {
    rewarded:  'bg-green-100 text-green-700',
    converted: 'bg-blue-100 text-blue-700',
    registered:'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status === 'rewarded' ? 'Paid' : status === 'converted' ? 'Upgraded' : 'Signed Up'}
    </span>
  );
};

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
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.get('/support/stats');
      setData(res.data.data);
    } catch (err) {
      if (err.response?.status === 401) { navigate('/support/login'); return; }
      setError(err.response?.data?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawing(true);
    setWMsg({ text: '', type: '' });
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
    } finally {
      setWithdrawing(false);
    }
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
    referralLink, referralBalance, totalCommissionEarned, canWithdraw, minWithdrawal,
    totalSignups, convertedCount, totalWithdrawn, pendingAmount, referrals, recentWithdrawals,
  } = data;

  const toWithdraw = Math.max(0, minWithdrawal - referralBalance);
  const paidReferrals = (referrals || []).filter(r => r.status === 'rewarded');

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{adminName}</p>
              <p className="text-xs text-emerald-600 capitalize">{adminRole} Member</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/prospects" target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition">
              <Building2 className="w-3.5 h-3.5" /> Prospects
            </a>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── Referral Link ─────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-emerald-200" />
            <p className="text-sm font-semibold text-white">Your Referral Link</p>
          </div>
          <p className="text-xs text-emerald-200 mb-3">
            Companies signing up via your link get <strong>20% off</strong> their plan — you earn <strong>20% commission</strong> on every payment they make.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono truncate">
              {referralLink}
            </div>
            <button onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition">
              {copied
                ? <><CheckCheck className="w-4 h-4 text-emerald-600" /> Copied!</>
                : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <p className="text-xs text-emerald-200 mt-2">
            Referral Code: <span className="font-mono font-bold text-white">{data.referralCode}</span>
          </p>
        </div>

        {/* ── Earnings Summary ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">${(referralBalance || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Available Balance</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">${(totalCommissionEarned || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Earned</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{totalSignups || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Signups</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <Star className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{paidReferrals.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Paid Companies</p>
          </div>
        </div>

        {/* ── Withdrawal Card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Withdraw Earnings
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Minimum withdrawal: <strong>${minWithdrawal}</strong>
                {' · '}Available: <span className="font-semibold text-emerald-600">${(referralBalance || 0).toFixed(2)}</span>
                {pendingAmount > 0 && <span className="text-yellow-600"> · Pending: ${pendingAmount.toFixed(2)}</span>}
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
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700 text-center">
                Earn <strong>${toWithdraw.toFixed(2)}</strong> more to unlock withdrawal
                <div className="mt-1.5 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((referralBalance || 0) / minWithdrawal) * 100)}%` }}
                  />
                </div>
                <p className="text-xs mt-1 text-amber-600">${(referralBalance || 0).toFixed(2)} / ${minWithdrawal}</p>
              </div>
            )}
          </div>

          {wMsg.text && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-4 ${
              wMsg.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {wMsg.type === 'success'
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {wMsg.text}
            </div>
          )}

          {showWForm && (
            <form onSubmit={handleWithdraw} className="space-y-3 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (USD)</label>
                  <input
                    type="number" min={minWithdrawal} max={referralBalance} step="0.01"
                    value={wForm.amount}
                    onChange={e => setWForm(f => ({ ...f, amount: e.target.value }))}
                    required
                    placeholder={`Min $${minWithdrawal}`}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
                  <select
                    value={wForm.method}
                    onChange={e => setWForm(f => ({ ...f, method: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {wForm.method === 'paypal' ? 'PayPal Email' : wForm.method === 'bank_transfer' ? 'Bank Account / IBAN' : 'Mailing Address'}
                  </label>
                  <input
                    type="text"
                    value={wForm.paypalEmail}
                    onChange={e => setWForm(f => ({ ...f, paypalEmail: e.target.value }))}
                    required
                    placeholder={wForm.method === 'paypal' ? 'you@paypal.com' : 'Enter details'}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
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

          {/* Withdrawal history */}
          {recentWithdrawals?.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Withdrawal History</p>
              <div className="space-y-2">
                {recentWithdrawals.map(w => (
                  <div key={w._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">${w.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{w.method?.replace('_', ' ')} · {new Date(w.createdAt).toLocaleDateString()}</p>
                      </div>
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

        {/* ── Companies / Referrals Table ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-gray-900">
              Companies via Your Link
              <span className="ml-2 text-sm font-normal text-gray-400">({referrals?.length || 0} total)</span>
            </h2>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Paid commission</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Upgraded plan</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Signed up</span>
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
              <table className="w-full text-sm min-w-[540px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Purchased</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Commission</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount Paid</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(r => (
                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900">{r.user?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{r.user?.email || '—'}</p>
                      </td>
                      <td className="py-3 px-3">
                        {r.planPurchased ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[r.planPurchased] || PLAN_COLORS.free}`}>
                            {r.planPurchased}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not yet</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {r.commissionAmount > 0 ? (
                          <span className="font-bold text-emerald-600">${r.commissionAmount.toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {r.paidAmount > 0 ? (
                          <div>
                            <span className="text-gray-700 font-medium">${r.paidAmount.toFixed(2)}</span>
                            {r.discountAmount > 0 && (
                              <p className="text-xs text-emerald-600">saved ${r.discountAmount.toFixed(2)}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-400">
                        {r.user?.createdAt ? new Date(r.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary row */}
          {paidReferrals.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm flex-wrap gap-2">
              <p className="text-gray-500">
                <strong className="text-gray-900">{paidReferrals.length}</strong> paid {paidReferrals.length === 1 ? 'company' : 'companies'} · total commission:&nbsp;
                <strong className="text-emerald-600">${paidReferrals.reduce((s, r) => s + (r.commissionAmount || 0), 0).toFixed(2)}</strong>
              </p>
              {totalWithdrawn > 0 && (
                <p className="text-gray-400 text-xs">Total withdrawn: ${totalWithdrawn.toFixed(2)}</p>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
