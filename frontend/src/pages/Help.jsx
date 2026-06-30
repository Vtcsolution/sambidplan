import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../hooks/useSocket';
import {
  HelpCircle, Plus, Ticket, Send, Paperclip, X, CheckCircle,
  Clock, AlertCircle, ChevronDown, ChevronUp, Upload,
  MessageSquare, Tag, ArrowLeft, RefreshCw, XCircle, Loader2,
  Lightbulb, Sparkles
} from 'lucide-react';
import { ticketAPI, suggestionAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import HowItWorks from '../components/HowItWorks';

const CATEGORIES = [
  { value: 'billing',         label: 'Billing & Payments' },
  { value: 'technical',       label: 'Technical Issue' },
  { value: 'account',         label: 'Account / Profile' },
  { value: 'general',         label: 'General Question' },
  { value: 'feature_request', label: 'Feature Request' },
];

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: 'bg-gray-100 text-gray-600' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high',   label: 'High',   color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
];

const STATUS_MAP = {
  open:         { label: 'Open',            color: 'bg-blue-100 text-blue-700',   icon: Clock },
  in_progress:  { label: 'In Progress',     color: 'bg-indigo-100 text-indigo-700', icon: RefreshCw },
  waiting_user: { label: 'Awaiting Reply',  color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  resolved:     { label: 'Resolved',        color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed:       { label: 'Closed',          color: 'bg-gray-100 text-gray-600',   icon: XCircle },
};

const FAQ = [
  { q: 'How do I upgrade my plan?', a: 'Go to Settings → Billing, or visit the Pricing page and select your desired plan.' },
  { q: 'Why am I not seeing any opportunities?', a: 'Make sure you have NAICS codes set in your profile (Settings → Profile). Opportunities are matched based on these codes.' },
  { q: 'How does AI matching work?', a: 'Our AI scores each federal contract from SAM.gov against your business profile and NAICS codes, then ranks by match percentage.' },
  { q: 'Can I export opportunities to PDF/CSV?', a: 'Yes — use the Export button on the Opportunities and Saved pages to download PDF or CSV.' },
  { q: 'How do referrals work?', a: 'Share your referral link from the Referral page. You earn a commission credit when someone signs up and subscribes using your link.' },
  { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page. A reset link will be emailed to you.' },
];

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
  const p = PRIORITIES.find(x => x.value === priority) || PRIORITIES[1];
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

// ─── Create Ticket Form ────────────────────────────────────────────────────────
function CreateTicketForm({ onSuccess }) {
  const [form, setForm] = useState({ subject: '', category: 'general', priority: 'medium', description: '' });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const picked = Array.from(e.target.files);
    if (files.length + picked.length > 3) { setError('Maximum 3 attachments allowed'); return; }
    setFiles(prev => [...prev, ...picked]);
    e.target.value = '';
  };

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setError('Subject and description are required'); return;
    }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach(f => fd.append('attachments', f));
      const res = await ticketAPI.create(fd);
      if (res.data.success) onSuccess(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={form.subject}
          onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
          placeholder="Brief description of your issue"
          maxLength={200}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={form.priority}
            onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
        <textarea
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Describe your issue in detail. Include any error messages or steps to reproduce."
          rows={5}
          maxLength={5000}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/5000</p>
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attachments <span className="text-gray-400 font-normal">(optional, max 3 files, 5 MB each)</span>
        </label>
        <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt" onChange={handleFile} className="hidden" />
        {files.length < 3 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors w-full justify-center"
          >
            <Upload className="w-4 h-4" /> Click to attach files
          </button>
        )}
        {files.length > 0 && (
          <div className="mt-2 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
                <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit Ticket</>}
      </button>
    </form>
  );
}

// ─── Ticket Conversation View ─────────────────────────────────────────────────
function TicketDetail({ ticketId, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState([]);
  const [sending,     setSending]    = useState(false);
  const [error,       setError]      = useState('');
  const [confirmDlg,  setConfirmDlg] = useState(false);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  const fetchTicket = async () => {
    try {
      const res = await ticketAPI.getById(ticketId);
      if (res.data.success) setTicket(res.data.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [ticket?.messages]);

  // Real-time: listen for admin replies on this ticket
  useEffect(() => {
    const socket = getSocket('authToken');
    if (!socket) return;

    const onAdminReply = (data) => {
      if (data.ticketId?.toString() !== ticketId?.toString()) return;
      setTicket(prev => {
        if (!prev) return prev;
        const alreadyHas = prev.messages.some(m => m._id === data.message?._id);
        if (alreadyHas) return prev;
        return {
          ...prev,
          status: data.status || prev.status,
          messages: [...prev.messages, data.message],
        };
      });
    };

    const onStatusChanged = (data) => {
      if (data.ticketId?.toString() !== ticketId?.toString()) return;
      setTicket(prev => prev ? { ...prev, status: data.status } : prev);
    };

    socket.on('ticket:admin_reply',    onAdminReply);
    socket.on('ticket:status_changed', onStatusChanged);
    return () => {
      socket.off('ticket:admin_reply',    onAdminReply);
      socket.off('ticket:status_changed', onStatusChanged);
    };
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
      files.forEach(f => fd.append('attachments', f));
      const res = await ticketAPI.reply(ticketId, fd);
      if (res.data.success) { setTicket(res.data.data); setReply(''); setFiles([]); }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reply');
    } finally { setSending(false); }
  };

  const handleClose = () => setConfirmDlg(true);

  const doClose = async () => {
    setConfirmDlg(false);
    try {
      await ticketAPI.close(ticketId);
      setTicket(prev => ({ ...prev, status: 'closed' }));
    } catch {}
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  if (!ticket) return <div className="text-center py-16 text-gray-400">Ticket not found</div>;

  const isClosed = ['resolved', 'closed'].includes(ticket.status);

  return (
    <div>
      <ConfirmModal
        isOpen={confirmDlg}
        title="Close Ticket?"
        message="Mark this ticket as closed. You won't be able to reply after closing."
        confirmLabel="Close Ticket"
        variant="warning"
        onConfirm={doClose}
        onCancel={() => setConfirmDlg(false)}
      />
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <button onClick={onBack} className="mt-1 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{ticket.ticketNumber}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug">{ticket.subject}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {CATEGORIES.find(c => c.value === ticket.category)?.label} · Opened {timeAgo(ticket.createdAt)}
          </p>
        </div>
        {!isClosed && (
          <button onClick={handleClose} className="shrink-0 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-4 mb-5 max-h-[480px] overflow-y-auto pr-1">
        {ticket.messages.map((msg, i) => {
          const isAdmin = msg.senderType === 'admin';
          return (
            <div key={i} className={`flex gap-3 ${isAdmin ? '' : 'flex-row-reverse'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isAdmin ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {isAdmin ? 'S' : 'U'}
              </div>
              <div className={`max-w-[80%] ${isAdmin ? '' : 'items-end'} flex flex-col gap-1`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isAdmin ? 'bg-indigo-50 text-gray-800 rounded-tl-none' : 'bg-gray-100 text-gray-800 rounded-tr-none'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-xs text-gray-400">{msg.senderName} · {timeAgo(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply form */}
      {isClosed ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-500">
          This ticket is {ticket.status}. <button onClick={onBack} className="text-indigo-600 hover:underline">Go back to open a new ticket</button> if you need further help.
        </div>
      ) : (
        <form onSubmit={handleReply} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          {error && <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">{error}</div>}
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Type your reply…"
            rows={3}
            className="w-full px-4 py-3 text-sm focus:outline-none resize-none border-b border-gray-100"
          />
          <div className="flex items-center justify-between px-3 py-2 gap-2">
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />
              <button type="button" onClick={() => fileRef.current?.click()} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Attach file">
                <Paperclip className="w-4 h-4" />
              </button>
              {files.map((f, i) => (
                <span key={i} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                  {f.name.slice(0, 15)}{f.name.length > 15 ? '…' : ''}
                  <button type="button" onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <button
              type="submit"
              disabled={!reply.trim() || sending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Inline Suggestion Panel ─────────────────────────────────────────────────
const SUG_CATS = [
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'improvement',     label: 'Improvement' },
  { value: 'bug_report',      label: 'Bug Report' },
  { value: 'general',         label: 'General Feedback' },
];
const SUG_STATUS = {
  pending:      { label: 'Pending',      color: 'bg-yellow-100 text-yellow-700' },
  under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-700' },
  in_progress:  { label: 'In Progress',  color: 'bg-indigo-100 text-indigo-700' },
  implemented:  { label: 'Implemented ✓',color: 'bg-green-100 text-green-700' },
  declined:     { label: 'Declined',     color: 'bg-red-100 text-red-700' },
};

function SuggestionPanel() {
  const [form, setForm]         = useState({ title: '', category: 'feature_request', description: '' });
  const [submitting, setSub]    = useState(false);
  const [submitted, setDone]    = useState(false);
  const [error, setErr]         = useState('');
  const [suggestions, setSugs]  = useState([]);
  const [loadingSugs, setLoadS] = useState(true);
  const [expanded, setExp]      = useState(null);

  useEffect(() => {
    suggestionAPI.getMy({ limit: 50 })
      .then(r => setSugs(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoadS(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.title.trim() || !form.description.trim()) { setErr('Title and description are required.'); return; }
    setSub(true);
    try {
      const r = await suggestionAPI.create(form);
      setSugs(prev => [r.data.data, ...prev]);
      setForm({ title: '', category: 'feature_request', description: '' });
      setDone(true);
      setTimeout(() => setDone(false), 5000);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to submit. Please try again.');
    } finally { setSub(false); }
  };

  return (
    <div className="space-y-5">
      {/* Submit form */}
      <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-100 rounded-lg"><Lightbulb className="w-4 h-4 text-indigo-600" /></div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Share a Suggestion or Idea</h2>
            <p className="text-xs text-gray-500">Your feedback shapes our product roadmap</p>
          </div>
        </div>

        {submitted && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-4 text-sm font-medium">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Thank you! 🎉 Your suggestion has been received. We'll review it and keep you updated.</span>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {SUG_CATS.map(c => (
              <button key={c.value} type="button"
                onClick={() => setForm(f => ({ ...f, category: c.value }))}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  form.category === c.value
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300'
                }`}
              >{c.label}</button>
            ))}
          </div>

          <input
            type="text" maxLength={200}
            placeholder="Title — short summary of your idea *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <textarea
            rows={4} maxLength={5000}
            placeholder="Describe your idea or feedback in detail — what problem it solves, how it would improve your experience… *"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button type="submit" disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting…' : 'Submit Suggestion'}
          </button>
        </form>
      </div>

      {/* Past submissions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" /> My Suggestions ({suggestions.length})
        </h3>
        {loadingSugs ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No suggestions yet — be the first to share an idea!</p>
        ) : (
          <div className="space-y-2">
            {suggestions.map(s => {
              const cat = SUG_CATS.find(c => c.value === s.category) || SUG_CATS[3];
              const st  = SUG_STATUS[s.status] || SUG_STATUS.pending;
              const open = expanded === s._id;
              return (
                <div key={s._id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => setExp(open ? null : s._id)}
                    className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        <span className="text-xs font-mono text-gray-400">{s.suggestionNumber}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600`}>{cat.label}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />}
                  </button>
                  {open && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-600 whitespace-pre-line">{s.description}</p>
                      {s.adminResponse?.note && (
                        <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                          <p className="text-xs font-semibold text-indigo-600 mb-1">
                            💬 Admin Response · {s.adminResponse.adminName}
                          </p>
                          <p className="text-sm text-gray-700">{s.adminResponse.note}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Help Page ───────────────────────────────────────────────────────────
export default function Help() {
  const [tab, setTab] = useState('my-tickets'); // 'new' | 'my-tickets' | 'faq' | 'suggestions'
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingId, setViewingId] = useState(null);
  const [successTicket, setSuccessTicket] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);
  const [showSugNudge, setShowSugNudge] = useState(false);

  const fetchTickets = async (page = 1) => {
    setLoading(true);
    try {
      const res = await ticketAPI.getAll({ page, limit: pageSize, ...(statusFilter !== 'all' && { status: statusFilter }) });
      if (res.data.success) {
        setTickets(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'my-tickets') fetchTickets(1);
  }, [tab, statusFilter]);

  const handleCreated = (ticket) => {
    setSuccessTicket(ticket);
    setTab('my-tickets');
    // Show suggestion nudge popup 1.2s after ticket submission
    setTimeout(() => setShowSugNudge(true), 1200);
  };

  if (viewingId) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
          <TicketDetail ticketId={viewingId} onBack={() => { setViewingId(null); fetchTickets(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-indigo-600 shrink-0" />
          Help & Support
          <HowItWorks title="Help & Support" steps={[
            { title: 'Create a support ticket', description: 'Describe your issue, select category (Billing, Technical, Account, General), set priority, attach files' },
            { title: 'Track status', description: 'Tickets move through: Open → In Progress → Awaiting Reply → Resolved → Closed' },
            { title: 'Get email replies', description: 'Our team responds via ticket thread — you get an email notification for each reply' },
            { title: 'AI Chat Assistant', description: 'Quick answers from our AI chatbot for common questions about the platform' },
          ]} dataUsed={['Your Tickets', 'FAQ Database']} />
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Submit a ticket, browse FAQs, or share feedback</p>
      </div>

      {/* Success banner */}
      {successTicket && (
        <div className="mb-5 flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">Ticket submitted successfully!</p>
            <p className="text-xs text-green-600 mt-0.5">
              Your ticket <span className="font-mono font-bold">{successTicket.ticketNumber}</span> has been created. Our team will respond shortly.
            </p>
          </div>
          <button onClick={() => setSuccessTicket(null)} className="text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Suggestion nudge popup — appears after ticket submit */}
      {showSugNudge && (
        <div className="mb-5 flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-100 rounded-lg shrink-0">
              <Lightbulb className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-900">Have a feature idea or feedback?</p>
              <p className="text-xs text-indigo-600 mt-0.5">While you wait — share a suggestion and help shape our roadmap.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setTab('suggestions'); setShowSugNudge(false); }}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Share Idea
            </button>
            <button onClick={() => setShowSugNudge(false)} className="text-indigo-300 hover:text-indigo-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {[
          { id: 'my-tickets',  label: 'My Tickets',  icon: Ticket },
          { id: 'new',         label: 'New Ticket',  icon: Plus },
          { id: 'faq',         label: 'FAQ',          icon: HelpCircle },
          { id: 'suggestions', label: 'Suggestions',  icon: Lightbulb },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <t.icon className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── New Ticket Tab ── */}
      {tab === 'new' && (
        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" /> Submit a Support Ticket
          </h2>
          <CreateTicketForm onSuccess={handleCreated} />
        </div>
      )}

      {/* ── My Tickets Tab ── */}
      {tab === 'my-tickets' && (
        <div className="bg-white rounded-xl shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-indigo-600" /> My Tickets
              {pagination.total > 0 && <span className="text-xs text-gray-400 font-normal ml-1">({pagination.total})</span>}
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                {Object.entries(STATUS_MAP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
              <button onClick={() => fetchTickets(1)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTab('new')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <Ticket className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tickets yet</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Submit a ticket if you need help with anything</p>
              <button
                onClick={() => setTab('new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Submit a Ticket
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tickets.map(t => (
                <button
                  key={t._id}
                  onClick={() => setViewingId(t._id)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-3"
                >
                  <div className="mt-0.5 shrink-0">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-indigo-600">{t.ticketNumber}</span>
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{t.subject}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="capitalize">{t.category.replace('_', ' ')}</span>
                      <span>·</span>
                      <span>{t.messages?.length || 1} message{(t.messages?.length || 1) !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{timeAgo(t.updatedAt)}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-300 shrink-0 mt-1 -rotate-90" />
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => fetchTickets(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >← Prev</button>
              <span className="px-3 py-1.5 text-sm text-gray-600">{pagination.page} / {pagination.pages}</span>
              <button
                onClick={() => fetchTickets(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── FAQ Tab ── */}
      {tab === 'faq' && (
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          <div className="px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Frequently Asked Questions</h2>
          </div>
          {FAQ.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">{item.q}</span>
                {faqOpen === i ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
              </button>
              {faqOpen === i && (
                <div className="px-5 pb-4 text-sm text-gray-600 border-t border-gray-50 bg-gray-50">{item.a}</div>
              )}
            </div>
          ))}
          <div className="px-5 py-4 bg-indigo-50 rounded-b-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-indigo-700 font-medium">Can't find your answer?</p>
              <p className="text-xs text-indigo-500 mt-0.5">Submit a ticket or share a suggestion.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTab('new')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Submit Ticket
              </button>
              <button
                onClick={() => setTab('suggestions')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-indigo-300 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
              >
                <Lightbulb className="w-4 h-4" /> Share Idea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suggestions Tab ── */}
      {tab === 'suggestions' && <SuggestionPanel />}
    </div>
    </div>
  );
}
