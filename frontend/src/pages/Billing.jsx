import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt, Download, CheckCircle, Clock, XCircle,
  CreditCard, Loader2, ArrowUpRight, FileText, Send,
  AlertCircle, X, BadgeCheck
} from 'lucide-react';
import { paymentAPI } from '../services/api';
import jsPDF from 'jspdf';

const STATUS_STYLES = {
  paid:    { icon: CheckCircle, cls: 'text-green-600 bg-green-50 border-green-200',  label: 'Paid' },
  pending: { icon: Clock,       cls: 'text-amber-600 bg-amber-50 border-amber-200',  label: 'Pending' },
  failed:  { icon: XCircle,     cls: 'text-red-600   bg-red-50   border-red-200',    label: 'Failed' },
  refunded:{ icon: XCircle,     cls: 'text-gray-500  bg-gray-50  border-gray-200',   label: 'Refunded' },
};

const METHOD_LABEL = {
  stripe:   'Credit Card (Stripe)',
  paypal:   'PayPal',
  payoneer: 'Payoneer',
  balance:  'Referral Balance',
};

function downloadInvoicePDF(inv) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header band
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFontSize(16); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
  doc.text('INVOICE', margin, 16);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text('Sambid Notify', pageW - margin, 12, { align: 'right' });
  doc.text('support@sambid.co', pageW - margin, 18, { align: 'right' });

  // Invoice meta
  doc.setTextColor(30,30,30); doc.setFontSize(10);
  let y = 42;
  const field = (label, value) => {
    doc.setFont('helvetica','bold');   doc.text(label, margin, y);
    doc.setFont('helvetica','normal'); doc.text(String(value), margin + 55, y);
    y += 7;
  };

  field('Invoice Number:',  inv.invoiceNumber || inv._id);
  field('Date:',            inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '—');
  field('Plan:',            (inv.plan || '—').charAt(0).toUpperCase() + (inv.plan || '').slice(1));
  field('Billing Cycle:',   (inv.billingCycle || 'monthly').charAt(0).toUpperCase() + (inv.billingCycle || 'monthly').slice(1));
  field('Payment Method:',  METHOD_LABEL[inv.paymentMethod] || inv.paymentMethod || '—');
  field('Status:',          (inv.status || '').toUpperCase());

  y += 6;
  // Amount box
  doc.setFillColor(245, 245, 255);
  doc.roundedRect(margin, y, pageW - margin * 2, 18, 3, 3, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text('Total Amount Due', margin + 6, y + 11);
  doc.setFontSize(14); doc.setTextColor(79,70,229);
  doc.text(`$${Number(inv.amount || 0).toFixed(2)} USD`, pageW - margin - 6, y + 11, { align: 'right' });

  // Footer
  doc.setFontSize(8); doc.setTextColor(150); doc.setFont('helvetica','normal');
  doc.text('Thank you for your business. For billing questions, contact support@sambid.co', pageW/2, 285, { align: 'center' });

  doc.save(`sambid-invoice-${inv.invoiceNumber || inv._id}.pdf`);
}

const PLAN_PRICES = {
  starter:    { monthly: 29,  yearly: 278  },
  pro:        { monthly: 79,  yearly: 758  },
  enterprise: { monthly: 499, yearly: 4788 },
};

const getRequestStatus = (req) => {
  if (req.status === 'completed') return { label: 'Plan Active', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle };
  if (req.status === 'rejected')  return { label: 'Rejected',    color: 'text-red-600 bg-red-50 border-red-200',     icon: XCircle };
  if (req.status === 'approved' && req.paymentProofAt) return { label: 'Proof Submitted — Verifying', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock };
  if (req.status === 'approved') return { label: 'Instructions Sent — Action Required', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: CreditCard };
  if (req.status === 'pending' && req.instructionsSentAt) return { label: 'Instructions Sent — Action Required', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: CreditCard };
  return { label: 'Under Review', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Clock };
};

