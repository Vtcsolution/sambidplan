import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, RefreshCw, Download, Search, Globe, Mail, Phone,
  ChevronLeft, ChevronRight, Loader2, X, CheckCircle,
  AlertCircle, Filter, Play, StopCircle, Trash2,
  BarChart3, Star, MapPin, Building2, Database, TrendingUp,
  ExternalLink, Check, ChevronDown, Send,
} from 'lucide-react';
import { adminProspectAPI } from '../../services/adminApi';
import ProspectEmailModal from '../../components/admin/ProspectEmailModal';
import ConfirmModal from '../../components/ConfirmModal';
import { useAdminPermission } from '../../hooks/useAdminPermission';

// ── Config ────────────────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  high:   { label: 'High',   color: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
};
const STATUS_CFG = {
  none:          { label: 'No Response',    color: 'text-gray-500' },
  replied:       { label: 'Replied',        color: 'text-blue-600' },
  interested:    { label: 'Interested',     color: 'text-green-600' },
  notInterested: { label: 'Not Interested', color: 'text-red-500' },
  converted:     { label: 'Converted',      color: 'text-purple-600' },
};
const WEBSITE_CFG = {
  active:   { label: 'Active',  color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Down',    color: 'bg-red-100 text-red-700' },
  unknown:  { label: 'Unknown', color: 'bg-gray-100 text-gray-500' },
};
const SOURCE_CFG = {
  usaspending: { label: 'USASpending', color: 'bg-emerald-100 text-emerald-700' },
  fpds:        { label: 'FPDS.gov',    color: 'bg-violet-100 text-violet-700' },
  sam:         { label: 'SAM.gov',     color: 'bg-blue-100 text-blue-700' },
};
const PHASE_LABELS = {
  phase1_usa:  'Phase 1 — USASpending.gov',
  phase1_fpds: 'Phase 1 — FPDS.gov',
  phase1_sam:  'Phase 1 — SAM.gov',
  phase2:      'Phase 2 — Enriching contacts',
  done:        'Sync complete',
};
const PHASE_COLORS = {
  phase1_usa:  'bg-emerald-500',
  phase1_fpds: 'bg-violet-500',
  phase1_sam:  'bg-blue-500',
  phase2:      'bg-indigo-500',
  done:        'bg-green-500',
};

const fmt  = n => ((n ?? 0)).toLocaleString();
const fmtM = n => {
  const v = Number(n) || 0;
  return v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`;
};

const EMPTY_FILTERS = {
  search: '', hasWebsite: '', hasEmail: '', hasPhone: '',
  priority: '', state: '', naicsCode: '', minAward: '', maxAward: '',
  contacted: '', responseStatus: '', websiteStatus: '', dataSource: '',
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, iconClass = 'bg-indigo-100', textClass = 'text-indigo-600' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 ${iconClass} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${textClass}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
        <p className="text-xl font-bold text-gray-900">{fmt(value)}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Sync Progress Bar ─────────────────────────────────────────────────────────
function SyncProgress({ state }) {
  // Only show when actively running or when a meaningful phase is set
  if (!state || !state.isRunning && !state.phase) return null;
  if (!state.isRunning && state.phase === 'idle') return null;

  const pct = state.percentComplete || 0;
  const bar = PHASE_COLORS[state.phase] || 'bg-gray-400';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {state.isRunning
            ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            : <CheckCircle className="w-4 h-4 text-green-600" />}
          <span className="font-semibold text-gray-800 text-sm">
            {PHASE_LABELS[state.phase] || (state.isRunning ? 'Running…' : 'Sync complete')}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-500">{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {[
          ['New Unique Companies',    fmt(state.phase1Saved)],
          ['Contract Records Read',   fmt(state.phase1Processed ?? state.phase1Saved)],
          ['Enriched',               fmt(state.phase2Saved)],
          ['Deleted (no contact)',   fmt(state.phase2Deleted)],
        ].map(([label, val]) => (
          <div key={label} className="text-center">
            <p className="text-gray-400 text-xs">{label}</p>
            <p className="font-bold text-gray-800">{val}</p>
          </div>
        ))}
      </div>
      {state.lastError && (
        <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{state.lastError}</span>
        </div>
      )}
    </div>
  );
}

// ── AI Finder Card ────────────────────────────────────────────────────────────
function AIFinderCard({ state, onStart, onStop }) {
  if (!state) return null;
  const { isRunning, total, processed, found, source, lastError, percentComplete } = state;
  return (
    <div className="bg-white rounded-xl border border-violet-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Star className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">AI Website Finder</p>
            <p className="text-xs text-gray-400">Gemini (Google Search) → GPT Web Search</p>
          </div>
        </div>
        {!isRunning ? (
          <button onClick={onStart}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg text-xs font-medium">
            <Play className="w-3 h-3" /> Find Websites with AI
          </button>
        ) : (
          <button onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium">
            <StopCircle className="w-3 h-3" /> Stop
          </button>
        )}
      </div>
      {(isRunning || processed > 0) && (
        <>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${percentComplete || 0}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-sm">
            {[
              ['Total', fmt(total), 'text-gray-800'],
              ['Processed', fmt(processed), 'text-gray-800'],
              ['Found', fmt(found), 'text-green-700'],
              ['Gemini', fmt(source?.gemini), 'text-violet-700'],
              ['GPT', fmt(source?.gpt), 'text-blue-700'],
            ].map(([label, val, cls]) => (
              <div key={label}>
                <p className="text-gray-400 text-xs">{label}</p>
                <p className={`font-bold ${cls}`}>{val}</p>
              </div>
            ))}
          </div>
          {lastError && (
            <div className="mt-2 flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg p-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{lastError}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 500, 1000];

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminProspects() {
  const { can, isAdmin } = useAdminPermission();
  // View the prospects list — support users with content permission can see data
  const canContent   = can('content');
  // Destructive / heavy operations (sync, enrich, clear, export) — admin/super_admin only
  const canManage    = isAdmin;
  const canAITools   = isAdmin && can('aiTools');  // AI Website Finder
  const canCampaigns = can('campaigns');            // Email Outreach

  const [stats, setStats]           = useState(null);
  const [prospects, setProspects]   = useState([]);
  const [limit, setLimit]           = useState(50);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading]       = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selected, setSelected]     = useState(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [syncState, setSyncState]   = useState(null);
  const [aiState, setAIState]       = useState(null);
  const [filters, setFilters]         = useState(EMPTY_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [confirmDlg,     setConfirmDlg]     = useState(null);

  const syncPollRef = useRef(null);
  const aiPollRef   = useRef(null);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const { data } = await adminProspectAPI.getStats();
      if (data.success) {
        setStats(data.data);
        setSyncState(data.data.syncState || null);
      }
    } catch { /* network error — ignore */ }
    finally { setStatsLoading(false); }
  }, []);

  const loadAIStatus = useCallback(async () => {
    try {
      const { data } = await adminProspectAPI.getAIFinderStatus();
      if (data.success) setAIState(data.data);
    } catch { /* ignore */ }
  }, []);

  const loadProspects = useCallback(async (pg) => {
    setLoading(true);
    try {
      const params = { page: pg, limit };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await adminProspectAPI.getAll(params);
      if (data.success) {
        setProspects(data.data);
        setPagination(data.pagination);
        setCurrentPage(data.pagination.page);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filters, limit]);

  // Load on mount
  useEffect(() => {
    loadStats();
    loadAIStatus();
  }, []); // eslint-disable-line

  // Reload prospects when filters change
  useEffect(() => {
    loadProspects(1);
  }, [loadProspects]);

  // Poll sync while running
  useEffect(() => {
    if (syncState?.isRunning && !syncPollRef.current) {
      syncPollRef.current = setInterval(loadStats, 4000);
    } else if (!syncState?.isRunning && syncPollRef.current) {
      clearInterval(syncPollRef.current);
      syncPollRef.current = null;
    }
    return () => { if (syncPollRef.current) { clearInterval(syncPollRef.current); syncPollRef.current = null; } };
  }, [syncState?.isRunning, loadStats]);

  // Poll AI finder while running
  useEffect(() => {
    if (aiState?.isRunning && !aiPollRef.current) {
      aiPollRef.current = setInterval(loadAIStatus, 3000);
    } else if (!aiState?.isRunning && aiPollRef.current) {
      clearInterval(aiPollRef.current);
      aiPollRef.current = null;
      loadStats();
    }
    return () => { if (aiPollRef.current) { clearInterval(aiPollRef.current); aiPollRef.current = null; } };
  }, [aiState?.isRunning, loadAIStatus, loadStats]);

  // ── Filter helpers ──────────────────────────────────────────────────────────
  const setFilter   = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  // ── Sync actions ────────────────────────────────────────────────────────────
  const handleStartSync    = async () => { try { await adminProspectAPI.startSync();   loadStats(); } catch (e) { alert(e.response?.data?.message || e.message); } };
  const handleCollectOnly  = async () => { try { await adminProspectAPI.collectOnly(); loadStats(); } catch (e) { alert(e.response?.data?.message || e.message); } };
  const handleEnrichOnly   = async () => { try { await adminProspectAPI.enrichOnly();  loadStats(); } catch (e) { alert(e.response?.data?.message || e.message); } };
  const handleStopSync     = async () => { try { await adminProspectAPI.stopSync(); setTimeout(loadStats, 1000); } catch (e) { alert(e.message); } };
  const handleClearAll = () => {
    setConfirmDlg({
      title:        'Delete ALL Prospects?',
      message:      'This will permanently delete every prospect in the database. This action cannot be undone.',
      confirmLabel: 'Delete All',
      onConfirm:    async () => {
        setConfirmDlg(null);
        try { await adminProspectAPI.clearAll(); loadStats(); loadProspects(1); } catch (e) { alert(e.message); }
      },
    });
  };

  // ── AI finder ───────────────────────────────────────────────────────────────
  const handleStartAI = async () => { try { await adminProspectAPI.startAIFinder(); loadAIStatus(); } catch (e) { alert(e.response?.data?.message || e.message); } };
  const handleStopAI  = async () => { try { await adminProspectAPI.stopAIFinder(); setTimeout(loadAIStatus, 500); } catch (e) { alert(e.message); } };

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = async (type) => {
    try {
      const params = { type };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await adminProspectAPI.export(params);
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `prospects_${type}_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert('Export failed: ' + e.message); }
  };

  // ── CRM ─────────────────────────────────────────────────────────────────────
  const handleMarkContacted = async (id) => { try { await adminProspectAPI.markContacted(id, { contactedBy: 'Admin' }); loadProspects(currentPage); } catch { /* */ } };
  const handleBulkContacted = async () => {
    if (!selected.size) return;
    try { await adminProspectAPI.bulkMarkContacted({ ids: [...selected], contactedBy: 'Admin' }); setSelected(new Set()); loadProspects(currentPage); } catch (e) { alert(e.message); }
  };
  const handleStatus = async (id, status) => { try { await adminProspectAPI.updateStatus(id, { status }); loadProspects(currentPage); } catch { /* */ } };
  const handleDelete = (id) => {
    setConfirmDlg({
      title:        'Delete Prospect?',
      message:      'This prospect record will be permanently removed.',
      confirmLabel: 'Delete',
      onConfirm:    async () => {
        setConfirmDlg(null);
        try { await adminProspectAPI.deleteOne(id); loadProspects(currentPage); loadStats(); } catch { /* */ }
      },
    });
  };

  // ── Selection ───────────────────────────────────────────────────────────────
  const toggleSelect    = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelected(s => s.size === prospects.length && prospects.length > 0 ? new Set() : new Set(prospects.map(p => p._id)));

  const isSyncRunning = !!syncState?.isRunning;
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <ConfirmModal
        isOpen={!!confirmDlg}
        title={confirmDlg?.title || ''}
        message={confirmDlg?.message}
        confirmLabel={confirmDlg?.confirmLabel}
        variant="danger"
        onConfirm={() => confirmDlg?.onConfirm?.()}
        onCancel={() => setConfirmDlg(null)}
      />

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Federal Prospects</h1>
          <p className="text-sm text-gray-500 mt-0.5">All federal awardees — small, medium &amp; large — from USASpending &amp; SAM.gov</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            !isSyncRunning ? (
              <>
                <button onClick={handleStartSync}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                  <Play className="w-3.5 h-3.5" /> Full Sync
                </button>
                <button onClick={handleCollectOnly}
                  title="Phase 1 only: save companies to DB without enriching"
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
                  <Database className="w-3.5 h-3.5" /> Collect
                </button>
                {stats && stats.total > 0 && (
                  <button onClick={handleEnrichOnly}
                    title={`Enrich ${stats.pendingEnrichment ?? 0} pending companies`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium">
                    <Star className="w-3.5 h-3.5" /> Enrich
                    {stats.pendingEnrichment > 0 && (
                      <span className="ml-1 bg-white/20 text-white text-xs rounded-full px-1.5">{fmt(stats.pendingEnrichment)}</span>
                    )}
                  </button>
                )}
              </>
            ) : (
              <button onClick={handleStopSync}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">
                <StopCircle className="w-3.5 h-3.5" /> Stop
              </button>
            )
          )}

          {/* Export — admin/super_admin only */}
          {canManage && (
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium">
                <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-44 hidden group-hover:block py-1">
                {[['all','All Records'],['email','Email List'],['phone','Phone List'],['website','Website List'],['contact','Contact Sheet']].map(([t,l]) => (
                  <button key={t} onClick={() => handleExport(t)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Clear All — admin/super_admin only */}
          {canManage && (
            <button onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-sm font-medium">
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
          {canCampaigns && (
            <button onClick={() => navigate('/admin/prospect-outreach')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
              <Send className="w-3.5 h-3.5" /> Email Outreach
            </button>
          )}
          <button onClick={() => { loadStats(); loadProspects(currentPage); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Sync progress ── */}
      <SyncProgress state={syncState} />

      {/* ── AI finder — only shown when aiTools permission is granted ── */}
      {canAITools && <AIFinderCard state={aiState} onStart={handleStartAI} onStop={handleStopAI} />}

      {/* ── Stats ── */}
      {statsLoading ? (
        <div className="flex items-center justify-center h-32 mb-6">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-9 gap-3 mb-6">
          <StatCard icon={Users}       label="Total"          value={stats.total}               iconClass="bg-indigo-100"  textClass="text-indigo-600" />
          <StatCard icon={Globe}       label="With Website"   value={stats.withWebsite}         iconClass="bg-blue-100"   textClass="text-blue-600"   sub={`${stats.total ? Math.round(stats.withWebsite/stats.total*100) : 0}%`} />
          <StatCard icon={Mail}        label="With Email"     value={stats.withEmail}           iconClass="bg-violet-100" textClass="text-violet-600" />
          <StatCard icon={Phone}       label="With Phone"     value={stats.withPhone}           iconClass="bg-green-100"  textClass="text-green-600" />
          <StatCard icon={CheckCircle} label="All 3"          value={stats.withAll}             iconClass="bg-emerald-100" textClass="text-emerald-600" />
          <StatCard icon={TrendingUp}  label="High Priority"  value={stats.priority?.high}      iconClass="bg-red-100"    textClass="text-red-600" />
          <StatCard icon={BarChart3}   label="Med Priority"   value={stats.priority?.medium}    iconClass="bg-amber-100"  textClass="text-amber-600" />
          <StatCard icon={Users}       label="Contacted"      value={stats.crm?.contacted}      iconClass="bg-purple-100" textClass="text-purple-600" />
          <StatCard icon={Database}    label="Pending Enrich" value={stats.pendingEnrichment}   iconClass="bg-orange-100" textClass="text-orange-600" sub="Click Enrich" />
        </div>
      ) : null}

      {/* ── Source breakdown ── */}
      {stats?.sources && Object.keys(stats.sources).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(stats.sources).map(([src, count]) => {
            const cfg = SOURCE_CFG[src] || { label: src, color: 'bg-gray-100 text-gray-600' };
            return (
              <span key={src} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                {cfg.label}: {fmt(count)}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={filters.search} onChange={e => setFilter('search', e.target.value)}
              placeholder="Search name, email, UEI, CAGE…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>

          {/* Individual contact toggles */}
          {[
            { key: 'hasWebsite', icon: Globe,  label: 'Website', on: 'bg-blue-600 text-white border-blue-600',   off: 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600' },
            { key: 'hasEmail',   icon: Mail,   label: 'Email',   on: 'bg-violet-600 text-white border-violet-600', off: 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600' },
            { key: 'hasPhone',   icon: Phone,  label: 'Phone',   on: 'bg-green-600 text-white border-green-600',  off: 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-600' },
          ].map(({ key, icon: Icon, label, on, off }) => (
            <button key={key}
              onClick={() => setFilter(key, filters[key] === 'true' ? '' : 'true')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${filters[key] === 'true' ? on : off}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}

          {/* Priority */}
          <select value={filters.priority} onChange={e => setFilter('priority', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-300 outline-none">
            <option value="">Any Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Response status */}
          <select value={filters.responseStatus} onChange={e => setFilter('responseStatus', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-300 outline-none">
            <option value="">Any Status</option>
            <option value="none">No Response</option>
            <option value="replied">Replied</option>
            <option value="interested">Interested</option>
            <option value="notInterested">Not Interested</option>
            <option value="converted">Converted</option>
          </select>

          {/* More filters */}
          <button onClick={() => setFilterOpen(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${filterOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Filter className="w-3.5 h-3.5" />
            More
            {activeFilters > 0 && <span className="bg-indigo-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">{activeFilters}</span>}
          </button>
          {activeFilters > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Expanded filters */}
        {filterOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contacted</label>
              <select value={filters.contacted} onChange={e => setFilter('contacted', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none">
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
              <input value={filters.state} onChange={e => setFilter('state', e.target.value)}
                placeholder="e.g. VA"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">NAICS Code</label>
              <input value={filters.naicsCode} onChange={e => setFilter('naicsCode', e.target.value)}
                placeholder="541511"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Min Award ($)</label>
              <input type="number" value={filters.minAward} onChange={e => setFilter('minAward', e.target.value)}
                placeholder="100000"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
              <select value={filters.dataSource} onChange={e => setFilter('dataSource', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none">
                <option value="">Any</option>
                <option value="usaspending">USASpending</option>
                <option value="fpds">FPDS.gov</option>
                <option value="sam">SAM.gov</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk actions ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
          <span className="text-indigo-700 font-medium">{selected.size} selected</span>
          <button onClick={handleBulkContacted}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
            <Check className="w-3.5 h-3.5" /> Mark Contacted
          </button>
          <button onClick={() => navigate('/admin/prospect-outreach')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700">
            <Send className="w-3.5 h-3.5" /> Email Outreach Page
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-500 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox"
                    checked={selected.size === prospects.length && prospects.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300" />
                </th>
                {['Company', 'Website', 'Email', 'Phone', 'Award', 'Priority', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                </td></tr>
              ) : prospects.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-gray-400">
                  <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="font-medium">No prospects found</p>
                  {!stats?.total && <p className="text-xs mt-1">Click "Full Sync" or "Collect" to fetch data</p>}
                </td></tr>
              ) : prospects.map(p => {
                const priCfg = PRIORITY_CFG[p.priority]    || PRIORITY_CFG.low;
                const stCfg  = STATUS_CFG[p.responseStatus] || STATUS_CFG.none;
                const webCfg = WEBSITE_CFG[p.websiteStatus] || WEBSITE_CFG.unknown;
                return (
                  <tr key={p._id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected.has(p._id) ? 'bg-indigo-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSelect(p._id)}
                        className="rounded border-gray-300" />
                    </td>
                    {/* Company */}
                    <td className="px-4 py-3">
                      <div className="max-w-52">
                        <p className="font-medium text-gray-900 truncate">{p.companyName || '—'}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {p.uei   && <span className="text-xs text-gray-400">UEI: {p.uei.slice(0,8)}…</span>}
                          {p.state && <span className="flex items-center gap-0.5 text-xs text-gray-400"><MapPin className="w-2.5 h-2.5"/>{p.state}{p.city ? `, ${p.city}` : ''}</span>}
                        </div>
                        {Array.isArray(p.dataSource) && p.dataSource.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.isSmallBusiness && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-medium">Small Biz</span>
                            )}
                            {p.dataSource.map(s => {
                              const c = SOURCE_CFG[s];
                              return c ? <span key={s} className={`text-xs px-1.5 py-0.5 rounded ${c.color}`}>{c.label}</span> : null;
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Website */}
                    <td className="px-4 py-3">
                      {p.website ? (
                        <div>
                          <a href={p.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline text-xs max-w-36 truncate">
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{p.website.replace(/^https?:\/\//,'')}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${webCfg.color}`}>{webCfg.label}</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3">
                      {p.primaryEmail ? (
                        <div>
                          <span className="text-xs text-gray-700 break-all">{p.primaryEmail}</span>
                          {p.contactPersonName && <p className="text-xs text-gray-400 truncate">{p.contactPersonName}</p>}
                          {p.isGovEmail && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Gov</span>}
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    {/* Phone */}
                    <td className="px-4 py-3">
                      {p.primaryPhone
                        ? <span className="text-xs text-gray-700">{p.primaryPhone}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    {/* Award */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{fmtM(p.totalAwardAmount)}</p>
                      <p className="text-xs text-gray-400">{p.totalContractsWon ?? 0} contracts</p>
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${priCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priCfg.dot}`} />
                        {priCfg.label}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      {p.contacted && (
                        <span className="text-xs text-green-600 flex items-center gap-0.5 mb-1">
                          <CheckCircle className="w-3 h-3"/>Contacted
                        </span>
                      )}
                      <select value={p.responseStatus || 'none'}
                        onChange={e => handleStatus(p._id, e.target.value)}
                        className={`text-xs border-0 bg-transparent font-medium focus:ring-0 outline-none cursor-pointer ${stCfg.color}`}>
                        {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                      </select>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!p.contacted && (
                          <button onClick={() => handleMarkContacted(p._id)} title="Mark Contacted"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {p.website && (
                          <a href={p.website} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {p.primaryEmail && (
                          <>
                            <button
                              onClick={() => navigate(`/admin/prospect-outreach?id=${p._id}`)}
                              title="Send email campaign"
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                              <Send className="w-4 h-4" />
                            </button>
                            <a href={`mailto:${p.primaryEmail}`}
                              className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
                              <Mail className="w-4 h-4" />
                            </a>
                          </>
                        )}
                        <button onClick={() => handleDelete(p._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {fmt((pagination.page-1)*limit+1)}–{fmt(Math.min(pagination.page*limit, pagination.total))} of {fmt(pagination.total)}
              </span>
              <span className="text-gray-300">|</span>
              <label className="text-xs text-gray-500">Per page:</label>
              <select
                value={limit}
                onChange={e => { setLimit(Number(e.target.value)); loadProspects(1); }}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-2">
                <button disabled={pagination.page <= 1}
                  onClick={() => loadProspects(pagination.page - 1)}
                  className="p-1.5 text-gray-500 hover:text-indigo-600 disabled:opacity-40 rounded-lg hover:bg-indigo-50 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Page {pagination.page} / {pagination.pages}
                </span>
                <button disabled={pagination.page >= pagination.pages}
                  onClick={() => loadProspects(pagination.page + 1)}
                  className="p-1.5 text-gray-500 hover:text-indigo-600 disabled:opacity-40 rounded-lg hover:bg-indigo-50 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Email Campaign Modal ── */}
      {emailModalOpen && (
        <ProspectEmailModal
          selectedProspects={prospects.filter(p => selected.has(p._id))}
          onClose={() => setEmailModalOpen(false)}
          onSent={() => { loadProspects(currentPage); loadStats(); }}
        />
      )}
    </div>
  );
}
