import { useState, useEffect, useRef } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import {
  Ticket, Search, RefreshCw, Send, Paperclip, X, CheckCircle,
  Clock, AlertCircle, XCircle, Loader2, ArrowLeft, UserCheck, Shield
} from 'lucide-react';
import { adminTicketAPI } from '../../services/adminApi';
import { getSocket } from '../../hooks/useSocket';

const CATEGORIES = {
  billing:         'Billing',
  technical:       'Technical',
  account:         'Account',
  general:         'General',
  feature_request: 'Feature Request',
};

const PRIORITIES = {
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high:   { label: 'High',   color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

const STATUS_MAP = {
  open:         { label: 'Open',           color: 'bg-blue-100 text-blue-700',     icon: Clock },
  in_progress:  { label: 'In Progress',    color: 'bg-indigo-100 text-indigo-700', icon: RefreshCw },
  waiting_user: { label: 'Awaiting User',  color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  resolved:     { label: 'Resolved',       color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  closed:       { label: 'Closed',         color: 'bg-gray-100 text-gray-600',     icon: XCircle },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.open;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      <Icon className="w-3 h-3" /> {s.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = PRIORITIES[priority] || PRIORITIES.medium;
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${p.color}`}>{p.label}</span>;
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(date).toLocaleDateString();
}

// ─── Ticket Detail / Reply ────────────────────────────────────────────────────
function TicketDetail({ ticketId, onBack, onUpdated }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply]     = useState('');
  const [nextStatus, setNextStatus] = useState('waiting_user');
  const [files, setFiles]     = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');
  const fileRef  = useRef(null);
  const bottomRef = useRef(null);

  const fetchTicket = async () => {
    try {
      const res = await adminTicketAPI.getById(ticketId);
      if (res.data.success) { setTicket(res.data.data); setNextStatus('waiting_user'); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [ticket?.messages]);

  // Real-time: user replies appear instantly in the conversation
  useEffect(() => {
    const socket = getSocket('adminToken');
    if (!socket) return;
    const onUserReply = (data) => {
      if (data.ticketId?.toString() !== ticketId?.toString()) return;
      setTicket(prev => {
        if (!prev) return prev;
        const alreadyHas = prev.messages.some(m => m._id === data.message?._id);
        if (alreadyHas) return prev;
        return { ...prev, messages: [...prev.messages, data.message] };
      });
      onUpdated?.();
    };
    socket.on('ticket:user_reply', onUserReply);
    return () => socket.off('ticket:user_reply', onUserReply);
  }, [ticketId]);

  const handleFile = (e) => {
    const picked = Array.from(e.target.files);
    if (files.length + picked.length > 3) return;
    setFiles(prev => [...prev, ...picked]);
    e.target.value = '';
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true); setError('');
    try {
      const fd = new FormData();
      fd.append('content', reply.trim());
      fd.append('status', nextStatus);
      files.forEach(f => fd.append('attachments', f));
      const res = await adminTicketAPI.reply(ticketId, fd);
      if (res.data.success) { setTicket(res.data.data); setReply(''); setFiles([]); onUpdated?.(); }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reply');
    } finally { setSending(false); }
  };

  const handleStatusChange = async (status) => {
    try {
      await adminTicketAPI.updateStatus(ticketId, status);
      setTicket(prev => ({ ...prev, status }));
      onUpdated?.();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  if (!ticket) return <div className="text-center py-16 text-gray-400">Ticket not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-5 pb-5 border-b border-gray-100">
        <button onClick={onBack} className="mt-1 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">{ticket.ticketNumber}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{CATEGORIES[ticket.category] || ticket.category}</span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug">{ticket.subject}</h2>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
            <span>From: <strong>{ticket.userName}</strong> ({ticket.userEmail})</span>
            <span>·</span>
            <span>Opened: {timeAgo(ticket.createdAt)}</span>
          </div>
          {/* Handler info */}
          {ticket.handlers?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-gray-400 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Handled by:</span>
              {ticket.handlers.map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                  <Shield className="w-3 h-3" /> {h.adminName}
                  <span className="text-indigo-400 capitalize">({h.adminRole?.replace('_',' ')})</span>
                  {h.replyCount > 1 && <span className="text-indigo-300">×{h.replyCount}</span>}
                </span>
              ))}
            </div>
          )}
          {ticket.assignedToName && (
            <div className="mt-1.5 text-xs text-gray-500">
              Currently assigned to: <strong className="text-indigo-600">{ticket.assignedToName}</strong>
              {ticket.assignedToRole && <span className="text-gray-400 capitalize ml-1">({ticket.assignedToRole.replace('_',' ')})</span>}
            </div>
          )}
        </div>

        {/* Quick status actions */}
        <div className="flex gap-2 shrink-0 flex-wrap">
          {ticket.status !== 'resolved' && (
            <button onClick={() => handleStatusChange('resolved')}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Mark Resolved
            </button>
          )}
          {ticket.status !== 'closed' && (
            <button onClick={() => handleStatusChange('closed')}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
              Close
            </button>
          )}
          {(ticket.status === 'resolved' || ticket.status === 'closed') && (
            <button onClick={() => handleStatusChange('open')}
              className="px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="space-y-4 mb-5 max-h-[460px] overflow-y-auto pr-1">
        {ticket.messages.map((msg, i) => {
          const isAdmin = msg.senderType === 'admin';
          return (
            <div key={i} className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isAdmin ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {isAdmin ? (msg.senderName?.charAt(0).toUpperCase() || 'A') : (ticket.userName?.charAt(0).toUpperCase() || 'U')}
              </div>
              <div className={`max-w-[80%] flex flex-col gap-1 ${isAdmin ? 'items-end' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isAdmin ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {msg.senderName}
                  {isAdmin && msg.senderRole && <span className="capitalize opacity-70 ml-1">({msg.senderRole.replace('_',' ')})</span>}
                  {' · '}{timeAgo(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply form */}
      <form onSubmit={handleReply} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        {error && <div className="px-4 py-2 bg-red-50 text-red-600 text-sm border-b border-red-100">{error}</div>}
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder="Type your reply to the user…"
          rows={3}
          className="w-full px-4 py-3 text-sm focus:outline-none resize-none"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Attach">
              <Paperclip className="w-4 h-4" />
            </button>
            {files.map((f, i) => (
              <span key={i} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                {f.name.slice(0, 15)}{f.name.length > 15 ? '…' : ''}
                <button type="button" onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={nextStatus}
              onChange={e => setNextStatus(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="waiting_user">Set: Awaiting User</option>
              <option value="in_progress">Set: In Progress</option>
              <option value="resolved">Set: Resolved</option>
              <option value="closed">Set: Closed</option>
            </select>
            <button
              type="submit"
              disabled={!reply.trim() || sending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Reply
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Main Admin Tickets Page ──────────────────────────────────────────────────
export default function AdminTickets() {
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch]     = useState('');
  const [statusCounts, setStatusCounts] = useState({});
  const [viewingId, setViewingId] = useState(null);

  const fetchTickets = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (search.trim()) params.search = search.trim();
      const res = await adminTicketAPI.getAll(params);
      if (res.data.success) {
        setTickets(res.data.data);
        setPagination(res.data.pagination);
        setStatusCounts(res.data.statusCounts || {});
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (!viewingId) fetchTickets(1); }, [statusFilter, priorityFilter, pageSize, viewingId]);

  // Real-time: new ticket or user reply → refresh list + badge
  useEffect(() => {
    const socket = getSocket('adminToken');
    if (!socket) return;

    const refresh = () => { if (!viewingId) fetchTickets(1); };
    const onNew    = (d) => {
      refresh();
      setStatusCounts(prev => ({ ...prev, open: (prev.open || 0) + 1 }));
    };
    socket.on('ticket:new',        onNew);
    socket.on('ticket:user_reply', refresh);
    socket.on('ticket:updated',    refresh);
    return () => {
      socket.off('ticket:new',        onNew);
      socket.off('ticket:user_reply', refresh);
      socket.off('ticket:updated',    refresh);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingId]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTickets(1);
  };

  if (viewingId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
          <TicketDetail ticketId={viewingId} onBack={() => setViewingId(null)} onUpdated={fetchTickets} />
        </div>
      </div>
    );
  }

  const totalOpen = (statusCounts.open || 0) + (statusCounts.in_progress || 0) + (statusCounts.waiting_user || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" /> Support Tickets
          <AdminHowItWorks page="tickets" /></h1>
          <p className="text-sm text-gray-500 mt-1">Manage and respond to user support requests</p>
        </div>
        <button onClick={() => fetchTickets(1)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shrink-0 self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Open',           count: statusCounts.open || 0,         color: 'border-blue-500',   text: 'text-blue-600' },
          { label: 'In Progress',    count: statusCounts.in_progress || 0,  color: 'border-indigo-500', text: 'text-indigo-600' },
          { label: 'Awaiting User',  count: statusCounts.waiting_user || 0, color: 'border-yellow-500', text: 'text-yellow-600' },
          { label: 'Resolved',       count: statusCounts.resolved || 0,     color: 'border-green-500',  text: 'text-green-600' },
          { label: 'Closed',         count: statusCounts.closed || 0,       color: 'border-gray-400',   text: 'text-gray-600' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${s.color}`}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.text}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ticket #, user, or subject…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </form>
          <div className="flex gap-2 flex-wrap">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-2 bg-white focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Status</option>
              {Object.entries(STATUS_MAP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-2 bg-white focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Priority</option>
              {Object.entries(PRIORITIES).map(([v, p]) => <option key={v} value={v}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tickets found</p>
            <p className="text-sm text-gray-400 mt-1">User support tickets will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Ticket #', 'User', 'Subject', 'Category', 'Priority', 'Status', 'Last Update', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map(t => (
                  <tr key={t._id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewingId(t._id)}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">{t.ticketNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{t.userName}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[120px]">{t.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm text-gray-900 truncate">{t.subject}</p>
                      <p className="text-xs text-gray-400">{t.messages?.length || 1} msg{(t.messages?.length || 1) !== 1 ? 's' : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 capitalize">{CATEGORIES[t.category] || t.category}</span>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(t.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); setViewingId(t._id); }}
                        className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        Reply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-indigo-500">
                {[10, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-gray-400 hidden sm:inline">
                {Math.min((pagination.page - 1) * pageSize + 1, pagination.total)}–{Math.min(pagination.page * pageSize, pagination.total)} of {pagination.total}
              </span>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={() => fetchTickets(pagination.page - 1)} disabled={pagination.page === 1}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">← Prev</button>
                <span className="px-3 text-sm text-gray-600">{pagination.page} / {pagination.pages}</span>
                <button onClick={() => fetchTickets(pagination.page + 1)} disabled={pagination.page === pagination.pages}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
