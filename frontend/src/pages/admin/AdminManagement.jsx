import { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldCheck, UserPlus, Edit2, Trash2, RefreshCw,
  Eye, EyeOff, CheckCircle, XCircle, X, Loader2, AlertCircle,
  Crown, User, Headphones, Clock, Wifi, WifiOff,
  DollarSign, TrendingUp, Users, ChevronDown, ChevronUp,
  FileText, Globe, Phone, MessageSquare, Send, ArrowUpRight, ExternalLink, Image,
} from 'lucide-react';
import { adminAuthAPI, supportAPI, partnerAPI } from '../../services/adminApi';
import ConfirmModal from '../../components/ConfirmModal';

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'admin',       label: 'Admin',       icon: ShieldCheck, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'support',     label: 'Support',     icon: Headphones,  color: 'bg-teal-100 text-teal-700' },
  { value: 'super_admin', label: 'Super Admin', icon: Crown,       color: 'bg-amber-100 text-amber-800' },
];

const PERMISSION_LABELS = {
  users:     'User Management',
  payments:  'Payments & Invoices',
  content:   'Content & Opportunities',
  settings:  'System Settings',
  aiTools:   'AI Tools',
  campaigns: 'Email Campaigns',
};

const DEFAULT_PERMS = (role) => ({
  users:     role !== 'support',
  payments:  role !== 'support',
  content:   true,
  settings:  role === 'super_admin',
  aiTools:   true,
  campaigns: role !== 'support',
});

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role) || ROLES[0];
  const Icon = r.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${r.color}`}>
      <Icon className="w-3 h-3" /> {r.label}
    </span>
  );
}

function timeAgo(date) {
  if (!date) return 'Never';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function AdminModal({ admin, currentAdminId, onClose, onSaved }) {
  const isEdit = !!admin;

  const [form, setForm] = useState({
    name:        admin?.name        || '',
    email:       admin?.email       || '',
    password:    '',
    role:        admin?.role        || 'admin',
    isActive:    admin?.isActive    ?? true,
    permissions: admin?.permissions || DEFAULT_PERMS('admin'),
  });
  const [showPw,   setShowPw]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const isSelf = isEdit && admin._id === currentAdminId;

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => {
      const next = { ...f, [field]: val };
      // Auto-set default permissions when role changes
      if (field === 'role') next.permissions = DEFAULT_PERMS(val);
      return next;
    });
  };

  const togglePerm = (key) =>
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));

  const handleSave = async () => {
    if (!form.name.trim())  { setError('Name is required.');  return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!isEdit && form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (isEdit && form.password && form.password.length < 8) { setError('New password must be at least 8 characters.'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name:        form.name,
        email:       form.email,
        role:        form.role,
        isActive:    form.isActive,
        permissions: form.permissions,
      };
      if (form.password) payload.password = form.password;

      if (isEdit) {
        await adminAuthAPI.updateAdmin(admin._id, payload);
      } else {
        await adminAuthAPI.createAdmin({ ...payload, password: form.password });
      }
      onSaved(isEdit ? 'Admin updated.' : 'Admin account created.');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              {isEdit ? <Edit2 className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Admin' : 'Add Admin Account'}</h2>
              {isEdit && <p className="text-xs text-gray-400">{admin.email}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Basic info */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="Jane Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="admin@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isEdit ? 'New Password (leave blank to keep current)' : 'Password * (min 8 characters)'}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder={isEdit ? 'Leave blank to keep unchanged' : 'Min 8 characters'}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => {
                const Icon = r.icon;
                const disabled = isSelf && r.value !== 'super_admin';
                return (
                  <button key={r.value}
                    onClick={() => !disabled && setForm(f => ({ ...f, role: r.value, permissions: DEFAULT_PERMS(r.value) }))}
                    disabled={disabled}
                    className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition flex flex-col items-center gap-1 ${
                      form.role === r.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    {r.label}
                  </button>
                );
              })}
            </div>
            {isSelf && <p className="text-xs text-amber-600 mt-1.5">You cannot change your own role.</p>}
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Permissions</label>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer group py-1">
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
                  <div className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors ${
                    form.permissions[key] ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                    onClick={() => togglePerm(key)}>
                    <span className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${
                      form.permissions[key] ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Active status */}
          {isEdit && (
            <label className="flex items-center justify-between cursor-pointer bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Account Active</p>
                <p className="text-xs text-gray-400">Inactive admins cannot log in.</p>
              </div>
              <div className={`relative inline-flex items-center w-10 h-5 rounded-full transition-colors ${
                form.isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
                onClick={() => !isSelf && setForm(f => ({ ...f, isActive: !f.isActive }))}>
                <span className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${
                  form.isActive ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Admin')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminManagement() {
  const [admins,         setAdmins]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [modal,          setModal]          = useState(null);
  const [toast,          setToast]          = useState('');
  const [deleting,       setDeleting]       = useState('');
  const [supportStats,    setSupportStats]   = useState([]);
  const [suppWithdrawals, setSuppWithdrawals] = useState([]);
  const [suppLoading,     setSuppLoading]    = useState(false);
  const [processingW,     setProcessingW]    = useState('');
  const [wTab,            setWTab]           = useState('pending');
  const [payModal,        setPayModal]       = useState(null);
  const [payForm,         setPayForm]        = useState({ paymentId: '', proofScreenshotUrl: '', adminNote: '' });
  const [payingSaving,    setPayingSaving]   = useState(false);
  const [confirmDlg,      setConfirmDlg]     = useState(null);
  const [rejectDlg,       setRejectDlg]      = useState(null);  // partner app to reject
  const [rejectReason,    setRejectReason]   = useState('');
  const [rejectSaving,    setRejectSaving]   = useState(false);
  const [showSupport,     setShowSupport]    = useState(false);
  const [applications,   setApplications]  = useState([]);
  const [appsLoading,    setAppsLoading]   = useState(false);
  const [showApps,       setShowApps]      = useState(false);
  const [appTab,         setAppTab]        = useState('pending');
  const [processingApp,  setProcessingApp] = useState('');
  const [approveModal,   setApproveModal]  = useState(null);
  const [approvePassword, setApprovePassword] = useState('');
  const [approveNote,    setApproveNote]   = useState('');
  const [approveSaving,  setApproveSaving] = useState(false);

  // Current logged-in admin id
  const currentAdminId = (() => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id;
    } catch { return null; }
  })();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAuthAPI.listAdmins();
      setAdmins(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admins.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadSupportStats(); }, []);

  const loadSupportStats = async () => {
    setSuppLoading(true);
    try {
      const [statsRes, wRes] = await Promise.all([
        supportAPI.adminGetAll(),
        supportAPI.adminGetWithdrawals(),
      ]);
      setSupportStats(statsRes.data.data || []);
      setSuppWithdrawals(wRes.data.data || []);
    } catch { /* ignore */ }
    finally { setSuppLoading(false); }
  };

  const openPayModal = (withdrawal) => {
    setPayModal(withdrawal);
    setPayForm({ paymentId: '', proofScreenshotUrl: '', adminNote: '' });
  };

  const handleProcessWithdrawal = async (id, status) => {
    setProcessingW(id);
    try {
      await supportAPI.adminProcess(id, { status });
      showToast(`Withdrawal ${status}.`);
      loadSupportStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed.');
    } finally { setProcessingW(''); }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!payForm.paymentId.trim()) { showToast('Payment ID is required.'); return; }
    setPayingSaving(true);
    try {
      await supportAPI.adminProcess(payModal._id, {
        status:             'paid',
        paymentId:          payForm.paymentId.trim(),
        proofScreenshotUrl: payForm.proofScreenshotUrl.trim(),
        adminNote:          payForm.adminNote.trim(),
      });
      showToast(`Payment recorded for ${payModal.supportMember?.name}.`);
      setPayModal(null);
      loadSupportStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record payment.');
    } finally { setPayingSaving(false); }
  };

  const loadApplications = async (status = appTab) => {
    setAppsLoading(true);
    try {
      const res = await partnerAPI.listApplications(status);
      setApplications(res.data.data || []);
    } catch { /* ignore */ }
    finally { setAppsLoading(false); }
  };

  const handleApproveApp = async () => {
    if (!approvePassword || approvePassword.length < 8) {
      showToast('Password must be at least 8 characters.');
      return;
    }
    setApproveSaving(true);
    try {
      const res = await partnerAPI.processApplication(approveModal._id, {
        status: 'approved',
        password: approvePassword,
        adminNote: approveNote,
      });
      showToast(res.data.message || 'Application approved and credentials emailed.');
      setApproveModal(null);
      setApprovePassword('');
      setApproveNote('');
      loadApplications();
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve.');
    } finally { setApproveSaving(false); }
  };

  const handleRejectApp = (app) => {
    setRejectReason('');
    setRejectDlg(app);
  };

  const submitReject = async () => {
    if (!rejectDlg) return;
    setRejectSaving(true);
    try {
      await partnerAPI.processApplication(rejectDlg._id, { status: 'rejected', adminNote: rejectReason });
      showToast(`Application from ${rejectDlg.name} rejected.`);
      setRejectDlg(null);
      loadApplications();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject.');
    } finally { setRejectSaving(false); }
  };

  const handleDelete = (admin) => {
    setConfirmDlg({
      title:     `Delete ${admin.name}?`,
      message:   `This will permanently remove "${admin.name}" (${admin.email}) and cannot be undone.`,
      variant:   'danger',
      onConfirm: async () => {
        setConfirmDlg(null);
        setDeleting(admin._id);
        try {
          await adminAuthAPI.deleteAdmin(admin._id);
          showToast(`${admin.name} deleted.`);
          loadAdmins();
        } catch (err) {
          showToast(err.response?.data?.message || 'Delete failed.');
        } finally {
          setDeleting('');
        }
      },
    });
  };

  const handleToggleActive = async (admin) => {
    try {
      await adminAuthAPI.updateAdmin(admin._id, { isActive: !admin.isActive });
      showToast(`${admin.name} ${admin.isActive ? 'deactivated' : 'activated'}.`);
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed.');
    }
  };

  const superAdminCount = admins.filter(a => a.role === 'super_admin').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage admin accounts, roles, and permissions. Only super admins can access this page.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button onClick={loadAdmins} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            <UserPlus className="w-4 h-4" /> Add Admin
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Admins',  value: admins.length,                                          color: 'text-gray-800' },
          { label: 'Super Admins',  value: superAdminCount,                                         color: 'text-amber-700' },
          { label: 'Active',        value: admins.filter(a => a.isActive).length,                   color: 'text-green-700' },
          { label: 'Support Staff', value: admins.filter(a => a.role === 'support').length,          color: 'text-teal-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Admins list */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : admins.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No admin accounts found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Admin</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-left hidden lg:table-cell">Permissions</th>
                <th className="px-6 py-3 text-left hidden md:table-cell">Last Login</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins.map(admin => {
                const isSelf = admin._id === currentAdminId;
                const enabledPerms = Object.entries(admin.permissions || {})
                  .filter(([, v]) => v).map(([k]) => PERMISSION_LABELS[k] || k);

                return (
                  <tr key={admin._id} className={`hover:bg-gray-50/50 transition ${!admin.isActive ? 'opacity-60' : ''}`}>
                    {/* Admin info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white
                          ${admin.role === 'super_admin' ? 'bg-amber-500' : admin.role === 'support' ? 'bg-teal-500' : 'bg-indigo-500'}`}>
                          {admin.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                            {admin.name}
                            {isSelf && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                          </p>
                          <p className="text-xs text-gray-400">{admin.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <RoleBadge role={admin.role} />
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => !isSelf && handleToggleActive(admin)}
                        disabled={isSelf}
                        title={isSelf ? 'Cannot change your own status' : (admin.isActive ? 'Deactivate' : 'Activate')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          admin.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        } ${isSelf ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {admin.isActive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Permissions */}
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {enabledPerms.length === 0
                          ? <span className="text-xs text-gray-400">No permissions</span>
                          : enabledPerms.map(p => (
                            <span key={p} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{p}</span>
                          ))
                        }
                      </div>
                    </td>

                    {/* Last login */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5 text-gray-300" />
                        {timeAgo(admin.lastLoginAt)}
                      </div>
                      {admin.lastLoginIP && (
                        <p className="text-xs text-gray-300 mt-0.5">{admin.lastLoginIP}</p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModal(admin)}
                          className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => handleDelete(admin)}
                            disabled={deleting === admin._id}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                            title="Delete"
                          >
                            {deleting === admin._id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── Partner Applications Section ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => {
            setShowApps(v => !v);
            if (!showApps) loadApplications('pending');
          }}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-semibold text-gray-900">Partner Applications</h2>
              <p className="text-xs text-gray-500">People who applied via the /become-partner page</p>
            </div>
          </div>
          {showApps ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showApps && (
          <div className="border-t border-gray-100 px-6 pb-6">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mt-4 mb-4">
              {['pending', 'approved', 'rejected'].map(t => (
                <button key={t} onClick={() => { setAppTab(t); loadApplications(t); }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${appTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                  {t}
                </button>
              ))}
            </div>

            {appsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : applications.filter(a => a.status === appTab).length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No {appTab} applications.</p>
            ) : (
              <div className="space-y-3">
                {applications.filter(a => a.status === appTab).map(app => (
                  <div key={app._id} className={`border rounded-xl p-4 ${
                    app.status === 'pending' ? 'border-amber-200 bg-amber-50' :
                    app.status === 'approved' ? 'border-green-200 bg-green-50' :
                    'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-gray-900">{app.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            app.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                            app.status === 'approved' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{app.status}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1"><Send className="w-3 h-3" /> {app.email}</span>
                          {app.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {app.phone}</span>}
                          {app.country && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {app.country}</span>}
                        </div>
                        {app.experience && <p className="text-xs text-gray-600 mb-1"><span className="font-medium">Experience:</span> {app.experience}</p>}
                        {app.channels?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {app.channels.map(c => <span key={c} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">{c}</span>)}
                          </div>
                        )}
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 max-w-xl">
                          <span className="font-medium text-gray-500">Motivation: </span>{app.motivation}
                        </div>
                        {app.adminNote && <p className="text-xs text-gray-500 mt-1 italic">Admin note: {app.adminNote}</p>}
                        {app.createdAdminId && (
                          <p className="text-xs text-green-700 mt-1">
                            Account created: <span className="font-mono font-medium">{app.createdAdminId.email}</span>
                            {app.createdAdminId.referralCode && <> · Code: <span className="font-mono">{app.createdAdminId.referralCode}</span></>}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Applied {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>

                      {app.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => { setApproveModal(app); setApprovePassword(''); setApproveNote(''); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => handleRejectApp(app)} disabled={processingApp === app._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 transition disabled:opacity-50">
                            {processingApp === app._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <AdminModal
          admin={modal === 'add' ? null : modal}
          currentAdminId={currentAdminId}
          onClose={() => setModal(null)}
          onSaved={(msg) => { showToast(msg); loadAdmins(); }}
        />
      )}

      {/* Approve Partner Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" /> Approve Partner Application
              </h2>
              <button onClick={() => setApproveModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-indigo-50 rounded-xl p-3 text-sm">
                <p className="font-semibold text-indigo-900">{approveModal.name}</p>
                <p className="text-indigo-600">{approveModal.email}</p>
              </div>
              <p className="text-sm text-gray-600">
                This will create a <strong>Support</strong> admin account for this person, generate their referral code,
                and email them their login credentials automatically.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Temporary Password <span className="text-red-500">*</span> (min 8 characters)
                </label>
                <div className="relative">
                  <input type="text" value={approvePassword} onChange={e => setApprovePassword(e.target.value)}
                    placeholder="e.g. Welcome2024!"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:outline-none" />
                </div>
                <p className="text-xs text-gray-400 mt-1">This will be emailed to the applicant. Ask them to change it after first login.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Admin Note (optional)</label>
                <input value={approveNote} onChange={e => setApproveNote(e.target.value)}
                  placeholder="e.g. Approved — strong LinkedIn network"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button onClick={() => setApproveModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleApproveApp} disabled={approveSaving || approvePassword.length < 8}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                {approveSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {approveSaving ? 'Creating account…' : 'Approve & Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Dialog ────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!confirmDlg}
        title={confirmDlg?.title || ''}
        message={confirmDlg?.message}
        variant={confirmDlg?.variant || 'danger'}
        confirmLabel={confirmDlg?.confirmLabel}
        onConfirm={() => confirmDlg?.onConfirm?.()}
        onCancel={() => setConfirmDlg(null)}
      />

      {/* ── Reject Partner Modal ──────────────────────────────────────────── */}
      {rejectDlg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Reject Application</h2>
              <button onClick={() => setRejectDlg(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-gray-600">
                Rejecting <strong>{rejectDlg.name}</strong> ({rejectDlg.email}). They will be notified by email.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason <span className="text-gray-400">(optional, shown to applicant)</span></label>
                <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. We are not accepting new partners in your region at this time."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-red-400 focus:outline-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button onClick={() => setRejectDlg(null)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={submitReject} disabled={rejectSaving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
                {rejectSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pay Withdrawal Modal ──────────────────────────────────────────── */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-semibold text-gray-900">Record Payment</h2>
              </div>
              <button onClick={() => setPayModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Withdrawal summary */}
            <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{payModal.supportMember?.name}</p>
                <span className="text-lg font-bold text-emerald-600">${payModal.amount?.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500">{payModal.supportMember?.email}</p>
              <p className="text-xs text-gray-500 capitalize">
                Method: <strong>{(payModal.method || '').replace(/_/g, ' ')}</strong>
                {' · '}Account: <strong>{payModal.accountDetails?.email || payModal.accountDetails?.account || '—'}</strong>
              </p>
            </div>

            <form onSubmit={submitPayment} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Payment ID / Transaction Reference <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PAY-7QT36789XL or TXN-123456"
                  value={payForm.paymentId}
                  onChange={e => setPayForm(f => ({ ...f, paymentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Image className="w-3.5 h-3.5" /> Screenshot Proof URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or imgur link"
                  value={payForm.proofScreenshotUrl}
                  onChange={e => setPayForm(f => ({ ...f, proofScreenshotUrl: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Paste a Google Drive, Dropbox, or direct image link. Support member will see this as proof.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Admin Note <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  rows={2}
                  placeholder="Any note for this payment..."
                  value={payForm.adminNote}
                  onChange={e => setPayForm(f => ({ ...f, adminNote: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
                <button type="button" onClick={() => setPayModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={payingSaving || !payForm.paymentId.trim()}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition">
                  {payingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Support Referral Program ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header — always visible, click to toggle member list */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
              <Headphones className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Support Referral Program</h2>
              <p className="text-xs text-gray-500">Earnings, referrals and withdrawal requests from support members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {suppWithdrawals.filter(w => w.status === 'pending').length > 0 && (
              <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                <DollarSign className="w-3 h-3" />
                {suppWithdrawals.filter(w => w.status === 'pending').length} withdrawal{suppWithdrawals.filter(w => w.status === 'pending').length > 1 ? 's' : ''} pending
              </span>
            )}
            <button
              onClick={() => { setShowSupport(v => !v); if (!showSupport) loadSupportStats(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600">
              {showSupport ? <><ChevronUp className="w-3.5 h-3.5" /> Hide</> : <><ChevronDown className="w-3.5 h-3.5" /> Show</>}
            </button>
          </div>
        </div>

        {/* ── Withdrawal Requests — always shown, loads on mount ── */}
        {suppLoading && !showSupport ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-teal-500" /></div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Withdrawal tabs + table */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" /> Withdrawal Requests
              </h3>
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                {['pending','approved','paid','rejected'].map(t => {
                  const cnt = suppWithdrawals.filter(w => w.status === t).length;
                  return (
                    <button key={t} onClick={() => { setWTab(t); if (suppWithdrawals.length === 0) loadSupportStats(); }}
                      className={`relative px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${wTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                      {t}
                      {cnt > 0 && t === 'pending' && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cnt}</span>
                      )}
                    </button>
                  );
                })}
                <button onClick={loadSupportStats} disabled={suppLoading}
                  className="px-2 py-1 rounded-md text-gray-400 hover:text-gray-600 transition">
                  <RefreshCw className={`w-3 h-3 ${suppLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {suppLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-teal-500" /></div>
            ) : suppWithdrawals.filter(w => w.status === wTab).length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <DollarSign className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No {wTab} withdrawal requests</p>
                {wTab === 'pending' && <p className="text-xs text-gray-400 mt-1">Requests will appear here when support members submit them</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[580px]">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      {['Support Member','Amount','Method','Account','Requested','Status','Actions'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {suppWithdrawals.filter(w => w.status === wTab).map(w => (
                      <tr key={w._id} className="hover:bg-gray-50 transition">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-gray-900">{w.supportMember?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{w.supportMember?.email || '—'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-bold text-emerald-600 text-base">${w.amount.toFixed(2)}</span>
                        </td>
                        <td className="px-3 py-3 capitalize text-gray-600 text-xs">
                          {(w.method || '').replace(/_/g, ' ')}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 max-w-[140px] truncate">
                          {w.accountDetails?.email || w.accountDetails?.account || '—'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-400">
                          {new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            w.status === 'paid'     ? 'bg-green-100 text-green-700' :
                            w.status === 'approved' ? 'bg-blue-100 text-blue-700'   :
                            w.status === 'rejected' ? 'bg-red-100 text-red-600'     :
                            'bg-amber-100 text-amber-700'
                          }`}>{w.status}</span>
                          {w.processedAt && (
                            <p className="text-xs text-gray-300 mt-0.5">{new Date(w.processedAt).toLocaleDateString()}</p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {(w.status === 'pending' || w.status === 'approved') && (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => openPayModal(w)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
                                <CheckCircle className="w-3 h-3" /> Mark Paid
                              </button>
                              {w.status === 'pending' && (
                                <button disabled={processingW === w._id}
                                  onClick={() => handleProcessWithdrawal(w._id, 'rejected')}
                                  className="px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition disabled:opacity-50">
                                  {processingW === w._id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reject'}
                                </button>
                              )}
                            </div>
                          )}
                          {w.status === 'paid' && w.paymentId && (
                            <div className="text-xs text-gray-500 space-y-0.5">
                              <p><span className="font-medium text-gray-700">ID:</span> <span className="font-mono">{w.paymentId}</span></p>
                              {w.proofScreenshotUrl && (
                                <a href={w.proofScreenshotUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-indigo-600 hover:underline">
                                  <ArrowUpRight className="w-3 h-3" /> View proof
                                </a>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Member stats — collapsible */}
            {showSupport && (
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Support Member Balances</h3>
                {supportStats.length === 0 ? (
                  <p className="text-sm text-gray-400">No support members yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <tr>
                          {['Member','Referral Code','Signups','Converted','Total Earned','Balance','Pending Requests'].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {supportStats.map(({ member, totalSignups, convertedCount, totalWithdrawn, pendingWithdrawals }) => (
                          <tr key={member._id} className="hover:bg-gray-50 transition">
                            <td className="px-3 py-3">
                              <p className="font-semibold text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-400">{member.email}</p>
                            </td>
                            <td className="px-3 py-3">
                              {member.referralCode
                                ? <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{member.referralCode}</span>
                                : <span className="text-xs text-gray-300 italic">none</span>}
                            </td>
                            <td className="px-3 py-3 font-bold text-gray-900">{totalSignups}</td>
                            <td className="px-3 py-3 font-bold text-gray-900">{convertedCount}</td>
                            <td className="px-3 py-3 font-bold text-emerald-600">${(member.totalCommissionEarned || 0).toFixed(2)}</td>
                            <td className="px-3 py-3 font-bold text-blue-600">${(member.referralBalance || 0).toFixed(2)}</td>
                            <td className="px-3 py-3">
                              {pendingWithdrawals > 0
                                ? <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">{pendingWithdrawals} pending</span>
                                : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
