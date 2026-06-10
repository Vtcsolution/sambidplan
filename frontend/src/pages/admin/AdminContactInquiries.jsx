import { useState, useEffect } from 'react';
import { MessageSquare, Mail, Phone, Building2, Users, Clock, ChevronDown, ChevronUp, Loader2, RefreshCw, Zap, AlertCircle, DollarSign, CheckCircle, ShieldAlert } from 'lucide-react';
import { adminPanelAPI } from '../../services/adminApi';
const contactAPI = {
  getAll:          (params) => adminPanelAPI.getContactInquiries(params),
  update:          (id, data) => adminPanelAPI.updateContactInquiry(id, data),
  confirmPayment:  (id, data) => adminPanelAPI.confirmInquiryPayment(id, data),
  activatePlan:    (id, data) => adminPanelAPI.activatePlan(id, data),
};

const STATUS_OPTIONS = ['new', 'in_progress', 'resolved', 'closed'];

const STATUS_COLORS = {
  new:         'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved:    'bg-green-100 text-green-700',
  closed:      'bg-gray-100 text-gray-600',
};

const PLAN_COLORS = {
  enterprise: 'bg-purple-100 text-purple-700',
  pro:        'bg-indigo-100 text-indigo-700',
  starter:    'bg-blue-100 text-blue-700',
  general:    'bg-gray-100 text-gray-600',
};

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 1)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

const ACTIVATABLE_PLANS = ['enterprise', 'custom', 'pro', 'starter'];

const PLAN_PRICES = { starter: 29, pro: 79, enterprise: 499, custom: 499 };

