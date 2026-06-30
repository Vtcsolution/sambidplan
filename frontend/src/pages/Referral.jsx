import { useState, useEffect } from 'react';
import {
  Copy, CheckCircle, Users, DollarSign, Gift, ArrowDownCircle,
  Clock, AlertCircle, TrendingUp, Link2, Banknote, Wallet
} from 'lucide-react';
import { referralAPI } from '../services/referralApi';
import HowItWorks from '../components/HowItWorks';

const PLAN_COLORS = {
  starter: 'bg-blue-100 text-blue-700',
  pro:     'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
  free:    'bg-gray-100 text-gray-600',
  trial:   'bg-green-100 text-green-700',
};

const STATUS_COLORS = {
  registered: 'bg-gray-100 text-gray-600',
  converted:  'bg-blue-100 text-blue-700',
  rewarded:   'bg-green-100 text-green-700',
};

export default function ReferralPage() {
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing]   = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    method: 'paypal',
    accountDetails: { paypalEmail: '', accountName: '', accountNumber: '', bankName: '', routingNumber: '' },
  });
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await referralAPI.getStats();
      setStats(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(stats.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawing(true);
    setMsg(null);
    try {
      const res = await referralAPI.withdraw({
        amount: parseFloat(withdrawForm.amount),
        method: withdrawForm.method,
        accountDetails: withdrawForm.accountDetails,
      });
      setMsg({ type: 'success', text: res.data.message });
      setShowWithdraw(false);
      fetchStats();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Withdrawal request failed.' });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!stats) return null;

  const paidLeft = Math.max(0, stats.minPaidReferrals - stats.paidReferralCount);

  return (
    <div className="min-h-screen bg-gray-50">
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" /> Referral Program
          <HowItWorks title="Referral Program" steps={[
            { title: 'Share your referral link', description: 'Copy your unique link and share with other businesses who could benefit from SamBid' },
            { title: 'They sign up & upgrade', description: 'When someone uses your link and purchases a paid plan, you earn a commission' },
            { title: 'Earn commissions', description: 'Starter: $10, Pro: $20, Enterprise: $60 per referral. Earnings accumulate in your balance' },
            { title: 'Withdraw earnings', description: 'Request withdrawal via PayPal, bank transfer, or Payoneer when your balance is sufficient' },
          ]} dataUsed={['Your Referral Link', 'Referral History']} >
            <p className="text-sm font-semibold text-gray-700 mt-2">Connected to:</p>
            <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
              <li><strong>Billing</strong> → referral earnings can offset your plan costs</li>
              <li><strong>Notifications</strong> → get notified when someone uses your link and converts</li>
            </ul>
          </HowItWorks>
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">
          Earn commissions when friends purchase a plan — Starter: 20%, Pro: 20%, Enterprise: 15%.
        </p>
      </div>

      {/* Message */}
      {msg && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Wallet className="w-5 h-5 text-green-600" />} label="Available Balance" value={`$${stats.referralBalance.toFixed(2)}`} bg="bg-green-50" />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-indigo-600" />} label="Total Earned" value={`$${stats.totalReferralEarnings.toFixed(2)}`} bg="bg-indigo-50" />
        <StatCard icon={<Users className="w-5 h-5 text-blue-600" />} label="Paid Referrals" value={stats.paidReferralCount} bg="bg-blue-50" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-amber-600" />} label="Total Referrals" value={stats.referrals.length} bg="bg-amber-50" />
      </div>

      {/* Referral Link */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4" /> Your Referral Link
        </h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-600 truncate">
            {stats.referralLink}
          </div>
          <button
            onClick={copyLink}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
              copied ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {copied ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Code: <span className="font-mono font-semibold text-gray-600">{stats.referralCode}</span>
        </p>
      </div>

      {/* Withdrawal Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Banknote className="w-4 h-4" /> Withdraw Earnings
          </h2>
          {stats.canWithdraw && (
            <button
              onClick={() => { setShowWithdraw(!showWithdraw); setMsg(null); }}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
              Request Withdrawal
            </button>
          )}
        </div>

        {/* Withdrawal requirements */}
        {!stats.canWithdraw && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Withdrawal not yet available</p>
              <ul className="text-xs text-amber-700 mt-1 space-y-1">
                {paidLeft > 0 && (
                  <li>• {paidLeft} more paid referral{paidLeft > 1 ? 's' : ''} needed (min {stats.minPaidReferrals})</li>
                )}
                {stats.referralBalance < stats.minWithdrawalAmount && (
                  <li>• Minimum balance of ${stats.minWithdrawalAmount} required (you have ${stats.referralBalance.toFixed(2)})</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Withdrawal form */}
        {showWithdraw && stats.canWithdraw && (
          <form onSubmit={handleWithdraw} className="mt-4 space-y-4 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
                <input
                  type="number"
                  min={stats.minWithdrawalAmount}
                  max={stats.referralBalance}
                  step="0.01"
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={`Max $${stats.referralBalance.toFixed(2)}`}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
                <select
                  value={withdrawForm.method}
                  onChange={e => setWithdrawForm(f => ({ ...f, method: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="paypal">PayPal</option>
                  <option value="bank_transfer">Bank Transfer (ACH)</option>
                  <option value="check">Check</option>
                </select>
              </div>
            </div>

            {withdrawForm.method === 'paypal' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">PayPal Email</label>
                <input
                  type="email"
                  required
                  value={withdrawForm.accountDetails.paypalEmail}
                  onChange={e => setWithdrawForm(f => ({ ...f, accountDetails: { ...f.accountDetails, paypalEmail: e.target.value } }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="your@paypal.com"
                />
              </div>
            )}

            {withdrawForm.method === 'bank_transfer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[['accountName','Account Name'],['bankName','Bank Name'],['accountNumber','Account Number'],['routingNumber','Routing Number']].map(([k,l]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                    <input
                      required
                      value={withdrawForm.accountDetails[k]}
                      onChange={e => setWithdrawForm(f => ({ ...f, accountDetails: { ...f.accountDetails, [k]: e.target.value } }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={withdrawing}
                className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60">
                {withdrawing ? 'Submitting...' : 'Submit Request'}
              </button>
              <button type="button" onClick={() => setShowWithdraw(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Recent withdrawals */}
        {stats.recentWithdrawals.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent Withdrawals</p>
            {stats.recentWithdrawals.map(w => (
              <div key={w._id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">${w.amount.toFixed(2)}</span>
                  <span className="text-gray-500 capitalize">{w.method.replace('_',' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    w.status === 'paid' ? 'bg-green-100 text-green-700' :
                    w.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                    w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{w.status}</span>
                  <span className="text-xs text-gray-400">{new Date(w.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referrals List */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Your Referrals ({stats.referrals.length})
        </h2>
        {stats.referrals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No referrals yet. Share your link to start earning!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="pb-2 text-left">User</th>
                  <th className="pb-2 text-left">Joined</th>
                  <th className="pb-2 text-left">Plan</th>
                  <th className="pb-2 text-left">Status</th>
                  <th className="pb-2 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.referrals.map(r => (
                  <tr key={r._id}>
                    <td className="py-2.5">
                      <p className="font-medium text-gray-800">{r.referee?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{r.referee?.email}</p>
                    </td>
                    <td className="py-2.5 text-gray-500 text-xs">
                      {r.referee?.createdAt ? new Date(r.referee.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_COLORS[r.referee?.plan] || 'bg-gray-100 text-gray-600'}`}>
                        {r.referee?.plan || '—'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-green-700">
                      {r.commissionAmount > 0 ? `+$${r.commissionAmount.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-indigo-800 mb-3">How It Works</h2>
        <ol className="space-y-2 text-sm text-indigo-700">
          <li className="flex items-start gap-2"><span className="font-bold shrink-0">1.</span> Share your referral link with other businesses.</li>
          <li className="flex items-start gap-2"><span className="font-bold shrink-0">2.</span> When they sign up and purchase a plan, you earn a commission automatically.</li>
          <li className="flex items-start gap-2"><span className="font-bold shrink-0">3.</span> <strong>Starter &amp; Pro:</strong> 20% commission · <strong>Enterprise:</strong> 15% commission.</li>
          <li className="flex items-start gap-2"><span className="font-bold shrink-0">4.</span> After <strong>5 paid referrals</strong>, you can withdraw or use your balance toward your own plan.</li>
          <li className="flex items-start gap-2"><span className="font-bold shrink-0">5.</span> Withdrawals are processed within 3–5 business days after admin approval.</li>
        </ol>
      </div>

    </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }) {
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs text-gray-500">{label}</p></div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}
