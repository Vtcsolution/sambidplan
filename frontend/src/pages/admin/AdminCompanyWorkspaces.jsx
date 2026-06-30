import { useState, useEffect } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import {
  Building2, Users, FileText, ShieldCheck, Search, Trash2, Eye,
  ChevronLeft, CheckCircle, XCircle, Loader, AlertTriangle, FolderOpen,
  Crown, Shield, Briefcase, FileEdit, User, X, RefreshCw, KeyRound, ToggleRight, ToggleLeft
} from 'lucide-react';
import { adminPanelAPI } from '../../services/adminApi';

const BASE = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:8000';

const adminApi = {
  getStats:     ()          => fetch(`${BASE}/api/admin/company-workspaces/stats`,   { headers: authHeaders() }).then(r => r.json()),
  list:         (params)    => fetch(`${BASE}/api/admin/company-workspaces?${new URLSearchParams(params)}`, { headers: authHeaders() }).then(r => r.json()),
  getById:      (id)        => fetch(`${BASE}/api/admin/company-workspaces/${id}`,   { headers: authHeaders() }).then(r => r.json()),
  verifyUEI:    (id)        => fetch(`${BASE}/api/admin/company-workspaces/${id}/verify-uei`,   { method: 'PUT', headers: authHeaders() }).then(r => r.json()),
  unverifyUEI:  (id)        => fetch(`${BASE}/api/admin/company-workspaces/${id}/unverify-uei`, { method: 'PUT', headers: authHeaders() }).then(r => r.json()),
  delete:       (id)        => fetch(`${BASE}/api/admin/company-workspaces/${id}`,   { method: 'DELETE', headers: authHeaders() }).then(r => r.json()),
  removeMember: (id, mId)   => fetch(`${BASE}/api/admin/company-workspaces/${id}/members/${mId}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json()),
};

function authHeaders() {
  const token = localStorage.getItem('adminToken');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const ROLE_COLORS = {
  owner:           'bg-amber-100 text-amber-700',
  admin:           'bg-purple-100 text-purple-700',
  capture_manager: 'bg-blue-100 text-blue-700',
  proposal_writer: 'bg-indigo-100 text-indigo-700',
  reviewer:        'bg-teal-100 text-teal-700',
  member:          'bg-gray-100 text-gray-600',
};

const CERT_LABELS = {
  '8a': '8(a)', wosb: 'WOSB', edwosb: 'EDWOSB',
  hubzone: 'HUBZone', sdvosb: 'SDVOSB', vosb: 'VOSB', sdb: 'SDB', other: 'Other',
};

const CAT_LABELS = {
  proposal: 'Proposal', past_performance: 'Past Perf', capability: 'Capability',
  template: 'Template', compliance: 'Compliance', sow: 'SOW', other: 'Other',
};

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ companyId, onClose, onVerify, onDelete }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  useEffect(() => { load(); }, [companyId]); // eslint-disable-line

  const load = async () => {
    setLoading(true);
    const res = await adminApi.getById(companyId);
    if (res.success) setData(res);
    setLoading(false);
  };

  const handleVerify = async (unverify = false) => {
    setActionId('verify');
    const res = unverify ? await adminApi.unverifyUEI(companyId) : await adminApi.verifyUEI(companyId);
    if (res.success) { onVerify(); load(); }
    setActionId(null);
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    setActionId(memberId);
    await adminApi.removeMember(companyId, memberId);
    load();
    setActionId(null);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this entire company workspace and all its documents? This cannot be undone.')) return;
    setActionId('delete');
    const res = await adminApi.delete(companyId);
    if (res.success) { onDelete(); onClose(); }
    setActionId(null);
  };

  const company = data?.data;
  const docs    = data?.docs || [];
  const accepted = company?.members?.filter(m => m.inviteStatus === 'accepted') || [];
  const pending  = company?.members?.filter(m => m.inviteStatus === 'pending')  || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900 text-lg">{loading ? 'Loading…' : company?.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <button onClick={handleDelete} disabled={actionId === 'delete'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition disabled:opacity-50">
                {actionId === 'delete' ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader className="w-7 h-7 text-indigo-600 animate-spin" /></div>
        ) : (
          <div className="p-6 space-y-6">

            {/* Company Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Owner</p>
                <p className="font-medium text-gray-900">{company.owner?.name}</p>
                <p className="text-gray-500">{company.owner?.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">Plan</p>
                <p className="capitalize font-medium text-gray-900">{company.owner?.plan || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">UEI</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-medium text-gray-900">{company.uei || '—'}</p>
                  {company.ueiVerified
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified</span>
                    : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Unverified</span>
                  }
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">CAGE</p>
                <p className="font-mono font-medium text-gray-900">{company.cage || '—'}</p>
              </div>
              {company.address?.city && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Location</p>
                  <p className="text-gray-900">{[company.address.city, company.address.state].filter(Boolean).join(', ')}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 font-semibold">Created</p>
                <p className="text-gray-900">{formatDate(company.createdAt)}</p>
              </div>
            </div>

            {/* NAICS & Certifications */}
            {(company.naicsCodes?.length > 0 || company.certifications?.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {company.naicsCodes?.map(n => (
                  <span key={n} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">{n}</span>
                ))}
                {company.certifications?.map(c => (
                  <span key={c.type} className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">{CERT_LABELS[c.type] || c.type}</span>
                ))}
              </div>
            )}

            {/* UEI Actions */}
            {company.uei && (
              <div className="flex gap-2">
                {!company.ueiVerified ? (
                  <button onClick={() => handleVerify(false)} disabled={actionId === 'verify'}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
                    {actionId === 'verify' ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    Manually Verify UEI
                  </button>
                ) : (
                  <button onClick={() => handleVerify(true)} disabled={actionId === 'verify'}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-sm font-semibold transition">
                    <XCircle className="w-3.5 h-3.5" /> Remove Verification
                  </button>
                )}
              </div>
            )}

            {/* Team Members */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Team Members ({accepted.length + 1})
              </h3>
              <div className="space-y-2">
                {/* Owner */}
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{company.owner?.name}</p>
                    <p className="text-xs text-gray-500">{company.owner?.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">Owner</span>
                </div>
                {accepted.map(m => (
                  <div key={m._id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{m.user?.name || 'Team Member'}</p>
                      <p className="text-xs text-gray-500">{m.user?.email || m.inviteEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[m.role] || ROLE_COLORS.member}`}>
                        {m.role?.replace('_',' ')}
                      </span>
                      <button onClick={() => handleRemoveMember(m._id)} disabled={actionId === m._id}
                        className="p-1 text-red-400 hover:text-red-600 transition">
                        {actionId === m._id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
                {pending.length > 0 && (
                  <p className="text-xs text-gray-400 px-3">{pending.length} pending invite{pending.length > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>

            {/* Workspace Access Users */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-500" /> Workspace Access Users ({company.workspaceUsers?.length || 0})
              </h3>
              {!company.workspaceUsers?.length ? (
                <p className="text-sm text-gray-400">No workspace access users created.</p>
              ) : (
                <div className="space-y-2">
                  {company.workspaceUsers.map(wu => (
                    <div key={wu._id} className="py-2.5 px-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{wu.displayName || wu.username}</span>
                          <span className="text-xs text-gray-500 ml-1.5">@{wu.username}</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${wu.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {wu.isActive ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                          {wu.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {wu.allowedPages?.length === 0
                          ? <span className="text-xs text-gray-400">No pages assigned</span>
                          : wu.allowedPages?.map(p => (
                              <span key={p} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{p}</span>
                            ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-500" /> Documents ({docs.length})
              </h3>
              {docs.length === 0 ? (
                <p className="text-sm text-gray-400">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {docs.map(d => (
                    <div key={d._id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{d.name}</p>
                        <p className="text-xs text-gray-500">{CAT_LABELS[d.category] || d.category} · {formatSize(d.size)} · {d.uploadedBy?.name}</p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0 ml-2">{formatDate(d.createdAt)}</p>
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
export default function AdminCompanyWorkspaces() {
  const [stats,     setStats]     = useState(null);
  const [companies, setCompanies] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [verified,  setVerified]  = useState('');
  const [page,      setPage]      = useState(1);
  const [selected,  setSelected]  = useState(null);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadList(); }, [page, verified]); // eslint-disable-line

  const loadStats = async () => {
    const res = await adminApi.getStats();
    if (res.success) setStats(res.data);
  };

  const loadList = async () => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (search)  params.search   = search;
    if (verified) params.verified = verified;
    const res = await adminApi.list(params);
    if (res.success) { setCompanies(res.data); setTotal(res.total); }
    setLoading(false);
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); loadList(); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Workspaces<AdminHowItWorks page="companyWorkspaces" /></h1>
          <p className="text-sm text-gray-500 mt-0.5">All company workspaces created by users</p>
        </div>
        <button onClick={() => { loadStats(); loadList(); }}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Workspaces"    value={stats?.totalCompanies} icon={Building2}  color="bg-indigo-100 text-indigo-600" />
        <StatCard label="UEI Verified"        value={stats?.verifiedCount}  icon={ShieldCheck} color="bg-green-100 text-green-600" />
        <StatCard label="Team Members"        value={stats?.totalMembers}   icon={Users}       color="bg-blue-100 text-blue-600" />
        <StatCard label="Workspace Users"     value={stats?.totalWsUsers}   icon={KeyRound}    color="bg-purple-100 text-purple-600" />
        <StatCard label="Total Documents"     value={stats?.totalDocs}      icon={FileText}    color="bg-amber-100 text-amber-600" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by company name or UEI…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <select value={verified} onChange={e => { setVerified(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All UEI Status</option>
            <option value="true">Verified Only</option>
            <option value="false">Unverified Only</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader className="w-7 h-7 text-indigo-600 animate-spin" /></div>
        ) : companies.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No company workspaces found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">UEI</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Members</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">WS Users</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Docs</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                          {c.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          {c.certifications?.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {c.certifications.slice(0, 3).map(cert => (
                                <span key={cert.type} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                  {CERT_LABELS[cert.type] || cert.type}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-gray-900 font-medium">{c.owner?.name}</p>
                      <p className="text-xs text-gray-500">{c.owner?.email}</p>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {c.uei ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-gray-700">{c.uei}</span>
                          {c.ueiVerified
                            ? <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                            : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          }
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {c.memberCount + 1}
                      </span>
                      {c.pendingInvites > 0 && (
                        <p className="text-[10px] text-amber-500">{c.pendingInvites} pending</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${c.workspaceUserCount > 0 ? 'text-purple-700' : 'text-gray-400'}`}>
                        <KeyRound className="w-3 h-3" />{c.workspaceUserCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center hidden sm:table-cell">
                      <span className="text-sm font-semibold text-gray-700">{c.docCount}</span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => setSelected(c._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {total > 15 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">Showing {companies.length} of {total}</p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition">
                    Prev
                  </button>
                  <button disabled={companies.length < 15} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <DetailModal
          companyId={selected}
          onClose={() => setSelected(null)}
          onVerify={() => { loadStats(); loadList(); }}
          onDelete={() => { loadStats(); loadList(); setSelected(null); }}
        />
      )}
    </div>
  );
}
