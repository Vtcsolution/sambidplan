import { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldCheck, UserPlus, Edit2, Trash2, RefreshCw,
  Eye, EyeOff, CheckCircle, XCircle, X, Loader2, AlertCircle,
  Crown, User, Headphones, Clock, Wifi, WifiOff,
} from 'lucide-react';
import { adminAuthAPI } from '../../services/adminApi';

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
  const [admins,    setAdmins]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [modal,     setModal]     = useState(null); // null | 'add' | admin object
  const [toast,     setToast]     = useState('');
  const [deleting,  setDeleting]  = useState('');

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

  const handleDelete = async (admin) => {
    if (!window.confirm(`Delete admin "${admin.name}" (${admin.email})? This cannot be undone.`)) return;
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

      {/* Modal */}
      {modal && (
        <AdminModal
          admin={modal === 'add' ? null : modal}
          currentAdminId={currentAdminId}
          onClose={() => setModal(null)}
          onSaved={(msg) => { showToast(msg); loadAdmins(); }}
        />
      )}
    </div>
  );
}
