import { useState, useEffect } from 'react';
import { Trophy, FileText, DollarSign, Clock, CheckCircle, XCircle, Loader, AlertTriangle, ChevronDown, ChevronUp, Briefcase, Package, MapPin, Target, Truck, ShieldCheck, Download, Link2, CreditCard } from 'lucide-react';
import { companyAPI } from '../../services/api';
import HowItWorks from '../../components/HowItWorks';
import jsPDF from 'jspdf';

const STATUS_META = {
  pending:     { label: 'Pending Review',  color: 'bg-amber-100 text-amber-700' },
  active:      { label: 'Active',          color: 'bg-green-100 text-green-700' },
  paused:      { label: 'Paused',          color: 'bg-gray-100 text-gray-600' },
  cancelled:   { label: 'Cancelled',       color: 'bg-red-100 text-red-600' },
};

const BID_STATUS = {
  identified:  { label: 'Identified',   color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress',  color: 'bg-indigo-100 text-indigo-700' },
  submitted:   { label: 'Submitted',    color: 'bg-purple-100 text-purple-700' },
  won:         { label: 'Won ✓',        color: 'bg-green-100 text-green-700' },
  lost:        { label: 'Lost',         color: 'bg-red-100 text-red-600' },
  cancelled:   { label: 'Cancelled',    color: 'bg-gray-100 text-gray-500' },
};

const INV_STATUS = {
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700' },
  sent:     { label: 'Sent',     color: 'bg-blue-100 text-blue-700' },
  paid:     { label: 'Paid',     color: 'bg-green-100 text-green-700' },
  overdue:  { label: 'Overdue',  color: 'bg-red-100 text-red-700' },
  cancelled:{ label: 'Cancelled',color: 'bg-gray-100 text-gray-500' },
};

function fmt(n) { return n ? `$${Number(n).toLocaleString()}` : '$0'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }

// ── PDF generation — matches the same layout used for plan billing invoices ──
function downloadCommissionInvoicePDF(inv, companyName) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFontSize(16); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', margin, 16);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Sambid Notify — Managed Service', pageW - margin, 12, { align: 'right' });
  doc.text('support@sambid.co', pageW - margin, 18, { align: 'right' });

  doc.setTextColor(30, 30, 30); doc.setFontSize(10);
  let y = 42;
  const field = (label, value) => {
    doc.setFont('helvetica', 'bold');   doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal'); doc.text(String(value), margin + 55, y);
    y += 7;
  };

  field('Invoice Number:', inv.invoiceNumber || inv._id);
  field('Bill To:',        companyName || '—');
  field('Type:',           inv.type === 'monthly_fee' ? 'Monthly Retainer Fee' : 'Commission');
  field('Date:',           inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—');
  field('Due Date:',       fmtDate(inv.dueDate));
  if (inv.contractValue > 0) field('Contract Value:', fmt(inv.contractValue));
  if (inv.commissionRate > 0) field('Commission Rate:', `${inv.commissionRate}%`);
  field('Payment Method:', inv.paymentMethod ? inv.paymentMethod.charAt(0).toUpperCase() + inv.paymentMethod.slice(1) : '—');
  field('Status:',         (inv.status || '').toUpperCase());
  if (inv.notes) field('Notes:', inv.notes);

  y += 6;
  doc.setFillColor(245, 245, 255);
  doc.roundedRect(margin, y, pageW - margin * 2, 18, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Total Amount Due', margin + 6, y + 11);
  doc.setFontSize(14); doc.setTextColor(79, 70, 229);
  doc.text(`$${Number(inv.amount || 0).toFixed(2)} USD`, pageW - margin - 6, y + 11, { align: 'right' });

  doc.setFontSize(8); doc.setTextColor(150); doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business. For billing questions, contact support@sambid.co', pageW / 2, 285, { align: 'center' });

  doc.save(`sambid-managed-service-${inv.invoiceNumber || inv._id}.pdf`);
}

export default function ManagedServicePage() {
  const [ms,         setMs]         = useState(null);
  const [bids,       setBids]       = useState([]);
  const [invoices,   setInvoices]   = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [applying,   setApplying]   = useState(false);
  const [expandBid,  setExpandBid]  = useState(null);
  const [expandProj, setExpandProj] = useState(null);
  const [projMilestones, setProjMilestones] = useState({});
  const [applyErr,   setApplyErr]   = useState('');
  const [payingId,   setPayingId]   = useState(null);
  const [payNotice,  setPayNotice]  = useState('');

  useEffect(() => { load(); }, []);

  // Handle return from Stripe Checkout — confirm the invoice payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get('invoiceId');
    if (params.get('invoice_paid') === '1' && invoiceId) {
      companyAPI.confirmInvoiceStripe(invoiceId, {})
        .then(res => { if (res.data.success) { setPayNotice('Payment successful — thank you!'); load(); } })
        .catch(() => setPayNotice('Payment received — refreshing your invoice status.'))
        .finally(() => window.history.replaceState({}, '', '/company/managed-service'));
    } else if (params.get('invoice_cancelled') === '1') {
      window.history.replaceState({}, '', '/company/managed-service');
    }
  }, []);

  const handlePayInvoice = async (invoiceId) => {
    setPayingId(invoiceId);
    try {
      const res = await companyAPI.payInvoiceStripe(invoiceId);
      if (res.data.success && res.data.data.url) {
        window.location.href = res.data.data.url;
        return;
      }
      alert(res.data.message || 'Could not start checkout.');
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed to start.');
    }
    setPayingId(null);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [msRes, projRes] = await Promise.all([
        companyAPI.getManagedService(),
        companyAPI.getMyProjects().catch(() => ({ data: { data: [] } })),
      ]);
      if (msRes.data.success) {
        setMs(msRes.data.data);
        setBids(msRes.data.bids || []);
        setInvoices(msRes.data.invoices || []);
      }
      if (projRes.data.success) {
        setProjects(projRes.data.data || []);
      }
    } catch {}
    setLoading(false);
  };

  const loadProjectDetail = async (projId) => {
    if (projMilestones[projId]) return;
    try {
      const res = await companyAPI.getMyProjectDetail(projId);
      if (res.data.success) {
        setProjMilestones(prev => ({ ...prev, [projId]: res.data.milestones || [] }));
      }
    } catch {}
  };

  const handleApply = async () => {
    setApplying(true);
    setApplyErr('');
    try {
      const res = await companyAPI.applyManagedService();
      if (res.data.success) { setMs(res.data.data); }
      else setApplyErr(res.data.message || 'Failed to apply.');
    } catch (err) {
      setApplyErr(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
    setApplying(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader className="w-7 h-7 text-indigo-600 animate-spin" /></div>;

  // Not applied yet
  if (!ms) return (
    <div className="max-w-2xl mx-auto py-16 text-center px-4">
      <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <Trophy className="w-8 h-8 text-indigo-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Win Contracts With Our Help</h1>
      <p className="text-gray-500 mb-2">Our team finds contracts, writes proposals, and manages your bids end-to-end.</p>
      <p className="text-gray-500 mb-8">We earn a commission only when <strong>you win</strong> — our success is your success.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
        {[
          { icon: FileText,   title: 'We find contracts', desc: 'Matched to your NAICS, certifications, and past performance' },
          { icon: Briefcase,  title: 'We write proposals', desc: 'Professional bid writing by GovCon experts' },
          { icon: DollarSign, title: 'Pay on win only',   desc: 'Commission taken from contract value — no win, no fee' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center mb-3">
              <Icon className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-1">{title}</p>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>

      {applyErr && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {applyErr}
          {applyErr.includes('company') && <a href="/company/profile" className="underline font-semibold ml-1">Create Company Profile →</a>}
        </div>
      )}
      <button onClick={handleApply} disabled={applying}
        className="flex items-center gap-2 mx-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
        {applying ? <Loader className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
        Apply for Managed Service
      </button>
      <p className="text-xs text-gray-400 mt-3">Our team will review your application and contact you within 24–48 hours.</p>
    </div>
  );

  const wonBids  = bids.filter(b => b.status === 'won');
  const activeBids = bids.filter(b => !['won','lost','cancelled'].includes(b.status));
  const pendingInv = invoices.filter(i => i.status === 'pending' || i.status === 'sent');
  const totalCommission = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Trophy className="w-6 h-6 text-indigo-600" /> Managed Service
            <HowItWorks title="Managed Bidding Service" steps={[
              { title: 'Apply for managed service', description: 'Sign up and our team reviews your company profile, NAICS codes, and certifications' },
              { title: 'We find matching contracts', description: 'Our team identifies real SAM.gov opportunities that match your capabilities and set-aside eligibility — linked directly, not generic templates' },
              { title: 'We write and submit proposals', description: 'Professional proposal writing using your real past performance and competitive positioning' },
              { title: 'You win — delivery begins immediately', description: 'A fulfillment project is created the moment you win, with milestones for the work ahead' },
              { title: 'Commission billed per milestone, not all at once', description: 'As the government pays for each milestone of the contract, we invoice our commission for just that portion — no surprise lump-sum bill at win time' },
            ]} dataUsed={['Your Company Profile', 'SAM.gov Opportunities', 'USASpending Competitors', 'Your Past Performance']} >
              <p className="text-sm font-semibold text-gray-700 mt-2">Full workflow:</p>
              <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                <li><strong>Apply</strong> → team reviews within 24-48 hours</li>
                <li><strong>Active</strong> → we identify bids, you see them here in real-time, with supporting documents</li>
                <li><strong>Won</strong> → fulfillment project created automatically, no waiting</li>
                <li><strong>Milestones</strong> → as the government pays each one, commission is billed for just that milestone — track progress below</li>
                <li>Connected to: <strong>Opportunities</strong>, <strong>AI Proposals</strong>, <strong>Subcontracting</strong> (admin side)</li>
              </ul>
            </HowItWorks>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Our team manages your federal contract bids end-to-end.</p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_META[ms.status]?.color || 'bg-gray-100 text-gray-600'}`}>
          {STATUS_META[ms.status]?.label || ms.status}
        </span>
      </div>

      {/* Payment confirmation banner */}
      {payNotice && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <p className="text-sm font-semibold text-green-800">{payNotice}</p>
        </div>
      )}

      {/* Pending notice */}
      {ms.status === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Application Under Review</p>
            <p className="text-xs text-amber-700 mt-0.5">Our team will contact you within 24–48 hours to confirm your commission rate and get started.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Bids',        value: bids.length,            icon: FileText,   color: 'bg-blue-100 text-blue-600' },
          { label: 'Active Bids',       value: activeBids.length,      icon: Clock,      color: 'bg-indigo-100 text-indigo-600' },
          { label: 'Contracts Won',     value: wonBids.length,         icon: Trophy,     color: 'bg-green-100 text-green-600' },
          { label: 'Commission Owed',   value: fmt(pendingInv.reduce((s,i)=>s+i.amount,0)), icon: DollarSign, color: 'bg-amber-100 text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Commission config */}
      {ms.status === 'active' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-indigo-500" /> Your Commission Agreement</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-gray-500 mb-0.5">Monthly Fee</p><p className="font-semibold text-gray-900">{fmt(ms.monthlyFee)}/mo</p></div>
            <div><p className="text-xs text-gray-500 mb-0.5">Commission Rate</p><p className="font-semibold text-gray-900">{ms.useTiers ? 'Tiered (see below)' : `${ms.defaultRate}%`}</p></div>
            <div><p className="text-xs text-gray-500 mb-0.5">Commission Cap</p><p className="font-semibold text-gray-900">{ms.commissionCap ? fmt(ms.commissionCap) : 'No cap'}</p></div>
          </div>
          {ms.useTiers && ms.tiers?.length > 0 && (
            <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left px-3 py-2 text-gray-500">Contract Value</th>
                  <th className="text-left px-3 py-2 text-gray-500">Rate</th>
                </tr></thead>
                <tbody>{ms.tiers.map((t, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2">{fmt(t.minValue)} – {t.maxValue ? fmt(t.maxValue) : 'No limit'}</td>
                    <td className="px-3 py-2 font-semibold text-indigo-700">{t.rate}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Active Bids */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Briefcase className="w-4 h-4 text-indigo-500" /> Active Bids ({activeBids.length})</h2>
        </div>
        {activeBids.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No active bids yet. Our team will add them once your service is active.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeBids.map(bid => (
              <div key={bid._id} className="p-4">
                <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpandBid(expandBid === bid._id ? null : bid._id)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{bid.contractTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{bid.agency || '—'} {bid.solicitationNumber ? `· ${bid.solicitationNumber}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BID_STATUS[bid.status]?.color}`}>{BID_STATUS[bid.status]?.label}</span>
                    {expandBid === bid._id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                {expandBid === bid._id && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
                      <div><p className="text-gray-400 mb-0.5">Est. Value</p><p className="font-medium">{fmt(bid.estimatedValue)}</p></div>
                      <div><p className="text-gray-400 mb-0.5">Deadline</p><p className="font-medium">{fmtDate(bid.deadline)}</p></div>
                      <div><p className="text-gray-400 mb-0.5">NAICS</p><p className="font-medium">{bid.naicsCode || '—'}</p></div>
                      <div><p className="text-gray-400 mb-0.5">Set-Aside</p><p className="font-medium">{bid.setAside || '—'}</p></div>
                      {bid.opportunity && (
                        <div className="col-span-2 sm:col-span-1"><p className="text-gray-400 mb-0.5">Source</p><p className="font-medium flex items-center gap-1 text-indigo-600"><Link2 className="w-3 h-3" /> Verified SAM.gov listing</p></div>
                      )}
                      {bid.notes && <div className="col-span-2 sm:col-span-3"><p className="text-gray-400 mb-0.5">Notes</p><p>{bid.notes}</p></div>}
                    </div>
                    {bid.documents?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {bid.documents.map(doc => (
                          <a key={doc._id} href={`${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}${doc.url}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition">
                            <Download className="w-3 h-3" /> {doc.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Won Bids */}
      {wonBids.length > 0 && (
        <div className="bg-white rounded-2xl border border-green-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-green-100 bg-green-50">
            <h2 className="font-bold text-green-800 flex items-center gap-2"><Trophy className="w-4 h-4 text-green-600" /> Won Contracts ({wonBids.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {wonBids.map(bid => {
              const pct = bid.commissionAmount > 0 ? Math.min(100, Math.round((bid.commissionInvoiced || 0) / bid.commissionAmount * 100)) : 0;
              return (
                <div key={bid._id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{bid.contractTitle}</p>
                      <p className="text-xs text-gray-500">{bid.agency || '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-green-700">{fmt(bid.wonValue)}</p>
                      <p className="text-xs text-gray-500">Total commission: {fmt(bid.commissionAmount)} ({bid.commissionRate}%)</p>
                    </div>
                  </div>
                  {/* Milestone billing progress */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 shrink-0">{fmt(bid.commissionInvoiced)} billed so far</span>
                  </div>
                  {bid.documents?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {bid.documents.map(doc => (
                        <a key={doc._id} href={`${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}${doc.url}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition">
                          <Download className="w-3 h-3" /> {doc.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Projects */}
      {projects.length > 0 && (
        <div className="bg-white rounded-2xl border border-indigo-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-indigo-100 bg-indigo-50">
            <h2 className="font-bold text-indigo-800 flex items-center gap-2"><Package className="w-4 h-4 text-indigo-600" /> Active Projects ({projects.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {projects.map(proj => {
              const isExpanded = expandProj === proj._id;
              const ms_list = projMilestones[proj._id] || [];
              const statusColors = {
                draft: 'bg-gray-100 text-gray-600', rfq_open: 'bg-blue-100 text-blue-700', vendor_selected: 'bg-indigo-100 text-indigo-700',
                in_progress: 'bg-amber-100 text-amber-700', delivered: 'bg-purple-100 text-purple-700', payment_pending: 'bg-orange-100 text-orange-700',
                completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600',
              };
              const statusLabels = {
                draft: 'Draft', rfq_open: 'RFQ Open', vendor_selected: 'Vendor Selected',
                in_progress: 'In Progress', delivered: 'Delivered', payment_pending: 'Payment Pending',
                completed: 'Completed', cancelled: 'Cancelled',
              };
              return (
                <div key={proj._id} className="p-4">
                  <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => { setExpandProj(isExpanded ? null : proj._id); if (!isExpanded) loadProjectDetail(proj._id); }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{proj.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{proj.projectNumber} · {proj.agency || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[proj.status]}`}>{statusLabels[proj.status]}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${proj.overallProgress || 0}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-indigo-600">{proj.overallProgress || 0}%</span>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      {/* Project details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
                        <div><p className="text-gray-400 mb-0.5">Contract Value</p><p className="font-semibold text-green-700">{fmt(proj.contractValue)}</p></div>
                        <div><p className="text-gray-400 mb-0.5">Deadline</p><p className="font-medium">{fmtDate(proj.deliveryDeadline)}</p></div>
                        <div><p className="text-gray-400 mb-0.5">NAICS</p><p className="font-medium">{proj.naicsCode || '—'}</p></div>
                        {proj.selectedVendor?.name && (
                          <div><p className="text-gray-400 mb-0.5">Vendor</p><p className="font-medium">{proj.selectedVendor.name}</p></div>
                        )}
                        <div><p className="text-gray-400 mb-0.5">Gov Payment</p><p className="font-medium capitalize">{proj.govPaymentStatus}</p></div>
                        {proj.govPaymentAmount > 0 && (
                          <div><p className="text-gray-400 mb-0.5">Gov Amount Received</p><p className="font-semibold text-green-700">{fmt(proj.govPaymentAmount)}</p></div>
                        )}
                      </div>

                      {/* Documents */}
                      {proj.documents?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {proj.documents.map(doc => (
                            <a key={doc._id} href={`${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}${doc.url}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition">
                              <Download className="w-3 h-3" /> {doc.name}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Delivery address */}
                      {proj.deliveryAddress?.city && (
                        <div className="text-xs text-gray-600 bg-amber-50 rounded-xl p-3 flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-800">Delivery Point</p>
                            <p>{[proj.deliveryAddress.street, proj.deliveryAddress.city, proj.deliveryAddress.state, proj.deliveryAddress.zip, proj.deliveryAddress.country].filter(Boolean).join(', ')}</p>
                            {proj.deliveryAddress.pointOfContact && <p className="mt-0.5">POC: {proj.deliveryAddress.pointOfContact} {proj.deliveryAddress.phone}</p>}
                          </div>
                        </div>
                      )}

                      {/* Milestones timeline */}
                      {ms_list.length > 0 && (
                        <div className="bg-white rounded-xl border p-3">
                          <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2"><Target className="w-3.5 h-3.5" /> Milestones</h4>
                          <div className="space-y-2">
                            {ms_list.map((m, i) => {
                              const msColors = { approved: 'bg-green-500', in_progress: 'bg-amber-500', submitted: 'bg-blue-500', pending: 'bg-gray-300', revision_needed: 'bg-red-500' };
                              return (
                                <div key={m._id} className="flex items-start gap-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${msColors[m.status] || 'bg-gray-300'}`}>{i + 1}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-semibold text-gray-900">{m.title}</p>
                                      <span className="text-[10px] text-gray-500 capitalize">{m.status?.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex gap-3 text-[10px] text-gray-400 mt-0.5 flex-wrap">
                                      {m.dueDate && <span>Due: {fmtDate(m.dueDate)}</span>}
                                      {m.govPaymentReceived ? (
                                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                          <ShieldCheck className="w-3 h-3" /> Gov paid {fmt(m.govPaymentAmount)} · Commission billed {fmt(m.commissionAmount)}
                                        </span>
                                      ) : (
                                        <span>Government payment pending</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Progress notes */}
                      {proj.progressNotes?.length > 0 && (
                        <div className="bg-indigo-50 rounded-xl p-3">
                          <h4 className="text-xs font-semibold text-indigo-800 mb-1.5">Recent Updates</h4>
                          {proj.progressNotes.slice(-3).reverse().map((n, i) => (
                            <p key={i} className="text-xs text-indigo-700 mb-0.5">
                              <span className="text-indigo-400">{fmtDate(n.date)}</span> — {n.progress}% — {n.note}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" /> Commission Invoices</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden sm:table-cell">Contract Value</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden sm:table-cell">Rate</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden sm:table-cell">Due</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-700">{fmt(inv.contractValue)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-700">{inv.commissionRate}%</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{fmt(inv.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${INV_STATUS[inv.status]?.color}`}>{INV_STATUS[inv.status]?.label}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">{fmtDate(inv.dueDate)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button
                          onClick={() => handlePayInvoice(inv._id)}
                          disabled={payingId === inv._id}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          {payingId === inv._id ? 'Starting…' : 'Pay Now'}
                        </button>
                      )}
                      <button
                        onClick={() => downloadCommissionInvoicePDF(inv, ms?.company?.name)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
