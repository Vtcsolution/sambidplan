// frontend/src/pages/admin/AdminHybridFetch.jsx
// Super-admin view: shows the hybrid SAM.gov data pipeline (API + Bulk),
// lets you trigger either manually, and lists every opportunity with a
// source badge so you can see exactly where each record came from.

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Zap, Download, Database, CheckCircle, Clock,
  AlertCircle, Search, Filter, ChevronLeft, ChevronRight,
  Activity, Shield, ExternalLink, Layers
} from 'lucide-react';
import { adminPanelAPI } from '../../services/adminApi';

// ── Source badge ─────────────────────────────────────────────────────────────
const SourceBadge = ({ src }) =>
  src === 'api' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
      <Zap className="w-3 h-3" /> API
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
      <Download className="w-3 h-3" /> Bulk
    </span>
  );

// ── Fetch status dot ─────────────────────────────────────────────────────────
const StatusDot = ({ active, label }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>
    <span className={`w-2 h-2 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
    {active ? label : 'Idle'}
  </span>
);

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, bg, border }) => (
  <div className={`${bg} ${border} border rounded-xl p-4`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="mt-0.5">{icon}</div>
    </div>
  </div>
);

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminHybridFetch() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [srcFilter,  setSrcFilter]  = useState('all');
  const [apiFetching,  setApiFetching]  = useState(false);
  const [bulkRunning,  setBulkRunning]  = useState(false);
  const [msg,        setMsg]        = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await adminPanelAPI.getHybridOpportunities({
        page,
        limit: 20,
        fetchSource: srcFilter,
        search: search || undefined,
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, srcFilter, search]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh while a fetch is running
  useEffect(() => {
    const running = data?.breakdown?.apiFetch?.isFetching || data?.breakdown?.bulkFetch?.isRunning;
    if (!running) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [data, load]);

  const handleApiTrigger = async () => {
    setApiFetching(true);
    setMsg(null);
    try {
      const r = await adminPanelAPI.triggerFetch();
      setMsg({ type: r.data.success ? 'success' : 'error', text: r.data.message });
      if (r.data.success) setTimeout(load, 4000);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Failed to start API fetch.' });
    } finally {
      setApiFetching(false);
    }
  };

  const handleBulkTrigger = async () => {
    setBulkRunning(true);
    setMsg(null);
    try {
      const r = await adminPanelAPI.triggerBulk();
      setMsg({ type: r.data.success ? 'success' : 'error', text: r.data.message });
      if (r.data.success) setTimeout(load, 8000);
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Failed to start bulk download.' });
    } finally {
      setBulkRunning(false);
    }
  };

  const bd = data?.breakdown;
  const pg = data?.pagination;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            Hybrid Data Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            SAM.gov API (real-time, per NAICS) + Nightly Bulk Download (all categories)
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Message ────────────────────────────────────────────────────────── */}
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── Pipeline cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* API Fetch card */}
        <div className="bg-white border border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">SAM.gov API Fetch</p>
                <p className="text-xs text-gray-400">Runs every 30 min · per-NAICS filter</p>
              </div>
            </div>
            <StatusDot active={bd?.apiFetch?.isFetching} label="Running" />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-700">{(bd?.fromApi ?? '—').toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total records</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-700">{bd?.todayApi ?? '—'}</p>
              <p className="text-xs text-gray-500">Today</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-700">{bd?.apiFetch?.totalRuns ?? '—'}</p>
              <p className="text-xs text-gray-500">Total runs</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3">
            Last run: {bd?.apiFetch?.lastRunAt ? new Date(bd.apiFetch.lastRunAt).toLocaleString() : 'Never'} ·{' '}
            {bd?.apiFetch?.lastRunCount ?? 0} records
          </p>

          <button
            onClick={handleApiTrigger}
            disabled={apiFetching || bd?.apiFetch?.isFetching}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {(apiFetching || bd?.apiFetch?.isFetching)
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running...</>
              : <><Zap className="w-4 h-4" /> Trigger API Fetch Now</>}
          </button>
        </div>

        {/* Bulk Download card */}
        <div className="bg-white border border-purple-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Nightly Bulk Download</p>
                <p className="text-xs text-gray-400">Runs at 00:05 · ALL categories, no filter</p>
              </div>
            </div>
            <StatusDot active={bd?.bulkFetch?.isRunning} label="Running" />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-purple-50 rounded-lg p-2">
              <p className="text-lg font-bold text-purple-700">{(bd?.fromBulk ?? '—').toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total records</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <p className="text-lg font-bold text-purple-700">{bd?.todayBulk ?? '—'}</p>
              <p className="text-xs text-gray-500">Today</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <p className="text-lg font-bold text-purple-700">{bd?.bulkFetch?.lastRunPages ?? '—'}</p>
              <p className="text-xs text-gray-500">Last pages</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3">
            Last run: {bd?.bulkFetch?.lastRunAt ? new Date(bd.bulkFetch.lastRunAt).toLocaleString() : 'Never'} ·{' '}
            {bd?.bulkFetch?.lastRunCount ?? 0} records
          </p>

          <button
            onClick={handleBulkTrigger}
            disabled={bulkRunning || bd?.bulkFetch?.isRunning}
            className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-60 transition"
          >
            {(bulkRunning || bd?.bulkFetch?.isRunning)
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running...</>
              : <><Download className="w-4 h-4" /> Run Bulk Download Now</>}
          </button>
        </div>
      </div>

      {/* ── Dedup guarantee banner ──────────────────────────────────────────── */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800">Zero Duplicate Guarantee</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Both pipelines write to the same MongoDB collection using <code className="bg-green-100 px-1 rounded">sourceId</code> (SAM.gov's
            unique <em>noticeId / solicitationNumber</em>) as the upsert key with a unique index.
            If the API and bulk both see the same opportunity, MongoDB merges them into one record — the
            first pipeline to fetch it sets <code className="bg-green-100 px-1 rounded">fetchSource</code>,
            the second just updates the fields. Total unique records:{' '}
            <strong>{(bd?.totalUnique ?? 0).toLocaleString()}</strong>.
          </p>
        </div>
      </div>

      {/* ── Summary stats row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Database className="w-5 h-5 text-indigo-500" />}
          label="Total Unique Records"
          value={(bd?.totalUnique ?? 0).toLocaleString()}
          sub="No duplicates"
          bg="bg-indigo-50" border="border-indigo-200"
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-blue-500" />}
          label="From API"
          value={(bd?.fromApi ?? 0).toLocaleString()}
          sub={`${bd?.todayApi ?? 0} today`}
          bg="bg-blue-50" border="border-blue-200"
        />
        <StatCard
          icon={<Download className="w-5 h-5 text-purple-500" />}
          label="From Bulk"
          value={(bd?.fromBulk ?? 0).toLocaleString()}
          sub={`${bd?.todayBulk ?? 0} today`}
          bg="bg-purple-50" border="border-purple-200"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-green-500" />}
          label="Today's New Records"
          value={(((bd?.todayApi ?? 0) + (bd?.todayBulk ?? 0))).toLocaleString()}
          sub="API + Bulk combined"
          bg="bg-green-50" border="border-green-200"
        />
      </div>

      {/* ── Opportunity Table ────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl">
        {/* Table controls */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search title, agency, NAICS..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {['all', 'api', 'bulk'].map(f => (
              <button
                key={f}
                onClick={() => { setSrcFilter(f); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  srcFilter === f
                    ? f === 'api'  ? 'bg-blue-600 text-white'
                    : f === 'bulk' ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All Sources' : f === 'api' ? '⚡ API Only' : '📥 Bulk Only'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : !data?.data?.length ? (
          <div className="text-center py-16 text-gray-400">
            <Database className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No opportunities found{search ? ` for "${search}"` : ''}.</p>
            {!search && <p className="text-sm mt-1">Run a fetch above to populate the database.</p>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Agency</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">NAICS</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fetched</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map(opp => (
                    <tr key={opp._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <SourceBadge src={opp.fetchSource || 'api'} />
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-800 truncate">{opp.title}</p>
                        <p className="text-xs text-gray-400 truncate">{opp.sourceId}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[150px] truncate">{opp.agency}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{opp.naicsCode}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {opp.dueDate ? new Date(opp.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {opp.lastFetched ? new Date(opp.lastFetched).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {(opp.url && opp.url !== '#') || opp.sourceId ? (
                          <a
                            href={opp.source === 'sam' || !opp.source
                              ? `https://sam.gov/opp/${opp.sourceId}/view`
                              : opp.url}
                            target="_blank" rel="noopener noreferrer"
                            className="text-indigo-500 hover:text-indigo-700"
                            title={opp.source === 'sam' || !opp.source ? 'View on SAM.gov' : 'View on source'}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pg && pg.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {((pg.page - 1) * 20) + 1}–{Math.min(pg.page * 20, pg.total)} of {pg.total.toLocaleString()} records
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pg.page === 1}
                    className="p-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    {pg.page} / {pg.pages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(pg.pages, p + 1))}
                    disabled={pg.page === pg.pages}
                    className="p-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
