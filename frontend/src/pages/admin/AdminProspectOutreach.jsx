// frontend/src/pages/admin/AdminProspectOutreach.jsx
import AdminHowItWorks from '../../components/AdminHowItWorks';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Mail, Search, Loader2, Sparkles, Send, RefreshCw,
  CheckCircle, AlertCircle, X, Clock,
  Building2, History, ArrowLeft, Plus, UserPlus,
} from 'lucide-react';
import { adminProspectAPI } from '../../services/adminApi';
import { useAdminPermission } from '../../hooks/useAdminPermission';

const EMAIL_TYPES = [
  { id: 'intro',      label: 'Platform Intro',   emoji: '👋', desc: 'Introduce Sambid for the first time' },
  { id: 'features',   label: 'Key Features',      emoji: '⚡', desc: 'AI matching, SAM.gov alerts, competitor intel' },
  { id: 'competitor', label: 'vs Competitors',     emoji: '🏆', desc: 'Compare to GovWin IQ and Deltek' },
  { id: 'campaign',   label: 'Win Campaign',       emoji: '🎯', desc: 'Better BD with less manual work' },
  { id: 'cost',       label: 'Cost Saving',        emoji: '💰', desc: '$29/mo vs $1,500+/mo competitors' },
  { id: 'time',       label: 'Time Saving',        emoji: '⏱️', desc: 'Save 8+ hrs/week on SAM.gov monitoring' },
  { id: 'trial',      label: 'Free Trial',         emoji: '🎁', desc: '7-day Pro trial, no credit card' },
  { id: 'pricing',    label: 'Pricing & Plans',    emoji: '📋', desc: 'Starter $29, Pro $79, Enterprise $499' },
  { id: 'success',    label: 'Success Stories',    emoji: '✅', desc: '40% more wins, +$180K avg revenue' },
  { id: 'followup',   label: 'Follow Up',          emoji: '🔁', desc: 'Gentle nudge after no reply' },
];

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

const fmt = d => new Date(d).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

