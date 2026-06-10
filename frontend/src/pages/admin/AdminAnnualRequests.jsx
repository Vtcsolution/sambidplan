import { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, DollarSign, RefreshCw, Clock, AlertTriangle,
  Mail, X, Send, Loader2, BadgeCheck, ShieldCheck, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { adminPanelAPI } from '../../services/adminApi';

const STATUS_TABS = ['pending', 'approved', 'completed', 'rejected'];

const PLAN_BADGE = {
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-indigo-100 text-indigo-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const PLAN_PRICES = {
  starter:    { monthly: 29,  yearly: 278  },
  pro:        { monthly: 79,  yearly: 758  },
  enterprise: { monthly: 499, yearly: 4788 },
};

const DEFAULT_ACCOUNT_INFO = {
  payoneer: `Payoneer Account Email: payments@sambidnotify.com\nPayoneer ID: (your Payoneer ID)\n\nSteps to pay:\n1. Log in to your Payoneer account\n2. Go to "Pay" → "Pay to Email"\n3. Enter the email above\n4. Enter the exact amount\n5. Add the Reference # in the "Note" field`,
  bank_transfer: `Bank Name: (Your Bank Name)\nAccount Name: Sambid Notify LLC\nAccount Number: XXXX-XXXX-XXXX\nRouting Number: XXXXXXXXX\nSWIFT/BIC: XXXXXXXX\n\nFor international transfers, use SWIFT code above.\nAdd the Reference # in the payment description.`,
  credit_card: `We will send a secure payment link to your email within 4 hours.\nYou can use any major credit or debit card (Visa, Mastercard, Amex).\n\nAlternatively, reply to this email with your preferred time and we will call you to process the payment securely.`,
};

const PAYMENT_METHODS = [
  { value: 'payoneer',      label: 'Payoneer' },
  { value: 'bank_transfer', label: 'Bank Transfer / Wire' },
  { value: 'credit_card',   label: 'Credit Card (Manual Invoice)' },
];

// ── Step tracker ──────────────────────────────────────────────────────────────
function StepBadge({ label, done, active }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
      done   ? 'bg-green-50 text-green-700 border-green-200' :
      active ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
               'bg-gray-50 text-gray-400 border-gray-200'
    }`}>
      {done ? <CheckCircle className="w-3 h-3" /> : active ? <Clock className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-40" />}
      {label}
    </div>
  );
}

// ── Send Instructions Modal ───────────────────────────────────────────────────
function SendInstructionsModal({ request, onClose, onSent }) {
  const planKey  = request.requestedPlan || 'starter';
  const cycle    = request.billingCycle  || 'yearly';
  const prices   = PLAN_PRICES[planKey]  || { monthly: 0, yearly: 0 };
  const amount   = cycle === 'yearly' ? prices.yearly : prices.monthly;

  const [method,        setMethod]        = useState(request.paymentMethod || 'payoneer');
  const [accountInfo,   setAccountInfo]   = useState(DEFAULT_ACCOUNT_INFO[request.paymentMethod || 'payoneer'] || '');
  const [reference,     setReference]     = useState(request._id.slice(-8).toUpperCase());
  const [customMessage, setCustomMessage] = useState('');
  const [sending,       setSending]       = useState(false);
  const [error,         setError]         = useState('');

  const handleMethodChange = (m) => { setMethod(m); setAccountInfo(DEFAULT_ACCOUNT_INFO[m] || ''); };

  const handleSend = async () => {
    if (!accountInfo.trim()) { setError('Please fill in the payment account details.'); return; }
    setSending(true); setError('');
    try {
      await adminPanelAPI.sendPaymentInstructions(request._id, { method, accountInfo, reference, customMessage });
      onSent(`Payment instructions sent to ${request.userEmail || request.user?.email}`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send. Check SMTP settings.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-500" /> Send Payment Instructions
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Email will be sent to <strong>{request.userEmail || request.user?.email}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 grid grid-cols-3 gap-3 text-center text-sm">
            <div><p className="text-xs text-indigo-400 uppercase font-semibold">Plan</p><p className="font-bold text-indigo-800 capitalize">{planKey} {cycle}</p></div>
            <div><p className="text-xs text-indigo-400 uppercase font-semibold">Amount</p><p className="font-bold text-indigo-800 text-lg">${amount.toLocaleString()}</p></div>
            <div><p className="text-xs text-indigo-400 uppercase font-semibold">User</p><p className="font-bold text-indigo-800 truncate">{request.userName || '—'}</p></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m.value} onClick={() => handleMethodChange(m.value)}
                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition text-center ${method === m.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Payment Account Details <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">Edit the defaults below with your actual account information.</p>
            <textarea value={accountInfo} onChange={e => setAccountInfo(e.target.value)} rows={8}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Reference Number</label>
            <p className="text-xs text-gray-400 mb-1.5">User must include this in their payment note so you can identify the payment.</p>
            <input value={reference} onChange={e => setReference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Additional Message (optional)</label>
            <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
              placeholder="Any special instructions or personal note for this user…" rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending…' : 'Send Instructions Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Verify & Activate Modal ───────────────────────────────────────────────────
function VerifyActivateModal({ request, onClose, onActivated }) {
  const planKey = request.requestedPlan || 'starter';
  const cycle   = request.billingCycle  || 'yearly';
  const amount  = PLAN_PRICES[planKey]?.[cycle === 'yearly' ? 'yearly' : 'monthly'] || 0;
  const invoice = request.invoiceId;

  const [confirmedRef, setConfirmedRef] = useState('');
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState('');
  const [checked,      setChecked]      = useState(false);

  const handleActivate = async () => {
    if (!checked) { setError('Please confirm you have verified the payment.'); return; }
    setBusy(true); setError('');
    try {
      await adminPanelAPI.markRequestAsPaid(request._id, { paymentReference: confirmedRef || request.userPaymentRef });
      onActivated(`Plan activated for ${request.userEmail || request.user?.email}!`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate plan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500" /> Verify & Activate Plan
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">User</span>
              <span className="font-semibold text-gray-900">{request.userName || request.userEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Plan</span>
              <span className="font-semibold text-gray-900 capitalize">{planKey} {cycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-indigo-700 text-base">${amount.toLocaleString()}</span>
            </div>
            {invoice && (
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice #</span>
                <span className="font-mono font-semibold text-gray-900">{invoice.invoiceNumber || '—'}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Method</span>
              <span className="font-semibold text-gray-900 capitalize">{(request.paymentMethod || '').replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* User-submitted reference — the key thing to verify */}
          <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> User-Submitted Payment Reference
            </p>
            <p className="font-mono text-lg font-bold text-amber-900">
              {request.userPaymentRef || '—'}
            </p>
            {request.userPaymentNote && (
              <p className="text-xs text-amber-700 mt-1.5 italic">Note: "{request.userPaymentNote}"</p>
            )}
            <p className="text-xs text-amber-600 mt-2">
              Check your payment platform (Payoneer/bank) to confirm this reference matches a received payment of <strong>${amount.toLocaleString()}</strong> from {request.userName || request.userEmail}.
            </p>
          </div>

          {/* Admin-confirmed reference */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Your Confirmed Reference (optional)
            </label>
            <p className="text-xs text-gray-400 mb-2">If different from user's ref, enter your internal transaction ID to store as the confirmed reference.</p>
            <input
              value={confirmedRef}
              onChange={e => setConfirmedRef(e.target.value)}
              placeholder={request.userPaymentRef || 'Leave blank - defaults to user ref'}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer" />
            <span className="text-sm text-gray-700">
              I confirm I have verified this payment in my payment platform and the amount matches <strong>${amount.toLocaleString()}</strong>.
            </span>
          </label>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleActivate} disabled={busy || !checked}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
            {busy ? 'Activating…' : 'Activate Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminAnnualRequests() {
  const [status,         setStatus]        = useState('pending');
  const [requests,       setRequests]      = useState([]);
  const [total,          setTotal]         = useState(0);
  const [loading,        setLoading]       = useState(true);
  const [error,          setError]         = useState('');
  const [actionLoading,  setActionLoading] = useState('');
  const [instructModal,  setInstructModal] = useState(null);
  const [verifyModal,    setVerifyModal]   = useState(null);
  const [toast,          setToast]         = useState('');
  const [expandedId,     setExpandedId]    = useState(null);

  useEffect(() => { fetchRequests(); }, [status]); // eslint-disable-line

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 5000); };

  const fetchRequests = async () => {
    setLoading(true); setError('');
    try {
      const res = await adminPanelAPI.getPlanRequests({ status, billingCycle: 'yearly', limit: 50 });
      if (res.data.success) {
        setRequests(res.data.data);
        setTotal(res.data.pagination?.total || res.data.data.length);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve');
    try {
      await adminPanelAPI.approvePlanRequest(id, {});
      showToast('Request approved. Now send payment instructions to the user.');
      fetchRequests();
    } catch (err) {
      showToast('Error: ' + (err.response?.data?.message || 'Failed to approve'));
    } finally { setActionLoading(''); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return;
    setActionLoading(id + '_reject');
    try {
      await adminPanelAPI.rejectPlanRequest(id, { reason });
      showToast('Request rejected.');
      fetchRequests();
    } catch (err) {
      showToast('Error: ' + (err.response?.data?.message || 'Failed to reject'));
    } finally { setActionLoading(''); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const planPrice = (plan, cycle) => {
    const p = PLAN_PRICES[plan];
    if (!p) return '—';
    return cycle === 'yearly' ? `$${p.yearly.toLocaleString()}/yr` : `$${p.monthly}/mo`;
  };

  // Determine step state for a request
  const getSteps = (req) => {
    const hasProof = !!req.paymentProofAt;
    return [
      { label: 'Request Submitted',      done: true,                                         active: req.status === 'pending' },
      { label: 'Admin Approved',          done: req.status !== 'pending' && req.status !== 'rejected', active: req.status === 'approved' && !hasProof },
      { label: 'Payment Proof Submitted', done: hasProof || req.status === 'completed',       active: req.status === 'approved' && !hasProof },
      { label: 'Verified & Activated',    done: req.status === 'completed',                   active: req.status === 'approved' && hasProof },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          <CheckCircle className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Annual Plan Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manual payment flow · Starter ($278/yr) · Pro ($758/yr) · Enterprise ($4,788/yr)</p>
        </div>
        <button onClick={fetchRequests} className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm self-start">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Workflow guide */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-3">How the payment flow works</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { step: '1', title: 'User Requests',    desc: 'User submits annual plan request from pricing page' },
            { step: '2', title: 'Approve & Instruct', desc: 'Admin approves then sends payment instructions via email' },
            { step: '3', title: 'User Pays',        desc: 'User completes payment and submits reference from Billing page' },
            { step: '4', title: 'Verify & Activate', desc: 'Admin verifies payment in payment platform, then activates plan' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</div>
              <div>
                <p className="text-xs font-semibold text-indigo-900">{title}</p>
                <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${status === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No {status} requests</p>
          <p className="text-gray-400 text-sm mt-1">
            {status === 'pending' ? 'New annual plan requests will appear here' : `No requests with status "${status}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const hasProof   = !!req.paymentProofAt;
            const proofReady = req.status === 'approved' && hasProof;
            const steps      = getSteps(req);
            const isExpanded = expandedId === req._id;
            const invoice    = req.invoiceId;

            return (
              <div key={req._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                proofReady ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-100'
              }`}>
                {/* Proof-ready banner */}
                {proofReady && (
                  <div className="bg-green-50 border-b border-green-200 px-5 py-2 flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs font-semibold text-green-700">
                      Payment proof submitted by user — ready to verify and activate
                    </p>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_BADGE[req.requestedPlan] || 'bg-gray-100 text-gray-600'}`}>
                          {(req.requestedPlan || '—').charAt(0).toUpperCase()}{(req.requestedPlan || '').slice(1)} Annual
                        </span>
                        <span className="text-sm font-bold text-gray-900">{planPrice(req.requestedPlan, req.billingCycle || 'yearly')}</span>
                      </div>

                      <p className="font-semibold text-gray-900">{req.userName || req.user?.name || '—'}</p>
                      <p className="text-sm text-gray-500">{req.userEmail || req.user?.email || '—'}</p>

                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Payment: <span className="font-medium text-gray-700">{(req.paymentMethod || '').replace(/_/g, ' ') || '—'}</span></span>
                        <span>Submitted: <span className="font-medium text-gray-700">{fmtDate(req.createdAt)}</span></span>
                        {req.approvedAt && <span>Approved: <span className="font-medium text-gray-700">{fmtDate(req.approvedAt)}</span></span>}
                        {invoice && <span>Invoice: <span className="font-mono font-semibold text-gray-700">{invoice.invoiceNumber || '—'}</span></span>}
                      </div>

                      {/* Step tracker */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <StepBadge label={step.label} done={step.done} active={step.active} />
                            {i < steps.length - 1 && <span className="text-gray-300 text-xs">→</span>}
                          </div>
                        ))}
                      </div>

                      {/* User-submitted proof preview */}
                      {req.userPaymentRef && (
                        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs">
                          <Eye className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-semibold text-amber-800">User's payment reference</p>
                            <p className="font-mono text-amber-900 text-sm font-bold mt-0.5">{req.userPaymentRef}</p>
                            {req.userPaymentNote && <p className="text-amber-700 mt-0.5 italic">"{req.userPaymentNote}"</p>}
                            {req.paymentProofAt && <p className="text-amber-600 mt-0.5">Submitted {fmtDate(req.paymentProofAt)}</p>}
                          </div>
                        </div>
                      )}

                      {req.notes && (
                        <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                          <span className="font-medium">User note:</span> {req.notes}
                        </p>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end shrink-0">
                      {/* Primary action: Verify & Activate (proof received) */}
                      {proofReady && (
                        <button onClick={() => setVerifyModal(req)}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 shadow-sm transition-colors">
                          <ShieldCheck className="w-4 h-4" /> Verify &amp; Activate
                        </button>
                      )}

                      {/* Send Instructions — pending & approved */}
                      {(req.status === 'pending' || req.status === 'approved') && (
                        <button onClick={() => setInstructModal(req)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors">
                          <Mail className="w-4 h-4" />
                          {req.status === 'pending' ? 'Send Instructions' : 'Resend Instructions'}
                        </button>
                      )}

                      {/* Approve / Reject (pending only) */}
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(req._id)} disabled={actionLoading === req._id + '_approve'}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                            <CheckCircle className="w-4 h-4" />
                            {actionLoading === req._id + '_approve' ? 'Approving…' : 'Approve'}
                          </button>
                          <button onClick={() => handleReject(req._id)} disabled={actionLoading === req._id + '_reject'}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </>
                      )}

                      {/* Approved but no proof yet — manual override */}
                      {req.status === 'approved' && !hasProof && (
                        <div className="mt-1 lg:text-right">
                          <button onClick={() => setExpandedId(isExpanded ? null : req._id)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Manual override
                          </button>
                          {isExpanded && (
                            <div className="mt-2">
                              <button onClick={() => setVerifyModal(req)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
                                <DollarSign className="w-3.5 h-3.5" /> Mark as Paid (skip proof)
                              </button>
                              <p className="text-xs text-gray-400 mt-1 max-w-[160px]">Use only if you've confirmed payment outside this system.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {req.status === 'completed' && (
                        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Plan Active
                          {req.completedAt && <span className="font-normal text-green-600 ml-1">· {fmtDate(req.completedAt)}</span>}
                        </div>
                      )}

                      {req.status === 'rejected' && (
                        <span className="text-xs text-gray-400 italic">Rejected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <p className="text-xs text-gray-400 text-center pt-2">
            Showing {requests.length} of {total} {status} annual requests
          </p>
        </div>
      )}

      {/* Modals */}
      {instructModal && (
        <SendInstructionsModal request={instructModal} onClose={() => setInstructModal(null)} onSent={showToast} />
      )}
      {verifyModal && (
        <VerifyActivateModal
          request={verifyModal}
          onClose={() => setVerifyModal(null)}
          onActivated={(msg) => { showToast(msg); fetchRequests(); }}
        />
      )}
    </div>
  );
}
