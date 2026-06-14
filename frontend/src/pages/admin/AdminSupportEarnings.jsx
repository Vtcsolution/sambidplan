import { useState, useEffect } from 'react';
import {
  Copy, CheckCheck, DollarSign, Users, TrendingUp, Loader2,
  AlertCircle, CheckCircle, Clock, CreditCard, Star, ArrowUpRight, Wallet, Gift, ExternalLink,
} from 'lucide-react';
import { supportAPI } from '../../services/adminApi';

const PLAN_COLORS = {
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-800',
  free:       'bg-gray-100 text-gray-500',
};

const StatusBadge = ({ status }) => {
  const map = {
    rewarded:   'bg-green-100 text-green-700',
    converted:  'bg-blue-100 text-blue-700',
    registered: 'bg-gray-100 text-gray-600',
  };
  const label = status === 'rewarded' ? 'Paid' : status === 'converted' ? 'Upgraded' : 'Signed Up';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
};

export default function AdminSupportEarnings() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [copied,      setCopied]      = useState(false);
  const [showWForm,   setShowWForm]   = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [wForm,       setWForm]       = useState({ amount: '', method: 'paypal', account: '' });
  const [wMsg,        setWMsg]        = useState({ text: '', type: '' });

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await supportAPI.getStats();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load earnings data.');
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
      await supportAPI.withdraw({
        amount: parseFloat(wForm.amount),
        method: wForm.method,
        accountDetails: { email: wForm.account },
      });
      setWMsg({ text: 'Withdrawal request submitted! Admin will process within 3–5 business days.', type: 'success' });
      setShowWForm(false);
      setWForm({ amount: '', method: 'paypal', account: '' });
      fetchStats();
    } catch (err) {
      setWMsg({ text: err.response?.data?.message || 'Withdrawal failed.', type: 'error' });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-gray-600">{error}</p>
      <button onClick={fetchStats} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Retry</button>
    </div>
  );

  const {
    referralLink, referralBalance, totalCommissionEarned, canWithdraw, minWithdrawal,
    totalSignups, convertedCount, totalWithdrawn, pendingAmount, referrals, recentWithdrawals,
  } = data;

  const paidReferrals = (referrals || []).filter(r => r.status === 'rewarded');
  const toWithdraw    = Math.max(0, minWithdrawal - referralBalance);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referral Earnings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Track your referral commissions and request withdrawals.</p>
      </div>

      {/* ── Referral Link ──────────────────────────────────────────────── */}
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
          <div className="flex-1 bg-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono truncate">
            {referralLink}
          </div>
          <button onClick={copyLink}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition">
            {copied ? <><CheckCheck className="w-4 h-4 text-green-600" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
          </button>
        </div>
        <p className="text-xs text-indigo-200 mt-2">
          Code: <span className="font-mono font-bold text-white">{data.referralCode}</span>
        </p>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Available Balance',   value: `$${(referralBalance || 0).toFixed(2)}`,       icon: Wallet,    color: 'bg-emerald-100 text-emerald-600' },
          { label: 'Total Earned',         value: `$${(totalCommissionEarned || 0).toFixed(2)}`, icon: TrendingUp, color: 'bg-blue-100 text-blue-600' },
          { label: 'Total Signups',        value: totalSignups || 0,                             icon: Users,     color: 'bg-purple-100 text-purple-600' },
          { label: 'Paid Companies',       value: paidReferrals.length,                          icon: Star,      color: 'bg-amber-100 text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Withdrawal ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Withdraw Earnings
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Minimum <strong>${minWithdrawal}</strong> to withdraw
              {' · '}Balance: <span className="font-semibold text-emerald-600">${(referralBalance || 0).toFixed(2)}</span>
              {pendingAmount > 0 && <span className="text-yellow-600"> · Pending: ${pendingAmount.toFixed(2)}</span>}
            </p>
          </div>

          {canWithdraw && !showWForm && (
            <button onClick={() => setShowWForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
              <ArrowUpRight className="w-4 h-4" /> Request Withdrawal
            </button>
          )}

          {!canWithdraw && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700 min-w-[180px]">
              Earn <strong>${toWithdraw.toFixed(2)}</strong> more to unlock
              <div className="mt-1.5 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((referralBalance || 0) / minWithdrawal) * 100)}%` }} />
              </div>
              <p className="text-xs text-amber-500 mt-1">${(referralBalance || 0).toFixed(2)} / ${minWithdrawal}</p>
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
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
                <select value={wForm.method} onChange={e => setWForm(f => ({ ...f, method: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option value="paypal">PayPal</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {wForm.method === 'paypal' ? 'PayPal Email' : wForm.method === 'bank_transfer' ? 'Bank / IBAN' : 'Mailing Address'}
                </label>
                <input type="text" value={wForm.account}
                  onChange={e => setWForm(f => ({ ...f, account: e.target.value }))}
                  required placeholder={wForm.method === 'paypal' ? 'you@paypal.com' : 'Enter details'}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Withdrawal History</p>
            <div className="space-y-2">
              {recentWithdrawals.map(w => (
                <div key={w._id} className={`rounded-xl px-4 py-3 border ${
                  w.status === 'paid'     ? 'bg-green-50 border-green-100'  :
                  w.status === 'rejected' ? 'bg-red-50 border-red-100'      :
                  w.status === 'approved' ? 'bg-blue-50 border-blue-100'    :
                  'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">${w.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 capitalize">{(w.method || '').replace(/_/g, ' ')} · {new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        {w.adminNote && <p className="text-xs text-gray-400 mt-0.5 italic">"{w.adminNote}"</p>}

                        {/* Payment proof — shown only when paid */}
                        {w.status === 'paid' && (
                          <div className="mt-2 space-y-1">
                            {w.paymentId && (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                                <span className="text-xs text-gray-600">Txn: <span className="font-mono font-semibold text-gray-800">{w.paymentId}</span></span>
                              </div>
                            )}
                            {w.proofScreenshotUrl && (
                              <a href={w.proofScreenshotUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium">
                                <ExternalLink className="w-3 h-3" /> View payment screenshot
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      w.status === 'paid'     ? 'bg-green-100 text-green-700'  :
                      w.status === 'approved' ? 'bg-blue-100 text-blue-700'    :
                      w.status === 'rejected' ? 'bg-red-100 text-red-600'      :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{w.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Companies Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Companies via Your Link
          <span className="ml-2 text-sm font-normal text-gray-400">({referrals?.length || 0})</span>
        </h2>

        {!referrals?.length ? (
          <div className="text-center py-10">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No companies yet. Share your referral link to start earning.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Company', 'Plan Purchased', 'Commission', 'Amount Paid', 'Status', 'Joined'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
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
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[r.planPurchased] || PLAN_COLORS.free}`}>
                          {r.planPurchased}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-3">
                      {r.commissionAmount > 0
                        ? <span className="font-bold text-emerald-600">${r.commissionAmount.toFixed(2)}</span>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-3">
                      {r.paidAmount > 0 ? (
                        <div>
                          <span className="font-medium text-gray-700">${r.paidAmount.toFixed(2)}</span>
                          {r.discountAmount > 0 && <p className="text-xs text-emerald-600">saved ${r.discountAmount.toFixed(2)}</p>}
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
                    <td className="py-3 px-3 text-xs text-gray-400">
                      {r.user?.createdAt ? new Date(r.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {paidReferrals.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm flex-wrap gap-2">
            <p className="text-gray-500">
              <strong className="text-gray-900">{paidReferrals.length}</strong> paid {paidReferrals.length === 1 ? 'company' : 'companies'}
              {' · '}Total commission: <strong className="text-emerald-600">${paidReferrals.reduce((s, r) => s + (r.commissionAmount || 0), 0).toFixed(2)}</strong>
            </p>
            {totalWithdrawn > 0 && <p className="text-xs text-gray-400">Total withdrawn: ${totalWithdrawn.toFixed(2)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