function InquiryRow({ inquiry: initialInquiry, onUpdate }) {
  const [expanded, setExpanded]         = useState(false);
  const [inquiry, setInquiry]           = useState(initialInquiry);
  const [status, setStatus]             = useState(initialInquiry.status);
  const [adminNotes, setAdminNotes]     = useState(initialInquiry.adminNotes || '');
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  // Payment confirmation (manual)
  const [payRef, setPayRef]             = useState('');
  const [payMethod, setPayMethod]       = useState('manual');
  const [confirmingPay, setConfirmingPay] = useState(false);
  const [payConfirmed, setPayConfirmed] = useState(initialInquiry.paymentConfirmed || false);


  // Plan activation
  const [activating, setActivating]     = useState(false);
  const [activateError, setActivateError] = useState('');
  const [activated, setActivated]       = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const handleSave = async () => {
    setSaving(true);
    try {
      await contactAPI.update(inquiry._id, { status, adminNotes });
      setSaved(true);
      onUpdate(inquiry._id, { status, adminNotes });
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async () => {
    setConfirmingPay(true);
    try {
      const res = await contactAPI.confirmPayment(inquiry._id, {
        paymentReference: payRef,
        paymentMethod:    payMethod,
        paymentAmount:    PLAN_PRICES[inquiry.planInterest] || 499,
      });
      setPayConfirmed(true);
      setInquiry(res.data.data);
      setStatus(res.data.data.status);
      onUpdate(inquiry._id, { paymentConfirmed: true });
    } catch (err) {
      setActivateError(err.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setConfirmingPay(false);
    }
  };

  const handleActivatePlan = async () => {
    if (!payConfirmed) {
      setActivateError('Confirm payment first before activating the plan.');
      return;
    }
    if (!window.confirm(`Activate ${inquiry.planInterest} plan for ${inquiry.email}?\n\nPayment confirmed ✓\nThis will upgrade their account and send an activation email.`)) return;
    setActivating(true);
    setActivateError('');
    try {
      await contactAPI.activatePlan(inquiry._id, { billingCycle });
      setActivated(true);
      setStatus('resolved');
      onUpdate(inquiry._id, { status: 'resolved' });
    } catch (err) {
      setActivateError(err.response?.data?.message || 'Failed to activate plan');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Summary Row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{inquiry.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[inquiry.planInterest] || 'bg-gray-100 text-gray-600'}`}>
              {inquiry.planInterest}</span>
            {payConfirmed
              ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">💰 Paid</span>
              : <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">⚠ Unpaid</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}>
              {status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{inquiry.email}</span>
            {inquiry.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{inquiry.company}</span>}
            {inquiry.employees && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{inquiry.employees} employees</span>}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(inquiry.createdAt)}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-6 py-5 space-y-4 bg-gray-50">
          {inquiry.phone && (
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" /> {inquiry.phone}
            </p>
          )}
          {inquiry.message && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Message</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-200">{inquiry.message}</p>
            </div>
          )}

          {/* Admin Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Update Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>
          {/* ── Payment & Activation — gated flow ───────────────────────── */}
          {ACTIVATABLE_PLANS.includes(inquiry.planInterest) && !activated && status !== 'resolved' && (
            <div className="space-y-3">

              {/* Step 1: Payment */}
              <div className={`rounded-xl border p-4 ${payConfirmed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${payConfirmed ? 'text-green-800' : 'text-amber-800'}`}>
                  <DollarSign className="w-4 h-4" />
                  Step 1: Payment Confirmation
                  {payConfirmed && <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />}
                </p>

                {payConfirmed ? (
                  <p className="text-xs text-green-700">
                    ✓ Payment confirmed{inquiry.paymentReference ? ` · Ref: ${inquiry.paymentReference}` : ''} · ${inquiry.paymentAmount || PLAN_PRICES[inquiry.planInterest]}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-amber-700 mb-3">
                      You must confirm payment has been received (via PayPal or bank transfer) before activating the plan.
                    </p>

                    {/* Billing cycle picker */}
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600">Billing:</span>
                      {['monthly', 'yearly'].map(c => (
                        <label key={c} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="radio" name={`billing-${inquiry._id}`} value={c}
                            checked={billingCycle === c} onChange={() => setBillingCycle(c)}
                            className="accent-indigo-600" />
                          {c === 'monthly' ? `Monthly ($${PLAN_PRICES[inquiry.planInterest]}/mo)` : `Yearly`}
                        </label>
                      ))}
                    </div>

                    {/* Manual payment confirmation */}
                    <div className="p-3 bg-white rounded-lg border border-amber-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Confirm Payment Received</p>
                      <div className="flex gap-2 mb-2">
                        <input
                          value={payRef}
                          onChange={e => setPayRef(e.target.value)}
                          placeholder="Payment reference / transaction ID"
                          className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-400"
                        />
                        <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-indigo-400">
                          <option value="manual">Manual / Bank</option>
                          <option value="stripe">Stripe</option>
                          <option value="paypal">PayPal</option>
                          <option value="wire">Wire Transfer</option>
                        </select>
                      </div>
                      <button onClick={handleConfirmPayment} disabled={confirmingPay || !payRef.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-60 transition">
                        {confirmingPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {confirmingPay ? 'Confirming…' : 'Mark as Paid'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Step 2: Activate */}
              <div className={`rounded-xl border p-4 ${payConfirmed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-green-600" /> Step 2: Activate Plan
                  {!payConfirmed && <span className="text-xs font-normal text-gray-500 ml-1">(requires payment confirmation)</span>}
                </p>
                {activateError && (
                  <p className="text-xs text-red-600 flex items-center gap-1 mb-2">
                    <AlertCircle className="w-3.5 h-3.5" /> {activateError}
                  </p>
                )}
                <button
                  onClick={handleActivatePlan}
                  disabled={!payConfirmed || activating}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {activating ? 'Activating...' : `Activate ${inquiry.planInterest} Plan for ${inquiry.email}`}
                </button>
                {!payConfirmed && (
                  <p className="text-xs text-gray-400 mt-1.5">Confirm payment above to unlock activation.</p>
                )}
              </div>
            </div>
          )}
          {activated && (
            <div className="bg-green-100 border border-green-300 rounded-xl px-4 py-3 text-sm text-green-800 font-medium">
              ✅ Plan activated! User has been notified by email.
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
            <a
              href={`mailto:${inquiry.email}?subject=Your Sambid Notify ${inquiry.planInterest} Inquiry`}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              Reply via Email
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminContactInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [total, setTotal]         = useState(0);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (filter !== 'all') params.status = filter;
      const res = await contactAPI.getAll(params);
      if (res.data.success) {
        setInquiries(res.data.data);
        setTotal(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInquiries(); }, [filter, page, pageSize]);

  const handleUpdate = (id, changes) => {
    setInquiries(prev => prev.map(i => i._id === id ? { ...i, ...changes } : i));
  };

  const counts = {
    all:         total,
    new:         inquiries.filter(i => i.status === 'new').length,
    in_progress: inquiries.filter(i => i.status === 'in_progress').length,
    resolved:    inquiries.filter(i => i.status === 'resolved').length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Contact Inquiries</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total inquiry{total !== 1 ? 'ies' : 'y'} from users and enterprise prospects</p>
        </div>
        <button
          onClick={fetchInquiries}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'new', 'in_progress', 'resolved', 'closed'].map(s => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.replace('_', ' ')}
            {s !== 'closed' && counts[s] !== undefined && (
              <span className="ml-1 opacity-70">({counts[s]})</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No inquiries found</p>
          <p className="text-sm">Inquiries from the contact form will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map(inquiry => (
            <InquiryRow key={inquiry._id} inquiry={inquiry} onUpdate={handleUpdate} />
          ))}
        </div>
      )}

      {/* Pagination + Rows per page */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {[10, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-400 hidden sm:inline">
              Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
            </span>
          </div>
          {Math.ceil(total / pageSize) > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page === Math.ceil(total / pageSize)}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
