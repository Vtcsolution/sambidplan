import { useState, useEffect } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import {
  Package, MapPin, Truck, Clock, Users, DollarSign, CheckCircle, AlertTriangle,
  Plus, Edit2, Trash2, Save, Loader, ChevronDown, ChevronUp, X, FileText,
  Target, CreditCard, Search, RefreshCw, Award, ArrowRight, Receipt, Upload, ShieldCheck
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';
function authH() {
  const token = localStorage.getItem('adminToken');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
async function api(path, method = 'GET', body) {
  try {
    const r = await fetch(`${BASE}/api/admin/managed-projects${path}`, { method, headers: authH(), body: body ? JSON.stringify(body) : undefined });
    return await r.json();
  } catch (e) {
    console.error('Admin managed-projects API error:', e.message);
    return { success: false, message: e.message };
  }
}

function fmt(n) { return n ? `$${Number(n).toLocaleString()}` : '$0'; }
function fmtD(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }

const STATUS_COLORS = {
  draft:           'bg-gray-100 text-gray-600',
  rfq_open:        'bg-blue-100 text-blue-700',
  vendor_selected: 'bg-indigo-100 text-indigo-700',
  in_progress:     'bg-amber-100 text-amber-700',
  delivered:       'bg-purple-100 text-purple-700',
  payment_pending: 'bg-orange-100 text-orange-700',
  completed:       'bg-green-100 text-green-700',
  cancelled:       'bg-red-100 text-red-600',
};

const STATUS_LABELS = {
  draft: 'Draft', rfq_open: 'RFQ Open', vendor_selected: 'Vendor Selected',
  in_progress: 'In Progress', delivered: 'Delivered', payment_pending: 'Payment Pending',
  completed: 'Completed', cancelled: 'Cancelled',
};

const TRANSITIONS = {
  draft: ['rfq_open'], rfq_open: ['vendor_selected'], vendor_selected: ['in_progress'],
  in_progress: ['delivered'], delivered: ['payment_pending'], payment_pending: ['completed'],
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${color}`}><Icon className="w-4 h-4 text-white" /></div>
      <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-xs text-gray-500">{label}</p></div>
    </div>
  </div>
);

// ── Quote Form ───────────────────────────────────────────────────────────────
function QuoteForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { vendorName: '', vendorEmail: '', vendorPhone: '', vendorCompany: '', quoteAmount: '', deliveryTimeline: '', proposedApproach: '', vendorLocation: { city: '', state: '', country: '' }, costBreakdown: [] });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const setLoc = (k, v) => setF(p => ({ ...p, vendorLocation: { ...p.vendorLocation, [k]: v } }));
  return (
    <div className="space-y-3 bg-gray-50 rounded-xl p-4 border">
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Vendor Name *" value={f.vendorName} onChange={e => set('vendorName', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        <input placeholder="Vendor Email *" value={f.vendorEmail} onChange={e => set('vendorEmail', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        <input placeholder="Company" value={f.vendorCompany} onChange={e => set('vendorCompany', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        <input placeholder="Phone" value={f.vendorPhone} onChange={e => set('vendorPhone', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        <input type="number" placeholder="Quote Amount ($) *" value={f.quoteAmount} onChange={e => set('quoteAmount', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        <input type="number" placeholder="Delivery Timeline (days)" value={f.deliveryTimeline} onChange={e => set('deliveryTimeline', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        <input placeholder="City" value={f.vendorLocation?.city} onChange={e => setLoc('city', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        <input placeholder="Country" value={f.vendorLocation?.country} onChange={e => setLoc('country', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
      </div>
      <textarea placeholder="Proposed Approach" value={f.proposedApproach} onChange={e => set('proposedApproach', e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2 h-20" />
      <div className="flex gap-2">
        <button onClick={() => onSave(f)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"><Save className="w-3.5 h-3.5 inline mr-1" />Save Quote</button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
      </div>
    </div>
  );
}

// ── Milestone Form ───────────────────────────────────────────────────────────
function MilestoneForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { title: '', description: '', dueDate: '', paymentAmount: '', paymentPercentage: '' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-3 bg-gray-50 rounded-xl p-4 border">
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Milestone Title *" value={f.title} onChange={e => set('title', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        <input type="date" placeholder="Due Date" value={f.dueDate?.slice?.(0, 10) || f.dueDate || ''} onChange={e => set('dueDate', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        <input type="number" placeholder="Payment Amount ($)" value={f.paymentAmount} onChange={e => set('paymentAmount', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
        <input type="number" placeholder="Payment % of Total" value={f.paymentPercentage} onChange={e => set('paymentPercentage', e.target.value)} className="text-sm border rounded-lg px-3 py-2" />
      </div>
      <textarea placeholder="Description" value={f.description} onChange={e => set('description', e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2 h-16" />
      <div className="flex gap-2">
        <button onClick={() => onSave(f)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"><Save className="w-3.5 h-3.5 inline mr-1" />Save</button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
      </div>
    </div>
  );
}

// ── Milestone gov-payment recorder — drives commission billing ───────────────
function MilestoneGovPaymentForm({ projectId, milestoneId, onDone, onCancel }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true); setError('');
    const res = await api(`/${projectId}/milestones/${milestoneId}/gov-payment`, 'POST', { amount: Number(amount), receivedDate: date || undefined });
    if (res.success) onDone(res.data);
    else setError(res.message || 'Failed to record payment.');
    setSaving(false);
  };

  return (
    <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-emerald-800">Record what the government paid for this milestone — commission will be auto-calculated and invoiced.</p>
      <div className="flex gap-2 flex-wrap">
        <input type="number" placeholder="Amount ($) *" value={amount} onChange={e => setAmount(e.target.value)} className="w-32 text-sm border border-emerald-300 rounded-lg px-2 py-1.5" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm border border-emerald-300 rounded-lg px-2 py-1.5" />
        <button onClick={submit} disabled={saving} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
          {saving ? <Loader className="w-3 h-3 animate-spin" /> : <Receipt className="w-3 h-3" />} Record &amp; Generate Invoice
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50">Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Project documents — contract, SOW, delivery confirmation uploads ─────────
function ProjectDocuments({ projectId, documents = [], onChanged }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', file.name);
    fd.append('type', 'contract');
    try {
      const token = localStorage.getItem('adminToken');
      const r = await fetch(`${BASE}/api/admin/managed-projects/${projectId}/documents`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const res = await r.json();
      if (res.success) onChanged();
      else alert(res.message || 'Upload failed');
    } catch { alert('Upload failed'); }
    setUploading(false);
  };

  const remove = async (docId) => {
    if (!window.confirm('Remove this document?')) return;
    await api(`/${projectId}/documents/${docId}`, 'DELETE');
    onChanged();
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 border">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Documents ({documents.length})</h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {documents.map(doc => (
          <a key={doc._id} href={`${BASE}${doc.url}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition group">
            <FileText className="w-3 h-3 shrink-0" /> <span className="max-w-[140px] truncate">{doc.name}</span>
            <button onClick={(e) => { e.preventDefault(); remove(doc._id); }} className="text-gray-300 group-hover:text-red-400 ml-0.5"><X className="w-3 h-3" /></button>
          </a>
        ))}
        <label className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-semibold hover:bg-indigo-100 cursor-pointer">
          {uploading ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
          <input type="file" className="hidden" disabled={uploading} onChange={e => handleUpload(e.target.files?.[0])} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.png,.webp" />
        </label>
      </div>
    </div>
  );
}