export default function AdminProspectOutreach() {
  const { can } = useAdminPermission();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const preId          = searchParams.get('id');

  if (!can('campaigns')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 text-sm">You don't have permission to access Email Outreach.<br/>Contact your administrator to enable the Campaigns permission.</p>
      </div>
    );
  }

  // DB prospect list (left panel)
  const [prospects, setProspects]     = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listSearch, setListSearch]   = useState('');
  const [selected, setSelected]       = useState(new Set());

  // Custom / manual emails
  const [customEmails, setCustomEmails]         = useState([]);
  const [showCustomForm, setShowCustomForm]     = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [customNameInput, setCustomNameInput]   = useState('');
  const [customEmailErr, setCustomEmailErr]     = useState('');

  // Email composer (right panel)
  const [activeType, setActiveType] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [subject, setSubject]       = useState('');
  const [bodyText, setBodyText]     = useState('');
  const [aiSource, setAiSource]     = useState('');
  const [genError, setGenError]     = useState('');
  const [sending, setSending]       = useState(false);
  const [result, setResult]         = useState(null);

  // History panel
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory]         = useState(null);
  const [histLoading, setHistLoading] = useState(false);

  // ── Load prospects with email ───────────────────────────────────────────────
  const loadProspects = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data } = await adminProspectAPI.getAll({ hasEmail: 'true', limit: 500, page: 1 });
      setProspects(data.data || []);
    } catch { /* ignore */ }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { loadProspects(); }, [loadProspects]);

  useEffect(() => {
    if (preId) setSelected(new Set([preId]));
  }, [preId, prospects.length]);

  // Load history when exactly 1 DB prospect selected
  useEffect(() => {
    if (selected.size !== 1) { setHistory(null); return; }
    const id = [...selected][0];
    setHistLoading(true);
    adminProspectAPI.getEmailHistory(id)
      .then(r => setHistory(r.data.data))
      .catch(() => setHistory(null))
      .finally(() => setHistLoading(false));
  }, [selected]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredProspects = prospects.filter(p => {
    if (!listSearch) return true;
    const q = listSearch.toLowerCase();
    return (
      p.companyName?.toLowerCase().includes(q) ||
      p.primaryEmail?.toLowerCase().includes(q) ||
      p.state?.toLowerCase().includes(q)
    );
  });

  const selectedProspects  = prospects.filter(p => selected.has(p._id));
  const totalRecipients    = selected.size + customEmails.length;

  // ── DB selection ────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setResult(null);
  };
  const selectAll   = () => setSelected(new Set(filteredProspects.map(p => p._id)));
  const clearSelect = () => setSelected(new Set());

  // ── Custom email handlers ───────────────────────────────────────────────────
  const addCustomEmail = async () => {
    const email = customEmailInput.trim().toLowerCase();
    setCustomEmailErr('');
    if (!email) return;
    if (!isValidEmail(email)) { setCustomEmailErr('Enter a valid email address'); return; }
    if (customEmails.find(e => e.email === email)) { setCustomEmailErr('Already added'); return; }

    const name = customNameInput.trim();
    setCustomEmails(prev => [...prev, { id: `${Date.now()}`, email, name }]);
    setCustomEmailInput('');
    setCustomNameInput('');
    setResult(null);

    // Save to database in the background, then refresh the list so it appears as a DB prospect
    try {
      const { data } = await adminProspectAPI.quickAdd({ email, companyName: name });
      if (data.success) {
        // Reload prospect list — the new entry will now appear in the DB section
        loadProspects();
        // If the saved prospect has an _id, swap the custom entry for the DB entry
        if (data.data?._id) {
          setCustomEmails(prev => prev.filter(e => e.email !== email));
          setSelected(s => new Set([...s, data.data._id]));
        }
      }
    } catch {
      // Adding failed silently — stays as custom entry and will still send
    }
  };

  const removeCustomEmail = (id) => {
    setCustomEmails(prev => prev.filter(e => e.id !== id));
    setResult(null);
  };

  // ── AI Generation ───────────────────────────────────────────────────────────
  const handleTypeSelect = async (type) => {
    if (totalRecipients === 0) return;
    setActiveType(type.id);
    setGenError('');
    setResult(null);
    setGenerating(true);
    setSubject('');
    setBodyText('');
    // Use first DB prospect for context; fall back to first custom email name
    const ctx = selectedProspects[0] || {
      companyName: customEmails[0]?.name || customEmails[0]?.email || '',
    };
    try {
      const { data } = await adminProspectAPI.generateEmail({
        templateType: type.id,
        prospectData: {
          companyName:       ctx.companyName,
          contactPersonName: ctx.contactPersonName,
          state:             ctx.state,
          city:              ctx.city,
          naicsCode:         ctx.naicsCode,
          naicsDescription:  ctx.naicsDescription,
          totalContractsWon: ctx.totalContractsWon,
          totalAwardAmount:  ctx.totalAwardAmount,
        },
      });
      if (data.success && data.data) {
        setSubject(data.data.subject || '');
        setBodyText(data.data.bodyText || '');
        setAiSource(data.data.source || '');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '';
      if (!msg.includes('429') && !msg.includes('quota') && !msg.includes('API key')) {
        setGenError(msg || 'Generation failed. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    const t = EMAIL_TYPES.find(t => t.id === activeType);
    if (t) handleTypeSelect(t);
  };

  // ── Send ─────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!subject.trim() || !bodyText.trim() || !totalRecipients) return;
    setSending(true);
    setResult(null);
    try {
      const { data } = await adminProspectAPI.sendProspectEmails({
        prospectIds:      selectedProspects.map(p => p._id),
        customRecipients: customEmails.map(e => ({ email: e.email, name: e.name })),
        subject:          subject.trim(),
        bodyText:         bodyText.trim(),
        templateType:     activeType || 'custom',
      });
      setResult(data.data);
      if (selected.size === 1) {
        const id = [...selected][0];
        adminProspectAPI.getEmailHistory(id).then(r => setHistory(r.data.data)).catch(() => {});
      }
    } catch (err) {
      setResult({ sent: 0, failed: totalRecipients, noEmail: 0,
        errors: [{ error: err.response?.data?.message || err.message }] });
    } finally {
      setSending(false);
    }
  };

  const currentType = EMAIL_TYPES.find(t => t.id === activeType);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ══════════════════════════════════════════════════════════════════
          LEFT PANEL — Company Selector + Custom Emails
      ══════════════════════════════════════════════════════════════════ */}
      <div className="w-72 xl:w-80 border-r border-gray-200 flex flex-col bg-white shrink-0">

        {/* Panel header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Recipients</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {loadingList ? 'Loading…' : `${prospects.length} companies with email`}
              </p>
            </div>
            <button onClick={() => navigate('/admin/prospects')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="w-3 h-3" /> All Prospects
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full pl-8 pr-8 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none"
            />
            {listSearch && (
              <button onClick={() => setListSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Bulk select + Add custom */}
          <div className="flex items-center gap-2 mt-2">
            {filteredProspects.length > 0 && (
              <button onClick={selectAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                All ({filteredProspects.length})
              </button>
            )}
            {selected.size > 0 && (
              <button onClick={clearSelect}
                className="text-xs text-gray-400 hover:text-red-500">
                Clear
              </button>
            )}
            <button
              onClick={() => { setShowCustomForm(s => !s); setCustomEmailErr(''); }}
              className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                showCustomForm
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              <UserPlus className="w-3 h-3" /> Add Custom
            </button>
          </div>
        </div>

        {/* Custom email form */}
        {showCustomForm && (
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
            <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Add any email address
            </p>
            <input
              value={customEmailInput}
              onChange={e => { setCustomEmailInput(e.target.value); setCustomEmailErr(''); }}
              onKeyDown={e => e.key === 'Enter' && addCustomEmail()}
              placeholder="email@company.com *"
              className="w-full px-3 py-1.5 text-xs border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none mb-1.5 bg-white"
            />
            <input
              value={customNameInput}
              onChange={e => setCustomNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomEmail()}
              placeholder="Name / Company (optional)"
              className="w-full px-3 py-1.5 text-xs border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none mb-2 bg-white"
            />
            {customEmailErr && (
              <p className="text-xs text-red-500 mb-1.5">{customEmailErr}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={addCustomEmail}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium transition-colors"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
              <button
                onClick={() => { setShowCustomForm(false); setCustomEmailErr(''); }}
                className="text-xs px-3 py-1.5 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Scrollable list: custom emails first, then DB prospects */}
        <div className="flex-1 overflow-y-auto">

          {/* Custom email entries */}
          {customEmails.map(e => (
            <div key={e.id}
              className="px-4 py-3 border-b border-amber-100 bg-amber-50 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                <Mail className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {e.name || e.email}
                </p>
                {e.name && <p className="text-xs text-amber-600 truncate">{e.email}</p>}
                <span className="text-xs text-amber-500">Custom</span>
              </div>
              <button onClick={() => removeCustomEmail(e.id)}
                className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* DB prospect list */}
          {loadingList ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No companies with email found</p>
            </div>
          ) : (
            filteredProspects.map(p => {
              const isSel = selected.has(p._id);
              const emailsSent = p.emailHistory?.length || 0;
              return (
                <button
                  key={p._id}
                  onClick={() => toggleSelect(p._id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 flex items-start gap-3 transition-colors ${
                    isSel ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                    isSel ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                  }`}>
                    {isSel && <CheckCircle className="w-3 h-3 text-white fill-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{p.companyName}</p>
                    <p className="text-xs text-indigo-600 truncate mt-0.5">{p.primaryEmail}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {p.state && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 rounded">{p.state}</span>}
                      {p.naicsCode && <span className="text-xs text-gray-400">{p.naicsCode}</span>}
                      {emailsSent > 0 && (
                        <span className="text-xs text-green-600 flex items-center gap-0.5">
                          <Mail className="w-2.5 h-2.5" />{emailsSent}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selection footer */}
        {totalRecipients > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-indigo-50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-indigo-700">
                {totalRecipients} {totalRecipients === 1 ? 'recipient' : 'recipients'} selected
                {customEmails.length > 0 && selected.size > 0 && (
                  <span className="text-xs font-normal text-indigo-500 ml-1">
                    ({selected.size} companies + {customEmails.length} custom)
                  </span>
                )}
              </p>
              <button onClick={() => { clearSelect(); setCustomEmails([]); }}
                className="text-xs text-indigo-400 hover:text-red-500">
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT PANEL — Email Composer
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto bg-gray-50 min-w-0">

        {/* Empty state */}
        {totalRecipients === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-semibold text-gray-600 mb-1">Select recipients to send email</h3>
            <p className="text-sm text-center max-w-xs">
              Choose companies from the list, or click <strong>Add Custom</strong> to type any email address manually.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-6 px-6 space-y-5">

            {/* To: header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To:</span>
                {selected.size === 1 && customEmails.length === 0 && (
                  <button
                    onClick={() => setShowHistory(s => !s)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border transition-colors ${
                      showHistory
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <History className="w-3 h-3" /> Email History
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {/* DB prospects */}
                {selectedProspects.map(p => (
                  <div key={p._id}
                    className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full">
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="font-medium">{p.companyName}</span>
                    <span className="opacity-60 truncate max-w-28">{p.primaryEmail}</span>
                    <button onClick={() => toggleSelect(p._id)}
                      className="ml-0.5 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* Custom emails */}
                {customEmails.map(e => (
                  <div key={e.id}
                    className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-2.5 py-1 rounded-full">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="font-medium">{e.name || e.email}</span>
                    {e.name && <span className="opacity-60 truncate max-w-28">{e.email}</span>}
                    <button onClick={() => removeCustomEmail(e.id)}
                      className="ml-0.5 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Email History (collapsible, only for single DB prospect) */}
            {showHistory && selected.size === 1 && customEmails.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Sent to {selectedProspects[0]?.companyName}
                  </h3>
                  <button
                    onClick={() => {
                      const id = [...selected][0];
                      setHistLoading(true);
                      adminProspectAPI.getEmailHistory(id)
                        .then(r => setHistory(r.data.data))
                        .catch(() => {})
                        .finally(() => setHistLoading(false));
                    }}
                    disabled={histLoading}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 disabled:opacity-40 transition-colors"
                    title="Refresh tracking data"
                  >
                    {histLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5" />
                    }
                    Refresh
                  </button>
                </div>
                {!histLoading && !history?.emailHistory?.length ? (
                  <div className="py-8 text-center text-gray-400 text-sm">
                    No emails sent to this company yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {[...(history?.emailHistory || [])].reverse().map((e, i) => (
                      <div key={i} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">{e.subject}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                {e.templateName || e.templateId}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {fmt(e.sentAt)}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{e.sentBy}</span>
                        </div>
                        {/* Tracking badges */}
                        {(e.openedAt || e.clickedAt) && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {e.openedAt && (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                                <span>📬</span> Opened
                                {e.openCount > 1 && <span className="text-green-500">×{e.openCount}</span>}
                                <span className="text-green-500 font-normal">· {fmt(e.openedAt)}</span>
                              </span>
                            )}
                            {e.clickedAt && (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                <span>🔗</span> Clicked
                                {e.clickCount > 1 && <span className="text-blue-500">×{e.clickCount}</span>}
                                <span className="text-blue-500 font-normal">· {fmt(e.clickedAt)}</span>
                              </span>
                            )}
                          </div>
                        )}
                        {!e.openedAt && !e.clickedAt && e.trackingId && (
                          <p className="text-xs text-gray-400 mt-1.5">Not opened yet</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 1 — Email type toggles */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Step 1 — Pick Email Type (AI auto-generates)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {EMAIL_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type)}
                    disabled={generating}
                    title={type.desc}
                    className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all ${
                      activeType === type.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-gray-50'
                    } ${generating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {activeType === type.id && generating && (
                      <span className="absolute top-1 right-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-500" />
                      </span>
                    )}
                    <span className="text-base leading-none">{type.emoji}</span>
                    <span className="text-center leading-tight text-xs">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generating state */}
            {generating && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Generating your email…</p>
                  <p className="text-xs text-indigo-500 mt-0.5">
                    Personalising for {selectedProspects[0]?.companyName || customEmails[0]?.name || customEmails[0]?.email || 'recipient'}
                  </p>
                </div>
              </div>
            )}

            {/* Generation error */}
            {genError && !generating && (
              <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Generation failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{genError}</p>
                </div>
              </div>
            )}

            {/* Step 2 — Editable email */}
            {!generating && (subject || bodyText) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Step 2 — Review & Edit
                    {aiSource && (
                      <span className={`ml-2 normal-case font-normal ${aiSource === 'template' ? 'text-amber-600' : 'text-indigo-500'}`}>
                        <Sparkles className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                        {aiSource === 'gemini' ? 'Gemini' : aiSource === 'gpt' ? 'GPT' : 'Template (add GEMINI_API_KEY for AI)'}
                      </span>
                    )}
                  </p>
                  <button onClick={handleRegenerate} disabled={generating}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 disabled:opacity-40 transition-colors">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject Line</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none font-medium text-gray-900"
                    placeholder="Subject…"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">Email Body</label>
                    <span className="text-xs text-gray-400">
                      {totalRecipients > 1
                        ? <><code className="bg-gray-100 px-1 rounded text-xs">{'{{companyName}}'}</code> personalises per recipient</>
                        : `${bodyText.length} chars`
                      }
                    </span>
                  </div>
                  <textarea
                    value={bodyText}
                    onChange={e => setBodyText(e.target.value)}
                    rows={13}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none text-gray-700 leading-relaxed resize-none"
                    placeholder="Email body…"
                  />
                </div>
              </div>
            )}

            {/* Send result */}
            {result && (
              <div className={`p-4 rounded-xl border ${result.sent > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.sent > 0
                    ? <CheckCircle className="w-5 h-5 text-green-600" />
                    : <AlertCircle className="w-5 h-5 text-red-600" />
                  }
                  <span className={`font-semibold text-sm ${result.sent > 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {result.sent > 0
                      ? `${result.sent} email${result.sent > 1 ? 's' : ''} sent!`
                      : 'Send failed'}
                  </span>
                </div>
                <div className="flex gap-4 text-xs">
                  {result.sent   > 0 && <span className="text-green-700">✓ Sent: {result.sent}</span>}
                  {result.noEmail> 0 && <span className="text-amber-600">⚠ No email: {result.noEmail}</span>}
                  {result.failed > 0 && <span className="text-red-600">✗ Failed: {result.failed}</span>}
                </div>
                {result.errors?.slice(0, 3).map((e, i) => (
                  <p key={i} className="text-xs text-red-600 mt-1">{e.name || ''}: {e.error}</p>
                ))}
              </div>
            )}

            <div className="h-4" />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STICKY SEND BAR
      ══════════════════════════════════════════════════════════════════ */}
      {totalRecipients > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between gap-4 shadow-lg">
          <div className="text-sm text-gray-600">
            {currentType
              ? <span><strong>{currentType.emoji} {currentType.label}</strong> → {totalRecipients} {totalRecipients === 1 ? 'recipient' : 'recipients'}</span>
              : <span className="text-gray-400">Pick a type above to generate the email</span>
            }
          </div>
          <div className="flex items-center gap-3">
            {result?.sent > 0 && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> {result.sent} sent
              </span>
            )}
            <button
              onClick={handleSend}
              disabled={!subject.trim() || !bodyText.trim() || sending || generating}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> Send to {totalRecipients} {totalRecipients === 1 ? 'Recipient' : 'Recipients'}</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