function SubmitProofModal({ request, onClose, onSuccess }) {
  const [ref,   setRef]   = useState('');
  const [note,  setNote]  = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  const planKey = request.requestedPlan || 'starter';
  const cycle   = request.billingCycle  || 'yearly';
  const amount  = PLAN_PRICES[planKey]?.[cycle === 'yearly' ? 'yearly' : 'monthly'] || 0;

  const handleSubmit = async () => {
    if (!ref.trim()) { setErr('Please enter your transaction ID or reference number.'); return; }
    setBusy(true); setErr('');
    try {
      await paymentAPI.submitPaymentProof(request._id, { userPaymentRef: ref.trim(), userPaymentNote: note.trim() });
      onSuccess('Payment proof submitted! Our team will verify your payment and activate your plan. You\'ll receive a confirmation email shortly.');
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-500" /> Confirm Your Payment
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Plan summary */}
          <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-indigo-900 capitalize">{planKey} {cycle === 'yearly' ? 'Annual' : 'Monthly'} Plan</p>
              <p className="text-indigo-600 text-2xl font-extrabold">${amount.toLocaleString()}</p>
            </div>
            <BadgeCheck className="w-10 h-10 text-indigo-300" />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-1.5">
            <p className="font-semibold">What to submit here:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Transaction ID or reference number from your payment</li>
              <li>Payoneer payment ID, bank transfer ref, or receipt number</li>
              <li>Any ID your bank or payment platform gave you</li>
            </ul>
            <p className="text-xs text-blue-600 mt-2">Our team will verify the payment in your payment platform and activate your plan. You'll get a confirmation email once it's live.</p>
          </div>

          {err && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" /> {err}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Transaction / Reference ID <span className="text-red-500">*</span>
            </label>
            <input
              value={ref}
              onChange={e => setRef(e.target.value)}
              placeholder="e.g. PAY-ABC12345XYZ or TXN-987654321"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Additional Details (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Payment date, sender account name, amount paid, or any other details that help us identify your payment…"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={busy}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {busy ? 'Submitting…' : 'Submit Payment Confirmation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Billing() {
  const [invoices,      setInvoices]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [planRequests,  setPlanRequests]  = useState([]);
  const [proofModal,    setProofModal]    = useState(null);
  const [toast,         setToast]         = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };

  useEffect(() => {
    paymentAPI.getInvoices()
      .then(res => setInvoices(res.data.invoices || res.data.data || []))
      .catch(() => setError('Unable to load billing history. Please try again.'))
      .finally(() => setLoading(false));

    paymentAPI.getMyPlanRequests()
      .then(res => setPlanRequests(res.data.data || []))
      .catch(() => {});
  }, []);

  const currentPlan = localStorage.getItem('userPlan') || 'free';

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
              <p className="text-sm text-gray-500">Download receipts and manage your subscription</p>
            </div>
          </div>
          <Link
            to="/pricing"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Upgrade Plan <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Current plan summary */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 text-white flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm mb-1">Current Plan</p>
            <p className="text-2xl font-bold capitalize">{currentPlan}</p>
            <p className="text-white/70 text-sm mt-1">
              {currentPlan === 'free' ? 'Free — no billing' : 'Billed monthly or annually'}
            </p>
          </div>
          <CreditCard className="w-12 h-12 text-white/30" />
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
            <BadgeCheck className="w-4 h-4 text-green-400 shrink-0" /> {toast}
          </div>
        )}

        {/* Annual Plan Requests panel */}
        {planRequests.length > 0 && (
          <div className="mb-8 space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-500" /> Your Plan Requests
            </h2>
            {planRequests.map(req => {
              const planKey    = req.requestedPlan || 'starter';
              const cycle      = req.billingCycle  || 'yearly';
              const amount     = PLAN_PRICES[planKey]?.[cycle === 'yearly' ? 'yearly' : 'monthly'] || 0;
              const ps         = getRequestStatus(req);
              const StatusIcon = ps.icon;
              const needsAction   = (req.status === 'approved' || req.instructionsSentAt) && !req.paymentProofAt && req.status !== 'completed';
              const proofSent     = !!req.paymentProofAt && req.status !== 'completed';
              const isActive      = req.status === 'completed';
              const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

              // Derive activation dates
              const startDate = req.completedAt ? fmtD(req.completedAt) : null;
              const endMs     = req.completedAt ? new Date(req.completedAt).getTime() + (cycle === 'yearly' ? 365 : 30) * 864e5 : null;
              const endDate   = endMs ? fmtD(new Date(endMs)) : null;

              // Steps
              const steps = [
                { label: 'Submitted',         done: true },
                { label: 'Instructions Sent', done: !!req.instructionsSentAt || req.status === 'approved' || isActive },
                { label: 'Payment Confirmed', done: !!req.paymentProofAt || isActive },
                { label: 'Plan Activated',    done: isActive },
              ];

              return (
                <div key={req._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  needsAction ? 'border-indigo-300 ring-1 ring-indigo-100' :
                  isActive    ? 'border-green-200' : 'border-gray-100'
                }`}>
                  {/* Action banner */}
                  {needsAction && (
                    <div className="bg-indigo-600 px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="text-white">
                        <p className="font-bold text-sm">Action required — complete your payment</p>
                        <p className="text-indigo-200 text-xs mt-0.5">
                          You received payment instructions{req.instructionsSentAt ? ` on ${fmtD(req.instructionsSentAt)}` : ''}. After paying, click the button to notify us.
                        </p>
                      </div>
                      <button onClick={() => setProofModal(req)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors shrink-0">
                        <Send className="w-4 h-4" /> I've Paid — Submit Confirmation
                      </button>
                    </div>
                  )}

                  {isActive && (
                    <div className="bg-green-600 px-5 py-3 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-white shrink-0" />
                      <div className="text-white">
                        <p className="font-bold text-sm">Plan Active!</p>
                        {startDate && endDate && (
                          <p className="text-green-100 text-xs mt-0.5">
                            Active from <strong>{startDate}</strong> to <strong>{endDate}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {proofSent && (
                    <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-xs font-semibold text-amber-700">
                        Payment proof submitted on {fmtD(req.paymentProofAt)} — our team is verifying. You'll get an email when your plan is activated.
                      </p>
                    </div>
                  )}

                  <div className="px-5 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-base font-bold text-gray-900 capitalize">
                            {planKey.charAt(0).toUpperCase() + planKey.slice(1)} {cycle === 'yearly' ? 'Annual' : 'Monthly'} Plan
                          </span>
                          <span className="text-base font-extrabold text-indigo-600">
                            ${amount.toLocaleString()}{cycle === 'yearly' ? '/yr' : '/mo'}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${ps.color}`}>
                            <StatusIcon className="w-3 h-3" /> {ps.label}
                          </span>
                        </div>

                        {/* Step tracker */}
                        <div className="flex flex-wrap items-center gap-1 mt-2.5">
                          {steps.map((step, i, arr) => (
                            <div key={i} className="flex items-center gap-1">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                                step.done ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                              }`}>
                                {step.done && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                {step.label}
                              </span>
                              {i < arr.length - 1 && <span className="text-gray-300 text-xs">→</span>}
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs text-gray-400 mt-2">
                          <span>Requested {fmtD(req.createdAt)}</span>
                          {req.paymentMethod && <span>Method: {req.paymentMethod.replace(/_/g, ' ')}</span>}
                          {req.userPaymentRef && (
                            <span>Your ref: <span className="font-mono font-semibold text-gray-600">{req.userPaymentRef}</span></span>
                          )}
                        </div>

                        {req.adminNotes && req.status === 'rejected' && (
                          <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
                            Rejection reason: {req.adminNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Invoice table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Payment History</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-500">{error}</div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No invoices yet.</p>
              {currentPlan === 'free' && (
                <Link to="/pricing" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
                  Upgrade to a paid plan →
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-5 gap-4 px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 rounded-t-xl">
                <span className="col-span-2">Invoice</span>
                <span>Plan</span>
                <span>Amount</span>
                <span className="text-right">Actions</span>
              </div>

              {invoices.map((inv) => {
                const s = STATUS_STYLES[inv.status] || STATUS_STYLES.pending;
                const StatusIcon = s.icon;
                return (
                  <div key={inv._id || inv.invoiceNumber} className="grid grid-cols-2 sm:grid-cols-5 gap-4 items-center px-6 py-4">
                    {/* Invoice number + date */}
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-gray-900">{inv.invoiceNumber || `INV-${inv._id?.slice(-6)}`}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : '—'}
                        {inv.billingCycle && <span className="ml-2 capitalize">· {inv.billingCycle}</span>}
                      </p>
                    </div>

                    {/* Plan + status */}
                    <div className="hidden sm:flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">{inv.plan || '—'}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border w-fit ${s.cls}`}>
                        <StatusIcon className="w-3 h-3" />
                        {s.label}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="hidden sm:block">
                      <p className="text-sm font-bold text-gray-900">${Number(inv.amount || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{METHOD_LABEL[inv.paymentMethod] || inv.paymentMethod || '—'}</p>
                    </div>

                    {/* Download */}
                    <div className="col-span-1 sm:col-span-1 flex justify-end">
                      {inv.status === 'paid' && (
                        <button
                          onClick={() => downloadInvoicePDF(inv)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Help note */}
        <p className="text-xs text-gray-400 text-center mt-6">
          Billing questions? Email{' '}
          <a href="mailto:billing@sambid.co" className="text-indigo-500 hover:underline">
            billing@sambid.co
          </a>
        </p>

      </div>

      {proofModal && (
        <SubmitProofModal
          request={proofModal}
          onClose={() => setProofModal(null)}
          onSuccess={(msg) => {
            showToast(msg);
            setProofModal(null);
            paymentAPI.getMyPlanRequests()
              .then(res => setPlanRequests(res.data.data || []))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
