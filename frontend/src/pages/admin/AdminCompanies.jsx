import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, RefreshCw, Download, Search,
  ChevronLeft, ChevronRight, Mail, Phone, MapPin,
  Hash, AlertCircle, CheckCircle, Loader2, X, Plus,
  Clock, Database, TrendingUp, Users, Star, Globe, Trash2
} from 'lucide-react';
import { adminPanelAPI } from '../../services/adminApi';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
  'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
  'TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','VI','GU','AS','MP',
];

const SOURCE_LABELS = {
  sam:          { label: 'SAM.gov',        color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  usaspending:  { label: 'USASpending',    color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  fpds:         { label: 'FPDS.gov',       color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  sba:          { label: 'SBA DSBS',       color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
};

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
};

function StatCard({ icon: Icon, label, value, color = 'indigo', sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 bg-${color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function SourceSyncCard({ sourceKey, sourceData, onSync }) {
  const cfg = SOURCE_LABELS[sourceKey] || { label: sourceKey, color: 'bg-gray-100 text-gray-600' };
  const isSyncing = sourceData?.isSyncing;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
          {isSyncing && (
            <span className="text-xs text-indigo-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Syncing (page {sourceData.currentPage})
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">
          {sourceData?.lastSyncAt
            ? `Last sync: ${new Date(sourceData.lastSyncAt).toLocaleString()}`
            : 'Never synced'}
          {sourceData?.savedCount > 0 && ` · ${sourceData.savedCount.toLocaleString()} saved`}
        </p>
        {sourceData?.lastError && (
          <p className="text-xs text-red-500 truncate mt-0.5">{sourceData.lastError}</p>
        )}
      </div>
      <button
        onClick={() => onSync(sourceKey)}
        disabled={isSyncing}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Running…' : 'Sync'}
      </button>
    </div>
  );
}

function FetchOneModal({ onClose, onSuccess }) {
  const [uei, setUei]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!uei.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminPanelAPI.fetchOneCompany({ ueiSAM: uei.trim() });
      if (res.data.success) {
        onSuccess(res.data.data);
      } else {
        setError(res.data.message || 'Not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Fetch Company by UEI</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SAM.gov UEI (Unique Entity Identifier)
            </label>
            <input
              value={uei}
              onChange={e => setUei(e.target.value)}
              placeholder="e.g. ABCDEFGH1234"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading || !uei.trim()}
              className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Fetch & Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClearConfirmModal({ totalCompanies, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [typed, setTyped]     = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-red-100">
          <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Clear All Companies
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">This will permanently delete {totalCompanies?.toLocaleString()} companies.</p>
            <p className="text-red-600 text-xs">After clearing, click "Sync SAM.gov" to re-fetch with full contact details (emails, phones). SAM.gov is the only source with real contact information.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="font-mono bg-gray-100 px-1 rounded">CLEAR</span> to confirm
            </label>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="CLEAR"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || typed !== 'CLEAR'}
              className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete All & Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SourceBadges({ sources = [] }) {
  if (!sources.length) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {sources.map(s => {
        const cfg = SOURCE_LABELS[s.name] || { label: s.name, color: 'bg-gray-100 text-gray-500' };
        return (
          <span key={s.name} className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.color}`}>
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

function CompanyRow({ company }) {
  const [expanded, setExpanded] = useState(false);

  const naicsList = (company.naicsCodes || []).slice(0, 5);
  const addr = company.physicalAddress || {};
  const addrStr = [addr.city, addr.stateOrProvinceCode, addr.zipCode].filter(Boolean).join(', ');

  return (
    <>
      <tr
        onClick={() => setExpanded(v => !v)}
        className="hover:bg-gray-50 cursor-pointer border-b border-gray-100"
      >
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900 text-sm leading-tight">
            {company.legalBusinessName || '—'}
          </div>
          {company.dbaName && (
            <div className="text-xs text-gray-400">DBA: {company.dbaName}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
            {company.ueiSAM || '—'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-gray-600">{company.cageCode || '—'}</span>
        </td>
        <td className="px-4 py-3">
          {addrStr ? <span className="text-xs text-gray-600">{addrStr}</span> : '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {naicsList.map((n, i) => (
              <span key={i}
                className={`text-xs px-1.5 py-0.5 rounded font-mono ${n.isPrimary ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
                title={n.description}>
                {n.code}
              </span>
            ))}
            {(company.naicsCodes || []).length > 5 && (
              <span className="text-xs text-gray-400">+{company.naicsCodes.length - 5}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <PriorityBadge priority={company.priority} />
        </td>
        <td className="px-4 py-3">
          <SourceBadges sources={company.sources} />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            {company.contactEmail ? (
              <div className="flex items-center gap-1 flex-wrap">
                <a href={`mailto:${company.contactEmail}`} onClick={e => e.stopPropagation()}
                  className="text-xs text-indigo-600 hover:underline truncate max-w-[140px] flex items-center gap-1">
                  <Mail className="w-3 h-3 flex-shrink-0" />{company.contactEmail}
                </a>
                {(company.allEmails?.length ?? 0) > 1 && (
                  <span
                    title={company.allEmails.join('\n')}
                    className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium cursor-help flex-shrink-0"
                  >
                    +{company.allEmails.length - 1}
                  </span>
                )}
              </div>
            ) : <span className="text-xs text-gray-300 italic">No email</span>}
            {company.contactPhone && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3 flex-shrink-0" />{company.contactPhone}
                </span>
                {(company.allPhones?.length ?? 0) > 1 && (
                  <span
                    title={company.allPhones.join('\n')}
                    className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium cursor-help flex-shrink-0"
                  >
                    +{company.allPhones.length - 1}
                  </span>
                )}
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            company.registrationStatus === 'Active'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          }`}>
            {company.registrationStatus === 'Active'
              ? <CheckCircle className="w-3 h-3" />
              : <AlertCircle className="w-3 h-3" />}
            {company.registrationStatus || 'Unknown'}
          </span>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-indigo-50 border-b border-indigo-100">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="font-semibold text-gray-700 mb-1">Contact</p>
                {company.contactName && <p className="text-gray-600">{company.contactName}</p>}
                {company.contactPhone && (
                  <p className="text-gray-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {company.contactPhone}
                  </p>
                )}
                {company.contactEmail && (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-gray-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <a href={`mailto:${company.contactEmail}`} className="text-indigo-600 hover:underline">
                        {company.contactEmail}
                      </a>
                    </p>
                    {(company.allEmails?.length ?? 0) > 1 && company.allEmails.slice(1).map(em => (
                      <p key={em} className="text-gray-500 flex items-center gap-1 pl-4 text-xs">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <a href={`mailto:${em}`} className="text-indigo-500 hover:underline">{em}</a>
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="font-semibold text-gray-700 mb-1">Contract Data</p>
                {company.totalContractsWon > 0 && (
                  <p className="text-gray-600">Contracts Won: {company.totalContractsWon.toLocaleString()}</p>
                )}
                {company.totalAwardAmount > 0 && (
                  <p className="text-gray-600">Total Awards: ${company.totalAwardAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                )}
                {company.entityType && <p className="text-gray-600 mt-1">Type: {company.entityType}</p>}
                {company.website && (
                  <a href={company.website} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline truncate block max-w-xs mt-1">
                    {company.website}
                  </a>
                )}
              </div>

              <div>
                <p className="font-semibold text-gray-700 mb-1">Business Types</p>
                <div className="flex flex-wrap gap-1">
                  {(company.businessTypes || []).slice(0, 6).map((bt, i) => (
                    <span key={i} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{bt}</span>
                  ))}
                  {(company.sbaBusinessTypes || []).slice(0, 4).map((bt, i) => (
                    <span key={i} className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{bt}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold text-gray-700 mb-1">Data Sources</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(company.sources || []).map(s => {
                    const cfg = SOURCE_LABELS[s.name] || { label: s.name, color: 'bg-gray-100 text-gray-600' };
                    return (
                      <span key={s.name} className={`px-1.5 py-0.5 rounded font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    );
                  })}
                </div>
                {company.firstSeenAt && (
                  <p className="text-gray-500">First seen: {new Date(company.firstSeenAt).toLocaleDateString()}</p>
                )}
                {company.lastFetched && (
                  <p className="text-gray-500">Last updated: {new Date(company.lastFetched).toLocaleDateString()}</p>
                )}
              </div>

              {(company.naicsCodes || []).length > 0 && (
                <div className="col-span-2 md:col-span-4">
                  <p className="font-semibold text-gray-700 mb-1">All NAICS Codes</p>
                  <div className="flex flex-wrap gap-1">
                    {company.naicsCodes.map((n, i) => (
                      <span key={i}
                        className={`px-2 py-0.5 rounded text-xs font-mono ${n.isPrimary ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-gray-100 text-gray-600'}`}
                        title={n.description}>
                        {n.code}{n.description ? ` — ${n.description}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function useCountdown(until) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!until) { setSecs(0); return; }
    const tick = () => setSecs(Math.max(0, Math.round((new Date(until) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function AdminCompanies() {
  const [companies,    setCompanies]    = useState([]);
  const [stats,        setStats]        = useState(null);
  const [sourceStats,  setSourceStats]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [syncing,      setSyncing]      = useState(false);
  const [error,        setError]        = useState('');
  const [toast,        setToast]        = useState('');
  const [showFetchModal,  setShowFetchModal]  = useState(false);
  const [showClearModal,  setShowClearModal]  = useState(false);
  const [showSources,     setShowSources]     = useState(true);

  const [search,         setSearch]         = useState('');
  const [naicsFilter,    setNaicsFilter]    = useState('');
  const [stateFilter,    setStateFilter]    = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter,   setSourceFilter]   = useState('');
  const [page,           setPage]           = useState(1);
  const [limit,          setLimit]          = useState(50);
  const [totalPages,     setTotalPages]     = useState(1);
  const [total,          setTotal]          = useState(0);

  const searchTimeout = useRef(null);
  const statsInterval = useRef(null);
  const prevSyncing   = useRef(false);

  const PAGE_SIZE_OPTIONS = [20, 50, 100, 500, 1000];
  const rateLimitCountdown = useCountdown(stats?.rateLimitedUntil);

  const loadCompanies = useCallback(async (pg = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminPanelAPI.getCompanies({
        page:     pg,
        limit,
        search:   search.trim()         || undefined,
        naics:    naicsFilter.trim()    || undefined,
        state:    stateFilter           || undefined,
        priority: priorityFilter        || undefined,
        source:   sourceFilter          || undefined,
      });
      const d = res.data;
      setCompanies(d.data || []);
      setTotalPages(d.pagination?.pages || 1);
      setTotal(d.pagination?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [search, naicsFilter, stateFilter, priorityFilter, sourceFilter, limit]);

  const loadStats = useCallback(async () => {
    try {
      const [statsRes, sourceRes] = await Promise.all([
        adminPanelAPI.getCompanyStats(),
        adminPanelAPI.getCompanySourceStats(),
      ]);
      const s = statsRes.data.data;
      setStats(s);
      setSourceStats(sourceRes.data.data);
      const isNowSyncing = s?.isSyncing || false;
      setSyncing(isNowSyncing);
      if (prevSyncing.current && !isNowSyncing) {
        showToast('Sync complete! Companies updated.');
        loadCompanies(1);
      }
      prevSyncing.current = isNowSyncing;
    } catch {}
  }, [loadCompanies]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  useEffect(() => {
    loadCompanies(1);
    loadStats();
    // Use a ref-based interval so it always calls the latest loadStats without stale closure
    statsInterval.current = setInterval(() => {
      adminPanelAPI.getCompanyStats().then(statsRes => {
        const s = statsRes.data.data;
        setStats(s);
        const isNowSyncing = s?.isSyncing || false;
        setSyncing(isNowSyncing);
        if (prevSyncing.current && !isNowSyncing) {
          showToast('Sync complete! Companies updated.');
          setPage(1);
          // use a fresh load call directly
          adminPanelAPI.getCompanies({ page: 1, limit }).then(r => {
            setCompanies(r.data.data || []);
            setTotalPages(r.data.pagination?.pages || 1);
            setTotal(r.data.pagination?.total || 0);
          }).catch(() => {});
        }
        prevSyncing.current = isNowSyncing;
      }).catch(() => {});

      adminPanelAPI.getCompanySourceStats().then(r => {
        setSourceStats(r.data.data);
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(statsInterval.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      loadCompanies(1);
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [search, naicsFilter, stateFilter, priorityFilter, sourceFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (p) => {
    setPage(p);
    loadCompanies(p);
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    prevSyncing.current = true;
    try {
      const res = await adminPanelAPI.syncCompanies({ maxPages: 100 });
      if (res.data.success) {
        showToast('SAM.gov sync started — requests are serialized to avoid rate limits…');
      } else {
        showToast(res.data.message || 'Sync failed to start');
        setSyncing(false);
        prevSyncing.current = false;
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start sync');
      setSyncing(false);
      prevSyncing.current = false;
    }
  };

  const handleSourceSync = async (sourceKey) => {
    const apiMap = {
      usaspending: () => adminPanelAPI.syncUsaSpending(),
      fpds:        () => adminPanelAPI.syncFpds(),
      sba:         () => adminPanelAPI.syncSba(),
    };
    if (!apiMap[sourceKey]) return;
    try {
      const res = await apiMap[sourceKey]();
      showToast(res.data.message || `${SOURCE_LABELS[sourceKey]?.label} sync started`);
      setTimeout(loadStats, 1000);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start sync');
    }
  };

  const handleClear = async () => {
    try {
      const res = await adminPanelAPI.clearAllCompanies();
      if (res.data.success) {
        setShowClearModal(false);
        showToast(`Cleared ${res.data.deletedCount} companies. Click "Sync SAM.gov" to re-fetch with full contact details.`);
        setCompanies([]);
        setTotal(0);
        setTotalPages(1);
        setPage(1);
        loadStats();
      }
    } catch (err) {
      showToast('Clear failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleFetchOneSuccess = (company) => {
    setShowFetchModal(false);
    showToast(`Saved: ${company.legalBusinessName}`);
    loadCompanies(page);
    loadStats();
  };

  const handleExportCSV = async () => {
    try {
      showToast('Preparing CSV export…');
      const res = await adminPanelAPI.getCompanies({
        page: 1, limit: 5000,
        search:   search.trim()      || undefined,
        naics:    naicsFilter.trim() || undefined,
        state:    stateFilter        || undefined,
        priority: priorityFilter     || undefined,
        source:   sourceFilter       || undefined,
      });
      const rows = res.data.data || [];

      const header = [
        'Company Name','DBA Name','UEI','CAGE Code',
        'Address','City','State','Zip','Country',
        'Primary NAICS','All NAICS Codes',
        'Contact Name','Contact Email','All Emails','Contact Phone','All Phones',
        'Entity Type','Business Types','Registration Status',
        'Priority','Sources',
        'Total Contracts Won','Total Award Amount',
        'First Seen','Last Updated',
      ];

      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = rows.map(c => [
        c.legalBusinessName,
        c.dbaName,
        c.ueiSAM,
        c.cageCode,
        c.physicalAddress?.addressLine1,
        c.physicalAddress?.city,
        c.physicalAddress?.stateOrProvinceCode,
        c.physicalAddress?.zipCode,
        c.physicalAddress?.countryCode,
        c.primaryNaics,
        (c.naicsCodes || []).map(n => n.code).join('; '),
        c.contactName,
        c.contactEmail,
        (c.allEmails || []).join('; '),
        c.contactPhone,
        (c.allPhones || []).join('; '),
        c.entityType,
        (c.businessTypes || []).join('; '),
        c.registrationStatus,
        c.priority,
        (c.sources || []).map(s => s.name).join('; '),
        c.totalContractsWon || 0,
        c.totalAwardAmount  || 0,
        c.firstSeenAt  ? new Date(c.firstSeenAt).toLocaleDateString()  : '',
        c.lastFetched  ? new Date(c.lastFetched).toLocaleDateString()  : '',
      ].map(escape).join(','));

      const csv  = [header.map(h => `"${h}"`).join(','), ...lines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `companies_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Export failed: ' + (err.message || 'Unknown error'));
    }
  };

  const fmtNumber = (n) => (n ?? 0).toLocaleString();
  const fmtDate   = (d) => d ? new Date(d).toLocaleString() : '—';
  const hasFilters = search || naicsFilter || stateFilter || priorityFilter || sourceFilter;
  const breakdown = sourceStats?.breakdown;

  return (
    <div className="space-y-6 w-full">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm animate-fade-in">
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" /> Federal Contractor Directory
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Aggregated from SAM.gov · USASpending.gov · FPDS.gov · SBA DSBS — deduplicated by UEI
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowClearModal(true)}
            disabled={!stats?.totalCompanies}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
          <button
            onClick={() => setShowSources(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <Globe className="w-4 h-4" /> Sources
          </button>
          <button
            onClick={() => setShowFetchModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <Plus className="w-4 h-4" /> Add by UEI
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => handleSourceSync('usaspending')}
            disabled={sourceStats?.sources?.usaspending?.isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${sourceStats?.sources?.usaspending?.isSyncing ? 'animate-spin' : ''}`} />
            {sourceStats?.sources?.usaspending?.isSyncing ? 'Syncing…' : 'Sync USASpending'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || stats?.quota?.exhausted}
            title={stats?.quota?.exhausted ? 'Daily API quota exhausted — resets at midnight UTC' : ''}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${stats?.samIsSyncing ? 'animate-spin' : ''}`} />
            {stats?.samIsSyncing ? 'Syncing SAM…' : stats?.quota?.exhausted ? 'SAM Quota Exhausted' : 'Sync SAM.gov'}
          </button>
        </div>
      </div>

      {/* Per-source sync panel */}
      {showSources && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" /> Data Sources
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            <span className="font-semibold text-indigo-700">SAM.gov</span> = full contact details (email, phone, address) ·
            <span className="font-semibold text-emerald-700"> USASpending</span> = contract award amounts (no emails) ·
            FPDS & SBA are currently unreachable
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['usaspending', 'fpds', 'sba'].map(key => (
              <SourceSyncCard
                key={key}
                sourceKey={key}
                sourceData={sourceStats?.sources?.[key]}
                onSync={handleSourceSync}
              />
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            For companies with emails and phone numbers, use <strong className="mx-0.5">Sync SAM.gov</strong> — it fetches the official federal contractor registry with full contact details.
          </p>
        </div>
      )}

      {/* SAM.gov quota bar */}
      {stats?.quota && (
        <div className="mb-4 bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span className="font-medium text-gray-700">SAM.gov API Quota (today)</span>
            <span className={stats.quota.exhausted ? 'text-red-600 font-semibold' : 'text-gray-500'}>
              {stats.quota.used} / {stats.quota.limit} requests used
              {stats.quota.exhausted ? ' — EXHAUSTED' : ` (${stats.quota.remaining} remaining)`}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                stats.quota.exhausted ? 'bg-red-500' :
                stats.quota.used / stats.quota.limit > 0.8 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, Math.round((stats.quota.used / stats.quota.limit) * 100))}%` }}
            />
          </div>
          {stats.quota.exhausted && (
            <p className="text-xs text-red-600 mt-1.5">
              Daily quota reached — SAM.gov resets at midnight UTC tonight.
              <span className="font-semibold"> USASpending sync is still available</span> (free, no quota) but does not include emails.
              For email/phone data, come back after midnight and click "Sync SAM.gov".
            </p>
          )}
        </div>
      )}

      {/* Active sync progress */}
      {syncing && stats && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm border ${
          stats.status === 'rate_limited'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-indigo-50 border-indigo-200 text-indigo-700'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {stats.status === 'rate_limited'
              ? <Clock className="w-4 h-4 flex-shrink-0 text-amber-500" />
              : <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            }
            <span className="font-medium">
              {stats.samIsSyncing && stats.status === 'rate_limited'
                ? `SAM.gov rate limit — resuming in ${rateLimitCountdown || '…'}`
                : stats.samIsSyncing
                  ? `Syncing SAM.gov — page ${stats.currentPage} of ~${stats.totalPages || '?'}`
                  : sourceStats?.sources?.usaspending?.isSyncing
                    ? `Syncing USASpending.gov — page ${sourceStats.sources.usaspending.currentPage || '?'}`
                    : 'Syncing…'
              }
            </span>
            <span className="ml-auto font-semibold text-green-700">
              {(stats.savedSoFar || 0).toLocaleString()} saved
            </span>
          </div>
          {stats.samIsSyncing && stats.totalPages > 0 && (
            <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((stats.currentPage / stats.totalPages) * 100))}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Stats cards — row 1: totals + breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Database}   label="Total Companies"  value={fmtNumber(breakdown?.total ?? stats?.totalCompanies)} color="indigo" />
        <StatCard icon={TrendingUp} label="New Today"        value={fmtNumber(stats?.newToday)} color="green" />
        <StatCard icon={Clock}      label="Last SAM Sync"    value={stats?.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleDateString() : 'Never'} sub={fmtDate(stats?.lastSyncAt)} color="blue" />
        <StatCard icon={Users}      label="Filtered Results" value={fmtNumber(total)} color="purple" />
      </div>

      {/* Priority breakdown */}
      {breakdown && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <button
            onClick={() => setPriorityFilter(priorityFilter === 'high' ? '' : 'high')}
            className={`rounded-xl border p-4 flex items-center gap-3 transition-all ${priorityFilter === 'high' ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-red-300'}`}
          >
            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs text-gray-500">High Priority</p>
              <p className="text-xl font-bold text-gray-900">{fmtNumber(breakdown.priority?.high)}</p>
              <p className="text-xs text-gray-400">3+ data sources</p>
            </div>
          </button>
          <button
            onClick={() => setPriorityFilter(priorityFilter === 'medium' ? '' : 'medium')}
            className={`rounded-xl border p-4 flex items-center gap-3 transition-all ${priorityFilter === 'medium' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-300'}`}
          >
            <span className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs text-gray-500">Medium Priority</p>
              <p className="text-xl font-bold text-gray-900">{fmtNumber(breakdown.priority?.medium)}</p>
              <p className="text-xs text-gray-400">2 data sources</p>
            </div>
          </button>
          <button
            onClick={() => setPriorityFilter(priorityFilter === 'low' ? '' : 'low')}
            className={`rounded-xl border p-4 flex items-center gap-3 transition-all ${priorityFilter === 'low' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs text-gray-500">Low Priority</p>
              <p className="text-xl font-bold text-gray-900">{fmtNumber(breakdown.priority?.low)}</p>
              <p className="text-xs text-gray-400">1 data source</p>
            </div>
          </button>
        </div>
      )}

      {/* Source breakdown */}
      {breakdown?.sources && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Object.entries(SOURCE_LABELS).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSourceFilter(sourceFilter === key ? '' : key)}
              className={`rounded-xl border p-3 flex items-center gap-2.5 transition-all ${
                sourceFilter === key ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-200'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <div className="text-left min-w-0">
                <p className="text-xs text-gray-500 truncate">{cfg.label}</p>
                <p className="text-lg font-bold text-gray-900">{fmtNumber(breakdown.sources[key] || 0)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, UEI, CAGE, email, city…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="relative w-full sm:w-40">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={naicsFilter}
              onChange={e => setNaicsFilter(e.target.value)}
              placeholder="NAICS code"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="relative w-full sm:w-32">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
            >
              <option value="">All States</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="relative w-full sm:w-36">
            <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
            >
              <option value="">All Priorities</option>
              <option value="high">High (3+ sources)</option>
              <option value="medium">Medium (2 sources)</option>
              <option value="low">Low (1 source)</option>
            </select>
          </div>

          <div className="relative w-full sm:w-40">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
            >
              <option value="">All Sources</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setNaicsFilter(''); setStateFilter(''); setPriorityFilter(''); setSourceFilter(''); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {total > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {fmtNumber(total)} companies
            {priorityFilter && ` · ${PRIORITY_CONFIG[priorityFilter]?.label} priority`}
            {sourceFilter && ` · ${SOURCE_LABELS[sourceFilter]?.label} only`}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <AlertCircle className="w-10 h-10 text-red-300" />
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={() => loadCompanies(page)} className="text-sm text-indigo-600 hover:underline">Retry</button>
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
            <Building2 className="w-12 h-12" />
            {hasFilters ? (
              <p className="text-sm text-gray-500">No companies match your filters.</p>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">No companies yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Sync All Sources" to fetch from all available APIs</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSourceSync('usaspending')}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    <RefreshCw className="w-4 h-4" /> Sync USASpending (Free)
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={stats?.quota?.exhausted}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
                  >
                    <RefreshCw className="w-4 h-4" /> Sync SAM.gov
                  </button>
                </div>
                <p className="text-xs text-gray-400">USASpending.gov requires no API key — data loads immediately</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">UEI</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CAGE</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">NAICS</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sources</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email / Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(company => (
                  <CompanyRow key={company._id || company.ueiSAM} company={company} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">
              {((page - 1) * limit + 1).toLocaleString()}–{Math.min(page * limit, total).toLocaleString()} of {total.toLocaleString()}
            </p>
            <span className="text-gray-300">|</span>
            <label className="text-xs text-gray-500">Per page:</label>
            <select
              value={limit}
              onChange={e => { const n = Number(e.target.value); setLimit(n); setPage(1); loadCompanies(1); }}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '…'
                    ? <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
                    : (
                      <button key={p} onClick={() => handlePageChange(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium ${
                          p === page ? 'bg-indigo-600 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}>
                        {p}
                      </button>
                    )
                )}

              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {showFetchModal && (
        <FetchOneModal
          onClose={() => setShowFetchModal(false)}
          onSuccess={handleFetchOneSuccess}
        />
      )}

      {showClearModal && (
        <ClearConfirmModal
          totalCompanies={stats?.totalCompanies}
          onClose={() => setShowClearModal(false)}
          onConfirm={handleClear}
        />
      )}
    </div>
  );
}
