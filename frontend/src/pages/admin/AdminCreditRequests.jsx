import { useState, useEffect, useCallback } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import { Zap, CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Search, AlertCircle } from 'lucide-react';
import { adminCreditAPI } from '../../services/adminApi';

const STATUS_COLORS = {
  pending:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400'  },
  approved: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
  rejected: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400'    },
};

const PACKS = {
  // Starter / Trial packs
  spark_25:  { label: 'Spark Pack',    credits: 25,   price: 4.99  },
  boost_75:  { label: 'Boost Pack',    credits: 75,   price: 11.99 },
  power_200: { label: 'Power Pack',    credits: 200,  price: 24.99 },
  // Pro / Enterprise packs
  pro_200:   { label: 'Standard Pack', credits: 200,  price: 29 },
  pro_400:   { label: 'Growth Pack',   credits: 400,  price: 49 },
  pro_1000:  { label: 'Power Pack',    credits: 1000, price: 99 },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RequestRow({ req, onApprove, onReject, processing }) {
  const [expanded, setExpanded]   = useState(false);
  const [note,     setNote]       = useState('');
  const s = STATUS_COLORS[req.status] || STATUS_COLORS.pending;
  const pack = PACKS[req.packageId] || {};
  const user = req.user || {};

  return (
    <div className={`border rounded-xl mb-3 ${req.status === 'pending' ? 'border-amber-200' : 'border-gray-200'}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-xl"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />

        {/* User */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{user.name || '—'}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>

        {/* Pack + price */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-800">{pack.credits} credits</p>
          <p className="text-xs text-gray-400">${pack.price} · {pack.label}</p>
        </div>

        {/* Status badge */}
        <div className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
        </div>

        {/* Time */}
        <p className="text-xs text-gray-400 shrink-0 hidden sm:block">{timeAgo(req.createdAt)}</p>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-gray-400 mb-0.5">User Plan</p>
              <p className="font-semibold text-gray-800 capitalize">{user.plan || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Feature Triggered</p>
              <p className="font-semibold text-gray-800">{req.feature || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Current Bonus Credits</p>
              <p className="font-semibold text-gray-800">{user.bonusAICredits ?? 0}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400 mb-0.5">PayPal Order ID</p>
              <p className="font-mono text-gray-700 break-all text-[11px]">{req.paypalOrderId || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Submitted</p>
              <p className="font-semibold text-gray-800">{new Date(req.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {req.adminNote && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
              <span className="font-semibold">Admin note:</span> {req.adminNote}
            </div>
          )}

          {/* Action buttons for pending */}
          {req.status === 'pending' && (
            <div className="flex flex-col gap-2 pt-1">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional admin note…"
                rows={2}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(req._id, note)}
                  disabled={processing === req._id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                >
                  {processing === req._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Approve & Add Credits
                </button>
                <button
                  onClick={() => onReject(req._id, note)}
                  disabled={processing === req._id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminCreditRequests() {
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filter,     setFilter]     = useState('pending');
  const [search,     setSearch]     = useState('');
  const [processing, setProcessing] = useState(null);
  const [toast,      setToast]      = useState('');
  const [total,      setTotal]      = useState(0);

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminCreditAPI.list({ status: filter || undefined });
      setRequests(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleApprove = async (id, note) => {
    setProcessing(id);
    try {
      const res = await adminCreditAPI.approve(id, { note });
      showToast(res.data.message);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Approve failed.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id, note) => {
    setProcessing(id);
    try {
      await adminCreditAPI.reject(id, { note });
      showToast('Request rejected.');
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Reject failed.');
    } finally {
      setProcessing(null);
    }
  };

  const filtered = search.trim()
    ? requests.filter(r =>
        r.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.paypalOrderId?.includes(search)
      )
    : requests;

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">Credit Top-Up Requests<AdminHowItWorks page="creditRequests" /></h1>
            <p className="text-sm text-gray-500">
              {pendingCount > 0
                ? <span className="text-amber-600 font-medium">{pendingCount} pending approval</span>
                : 'All caught up'}
            </p>
          </div>
        </div>
        <button onClick={fetchRequests} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition shrink-0 self-start sm:self-auto">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Pending',  count: requests.filter(r=>r.status==='pending').length,  color: 'text-amber-600',  bg: 'bg-amber-50',  Icon: Clock       },
          { label: 'Approved', count: requests.filter(r=>r.status==='approved').length, color: 'text-green-600',  bg: 'bg-green-50',  Icon: CheckCircle },
          { label: 'Rejected', count: requests.filter(r=>r.status==='rejected').length, color: 'text-red-500',    bg: 'bg-red-50',    Icon: XCircle     },
        ].map(({ label, count, color, bg, Icon }) => (
          <div key={label} className={`${bg} rounded-xl p-4 text-center border border-opacity-30`}>
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
            <p className={`text-xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {['pending', 'approved', 'rejected', ''].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
                filter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or PayPal order ID…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* List */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Zap className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No requests found</p>
        </div>
      ) : (
        filtered.map(req => (
          <RequestRow
            key={req._id}
            req={req}
            onApprove={handleApprove}
            onReject={handleReject}
            processing={processing}
          />
        ))
      )}
    </div>
  );
}