// ── Project Detail Drawer ────────────────────────────────────────────────────
function ProjectDetail({ projectId, onClose, onRefresh }) {
  const [project, setProject] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showMsForm, setShowMsForm] = useState(false);
  const [progressNote, setProgressNote] = useState('');
  const [progressVal, setProgressVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [deliveryDeadline, setDeliveryDeadline] = useState('');
  const [deliveryAddr, setDeliveryAddr] = useState({});
  const [editDelivery, setEditDelivery] = useState(false);
  const [govPayMsId, setGovPayMsId] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await api(`/${projectId}`);
    if (res.success) {
      setProject(res.data);
      setQuotes(res.quotes || []);
      setMilestones(res.milestones || []);
      setDeliveryDeadline(res.data.deliveryDeadline?.slice?.(0, 10) || '');
      setDeliveryAddr(res.data.deliveryAddress || {});
    }
    setLoading(false);
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);

  if (loading) return <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-white" /></div>;
  if (!project) return null;

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    await api(`/${projectId}`, 'PUT', { status: newStatus });
    await load(); onRefresh(); setSaving(false);
  };

  const handleSaveDelivery = async () => {
    setSaving(true);
    await api(`/${projectId}`, 'PUT', { deliveryDeadline, deliveryAddress: deliveryAddr });
    await load(); setEditDelivery(false); setSaving(false);
  };

  const handleAddQuote = async (data) => {
    await api(`/${projectId}/quotes`, 'POST', data);
    setShowQuoteForm(false); await load();
  };

  const handleSelectVendor = async (quoteId) => {
    if (!confirm('Accept this quote and reject all others?')) return;
    setSaving(true);
    await api(`/${projectId}/select-vendor`, 'POST', { quoteId });
    await load(); onRefresh(); setSaving(false);
  };

  const handleAddMilestone = async (data) => {
    await api(`/${projectId}/milestones`, 'POST', data);
    setShowMsForm(false); await load();
  };

  const handleMilestoneStatus = async (msId, status) => {
    await api(`/${projectId}/milestones/${msId}`, 'PUT', { status });
    await load(); onRefresh();
  };

  const handleMilestonePay = async (msId) => {
    const ref = prompt('Payment reference (e.g. Wire-2024-001):');
    if (ref === null) return;
    await api(`/${projectId}/milestones/${msId}/pay`, 'POST', { paymentReference: ref });
    await load(); onRefresh();
  };

  const handleDeleteMilestone = async (msId) => {
    if (!confirm('Delete this milestone?')) return;
    await api(`/${projectId}/milestones/${msId}`, 'DELETE');
    await load();
  };

  const handleProgress = async () => {
    await api(`/${projectId}/progress`, 'PUT', { progress: Number(progressVal) || project.overallProgress, note: progressNote });
    setProgressNote(''); setProgressVal(''); await load(); onRefresh();
  };

  const nextStatuses = TRANSITIONS[project.status] || [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{project.title}</h2>
            <p className="text-xs text-gray-500">{project.projectNumber} · {project.agency}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status + Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[project.status]}`}>{STATUS_LABELS[project.status]}</span>
            {nextStatuses.map(s => (
              <button key={s} onClick={() => handleStatusChange(s)} disabled={saving}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" /> {STATUS_LABELS[s]}
              </button>
            ))}
            {project.status !== 'cancelled' && project.status !== 'completed' && (
              <button onClick={() => handleStatusChange('cancelled')} disabled={saving}
                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100">Cancel</button>
            )}
          </div>

          {/* Contract Info */}
          <div className="bg-gray-50 rounded-xl p-4 border">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Contract Info</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Value:</span> <span className="font-semibold text-green-700">{fmt(project.contractValue)}</span></div>
              <div><span className="text-gray-500">NAICS:</span> <span className="font-mono">{project.naicsCode || '—'}</span></div>
              <div><span className="text-gray-500">Solicitation:</span> <span className="font-mono">{project.solicitationNumber || '—'}</span></div>
              <div><span className="text-gray-500">Set-Aside:</span> {project.setAside || '—'}</div>
              <div><span className="text-gray-500">Owner:</span> {project.owner?.name || '—'}</div>
              <div><span className="text-gray-500">Company:</span> {project.company?.name || '—'}</div>
            </div>
          </div>

          {/* Documents */}
          <ProjectDocuments projectId={projectId} documents={project.documents || []} onChanged={load} />

          {/* Delivery */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2"><Truck className="w-4 h-4" /> Delivery</h3>
              <button onClick={() => setEditDelivery(!editDelivery)} className="text-xs text-amber-700 hover:underline">{editDelivery ? 'Cancel' : 'Edit'}</button>
            </div>
            {editDelivery ? (
              <div className="space-y-2">
                <input type="date" value={deliveryDeadline} onChange={e => setDeliveryDeadline(e.target.value)} className="text-sm border rounded-lg px-3 py-2 w-full" />
                <div className="grid grid-cols-2 gap-2">
                  {['street', 'city', 'state', 'zip', 'country', 'pointOfContact', 'phone', 'email'].map(k => (
                    <input key={k} placeholder={k.charAt(0).toUpperCase() + k.slice(1)} value={deliveryAddr[k] || ''} onChange={e => setDeliveryAddr(p => ({ ...p, [k]: e.target.value }))} className="text-sm border rounded-lg px-3 py-2" />
                  ))}
                </div>
                <button onClick={handleSaveDelivery} disabled={saving} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700"><Save className="w-3.5 h-3.5 inline mr-1" />Save Delivery</button>
              </div>
            ) : (
              <div className="text-sm space-y-1">
                <p><span className="text-amber-700">Deadline:</span> <strong>{fmtD(project.deliveryDeadline)}</strong></p>
                {project.deliveryAddress?.city && <p><span className="text-amber-700">Address:</span> {[project.deliveryAddress.street, project.deliveryAddress.city, project.deliveryAddress.state, project.deliveryAddress.zip, project.deliveryAddress.country].filter(Boolean).join(', ')}</p>}
                {project.deliveryAddress?.pointOfContact && <p><span className="text-amber-700">POC:</span> {project.deliveryAddress.pointOfContact} {project.deliveryAddress.phone}</p>}
              </div>
            )}
          </div>

          {/* Selected Vendor */}
          {project.selectedVendor?.name && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <h3 className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-2"><Award className="w-4 h-4" /> Selected Vendor</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-green-700">Name:</span> <strong>{project.selectedVendor.name}</strong></div>
                <div><span className="text-green-700">Company:</span> {project.selectedVendor.company || '—'}</div>
                <div><span className="text-green-700">Email:</span> {project.selectedVendor.email}</div>
                <div><span className="text-green-700">Quote:</span> <span className="font-semibold text-green-800">{fmt(project.selectedVendor.quoteAmount)}</span></div>
              </div>
            </div>
          )}

          {/* Quotes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Vendor Quotes ({quotes.length})</h3>
              <button onClick={() => setShowQuoteForm(!showQuoteForm)} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"><Plus className="w-3 h-3 inline mr-1" />Add Quote</button>
            </div>
            {showQuoteForm && <QuoteForm onSave={handleAddQuote} onCancel={() => setShowQuoteForm(false)} />}
            <div className="space-y-2 mt-2">
              {quotes.map(q => (
                <div key={q._id} className={`p-3 rounded-xl border ${q.status === 'accepted' ? 'bg-green-50 border-green-200' : q.status === 'rejected' ? 'bg-red-50 border-red-200 opacity-60' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{q.vendorName} {q.vendorCompany && `(${q.vendorCompany})`}</p>
                      <p className="text-xs text-gray-500">{q.vendorEmail} · {[q.vendorLocation?.city, q.vendorLocation?.country].filter(Boolean).join(', ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">{fmt(q.quoteAmount)}</p>
                      <p className="text-xs text-gray-500">{q.deliveryTimeline ? `${q.deliveryTimeline} days` : ''}</p>
                    </div>
                  </div>
                  {q.proposedApproach && <p className="text-xs text-gray-600 mt-1">{q.proposedApproach}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${q.status === 'accepted' ? 'bg-green-100 text-green-700' : q.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{q.status}</span>
                    {q.status === 'submitted' && project.status === 'rfq_open' && (
                      <button onClick={() => handleSelectVendor(q._id)} className="px-2.5 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">Accept & Select</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Target className="w-4 h-4" /> Milestones ({milestones.length})</h3>
              <button onClick={() => setShowMsForm(!showMsForm)} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"><Plus className="w-3 h-3 inline mr-1" />Add</button>
            </div>
            {showMsForm && <MilestoneForm onSave={handleAddMilestone} onCancel={() => setShowMsForm(false)} />}
            <div className="space-y-2 mt-2">
              {milestones.map((ms, i) => (
                <div key={ms._id} className="p-3 rounded-xl border bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${ms.status === 'approved' ? 'bg-green-100 text-green-700' : ms.status === 'in_progress' || ms.status === 'submitted' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                      <div>
                        <p className="font-semibold text-sm">{ms.title}</p>
                        {ms.description && <p className="text-xs text-gray-500">{ms.description}</p>}
                        <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          <span>Due: {fmtD(ms.dueDate)}</span>
                          <span>Vendor pay: {fmt(ms.paymentAmount)}</span>
                          <span className={`font-medium ${ms.paymentStatus === 'paid' ? 'text-green-600' : 'text-gray-500'}`}>{ms.paymentStatus}</span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs flex-wrap">
                          {ms.govPaymentReceived ? (
                            <span className="flex items-center gap-1 text-emerald-700 font-medium">
                              <ShieldCheck className="w-3 h-3" /> Gov paid {fmt(ms.govPaymentAmount)} · Commission {fmt(ms.commissionAmount)} invoiced
                            </span>
                          ) : (
                            <span className="text-gray-400">Government payment not yet recorded</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {ms.status === 'pending' && <button onClick={() => handleMilestoneStatus(ms._id, 'in_progress')} className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs hover:bg-amber-100">Start</button>}
                      {ms.status === 'in_progress' && <button onClick={() => handleMilestoneStatus(ms._id, 'submitted')} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">Submit</button>}
                      {ms.status === 'submitted' && (
                        <>
                          <button onClick={() => handleMilestoneStatus(ms._id, 'approved')} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100">Approve</button>
                          <button onClick={() => handleMilestoneStatus(ms._id, 'revision_needed')} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100">Revise</button>
                        </>
                      )}
                      {ms.status === 'approved' && ms.paymentStatus === 'unpaid' && (
                        <button onClick={() => handleMilestonePay(ms._id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1"><CreditCard className="w-3 h-3" />Pay Vendor</button>
                      )}
                      {!ms.govPaymentReceived && (
                        <button onClick={() => setGovPayMsId(govPayMsId === ms._id ? null : ms._id)} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs hover:bg-emerald-100 flex items-center gap-1"><Receipt className="w-3 h-3" />Gov Paid?</button>
                      )}
                      <button onClick={() => handleDeleteMilestone(ms._id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {govPayMsId === ms._id && (
                    <MilestoneGovPaymentForm
                      projectId={projectId}
                      milestoneId={ms._id}
                      onDone={() => { setGovPayMsId(null); load(); onRefresh(); }}
                      onCancel={() => setGovPayMsId(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
            <h3 className="text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> Progress: {project.overallProgress}%</h3>
            <div className="bg-indigo-200 rounded-full h-3 mb-3">
              <div className="bg-indigo-600 h-3 rounded-full transition-all" style={{ width: `${project.overallProgress}%` }} />
            </div>
            <div className="flex gap-2">
              <input type="number" placeholder="%" value={progressVal} onChange={e => setProgressVal(e.target.value)} className="w-20 text-sm border rounded-lg px-2 py-1.5" />
              <input placeholder="Add note..." value={progressNote} onChange={e => setProgressNote(e.target.value)} className="flex-1 text-sm border rounded-lg px-3 py-1.5" />
              <button onClick={handleProgress} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">Update</button>
            </div>
            {project.progressNotes?.length > 0 && (
              <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                {project.progressNotes.slice().reverse().map((n, i) => (
                  <div key={i} className="text-xs text-indigo-700 flex items-start gap-2">
                    <span className="text-indigo-400 shrink-0">{fmtD(n.date)}</span>
                    <span>{n.progress}% — {n.note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Government Payment — cumulative summary, driven by milestone-level recordings above */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <h3 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Government Payment (cumulative)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-emerald-700">Status:</span> <strong>{project.govPaymentStatus}</strong></div>
              <div><span className="text-emerald-700">Of contract value:</span> {fmt(project.contractValue)}</div>
              <div><span className="text-emerald-700">First received:</span> {fmtD(project.govPaymentReceivedDate)}</div>
              <div><span className="text-emerald-700">Total received:</span> <strong className="text-emerald-800">{fmt(project.govPaymentAmount)}</strong></div>
            </div>
            <p className="text-xs text-emerald-700 mt-2">Use "Gov Paid?" on each milestone above to record payments — commission is calculated and invoiced automatically per milestone.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminManagedProjects() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const loadStats = async () => { const r = await api('/stats'); if (r.success) setStats(r.data); };
  const loadProjects = async () => {
    setLoading(true);
    const q = new URLSearchParams({ page, limit: 15, ...(statusFilter !== 'all' && { status: statusFilter }), ...(search && { search }) });
    const r = await api(`?${q}`);
    if (r.success) { setProjects(r.data); setTotal(r.total); setPages(r.pages); }
    setLoading(false);
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadProjects(); }, [page, statusFilter, search]);

  const refresh = () => { loadStats(); loadProjects(); };

  return (
    <div className="p-4 sm:p-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Package className="w-6 h-6 text-indigo-600" /> Subcontracting Projects<AdminHowItWorks page="managedProjects" /></h1>
          <p className="text-sm text-gray-500">Manage post-win fulfillment, vendor quotes, milestones, and payments</p>
        </div>
        <button onClick={refresh} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard icon={Package} label="Total" value={stats.total} color="bg-indigo-500" />
          <StatCard icon={Clock} label="In Progress" value={stats.inProgress} color="bg-amber-500" />
          <StatCard icon={Truck} label="Delivered" value={stats.delivered} color="bg-purple-500" />
          <StatCard icon={DollarSign} label="Pending Payment" value={stats.paymentPending} color="bg-orange-500" />
          <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="bg-green-500" />
          <StatCard icon={DollarSign} label="Gov Received" value={fmt(stats.receivedGovPayment)} color="bg-emerald-600" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Search projects..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        {['all', 'draft', 'rfq_open', 'vendor_selected', 'in_progress', 'delivered', 'payment_pending', 'completed'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-2 rounded-lg text-xs font-medium ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No projects found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Project</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Vendor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Progress</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Value</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Deadline</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map(p => (
                <tr key={p._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(p._id)}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 truncate max-w-[200px]">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.projectNumber} · {p.agency}</p>
                  </td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span></td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">{p.selectedVendor?.name || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5"><div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${p.overallProgress}%` }} /></div>
                      <span className="text-xs text-gray-500">{p.overallProgress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700">{fmt(p.contractValue)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{fmtD(p.deliveryDeadline)}</td>
                  <td className="px-4 py-3"><button className="text-indigo-600 hover:underline text-xs font-semibold">Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50">Prev</button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page}/{pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedId && <ProjectDetail projectId={selectedId} onClose={() => setSelectedId(null)} onRefresh={refresh} />}
    </div>
  );
}
