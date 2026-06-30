import { useState, useEffect, useCallback } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import {
  Users, DollarSign, TrendingUp, Loader2, AlertCircle, CheckCircle,
  Clock, CreditCard, Star, Wallet, Trophy, Lock, Unlock, ChevronDown,
  ChevronUp, RefreshCw, ExternalLink, Filter, X,
} from 'lucide-react';
import { supportAPI } from '../../services/adminApi';

const fmt    = n => `$${(Number(n) || 0).toFixed(2)}`;
const fmtNum = n => (Number(n) || 0).toLocaleString();

const TARGET = 100;

const PLAN_COLORS = {
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-800',
};

// ── Withdraw process modal ─────────────────────────────────────────────────────
function ProcessModal({ withdrawal, onClose, onDone }) {
  const [form, setForm] = useState({
    status:            withdrawal.status === 'pending' ? 'approved' : 'paid',
    adminNote:         '',
    paymentId:         '',
    proofScreenshotUrl:'',
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const handle = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await supportAPI.adminProcess(withdrawal._id, form);
      onDone();
    } catch (ex) { setErr(ex.response?.data?.message || ex.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Process Withdrawal</h3>
        <p className="text-sm text-gray-500 mb-4">
          {withdrawal.supportMember?.name} · {fmt(withdrawal.amount)} · {(withdrawal.method||'').replace(/_/g,' ')}
        </p>
        <form onSubmit={handle} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {['approved', 'paid'].includes(form.status) && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment / Transaction ID {form.status === 'paid' && <span className="text-red-500">*</span>}
                  {form.status === 'approved' && <span className="text-gray-400 font-normal"> (optional)</span>}
                </label>
                <input value={form.paymentId} onChange={e => setForm(f => ({ ...f, paymentId: e.target.value }))}
                  required={form.status === 'paid'}
                  placeholder="PayPal txn ID, transaction ref…"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Proof Screenshot URL <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={form.proofScreenshotUrl} onChange={e => setForm(f => ({ ...f, proofScreenshotUrl: e.target.value }))}
                  placeholder="https://… paste link to screenshot"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Admin Note (optional)</label>
            <input value={form.adminNote} onChange={e => setForm(f => ({ ...f, adminNote: e.target.value }))}
              placeholder="Optional note visible to support member"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              Save
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Member card ────────────────────────────────────────────────────────────────
function MemberCard({ item, onProcessWithdrawal }) {
  const [open, setOpen] = useState(false);
  const { member, targetProgress, totalSignups, convertedCount, proEnterpriseCount,
          totalWithdrawn, pendingWithdrawalCount, pendingWithdrawalAmount, referrals, recentWithdrawals } = item;

  const progressPct = Math.min(100, Math.round(((member.proEnterpriseReferralCount || 0) / TARGET) * 100));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Member header */}
      <div className="p-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-base">{member.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {member.isActive ? 'Active' : 'Inactive'}
              </span>
              {member.recurringUnlocked
                ? <span className="flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold"><Unlock className="w-3 h-3" /> Recurring Unlocked</span>
                : <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><Lock className="w-3 h-3" /> Recurring Locked</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{member.email}</p>
            <p className="text-xs text-gray-400">Code: <span className="font-mono font-semibold text-gray-700">{member.referralCode}</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Last login</p>
            <p className="text-xs text-gray-600">{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Balance',        value: fmt(member.referralBalance),        color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Earned',   value: fmt(member.totalCommissionEarned),  color: 'text-blue-600',    bg: 'bg-blue-50' },
            { label: '15% One-Time',   value: fmt(member.totalOneTimeEarned),     color: 'text-amber-700',   bg: 'bg-amber-50' },
            { label: '7.5% Recurring', value: fmt(member.totalRecurringEarned),   color: 'text-violet-700',  bg: 'bg-violet-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-3 py-2.5`}>
              <p className={`text-lg font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Target progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Pro/Enterprise Target</span>
            <span className="text-xs font-bold text-gray-800">{member.proEnterpriseReferralCount || 0} / {TARGET}</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${member.recurringUnlocked ? 'bg-violet-500' : 'bg-gradient-to-r from-amber-400 to-emerald-500'}`}
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
          <span><strong className="text-gray-800">{totalSignups}</strong> signups</span>
          <span><strong className="text-gray-800">{convertedCount}</strong> purchased</span>
          <span><strong className="text-gray-800">{proEnterpriseCount}</strong> Pro/Enterprise</span>
          <span><strong className="text-gray-800">{fmt(totalWithdrawn)}</strong> withdrawn</span>
          {pendingWithdrawalCount > 0 && (
            <span className="text-amber-600 font-semibold"><strong>{pendingWithdrawalCount}</strong> pending withdrawal ({fmt(pendingWithdrawalAmount)})</span>
          )}
        </div>

        <button onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline font-medium">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? 'Hide details' : 'View referrals & withdrawals'}
        </button>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">

          {/* Referrals */}
          {referrals?.length > 0 && (
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Referrals ({referrals.length})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[540px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Company', 'First Plan', 'One-Time', 'Recurring', 'Target?', 'Joined'].map(h => (
                        <th key={h} className="text-left py-1.5 px-2 text-gray-400 font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map(r => (
                      <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <p className="font-semibold text-gray-800">{r.user?.name || '—'}</p>
                          <p className="text-gray-400">{r.user?.email || '—'}</p>
                        </td>
                        <td className="py-2 px-2">
                          {r.firstPurchasePlan
                            ? <span className={`px-1.5 py-0.5 rounded-full font-semibold capitalize ${PLAN_COLORS[r.firstPurchasePlan] || 'bg-gray-100 text-gray-600'}`}>{r.firstPurchasePlan}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2 px-2 font-bold text-emerald-600">{r.firstCommission > 0 ? fmt(r.firstCommission) : '—'}</td>
                        <td className="py-2 px-2 font-bold text-violet-600">{r.totalRecurringEarned > 0 ? fmt(r.totalRecurringEarned) : '—'}</td>
                        <td className="py-2 px-2">
                          {r.countsTowardTarget
                            ? <span className="text-green-600 font-semibold">Yes</span>
                            : <span className="text-gray-400">No</span>}
                        </td>
                        <td className="py-2 px-2 text-gray-400">
                          {r.user?.createdAt ? new Date(r.user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Withdrawals */}
          {recentWithdrawals?.length > 0 && (
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Withdrawals</p>
              <div className="space-y-2">
                {recentWithdrawals.map(w => (
                  <div key={w._id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                    w.status === 'paid'     ? 'bg-green-50 border-green-100'  :
                    w.status === 'rejected' ? 'bg-red-50 border-red-100'      :
                    w.status === 'approved' ? 'bg-blue-50 border-blue-100'    :
                    'bg-amber-50 border-amber-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{fmt(w.amount)}</p>
                        <p className="text-xs text-gray-500 capitalize">{(w.method||'').replace(/_/g,' ')} · {new Date(w.createdAt).toLocaleDateString()}</p>
                        {w.adminNote && <p className="text-xs text-gray-400 italic">"{w.adminNote}"</p>}
                        {w.paymentId && <p className="text-xs text-gray-500">Txn: <span className="font-mono font-semibold">{w.paymentId}</span></p>}
                        {w.proofScreenshotUrl && (
                          <a href={w.proofScreenshotUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                            <ExternalLink className="w-3 h-3" /> View proof
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        w.status === 'paid'     ? 'bg-green-100 text-green-700'  :
                        w.status === 'approved' ? 'bg-blue-100 text-blue-700'    :
                        w.status === 'rejected' ? 'bg-red-100 text-red-600'      :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{w.status}</span>
                      {['pending','approved'].includes(w.status) && (
                        <button onClick={() => onProcessWithdrawal(w)}
                          className="text-xs text-indigo-600 hover:underline font-medium">Process</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Withdrawals tab ────────────────────────────────────────────────────────────
function WithdrawalsTab({ onRefresh, members }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [modal,   setModal]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supportAPI.adminGetWithdrawals();
      setData(res.data.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? data : data.filter(w => w.status === filter);
  const counts   = { pending: 0, approved: 0, paid: 0, rejected: 0, all: data.length };
  data.forEach(w => { if (counts[w.status] !== undefined) counts[w.status]++; });

  return (
    <div className="space-y-5">
      {modal && (
        <ProcessModal withdrawal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); onRefresh(); }} />
      )}

      {/* Member balance overview */}
      {members?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Member Balances & Payouts</p>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Member', 'Balance', 'Total Earned', 'One-Time (15%)', 'Recurring (7.5%)', 'Withdrawn', 'Pending', 'Status'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.map(item => (
                    <tr key={item.member._id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-gray-900 text-sm">{item.member.name}</p>
                        <p className="text-xs text-gray-400">{item.member.email}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold ${item.member.referralBalance > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {fmt(item.member.referralBalance)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-blue-600">{fmt(item.member.totalCommissionEarned)}</td>
                      <td className="py-2.5 px-3 text-amber-700">{fmt(item.member.totalOneTimeEarned)}</td>
                      <td className="py-2.5 px-3 text-violet-700">{fmt(item.member.totalRecurringEarned)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${item.totalWithdrawn > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {fmt(item.totalWithdrawn)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {item.pendingWithdrawalCount > 0
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{item.pendingWithdrawalCount} ({fmt(item.pendingWithdrawalAmount)})</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.member.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal requests */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Withdrawal Requests</p>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[['all','All'],['pending','Pending'],['approved','Approved'],['paid','Paid'],['rejected','Rejected']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === val ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {label}
              {counts[val] > 0 && <span className="ml-1.5 text-xs opacity-80">({counts[val]})</span>}
            </button>
          ))}
          <button onClick={load} className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-gray-100">
            <Wallet className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No {filter === 'all' ? '' : filter + ' '}withdrawal requests yet</p>
            <p className="text-xs text-gray-300 mt-1">Requests will appear here when support members submit withdrawals</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(w => (
              <div key={w._id} className={`bg-white rounded-xl border p-4 flex items-start justify-between gap-4 ${
                w.status === 'pending' ? 'border-amber-200' : 'border-gray-200'
              }`}>
                <div className="flex items-start gap-3 min-w-0">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{w.supportMember?.name || '—'}</p>
                    <p className="text-xs text-gray-400">{w.supportMember?.email}</p>
                    <p className="text-sm font-bold text-gray-800 mt-1">{fmt(w.amount)}</p>
                    <p className="text-xs text-gray-500 capitalize">{(w.method||'').replace(/_/g,' ')} · {new Date(w.createdAt).toLocaleDateString()}</p>
                    {w.accountDetails?.email && <p className="text-xs text-gray-400">To: {w.accountDetails.email}</p>}
                    {w.adminNote && <p className="text-xs italic text-gray-400">Note: "{w.adminNote}"</p>}
                    {w.paymentId && <p className="text-xs">Txn: <span className="font-mono font-semibold text-gray-700">{w.paymentId}</span></p>}
                    {w.proofScreenshotUrl && (
                      <a href={w.proofScreenshotUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-0.5">
                        <ExternalLink className="w-3 h-3" /> View proof
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    w.status === 'paid'     ? 'bg-green-100 text-green-700'  :
                    w.status === 'approved' ? 'bg-blue-100 text-blue-700'    :
                    w.status === 'rejected' ? 'bg-red-100 text-red-600'      :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{w.status}</span>
                  {['pending','approved'].includes(w.status) && (
                    <button onClick={() => setModal(w)}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg font-medium hover:bg-indigo-700">
                      Process
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminSupportManagement() {
  const [tab,          setTab]          = useState('members');
  const [memberFilter, setMemberFilter] = useState('all');
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [modal,        setModal]        = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await supportAPI.adminGetAll();
      setData(res.data);
    } catch (err) { setError(err.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const members = data?.data || [];
  const targetGoal = data?.targetGoal || TARGET;

  const filteredMembers = members.filter(item => {
    if (memberFilter === 'active')  return item.member.isActive;
    if (memberFilter === 'inactive') return !item.member.isActive;
    if (memberFilter === 'pending') return item.pendingWithdrawalCount > 0;
    if (memberFilter === 'paid')    return item.totalWithdrawn > 0;
    return true;
  });

  const memberCounts = {
    all:      members.length,
    active:   members.filter(i => i.member.isActive).length,
    inactive: members.filter(i => !i.member.isActive).length,
    pending:  members.filter(i => i.pendingWithdrawalCount > 0).length,
    paid:     members.filter(i => i.totalWithdrawn > 0).length,
  };

  // Summary across all members
  const summary = members.reduce((acc, item) => {
    acc.totalBalance         += item.member.referralBalance || 0;
    acc.totalEarned          += item.member.totalCommissionEarned || 0;
    acc.totalOneTime         += item.member.totalOneTimeEarned || 0;
    acc.totalRecurring       += item.member.totalRecurringEarned || 0;
    acc.totalSignups         += item.totalSignups || 0;
    acc.totalConverted       += item.convertedCount || 0;
    acc.unlocked             += item.member.recurringUnlocked ? 1 : 0;
    acc.pendingWithdrawals   += item.pendingWithdrawalCount || 0;
    return acc;
  }, { totalBalance:0, totalEarned:0, totalOneTime:0, totalRecurring:0, totalSignups:0, totalConverted:0, unlocked:0, pendingWithdrawals:0 });

  return (
    <div className="space-y-6 w-full">
      {modal && (
        <ProcessModal withdrawal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Team Management<AdminHowItWorks page="supportManagement" /></h1>
          <p className="text-sm text-gray-500 mt-0.5">Referral earnings, target progress, and withdrawal requests</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Commission rules callout */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-indigo-900 mb-3">Commission Rules</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0"><Star className="w-4 h-4 text-emerald-600" /></div>
            <div>
              <p className="font-semibold text-gray-900">15% One-Time Commission</p>
              <p className="text-xs text-gray-500 mt-0.5">Triggered on the first purchase by any referred company — Starter, Pro Monthly/Yearly, or Enterprise Monthly/Yearly.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0"><Trophy className="w-4 h-4 text-violet-600" /></div>
            <div>
              <p className="font-semibold text-gray-900">7.5% Recurring Commission (Locked)</p>
              <p className="text-xs text-gray-500 mt-0.5">Unlocks after referring <strong>{targetGoal} Pro or Enterprise</strong> companies. Then 7.5% is earned on every Pro/Enterprise renewal.</p>
              <p className="text-xs text-amber-600 mt-1">Starter referrals do NOT count toward the {targetGoal} target.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && members.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {[
            { label: 'Members',         value: fmtNum(members.length),           color: 'bg-indigo-100 text-indigo-600' },
            { label: 'Unlocked',        value: fmtNum(summary.unlocked),          color: 'bg-violet-100 text-violet-600' },
            { label: 'Total Signups',   value: fmtNum(summary.totalSignups),      color: 'bg-blue-100 text-blue-600' },
            { label: 'Purchased',       value: fmtNum(summary.totalConverted),    color: 'bg-green-100 text-green-600' },
            { label: 'Total Earned',    value: fmt(summary.totalEarned),          color: 'bg-emerald-100 text-emerald-600' },
            { label: '15% One-Time',    value: fmt(summary.totalOneTime),         color: 'bg-amber-100 text-amber-600' },
            { label: '7.5% Recurring',  value: fmt(summary.totalRecurring),       color: 'bg-purple-100 text-purple-600' },
            { label: 'Pending Payout',  value: fmtNum(summary.pendingWithdrawals) + ' req', color: 'bg-red-100 text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className={`text-sm font-black ${color.split(' ')[1]}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[['members','Support Members'],['withdrawals','Withdrawal Requests']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === val ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {label}
            {val === 'withdrawals' && summary.pendingWithdrawals > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{summary.pendingWithdrawals}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-gray-600">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Retry</button>
        </div>
      ) : tab === 'members' ? (
        members.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No support members yet. Create a support member from Admin Management.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Member filter tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[['all','All'],['active','Active'],['inactive','Inactive'],['pending','Pending Withdrawals'],['paid','Paid']].map(([val, label]) => (
                <button key={val} onClick={() => setMemberFilter(val)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${memberFilter === val ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {label}
                  {memberCounts[val] > 0 && <span className="ml-1.5 text-xs opacity-80">({memberCounts[val]})</span>}
                </button>
              ))}
            </div>

            {filteredMembers.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Filter className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p>No members match this filter</p>
              </div>
            ) : (
              filteredMembers.map(item => (
                <MemberCard key={item.member._id} item={item} onProcessWithdrawal={setModal} />
              ))
            )}
          </div>
        )
      ) : (
        <WithdrawalsTab onRefresh={load} members={members} />
      )}
    </div>
  );
}
