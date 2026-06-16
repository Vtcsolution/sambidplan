import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, Copy, Download, Check, ChevronDown, ChevronUp,
  Building2, Calendar, DollarSign, Star, Trash2, Edit2, FileText,
  Loader2, Award, Users, Tag, ClipboardList, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { pastPerformanceAPI } from '../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const CONTRACT_TYPES  = ['FFP', 'T&M', 'Cost-Plus', 'IDIQ', 'BPA', 'CPFF', 'CPAF', 'Other'];
const ROLES           = ['Prime', 'Subcontractor', 'Teaming Partner'];
const CPARS_RATINGS   = ['Exceptional', 'Very Good', 'Satisfactory', 'Marginal', 'Unsatisfactory', 'Not Rated'];

const RATING_COLOR = {
  'Exceptional':   'bg-emerald-100 text-emerald-700',
  'Very Good':     'bg-green-100 text-green-700',
  'Satisfactory':  'bg-blue-100 text-blue-700',
  'Marginal':      'bg-amber-100 text-amber-700',
  'Unsatisfactory':'bg-red-100 text-red-700',
  'Not Rated':     'bg-gray-100 text-gray-500',
};

const fmt = (n) => n ? `$${Number(n).toLocaleString()}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
const toInput = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

const EMPTY_FORM = {
  projectTitle: '', contractNumber: '', taskOrderNumber: '', contractType: 'FFP',
  agencyName: '', subAgency: '', officeName: '',
  role: 'Prime', primeContractorName: '',
  originalValue: '', finalValue: '',
  startDate: '', endDate: '',
  naicsCode: '', setAside: '', placeOfPerformance: '',
  scopeSummary: '', keyDeliverables: [''], technologiesUsed: [''],
  cparsRating: 'Not Rated',
  pocName: '', pocTitle: '', pocEmail: '', pocPhone: '',
  keyPersonnel: [{ name: '', title: '', clearance: '' }],
  tags: '',
};

// ── Sub-components ────────────────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handle}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function ArrayField({ label, values, onChange, placeholder }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <button type="button" onClick={() => onChange([...values, ''])}
          className="text-xs text-indigo-600 hover:text-indigo-800">+ Add</button>
      </div>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input value={v} placeholder={placeholder}
              onChange={e => { const a = [...values]; a[i] = e.target.value; onChange(a); }}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none" />
            {values.length > 1 && (
              <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modal form ────────────────────────────────────────────────────────────────
function RecordModal({ record, onClose, onSaved }) {
  const isEdit = !!record?._id;
  const [form, setForm]       = useState(isEdit ? {
    ...record,
    startDate: toInput(record.startDate),
    endDate:   toInput(record.endDate),
    keyDeliverables:  record.keyDeliverables?.length  ? record.keyDeliverables  : [''],
    technologiesUsed: record.technologiesUsed?.length ? record.technologiesUsed : [''],
    keyPersonnel:     record.keyPersonnel?.length     ? record.keyPersonnel     : [{ name: '', title: '', clearance: '' }],
    tags: record.tags?.join(', ') || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');
  const [section, setSection] = useState('basic'); // basic | scope | poc | personnel

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.projectTitle.trim() || !form.agencyName.trim() || !form.scopeSummary.trim()) {
      setError('Project title, agency, and scope summary are required.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        keyDeliverables:  form.keyDeliverables.filter(Boolean),
        technologiesUsed: form.technologiesUsed.filter(Boolean),
        keyPersonnel:     form.keyPersonnel.filter(p => p.name),
        tags:             form.tags.split(',').map(t => t.trim()).filter(Boolean),
        originalValue:    form.originalValue ? Number(form.originalValue) : undefined,
        finalValue:       form.finalValue    ? Number(form.finalValue)    : undefined,
      };
      const { data } = isEdit
        ? await pastPerformanceAPI.update(record._id, payload)
        : await pastPerformanceAPI.create(payload);
      onSaved(data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic',     label: 'Contract Info' },
    { id: 'scope',     label: 'Scope & Work' },
    { id: 'poc',       label: 'Contact & Rating' },
    { id: 'personnel', label: 'Key Personnel' },
  ];

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEdit ? 'Edit Past Performance' : 'Add Past Performance'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Used in proposals as SF-330 Part II citations</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setSection(t.id)}
              className={`text-sm py-3 px-3 border-b-2 font-medium transition-colors ${
                section === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {section === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Project / Contract Title *</label>
                  <input value={form.projectTitle} onChange={e => set('projectTitle', e.target.value)}
                    className={inputCls} placeholder="e.g. Enterprise IT Support Services" required />
                </div>
                <div>
                  <label className={labelCls}>Contract Number</label>
                  <input value={form.contractNumber} onChange={e => set('contractNumber', e.target.value)}
                    className={inputCls} placeholder="e.g. GS-35F-0001X" />
                </div>
                <div>
                  <label className={labelCls}>Task Order Number</label>
                  <input value={form.taskOrderNumber} onChange={e => set('taskOrderNumber', e.target.value)}
                    className={inputCls} placeholder="Optional" />
                </div>
                <div>
                  <label className={labelCls}>Contract Type</label>
                  <select value={form.contractType} onChange={e => set('contractType', e.target.value)} className={inputCls}>
                    {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Your Role</label>
                  <select value={form.role} onChange={e => set('role', e.target.value)} className={inputCls}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                {form.role !== 'Prime' && (
                  <div className="col-span-2">
                    <label className={labelCls}>Prime Contractor Name</label>
                    <input value={form.primeContractorName} onChange={e => set('primeContractorName', e.target.value)}
                      className={inputCls} placeholder="Name of the prime contractor" />
                  </div>
                )}
                <div className="col-span-2">
                  <label className={labelCls}>Agency / Customer *</label>
                  <input value={form.agencyName} onChange={e => set('agencyName', e.target.value)}
                    className={inputCls} placeholder="e.g. Department of Veterans Affairs" required />
                </div>
                <div>
                  <label className={labelCls}>Sub-Agency / Component</label>
                  <input value={form.subAgency} onChange={e => set('subAgency', e.target.value)}
                    className={inputCls} placeholder="e.g. VHA, USCIS, USAF" />
                </div>
                <div>
                  <label className={labelCls}>Contracting Office</label>
                  <input value={form.officeName} onChange={e => set('officeName', e.target.value)}
                    className={inputCls} placeholder="Optional" />
                </div>
                <div>
                  <label className={labelCls}>Original Contract Value ($)</label>
                  <input type="number" min="0" value={form.originalValue} onChange={e => set('originalValue', e.target.value)}
                    className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Final Contract Value ($)</label>
                  <input type="number" min="0" value={form.finalValue} onChange={e => set('finalValue', e.target.value)}
                    className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>NAICS Code</label>
                  <input value={form.naicsCode} onChange={e => set('naicsCode', e.target.value)}
                    className={inputCls} placeholder="e.g. 541512" />
                </div>
                <div>
                  <label className={labelCls}>Set-Aside Type</label>
                  <input value={form.setAside} onChange={e => set('setAside', e.target.value)}
                    className={inputCls} placeholder="e.g. Small Business, 8(a)" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Place of Performance</label>
                  <input value={form.placeOfPerformance} onChange={e => set('placeOfPerformance', e.target.value)}
                    className={inputCls} placeholder="e.g. Washington, D.C. (Remote)" />
                </div>
              </div>
            </>
          )}

          {section === 'scope' && (
            <>
              <div>
                <label className={labelCls}>Scope Summary * <span className="font-normal text-gray-400">(2–4 sentences, used directly in proposals)</span></label>
                <textarea value={form.scopeSummary} onChange={e => set('scopeSummary', e.target.value)}
                  rows={5} className={inputCls}
                  placeholder="Describe the work performed, objectives met, and value delivered. This text will appear verbatim in SF-330 citations." required />
                <p className="text-xs text-gray-400 mt-1">{form.scopeSummary.length} chars</p>
              </div>
              <ArrayField label="Key Deliverables" values={form.keyDeliverables} onChange={v => set('keyDeliverables', v)}
                placeholder="e.g. Delivered 24/7 NOC monitoring platform" />
              <ArrayField label="Technologies / Skills" values={form.technologiesUsed} onChange={v => set('technologiesUsed', v)}
                placeholder="e.g. AWS, Python, Zero Trust Architecture" />
              <div>
                <label className={labelCls}>Tags <span className="font-normal text-gray-400">(comma-separated, for search)</span></label>
                <input value={form.tags} onChange={e => set('tags', e.target.value)}
                  className={inputCls} placeholder="e.g. cybersecurity, cloud, DoD, clearance" />
              </div>
            </>
          )}

          {section === 'poc' && (
            <>
              <div>
                <label className={labelCls}>CPARS Performance Rating</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CPARS_RATINGS.map(r => (
                    <button key={r} type="button" onClick={() => set('cparsRating', r)}
                      className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                        form.cparsRating === r
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>POC Full Name</label>
                  <input value={form.pocName} onChange={e => set('pocName', e.target.value)}
                    className={inputCls} placeholder="Contracting Officer or COR name" />
                </div>
                <div>
                  <label className={labelCls}>POC Title</label>
                  <input value={form.pocTitle} onChange={e => set('pocTitle', e.target.value)}
                    className={inputCls} placeholder="e.g. Contracting Officer" />
                </div>
                <div>
                  <label className={labelCls}>POC Phone</label>
                  <input value={form.pocPhone} onChange={e => set('pocPhone', e.target.value)}
                    className={inputCls} placeholder="(202) 555-0100" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>POC Email</label>
                  <input type="email" value={form.pocEmail} onChange={e => set('pocEmail', e.target.value)}
                    className={inputCls} placeholder="co.name@agency.gov" />
                </div>
              </div>
            </>
          )}

          {section === 'personnel' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Key Personnel</p>
                <button type="button"
                  onClick={() => set('keyPersonnel', [...form.keyPersonnel, { name: '', title: '', clearance: '' }])}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add Person</button>
              </div>
              {form.keyPersonnel.map((p, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                  <input value={p.name} placeholder="Full name"
                    onChange={e => { const a = [...form.keyPersonnel]; a[i] = { ...a[i], name: e.target.value }; set('keyPersonnel', a); }}
                    className={inputCls} />
                  <input value={p.title} placeholder="Title / Role"
                    onChange={e => { const a = [...form.keyPersonnel]; a[i] = { ...a[i], title: e.target.value }; set('keyPersonnel', a); }}
                    className={inputCls} />
                  <div className="flex gap-2">
                    <input value={p.clearance} placeholder="Clearance"
                      onChange={e => { const a = [...form.keyPersonnel]; a[i] = { ...a[i], clearance: e.target.value }; set('keyPersonnel', a); }}
                      className={inputCls} />
                    {form.keyPersonnel.length > 1 && (
                      <button type="button" onClick={() => set('keyPersonnel', form.keyPersonnel.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex gap-2">
            {tabs.map((t, i) => (
              <button key={t.id} type="button" onClick={() => setSection(t.id)}
                className={`w-2 h-2 rounded-full transition-colors ${section === t.id ? 'bg-indigo-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Add Record'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export modal ──────────────────────────────────────────────────────────────
function ExportModal({ record, onClose }) {
  const [text, setText]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pastPerformanceAPI.exportOne(record._id)
      .then(r => setText(r.data.data.text))
      .catch(() => setText('Export failed.'))
      .finally(() => setLoading(false));
  }, [record._id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">SF-330 Citation</h2>
            <p className="text-xs text-gray-400">{record.projectTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && <CopyBtn text={text} label="Copy All" />}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading
            ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            : <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200">{text}</pre>
          }
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function RecordCard({ record, onEdit, onDelete, onExport }) {
  const [expanded, setExpanded] = useState(false);

  const period = (record.startDate || record.endDate)
    ? `${fmtDate(record.startDate)} – ${fmtDate(record.endDate)}`
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-bold text-gray-900 leading-tight">{record.projectTitle}</h3>
              {record.cparsRating !== 'Not Rated' && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RATING_COLOR[record.cparsRating]}`}>
                  ★ {record.cparsRating}
                </span>
              )}
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{record.role}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-medium">{record.agencyName}</span>
              {record.subAgency && <><span className="text-gray-300">·</span><span>{record.subAgency}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onExport} title="Export as SF-330"
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={onEdit} title="Edit"
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} title="Delete"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Key metrics row */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {(record.finalValue || record.originalValue) && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <DollarSign className="w-3.5 h-3.5 text-green-500" />
              {fmt(record.finalValue || record.originalValue)}
            </div>
          )}
          {period && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {period}
            </div>
          )}
          {record.contractNumber && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <FileText className="w-3.5 h-3.5" />
              {record.contractNumber}
            </div>
          )}
          {record.contractType && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{record.contractType}</span>
          )}
          {record.usedInProposals > 0 && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <ClipboardList className="w-3 h-3" /> Used {record.usedInProposals}×
            </span>
          )}
        </div>

        {/* Scope preview */}
        <p className={`text-xs text-gray-500 mt-3 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
          {record.scopeSummary}
        </p>

        {/* Tags */}
        {record.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {record.tags.map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}

        {/* Expand toggle */}
        <button onClick={() => setExpanded(s => !s)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 mt-2 transition-colors">
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Less</> : <><ChevronDown className="w-3.5 h-3.5" /> More details</>}
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-500">
            {record.naicsCode        && <div><span className="font-medium text-gray-600">NAICS:</span> {record.naicsCode}</div>}
            {record.setAside         && <div><span className="font-medium text-gray-600">Set-Aside:</span> {record.setAside}</div>}
            {record.placeOfPerformance && <div><span className="font-medium text-gray-600">Location:</span> {record.placeOfPerformance}</div>}
            {record.pocName          && <div><span className="font-medium text-gray-600">POC:</span> {record.pocName}{record.pocTitle ? `, ${record.pocTitle}` : ''}</div>}
            {record.pocEmail         && <div><span className="font-medium text-gray-600">Email:</span> {record.pocEmail}</div>}
            {record.pocPhone         && <div><span className="font-medium text-gray-600">Phone:</span> {record.pocPhone}</div>}
            {record.keyDeliverables?.length > 0 && (
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Deliverables:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5">{record.keyDeliverables.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
            )}
            {record.technologiesUsed?.length > 0 && (
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Technologies:</span> {record.technologiesUsed.join(', ')}
              </div>
            )}
            {record.keyPersonnel?.length > 0 && (
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Key Personnel:</span>
                <div className="mt-1 space-y-0.5">
                  {record.keyPersonnel.map((p, i) => (
                    <div key={i}>{p.name}{p.title ? ` — ${p.title}` : ''}{p.clearance ? ` (${p.clearance})` : ''}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PastPerformancePage() {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [modal, setModal]           = useState(null); // null | 'add' | record (edit)
  const [exportRec, setExportRec]   = useState(null);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleting, setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
      if (filterRole)   params.role   = filterRole;
      if (filterRating) params.rating = filterRating;
      const { data } = await pastPerformanceAPI.getAll(params);
      setRecords(data.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, filterRole, filterRating]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (record) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r._id === record._id);
      if (idx >= 0) { const a = [...prev]; a[idx] = record; return a; }
      return [record, ...prev];
    });
    setModal(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await pastPerformanceAPI.remove(deleteId);
      setRecords(prev => prev.filter(r => r._id !== deleteId));
    } catch { /* ignore */ }
    finally { setDeleting(false); setDeleteId(null); }
  };

  const totalValue = records.reduce((s, r) => s + (r.finalValue || r.originalValue || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-indigo-600" /> Past Performance
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {records.length} contract{records.length !== 1 ? 's' : ''}
              {totalValue > 0 && <span className="ml-2 text-green-600 font-medium">{fmt(totalValue)} total value</span>}
              <span className="ml-2 text-gray-400">— one-click export for SF-330 proposals</span>
            </p>
          </div>
          <button onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, agency, contract #, scope…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none bg-white" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-300 outline-none text-gray-600">
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={filterRating} onChange={e => setFilterRating(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-300 outline-none text-gray-600">
            <option value="">All Ratings</option>
            {CPARS_RATINGS.map(r => <option key={r}>{r}</option>)}
          </select>
          {records.length > 1 && (
            <button
              onClick={async () => {
                const { data } = await pastPerformanceAPI.exportBatch();
                const blob = new Blob([data.data.text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                a.download = 'past-performance.txt'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-xl text-gray-600 hover:border-indigo-300 hover:text-indigo-600 bg-white transition-colors">
              <Download className="w-4 h-4" /> Export All
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <Award className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-gray-500 mb-1">
              {search || filterRole || filterRating ? 'No records match your filters' : 'No past performance records yet'}
            </h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
              {search || filterRole || filterRating
                ? 'Try adjusting your search or filters.'
                : 'Add your completed federal contracts to reuse them as SF-330 citations in every proposal.'}
            </p>
            {!search && !filterRole && !filterRating && (
              <button onClick={() => setModal('add')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" /> Add Your First Contract
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {records.map(r => (
              <RecordCard
                key={r._id}
                record={r}
                onEdit={() => setModal(r)}
                onExport={() => setExportRec(r)}
                onDelete={() => setDeleteId(r._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'add' || (modal && modal._id)) && (
        <RecordModal
          record={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {exportRec && <ExportModal record={exportRec} onClose={() => setExportRec(null)} />}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete this record?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently remove the past performance record and cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
