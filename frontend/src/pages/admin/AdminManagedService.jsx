import { useState, useEffect, useRef } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import jsPDF from 'jspdf';
import {
  Trophy, Users, DollarSign, FileText, Plus, Edit2, Trash2, Loader,
  CheckCircle, XCircle, X, RefreshCw, ChevronDown, ChevronUp, Save, AlertTriangle,
  Search, UserPlus, Receipt, Bell, Link2, Upload, Download, ShieldCheck, Building2, Award, Zap
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';
function authH() {
  const token = localStorage.getItem('adminToken');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
async function api(path, method = 'GET', body) {
  try {
    const r = await fetch(`${BASE}/api/admin/managed-service${path}`, { method, headers: authH(), body: body ? JSON.stringify(body) : undefined });
    return await r.json();
  } catch (e) {
    console.error('Admin managed-service API error:', e.message);
    return { success: false, message: e.message };
  }
}

function fmt(n)   { return n ? `$${Number(n).toLocaleString()}` : '$0'; }
function fmtD(d)  { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }

function downloadInvoicePDF(inv, companyName) {
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
  field('Due Date:',       fmtD(inv.dueDate));
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

const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-700',
  active:    'bg-green-100 text-green-700',
  paused:    'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};
const BID_COLORS = {
  identified:  'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  submitted:   'bg-purple-100 text-purple-700',
  won:         'bg-green-100 text-green-700',
  lost:        'bg-red-100 text-red-600',
  cancelled:   'bg-gray-100 text-gray-500',
};
const INV_COLORS = {
  pending:   'bg-amber-100 text-amber-700',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-6 h-6" /></div>
      <div><p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p><p className="text-sm text-gray-500">{label}</p></div>
    </div>
  );
}

// ── Commission Config Panel ───────────────────────────────────────────────────
function CommissionConfig({ ms, onSaved }) {
  const [form, setForm] = useState({
    status:        ms.status,
    monthlyFee:    ms.monthlyFee,
    defaultRate:   ms.defaultRate,
    commissionCap: ms.commissionCap,
    useTiers:      ms.useTiers,
    tiers:         ms.tiers?.length ? ms.tiers : [{ label: 'Small', minValue: 0, maxValue: 100000, rate: 8 }, { label: 'Mid', minValue: 100001, maxValue: 500000, rate: 5 }, { label: 'Large', minValue: 500001, maxValue: null, rate: 3 }],
    notes:         ms.notes,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await api(`/${ms._id}`, 'PUT', form);
    if (res.success) onSaved(res.data);
    setSaving(false);
  };

  const setTier = (i, field, val) => {
    const tiers = [...form.tiers];
    tiers[i] = { ...tiers[i], [field]: val === '' ? null : (field === 'label' ? val : Number(val)) };
    setForm(f => ({ ...f, tiers }));
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
      <p className="font-bold text-gray-900 text-sm">Commission Configuration</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Monthly Fee ($)</label>
          <input type="number" value={form.monthlyFee} onChange={e => setForm(f => ({ ...f, monthlyFee: Number(e.target.value) }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Flat Rate (%)</label>
          <input type="number" value={form.defaultRate} onChange={e => setForm(f => ({ ...f, defaultRate: Number(e.target.value) }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Commission Cap ($)</label>
          <input type="number" value={form.commissionCap} onChange={e => setForm(f => ({ ...f, commissionCap: Number(e.target.value) }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      </div>

      {/* Tiered toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700">
        <input type="checkbox" checked={form.useTiers} onChange={e => setForm(f => ({ ...f, useTiers: e.target.checked }))}
          className="accent-indigo-600 w-4 h-4" />
        Use tiered commission rates instead of flat rate
      </label>

      {form.useTiers && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-semibold">Tiers</p>
          {form.tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-center">
              <input placeholder="Label" value={t.label || ''} onChange={e => setTier(i, 'label', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              <input type="number" placeholder="Min $" value={t.minValue ?? ''} onChange={e => setTier(i, 'minValue', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              <input type="number" placeholder="Max $ (blank=∞)" value={t.maxValue ?? ''} onChange={e => setTier(i, 'maxValue', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              <div className="flex items-center gap-1">
                <input type="number" placeholder="Rate %" value={t.rate ?? ''} onChange={e => setTier(i, 'rate', e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full" />
                <button onClick={() => setForm(f => ({ ...f, tiers: f.tiers.filter((_, j) => j !== i) }))}
                  className="text-red-400 hover:text-red-600 shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          <button onClick={() => setForm(f => ({ ...f, tiers: [...f.tiers, { label: '', minValue: 0, maxValue: null, rate: 5 }] }))}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Tier
          </button>
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Internal Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
        {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Configuration
      </button>
    </div>
  );
}

// ── Opportunity picker — search real SAM.gov opportunities to auto-fill a bid ──
function OpportunityPicker({ onPick }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  const search = (q) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (q.trim().length < 3) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      const res = await api(`/search-opportunities?q=${encodeURIComponent(q)}`);
      if (res.success) { setResults(res.data); setOpen(true); }
      setLoading(false);
    }, 350);
  };

  return (
    <div className="relative">
      <label className="text-xs text-gray-500 mb-1 block">Link a Real SAM.gov Opportunity (recommended)</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search by contract title, agency, or solicitation #…"
          className="w-full pl-9 pr-4 py-2.5 border border-indigo-200 bg-indigo-50/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {loading && <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {results.map(o => (
            <button key={o._id} type="button"
              onClick={() => { onPick(o); setQuery(o.title); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition border-b border-gray-50 last:border-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{o.title}</p>
              <p className="text-xs text-gray-500 truncate">{o.agency} · NAICS {o.naicsCode} {o.setAside ? `· ${o.setAside}` : ''} {o.estimatedValue ? `· $${Number(o.estimatedValue).toLocaleString()}` : ''}</p>
            </button>
          ))}
        </div>
      )}
      {open && !loading && query.trim().length >= 3 && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs text-gray-400 text-center">
          No matching opportunities found — you can still fill in the fields below manually.
        </div>
      )}
    </div>
  );
}

// ── Company eligibility profile — everything admin needs to know to bid well ──
function CompanyProfileCard({ company }) {
  if (!company) return null;
  const certLabels = { '8a': '8(a)', wosb: 'WOSB', edwosb: 'EDWOSB', hubzone: 'HUBZone', sdvosb: 'SDVOSB', vosb: 'VOSB', sdb: 'SDB', other: 'Other' };

  return (
    <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
      <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5"><Building2 className="w-4 h-4 text-indigo-500" /> Company Eligibility Profile</p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-gray-400">UEI</p>
          <p className="font-mono font-semibold text-gray-900 flex items-center gap-1">
            {company.uei || '—'}
            {company.ueiVerified && <ShieldCheck className="w-3.5 h-3.5 text-green-500" title="Verified" />}
          </p>
        </div>
        <div>
          <p className="text-gray-400">CAGE Code</p>
          <p className="font-mono font-semibold text-gray-900">{company.cage || '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-gray-400 mb-1">NAICS Codes</p>
          <div className="flex flex-wrap gap-1">
            {company.naicsCodes?.length ? company.naicsCodes.map(n => (
              <span key={n} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-mono text-[11px]">{n}</span>
            )) : <span className="text-gray-400">None on file</span>}
          </div>
        </div>
        <div className="col-span-2">
          <p className="text-gray-400 mb-1 flex items-center gap-1"><Award className="w-3 h-3" /> Certifications (set-aside eligibility)</p>
          <div className="flex flex-wrap gap-1">
            {company.certifications?.length ? company.certifications.map((c, i) => (
              <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-semibold text-[11px]">{certLabels[c.type] || c.type}</span>
            )) : <span className="text-gray-400">No certifications on file</span>}
          </div>
        </div>
        {company.capabilities && (
          <div className="col-span-2">
            <p className="text-gray-400 mb-1">Capabilities</p>
            <p className="text-gray-700 leading-relaxed">{company.capabilities}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bid documents — upload + list proposal/capability/contract files ─────────
function BidDocuments({ serviceId, bid, onChanged }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', file.name);
    fd.append('type', 'proposal');
    try {
      const token = localStorage.getItem('adminToken');
      const r = await fetch(`${BASE}/api/admin/managed-service/${serviceId}/bids/${bid._id}/documents`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const res = await r.json();
      if (res.success) onChanged();
      else alert(res.message || 'Upload failed');
    } catch { alert('Upload failed'); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const remove = async (docId) => {
    if (!window.confirm('Remove this document?')) return;
    await api(`/${serviceId}/bids/${bid._id}/documents/${docId}`, 'DELETE');
    onChanged();
  };

  return (
    <div className="mt-2 pl-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {(bid.documents || []).map(doc => (
          <a key={doc._id} href={`${BASE}${doc.url}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition group">
            <FileText className="w-3 h-3 shrink-0" /> <span className="max-w-[120px] truncate">{doc.name}</span>
            <button onClick={(e) => { e.preventDefault(); remove(doc._id); }} className="text-gray-300 group-hover:text-red-400 ml-0.5"><X className="w-3 h-3" /></button>
          </a>
        ))}
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-semibold hover:bg-indigo-100 disabled:opacity-50">
          {uploading ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload Document
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={e => upload(e.target.files?.[0])} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.png,.webp" />
      </div>
    </div>
  );
}

// ── Stable field component — must be outside BidForm to avoid remount on every keystroke ──
function BidField({ label, field, type = 'text', placeholder = '', value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(field, e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );
}

// ── Add/Edit Bid Form ─────────────────────────────────────────────────────────
function BidForm({ serviceId, bid, onSaved, onCancel }) {
  const empty = { contractTitle: '', solicitationNumber: '', agency: '', naicsCode: '', setAside: '', estimatedValue: '', deadline: '', status: 'identified', wonValue: '', notes: '', proposalUrl: '', opportunityId: null };
  const [form, setForm] = useState(bid ? { ...bid, estimatedValue: bid.estimatedValue || '', wonValue: bid.wonValue || '', deadline: bid.deadline ? bid.deadline.split('T')[0] : '' } : empty);
  const [saving, setSaving] = useState(false);
  const [linkedOpp, setLinkedOpp] = useState(bid?.opportunity || null);

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handlePickOpportunity = (opp) => {
    setLinkedOpp(opp);
    setForm(f => ({
      ...f,
      opportunityId:      opp._id,
      contractTitle:      opp.title,
      solicitationNumber: opp.solicitationNumber || f.solicitationNumber,
      agency:              opp.agency || '',
      naicsCode:           opp.naicsCode || '',
      setAside:            opp.setAside || '',
      estimatedValue:      opp.estimatedValue || '',
      deadline:            opp.dueDate ? opp.dueDate.split('T')[0] : f.deadline,
      proposalUrl:         opp.url || f.proposalUrl,
    }));
  };

  const save = async () => {
    if (!form.contractTitle.trim()) return;
    setSaving(true);
    const payload = { ...form, estimatedValue: Number(form.estimatedValue) || 0, wonValue: Number(form.wonValue) || 0 };
    const res = bid
      ? await api(`/${serviceId}/bids/${bid._id}`, 'PUT', payload)
      : await api(`/${serviceId}/bids`, 'POST', payload);
    if (res.success) onSaved(res.data);
    setSaving(false);
  };

  return (
    <div className="border border-indigo-100 rounded-2xl p-4 bg-indigo-50/30 space-y-3">
      <p className="font-bold text-gray-900 text-sm">{bid ? 'Edit Bid' : 'Add New Bid'}</p>

      {!bid && <OpportunityPicker onPick={handlePickOpportunity} />}
      {linkedOpp && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
          <Link2 className="w-3.5 h-3.5 shrink-0" /> Linked to a real SAM.gov opportunity — fields auto-filled from live data.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <BidField label="Contract Title *" field="contractTitle" placeholder="e.g. IT Support Services for DHS" value={form.contractTitle} onChange={handleChange} />
        </div>
        <BidField label="Solicitation Number" field="solicitationNumber" placeholder="e.g. 70RSAT24R00000001" value={form.solicitationNumber} onChange={handleChange} />
        <BidField label="Agency" field="agency" placeholder="e.g. Department of Homeland Security" value={form.agency} onChange={handleChange} />
        <BidField label="NAICS Code" field="naicsCode" placeholder="e.g. 541512" value={form.naicsCode} onChange={handleChange} />
        <BidField label="Set-Aside" field="setAside" placeholder="e.g. SDVOSB, 8(a), HUBZone" value={form.setAside} onChange={handleChange} />
        <BidField label="Estimated Value ($)" field="estimatedValue" type="number" placeholder="e.g. 500000" value={form.estimatedValue} onChange={handleChange} />
        <BidField label="Deadline" field="deadline" type="date" value={form.deadline} onChange={handleChange} />
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="identified">Identified</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {form.status === 'won' && (
          <BidField label="Actual Won Value ($) *" field="wonValue" type="number" placeholder="e.g. 480000" value={form.wonValue} onChange={handleChange} />
        )}
        <div className="sm:col-span-2">
          <BidField label="Proposal URL" field="proposalUrl" placeholder="https://drive.google.com/..." value={form.proposalUrl} onChange={handleChange} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Internal notes about this bid..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {bid ? 'Save Changes' : 'Add Bid'}
        </button>
      </div>
    </div>
  );
}

// ── Enroll Modal ──────────────────────────────────────────────────────────────
function EnrollModal({ onClose, onEnrolled }) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState({ monthlyFee: 299, defaultRate: 5, commissionCap: 50000, status: 'active' });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const timer = useRef(null);

  const search = (q) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const res = await api(`/search-users?q=${encodeURIComponent(q)}`);
      if (res.success) setResults(res.data);
    }, 300);
  };

  const enroll = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    const res = await api('/enroll', 'POST', { userId: selected._id, ...form });
    if (res.success) { onEnrolled(); onClose(); }
    else setError(res.message || 'Enrollment failed.');
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><UserPlus className="w-4 h-4 text-indigo-600" /> Enroll Company</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* User search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={query} onChange={e => search(e.target.value)} placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        {results.length > 0 && !selected && (
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 max-h-48 overflow-y-auto">
            {results.map(u => (
              <button key={u._id} onClick={() => { setSelected(u); setResults([]); setQuery(u.name); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 transition text-left ${u.alreadyEnrolled ? 'opacity-50' : ''}`}
                disabled={u.alreadyEnrolled}>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email} · {u.plan}</p>
                </div>
                {u.alreadyEnrolled && <span className="text-xs text-green-600 font-semibold">Enrolled</span>}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-indigo-900 text-sm">{selected.name}</p>
              <p className="text-xs text-indigo-600">{selected.email}</p>
            </div>
            <button onClick={() => { setSelected(null); setQuery(''); }} className="text-indigo-400 hover:text-indigo-600"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Monthly Fee ($)', field: 'monthlyFee' },
            { label: 'Commission Rate (%)', field: 'defaultRate' },
            { label: 'Commission Cap ($)', field: 'commissionCap' },
          ].map(({ label, field }) => (
            <div key={field} className={field === 'commissionCap' ? 'col-span-2' : ''}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input type="number" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Initial Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="active">Active (start immediately)</option>
              <option value="pending">Pending (await review)</option>
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button onClick={enroll} disabled={!selected || saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Enroll Company
        </button>
      </div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function ServiceDetail({ serviceId, onClose, onUpdate }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showCfg,   setShowCfg]   = useState(false);
  const [showBidForm, setShowBidForm] = useState(false);
  const [editBid,   setEditBid]   = useState(null);
  const [actionId,  setActionId]  = useState(null);

  useEffect(() => { load(); }, [serviceId]);

  const load = async () => {
    setLoading(true);
    const res = await api(`/${serviceId}`);
    if (res.success) setData(res);
    setLoading(false);
  };

  const handleGenerateMonthlyFee = async () => {
    if (!window.confirm('Generate a monthly fee invoice for this company?')) return;
    setActionId('monthly');
    const res = await api(`/${serviceId}/monthly-fee`, 'POST');
    if (res.success) { load(); onUpdate(); }
    else alert(res.message || 'Failed to generate invoice.');
    setActionId(null);
  };

  const handlePayInvoice = async (invId) => {
    const method = window.prompt('Payment method (e.g. Stripe, Wire):');
    if (!method) return;
    setActionId(invId);
    await api(`/invoices/${invId}/pay`, 'PUT', { paymentMethod: method });
    load(); onUpdate();
    setActionId(null);
  };

  const handleDeleteBid = async (bid) => {
    if (!window.confirm(`Delete bid "${bid.contractTitle}"?`)) return;
    setActionId(bid._id);
    await api(`/${serviceId}/bids/${bid._id}`, 'DELETE');
    load();
    setActionId(null);
  };

  const ms       = data?.data;
  const bids     = data?.bids     || [];
  const invoices = data?.invoices || [];
  const projects = data?.projects || [];
  const projectForBid = (bidId) => projects.find(p => p.managedBid?.toString?.() === bidId || p.managedBid === bidId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-full max-h-screen overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">{loading ? 'Loading…' : ms?.company?.name}</h2>
          <div className="flex items-center gap-2">
            {!loading && ms?.status === 'active' && (
              <button onClick={handleGenerateMonthlyFee} disabled={actionId === 'monthly'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition disabled:opacity-50">
                {actionId === 'monthly' ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                Monthly Fee
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader className="w-7 h-7 text-indigo-600 animate-spin" /></div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Owner info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{ms.owner?.name}</p>
                <p className="text-xs text-gray-500">{ms.owner?.email} · {ms.owner?.plan} plan</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_COLORS[ms.status]}`}>{ms.status}</span>
            </div>

            {/* Company eligibility profile — UEI, CAGE, NAICS, certifications */}
            <CompanyProfileCard company={ms.company} />

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xl font-bold text-gray-900">{bids.length}</p>
                <p className="text-xs text-gray-500">Total Bids</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xl font-bold text-green-700">{bids.filter(b=>b.status==='won').length}</p>
                <p className="text-xs text-gray-500">Won</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xl font-bold text-indigo-700">{fmt(invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount,0))}</p>
                <p className="text-xs text-gray-500">Collected</p>
              </div>
            </div>

            {/* Commission config toggle */}
            <button onClick={() => setShowCfg(!showCfg)}
              className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition">
              <span>Commission Configuration</span>
              {showCfg ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showCfg && <CommissionConfig ms={ms} onSaved={(d) => { setData(p => ({ ...p, data: d })); setShowCfg(false); onUpdate(); }} />}

            {/* Bids */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">Bids ({bids.length})</h3>
                <button onClick={() => { setShowBidForm(!showBidForm); setEditBid(null); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition">
                  <Plus className="w-3.5 h-3.5" /> Add Bid
                </button>
              </div>

              {showBidForm && !editBid && (
                <BidForm serviceId={ms._id} onSaved={() => { load(); setShowBidForm(false); onUpdate(); }} onCancel={() => setShowBidForm(false)} />
              )}

              <div className="space-y-2">
                {bids.map(bid => (
                  <div key={bid._id}>
                    {editBid?._id === bid._id ? (
                      <BidForm serviceId={ms._id} bid={bid} onSaved={() => { load(); setEditBid(null); onUpdate(); }} onCancel={() => setEditBid(null)} />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-gray-900 truncate">{bid.contractTitle}</p>
                              {bid.opportunity && <Link2 className="w-3 h-3 text-green-500 shrink-0" title="Linked to real SAM.gov data" />}
                            </div>
                            <p className="text-xs text-gray-500">{bid.agency || '—'} {bid.solicitationNumber ? `· ${bid.solicitationNumber}` : ''}</p>
                            {bid.status === 'won' && (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-xs font-semibold text-green-700">{fmt(bid.wonValue)} won · Total commission: {fmt(bid.commissionAmount)} ({bid.commissionRate}%)</p>
                                <p className="text-[11px] text-gray-500">Invoiced so far: {fmt(bid.commissionInvoiced)} — billed per milestone as the government pays</p>
                                {projectForBid(bid._id) && (
                                  <p className="text-[11px] text-indigo-600">
                                    Fulfillment project: <span className="font-mono">{projectForBid(bid._id).projectNumber}</span> — manage milestones &amp; gov payments in Subcontracting → Projects
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BID_COLORS[bid.status]}`}>{bid.status.replace('_',' ')}</span>
                            <button onClick={() => setEditBid(bid)} className="p-1 text-indigo-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteBid(bid)} disabled={actionId === bid._id} className="p-1 text-red-400 hover:text-red-600">
                              {actionId === bid._id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <BidDocuments serviceId={ms._id} bid={bid} onChanged={load} />
                      </div>
                    )}
                  </div>
                ))}
                {bids.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No bids added yet.</p>}
              </div>
            </div>

            {/* Invoices */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Commission Invoices ({invoices.length})</h3>
              <p className="text-xs text-gray-400 -mt-2 mb-3">Commission is billed per milestone — go to the fulfillment project to record each government payment as it's received.</p>
              {invoices.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No invoices yet. Win a bid, then record government payments per milestone in the fulfillment project.</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-600">{inv.invoiceNumber} <span className="text-gray-400 font-sans">· {inv.type === 'monthly_fee' ? 'Monthly Fee' : 'Commission'}</span></p>
                        <p className="text-sm font-bold text-gray-900">{fmt(inv.amount)}</p>
                        <p className="text-xs text-gray-500">{inv.commissionRate ? `${inv.commissionRate}% of ${fmt(inv.contractValue)} · ` : ''}Due {fmtD(inv.dueDate)}{inv.notes ? ` · ${inv.notes}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${INV_COLORS[inv.status]}`}>{inv.status}</span>
                        <button onClick={() => downloadInvoicePDF(inv, ms?.company?.name)}
                          className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50">
                          <Download className="w-3 h-3" /> PDF
                        </button>
                        {inv.status !== 'paid' && (
                          <button onClick={() => handlePayInvoice(inv._id)} disabled={actionId === inv._id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                            {actionId === inv._id ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminManagedService() {
  const [stats,        setStats]        = useState(null);
  const [services,     setServices]     = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [selected,     setSelected]     = useState(null);
  const [showEnroll,   setShowEnroll]   = useState(false);
  const [billingBusy,  setBillingBusy]  = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadList(); }, [page, statusFilter]);

  const loadStats = async () => {
    try {
      const res = await api('/stats');
      if (res.success) setStats(res.data);
    } catch {}
  };
  const loadList = async (q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (statusFilter) params.set('status', statusFilter);
      if (q ?? search)  params.set('search', q ?? search);
      const res = await api(`?${params}`);
      if (res.success) { setServices(res.data); setTotal(res.total); }
    } catch {}
    setLoading(false);
  };

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearch(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); loadList(q); }, 400);
  };

  const handleRunMonthlyBilling = async () => {
    if (!window.confirm('Generate monthly retainer fee invoices for every active company that has not been billed yet this month?')) return;
    setBillingBusy(true);
    const res = await api('/run-monthly-billing', 'POST');
    alert(res.message || (res.success ? 'Monthly billing run started.' : 'Failed to start billing run.'));
    setBillingBusy(false);
    loadStats(); loadList();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Trophy className="w-6 h-6 text-indigo-600" /> Managed Service<AdminHowItWorks page="managedService" /></h1>
          <p className="text-sm text-gray-500 mt-0.5">Commission-based contract winning program</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRunMonthlyBilling} disabled={billingBusy}
            title="Manually trigger monthly retainer fee billing for all active companies (also runs automatically on the 1st of each month)"
            className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold hover:bg-amber-100 transition disabled:opacity-50">
            {billingBusy ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Run Monthly Billing
          </button>
          <button onClick={() => setShowEnroll(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
            <UserPlus className="w-4 h-4" /> Enroll Company
          </button>
          <button onClick={() => { loadStats(); loadList(); }}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total"         value={stats?.total}              icon={Users}      color="bg-indigo-100 text-indigo-600" />
        <StatCard label="Active"        value={stats?.active}             icon={CheckCircle}color="bg-green-100 text-green-600" />
        <StatCard label="Pending"       value={stats?.pending}            icon={AlertTriangle} color="bg-amber-100 text-amber-600" />
        <StatCard label="Bids Won"      value={stats?.bids?.won}          icon={Trophy}     color="bg-purple-100 text-purple-600" />
        <StatCard label="Collected"     value={fmt(stats?.earnings?.paid)}icon={DollarSign} color="bg-teal-100 text-teal-600" />
      </div>

      {/* Earnings summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Pipeline',   value: fmt(stats.earnings.total),   color: 'text-gray-900' },
            { label: 'Pending Payment',  value: fmt(stats.earnings.pending),  color: 'text-amber-600' },
            { label: 'Collected',        value: fmt(stats.earnings.paid),     color: 'text-green-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={handleSearch} placeholder="Search by company name, owner name or email…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'active', 'paused', 'cancelled'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${statusFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader className="w-7 h-7 text-indigo-600 animate-spin" /></div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No managed service applications yet</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase">Company / Owner</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden sm:table-cell">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">Bids</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">Won</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden lg:table-cell">Rate</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden lg:table-cell">Earned</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{s.company?.name || '—'}</p>
                      <p className="text-xs text-gray-500">{s.owner?.name} · {s.owner?.email}</p>
                    </td>
                    <td className="px-4 py-4 text-center hidden sm:table-cell">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      <span className="font-semibold text-gray-700">{s.bidTotal}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      <span className="font-semibold text-green-700">{s.bidWon}</span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-gray-700">
                      {s.useTiers ? 'Tiered' : `${s.defaultRate}%`}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell font-semibold text-gray-900">
                      {fmt(s.totalEarned)}
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => setSelected(s._id)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > 15 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">Showing {services.length} of {total}</p>
                <div className="flex gap-2">
                  <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
                  <button disabled={services.length<15} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <ServiceDetail
          serviceId={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => { loadStats(); loadList(); }}
        />
      )}

      {showEnroll && (
        <EnrollModal
          onClose={() => setShowEnroll(false)}
          onEnrolled={() => { loadStats(); loadList(); setShowEnroll(false); }}
        />
      )}
    </div>
  );
}
