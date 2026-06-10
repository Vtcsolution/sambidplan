import { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb, Search, RefreshCw, CheckCircle, Clock, XCircle,
  Loader2, ChevronDown, ChevronUp, Trash2, Save, Filter
} from 'lucide-react';
import { adminSuggestionAPI } from '../../services/adminApi';
import { getSocket } from '../../hooks/useSocket';

const CATEGORIES = {
  feature_request: { label: 'Feature Request', color: 'bg-indigo-100 text-indigo-700' },
  improvement:     { label: 'Improvement',     color: 'bg-blue-100 text-blue-700' },
  bug_report:      { label: 'Bug Report',       color: 'bg-red-100 text-red-700' },
  general:         { label: 'General Feedback', color: 'bg-gray-100 text-gray-700' },
};

const STATUS_OPTIONS = [
  { value: 'pending',      label: 'Pending',      color: 'bg-yellow-100 text-yellow-700' },
  { value: 'under_review', label: 'Under Review',  color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress',  label: 'In Progress',   color: 'bg-indigo-100 text-indigo-700' },
  { value: 'implemented',  label: 'Implemented',   color: 'bg-green-100 text-green-700' },
  { value: 'declined',     label: 'Declined',      color: 'bg-red-100 text-red-700' },
];

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(date).toLocaleDateString();
}

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>;
}

function SuggestionRow({ suggestion: initial, onDeleted }) {
  const [s, setS]           = useState(initial);
  const [expanded, setExp]  = useState(false);
  const [editStatus, setES] = useState(initial.status);
  const [note, setNote]     = useState(initial.adminResponse?.note || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDel]  = useState(false);
  const [saved, setSaved]   = useState(false);

  const cat = CATEGORIES[s.category] || CATEGORIES.general;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (editStatus !== s.status) payload.status = editStatus;
      if (note.trim() !== (s.adminResponse?.note || '')) payload.note = note.trim();
      if (!Object.keys(payload).length) { setSaving(false); return; }

      const r = await adminSuggestionAPI.update(s._id, payload);
      setS(r.data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete suggestion ${s.suggestionNumber}?`)) return;
    setDel(true);
    try {
      await adminSuggestionAPI.delete(s._id);
      onDeleted(s._id);
    } catch {
      setDel(false);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-3">
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExp(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{s.suggestionNumber}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
            <StatusBadge status={s.status} />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {s.userName} · {s.userEmail}
            {s.companyName && ` · ${s.companyName}`}
            {' · '}{timeAgo(s.createdAt)}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />}
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-4 bg-white dark:bg-gray-800">
          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line bg-gray-50 dark:bg-gray-700 rounded-lg p-3">{s.description}</p>
          </div>

          {/* Status + Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Update Status</label>
              <select
                value={editStatus}
                onChange={e => setES(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Admin Response Note</label>
              <textarea
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional note visible to the user…"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSuggestions() {
  const [suggestions, setSuggestions]   = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat, setFilterCat]       = useState('');
  const [newCount, setNewCount]         = useState(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCat)    params.category = filterCat;
      if (search)       params.search = search;
      const r = await adminSuggestionAPI.getAll(params);
      setSuggestions(r.data.data || []);
      setStatusCounts(r.data.statusCounts || {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCat, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Real-time: listen for new suggestions
  useEffect(() => {
    const socket = getSocket('adminToken');
    if (!socket) return;
    const handler = (data) => {
      setSuggestions(prev => [data, ...prev]);
      setNewCount(n => n + 1);
    };
    socket.on('suggestion:new', handler);
    return () => socket.off('suggestion:new', handler);
  }, []);

  const handleDeleted = (id) => setSuggestions(prev => prev.filter(s => s._id !== id));

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl shrink-0">
            <Lightbulb className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
              Suggestions & Feedback
              {newCount > 0 && (
                <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">{newCount} new</span>
              )}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Review and respond to user suggestions</p>
          </div>
        </div>
        <button onClick={() => { fetchAll(); setNewCount(0); }} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shrink-0 self-start sm:self-auto">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Status counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[{ value: '', label: 'All', count: total }, ...STATUS_OPTIONS].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`text-center p-3 rounded-xl border transition-all ${
              filterStatus === opt.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {opt.value === '' ? total : (statusCounts[opt.value] || 0)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORIES).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No suggestions found</p>
        </div>
      ) : (
        <div>
          {suggestions.map(s => (
            <SuggestionRow key={s._id} suggestion={s} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
