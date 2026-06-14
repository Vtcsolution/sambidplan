import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, XCircle, Loader2, RefreshCw, Globe,
  Phone, Mail, ChevronDown, ChevronUp, X, Eye, EyeOff,
  AlertCircle, Headphones, Clock, Star, TrendingUp, FileText,
} from 'lucide-react';
import { partnerAPI } from '../../services/adminApi';
import ConfirmModal from '../../components/ConfirmModal';

const STATUS_COLOR = {
  pending:  'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-gray-100 text-gray-500 border-gray-200',
};

const TABS = ['pending', 'approved', 'rejected'];

// ── Approve Modal ─────────────────────────────────────────────────────────────
function ApproveModal({ app, onClose, onApproved }) {
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [note,      setNote]      = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const handleApprove = async () => {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await partnerAPI.processApplication(app._id, {
        status: 'approved',
        password,
        adminNote: note,
      });
      onApproved(res.data.message || 'Application approved and credentials emailed.');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" /> Approve Partner
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Applicant summary */}
          <div className="bg-indigo-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {app.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{app.name}</p>
              <p className="text-sm text-indigo-600">{app.email}</p>
              {app.country && <p className="text-xs text-gray-500">{app.country}</p>}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            This will <strong>create a Support account</strong> using <strong>{app.email}</strong>,
            auto-generate a referral code, and email login credentials to the applicant.
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Temporary Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 pr-10 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Will be emailed to applicant. They should change it after first login.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Admin Note (optional)</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Strong LinkedIn presence, good fit"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleApprove} disabled={saving || password.length < 8}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Creating account…' : 'Approve & Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Application Card ──────────────────────────────────────────────────────────
function AppCard({ app, onApprove, onReject, rejecting }) {
  const [expanded, setExpanded] = useState(false);
  const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      app.status === 'pending' ? 'border-amber-200' :
      app.status === 'approved' ? 'border-green-200' : 'border-gray-200'
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Avatar + info */}
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
              app.status === 'approved' ? 'bg-green-500' :
              app.status === 'rejected' ? 'bg-gray-400'  : 'bg-indigo-500'
            }`}>
              {app.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="font-semibold text-gray-900">{app.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLOR[app.status]}`}>
                  {app.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{app.email}</span>
                {app.phone   && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{app.phone}</span>}
                {app.country && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{app.country}</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Applied {fmtDate(app.createdAt)}</span>
              </div>

              {app.experience && (
                <p className="text-xs text-gray-600 mt-1.5">
                  <span className="font-medium text-gray-700">Background:</span> {app.experience}
                </p>
              )}

              {app.channels?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {app.channels.map(c => (
                    <span key={c} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {app.status === 'pending' && (
              <>
                <button onClick={() => onApprove(app)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition">
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </button>
                <button onClick={() => onReject(app)} disabled={rejecting === app._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50">
                  {rejecting === app._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Reject
                </button>
              </>
            )}
            <button onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded: motivation + post-approval info */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Why they want to join</p>
              <p className="text-sm text-gray-700 leading-relaxed">{app.motivation}</p>
            </div>

            {app.adminNote && (
              <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-medium not-italic">Admin note:</span> {app.adminNote}
              </p>
            )}

            {app.status === 'approved' && app.createdAdminId && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
                <p className="font-semibold text-green-800 flex items-center gap-1.5 mb-1">
                  <Headphones className="w-4 h-4" /> Support account created
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                  <span><span className="font-medium">Email:</span> {app.createdAdminId.email}</span>
                  <span><span className="font-medium">Referral Code:</span> <span className="font-mono">{app.createdAdminId.referralCode}</span></span>
                </div>
              </div>
            )}

            {app.processedAt && (
              <p className="text-xs text-gray-400">
                {app.status === 'approved' ? 'Approved' : 'Rejected'} on {fmtDate(app.processedAt)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminMarketingPanel() {
  const [tab,          setTab]          = useState('pending');
  const [applications, setApplications] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [toast,        setToast]        = useState('');
  const [approveModal,  setApproveModal]  = useState(null);
  const [rejecting,     setRejecting]     = useState('');
  const [rejectDlg,     setRejectDlg]     = useState(null);
  const [rejectReason,  setRejectReason]  = useState('');

  useEffect(() => { fetchApps(); }, [tab]); // eslint-disable-line

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const fetchApps = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await partnerAPI.listApplications('all');
      setApplications(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (app) => {
    setRejectReason('');
    setRejectDlg(app);
  };

  const submitReject = async () => {
    if (!rejectDlg) return;
    setRejecting(rejectDlg._id);
    try {
      await partnerAPI.processApplication(rejectDlg._id, { status: 'rejected', adminNote: rejectReason });
      showToast(`${rejectDlg.name}'s application rejected.`);
      setRejectDlg(null);
      fetchApps();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject.');
    } finally { setRejecting(''); }
  };

  const filtered    = applications.filter(a => a.status === tab);
  const pendingCount  = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  return (
    <div className="space-y-6">

      {/* Reject Modal */}
      {rejectDlg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Reject Application</h2>
              <button onClick={() => setRejectDlg(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <XCircle className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-gray-600">Rejecting <strong>{rejectDlg.name}</strong> — they will be notified by email.</p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason <span className="text-gray-400">(optional)</span></label>
                <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason sent to applicant..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-red-400 focus:outline-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button onClick={() => setRejectDlg(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={submitReject} disabled={!!rejecting}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          <CheckCircle className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Partner program applications from <span className="font-medium text-indigo-600">sambid.co/become-partner</span>
          </p>
        </div>
        <button onClick={fetchApps} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 self-start">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: applications.length,  icon: FileText,  color: 'bg-indigo-500', border: 'border-indigo-500' },
          { label: 'Pending Review',     value: pendingCount,         icon: Clock,     color: 'bg-amber-500',  border: 'border-amber-500'  },
          { label: 'Approved Partners',  value: approvedCount,        icon: Headphones,color: 'bg-green-500',  border: 'border-green-500'  },
          { label: 'Rejected',           value: rejectedCount,        icon: XCircle,   color: 'bg-gray-400',   border: 'border-gray-400'   },
        ].map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${border}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`${color} p-2.5 rounded-xl shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending notice */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Star className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendingCount}</strong> application{pendingCount > 1 ? 's' : ''} waiting for your review.
            Approve to instantly create their support account and email credentials.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {t}
            {t === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No {tab} applications</p>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'pending'
              ? 'New applications from the /become-partner page will appear here.'
              : `No applications have been ${tab} yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => (
            <AppCard
              key={app._id}
              app={app}
              onApprove={setApproveModal}
              onReject={handleReject}
              rejecting={rejecting}
            />
          ))}
          <p className="text-xs text-gray-400 text-center pt-1">
            {filtered.length} {tab} application{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Approve modal */}
      {approveModal && (
        <ApproveModal
          app={approveModal}
          onClose={() => setApproveModal(null)}
          onApproved={(msg) => { showToast(msg); fetchApps(); }}
        />
      )}

    </div>
  );
}
