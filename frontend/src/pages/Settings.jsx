// frontend/src/pages/Settings.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Briefcase, Bell, Shield, Crown, Moon, Sun,
  Search, X, Check, Loader2, CheckCircle, AlertCircle,
  Eye, EyeOff, Zap, Clock, Calendar, Save, ChevronRight, Palette,
  ShieldCheck, QrCode, Key, Copy, Download, Trash2
} from 'lucide-react';
import { authAPI, opportunityAPI, paymentAPI } from '../services/api';
import { searchNAICS, NAICS_CODES } from '../data/naicsCodes';
import PushNotificationToggle from '../components/PushNotificationToggle';
import { useDarkMode } from '../hooks/useDarkMode';
import { usePlans } from '../hooks/usePlans';

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'naics',         label: 'NAICS Codes',   icon: Briefcase },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'appearance',    label: 'Appearance',    icon: Palette },
  { id: 'plan',          label: 'Plan',          icon: Crown },
];

const BUSINESS_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'llc',             label: 'LLC' },
  { value: 'corporation',     label: 'Corporation' },
  { value: 'nonprofit',       label: 'Nonprofit' },
  { value: 'other',           label: 'Other' },
];

// ── Reusable toast ──────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm mb-5 ${
      type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
      'bg-red-50 border border-red-200 text-red-700'
    }`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {msg}
    </div>
  );
}

export default function Settings() {
  const [activeTab,  setActiveTab]  = useState('profile');
  const [userData,   setUserData]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [isDark, setIsDark] = useDarkMode();
  const { getMonthly, getYearly } = usePlans();

  // ── Profile tab ────────────────────────────────────────────────────────────
  const [name,         setName]         = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('llc');
  const [profSaving,   setProfSaving]   = useState(false);
  const [profMsg,      setProfMsg]      = useState({ text: '', type: '' });

  // ── NAICS tab ──────────────────────────────────────────────────────────────
  const [selectedNAICS, setSelectedNAICS] = useState([]);
  const [naicsQuery,    setNaicsQuery]    = useState('');
  const [naicsResults,  setNaicsResults]  = useState([]);
  const [naicsSaving,   setNaicsSaving]   = useState(false);
  const [naicsMsg,      setNaicsMsg]      = useState({ text: '', type: '' });
  const naicsInputRef = useRef(null);

  // ── Notifications tab ──────────────────────────────────────────────────────
  const [emailAlerts,    setEmailAlerts]    = useState(true);
  const [alertFrequency, setAlertFrequency] = useState('daily');
  const [notifSaving,    setNotifSaving]    = useState(false);
  const [notifMsg,       setNotifMsg]       = useState({ text: '', type: '' });

  // ── Security tab ──────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [secSaving, setSecSaving] = useState(false);
  const [secMsg,    setSecMsg]    = useState({ text: '', type: '' });

  // ── 2FA state ──────────────────────────────────────────────────────────────
  const [tfaEnabled,     setTfaEnabled]     = useState(() => localStorage.getItem('twoFactorEnabled') === 'true');
  const [tfaStep,        setTfaStep]        = useState('idle'); // idle | setup | verify | backup | disable
  const [tfaQR,          setTfaQR]          = useState('');
  const [tfaSecret,      setTfaSecret]      = useState('');
  const [tfaOtp,         setTfaOtp]         = useState('');
  const [tfaDisablePw,   setTfaDisablePw]   = useState('');
  const [tfaDisableOtp,  setTfaDisableOtp]  = useState('');
  const [backupCodes,    setBackupCodes]    = useState([]);
  const [tfaLoading,     setTfaLoading]     = useState(false);
  const [tfaMsg,         setTfaMsg]         = useState({ text: '', type: '' });
  const [copiedCode,     setCopiedCode]     = useState('');

  // ── Privacy & Data (export / delete account) ──────────────────────────────
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMsg,     setExportMsg]     = useState({ text: '', type: '' });
  const [delStep,       setDelStep]       = useState('idle'); // idle | confirm
  const [delPassword,   setDelPassword]   = useState('');
  const [delConfirmText, setDelConfirmText] = useState('');
  const [delOtp,        setDelOtp]        = useState('');
  const [delLoading,    setDelLoading]    = useState(false);
  const [delMsg,        setDelMsg]        = useState({ text: '', type: '' });

  const pwStrength = (() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 8)           s++;
    if (/[A-Z]/.test(newPw))        s++;
    if (/[0-9]/.test(newPw))        s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  })();

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await authAPI.getProfile();
        if (res.data.success) {
          const u = res.data.data;
          setUserData(u);
          setName(u.name || '');
          setBusinessName(u.businessName || '');
          setBusinessType(u.businessType || 'llc');
          setSelectedNAICS(u.naicsCodes || []);
          setEmailAlerts(u.emailAlertsEnabled !== false);
          setAlertFrequency(u.alertFrequency || 'daily');
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  // ── NAICS search ───────────────────────────────────────────────────────────
  useEffect(() => {
    setNaicsResults(naicsQuery.trim().length >= 2 ? searchNAICS(naicsQuery) : []);
  }, [naicsQuery]);

  const addNAICS = (code) => {
    if (!selectedNAICS.includes(code) && selectedNAICS.length < 5) {
      setSelectedNAICS(prev => [...prev, code]);
    }
    setNaicsQuery('');
    setNaicsResults([]);
    naicsInputRef.current?.focus();
  };
  const removeNAICS = (code) => setSelectedNAICS(prev => prev.filter(c => c !== code));

  // ── Save handlers ──────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!name.trim()) { setProfMsg({ text: 'Full name is required.', type: 'error' }); return; }
    if (name.trim().length < 2) { setProfMsg({ text: 'Name must be at least 2 characters.', type: 'error' }); return; }
    setProfSaving(true); setProfMsg({ text: '', type: '' });
    try {
      await authAPI.updateProfile({ name: name.trim(), businessName, businessType });
      localStorage.setItem('userName', name.trim());
      setProfMsg({ text: 'Profile updated!', type: 'success' });
    } catch (e) {
      setProfMsg({ text: e.response?.data?.message || 'Failed to save', type: 'error' });
    } finally {
      setProfSaving(false);
      setTimeout(() => setProfMsg({ text: '', type: '' }), 3000);
    }
  };

  const saveNAICS = async () => {
    setNaicsSaving(true); setNaicsMsg({ text: '', type: '' });
    try {
      await opportunityAPI.updateProfile({ naicsCodes: selectedNAICS });
      setNaicsMsg({ text: 'NAICS codes saved! Your opportunity feed will refresh shortly.', type: 'success' });
    } catch (e) {
      setNaicsMsg({ text: e.response?.data?.message || 'Failed to save', type: 'error' });
    } finally {
      setNaicsSaving(false);
      setTimeout(() => setNaicsMsg({ text: '', type: '' }), 4000);
    }
  };

  const saveNotifications = async () => {
    setNotifSaving(true); setNotifMsg({ text: '', type: '' });
    try {
      await authAPI.updateProfile({ emailAlertsEnabled: emailAlerts, alertFrequency });
      setNotifMsg({ text: 'Notification preferences saved!', type: 'success' });
    } catch (e) {
      setNotifMsg({ text: e.response?.data?.message || 'Failed to save', type: 'error' });
    } finally {
      setNotifSaving(false);
      setTimeout(() => setNotifMsg({ text: '', type: '' }), 3000);
    }
  };

  const savePassword = async () => {
    if (!currentPw.trim()) { setSecMsg({ text: 'Current password is required.', type: 'error' }); return; }
    if (!newPw.trim())     { setSecMsg({ text: 'New password is required.', type: 'error' }); return; }
    if (newPw.length < 6)  { setSecMsg({ text: 'New password must be at least 6 characters.', type: 'error' }); return; }
    if (newPw !== confirmPw) { setSecMsg({ text: "New passwords don't match.", type: 'error' }); return; }
    setSecSaving(true); setSecMsg({ text: '', type: '' });
    try {
      await authAPI.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setSecMsg({ text: 'Password updated successfully!', type: 'success' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e) {
      setSecMsg({ text: e.response?.data?.message || 'Failed to update password', type: 'error' });
    } finally {
      setSecSaving(false);
    }
  };

  // ── 2FA handlers ──────────────────────────────────────────────────────────
  const start2FASetup = async () => {
    setTfaLoading(true); setTfaMsg({ text: '', type: '' });
    try {
      const res = await authAPI.setup2FA();
      setTfaQR(res.data.data.qrCode);
      setTfaSecret(res.data.data.secret);
      setTfaStep('setup');
    } catch (e) {
      setTfaMsg({ text: e.response?.data?.message || 'Failed to start 2FA setup.', type: 'error' });
    } finally {
      setTfaLoading(false);
    }
  };

  const confirm2FAEnable = async () => {
    if (!tfaOtp.trim()) { setTfaMsg({ text: 'Enter the 6-digit code from your authenticator app.', type: 'error' }); return; }
    setTfaLoading(true); setTfaMsg({ text: '', type: '' });
    try {
      const res = await authAPI.enable2FA(tfaOtp.trim());
      setBackupCodes(res.data.data.backupCodes);
      setTfaEnabled(true);
      localStorage.setItem('twoFactorEnabled', 'true');
      setTfaStep('backup');
      setTfaOtp('');
    } catch (e) {
      setTfaMsg({ text: e.response?.data?.message || 'Invalid code. Please try again.', type: 'error' });
    } finally {
      setTfaLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!tfaDisableOtp.trim() || !tfaDisablePw.trim()) {
      setTfaMsg({ text: 'Password and OTP code are both required.', type: 'error' }); return;
    }
    setTfaLoading(true); setTfaMsg({ text: '', type: '' });
    try {
      await authAPI.disable2FA({ token: tfaDisableOtp.trim(), password: tfaDisablePw });
      setTfaEnabled(false);
      localStorage.removeItem('twoFactorEnabled');
      setTfaStep('idle');
      setTfaDisablePw(''); setTfaDisableOtp('');
      setTfaMsg({ text: '2FA has been disabled.', type: 'success' });
    } catch (e) {
      setTfaMsg({ text: e.response?.data?.message || 'Failed to disable 2FA.', type: 'error' });
    } finally {
      setTfaLoading(false);
    }
  };

  const copyBackupCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const copyAllBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCode('all');
    setTimeout(() => setCopiedCode(''), 2000);
  };

  // ── Privacy & Data handlers ────────────────────────────────────────────────
  const handleExportData = async () => {
    setExportLoading(true); setExportMsg({ text: '', type: '' });
    try {
      const res = await authAPI.exportData();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sambid-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportMsg({ text: 'Your data export has been downloaded.', type: 'success' });
    } catch (e) {
      setExportMsg({ text: e.response?.data?.message || 'Failed to export data.', type: 'error' });
    } finally {
      setExportLoading(false);
      setTimeout(() => setExportMsg({ text: '', type: '' }), 4000);
    }
  };

  const handleDeleteAccount = async () => {
    if (delConfirmText !== 'DELETE') {
      setDelMsg({ text: 'Please type DELETE to confirm.', type: 'error' }); return;
    }
    if (!delPassword.trim()) {
      setDelMsg({ text: 'Your password is required.', type: 'error' }); return;
    }
    if (tfaEnabled && !delOtp.trim()) {
      setDelMsg({ text: 'Authenticator code is required.', type: 'error' }); return;
    }
    setDelLoading(true); setDelMsg({ text: '', type: '' });
    try {
      await authAPI.deleteAccount({ password: delPassword, confirmation: delConfirmText, token: delOtp.trim() });
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } catch (e) {
      setDelMsg({ text: e.response?.data?.message || 'Failed to delete account.', type: 'error' });
      setDelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        <div className="mb-5 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-0.5 sm:mt-1 text-xs sm:text-sm">Manage your account, NAICS codes, and preferences</p>
        </div>

        <div className="flex gap-5 sm:gap-6 flex-col lg:flex-row">

          {/* ── Sidebar tabs ─────────────────────────────────────────────── */}
          <nav className="lg:w-52 flex-shrink-0">
            {/* Mobile: horizontal scroll */}
            <div className="flex lg:hidden gap-1 overflow-x-auto pb-1 bg-white rounded-xl shadow-sm p-1.5 no-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Desktop: vertical list */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-700 border-l-2 border-l-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {/* ── Tab content ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* ══ Profile ═══════════════════════════════════════════════════ */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-5">Profile Information</h2>
                <Toast msg={profMsg.text} type={profMsg.type} />

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        value={userData?.email || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Your Company LLC"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {BUSINESS_TYPES.map(bt => (
                        <button
                          key={bt.value}
                          type="button"
                          onClick={() => setBusinessType(bt.value)}
                          className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                            businessType === bt.value
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {businessType === bt.value && <Check className="w-3 h-3 inline mr-1" />}
                          {bt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={saveProfile}
                    disabled={profSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {profSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {profSaving ? 'Saving…' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}

            {/* ══ NAICS Codes ═══════════════════════════════════════════════ */}
            {activeTab === 'naics' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">NAICS Industry Codes</h2>
                <p className="text-sm text-gray-500 mb-5">
                  These codes determine which federal contracts are matched to you. Add up to 5 codes.
                </p>
                <Toast msg={naicsMsg.text} type={naicsMsg.type} />

                {/* Selected chips */}
                {selectedNAICS.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4 p-3 bg-indigo-50 rounded-xl">
                    {selectedNAICS.map(code => {
                      const entry = NAICS_CODES.find(n => n.code === code);
                      const desc  = entry?.label.split(' — ')[1] || '';
                      return (
                        <span key={code} className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                          <span className="font-mono">{code}</span>
                          {desc && <span className="opacity-75 hidden sm:inline">{desc.substring(0, 30)}</span>}
                          <button onClick={() => removeNAICS(code)} className="hover:bg-indigo-500 rounded-full p-0.5 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search */}
                {selectedNAICS.length < 5 ? (
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={naicsInputRef}
                      type="text"
                      value={naicsQuery}
                      onChange={e => setNaicsQuery(e.target.value)}
                      placeholder="Search by keyword or code — e.g. 'software', 'construction', '541512'"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    {naicsResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        {naicsResults.map(n => (
                          <button
                            key={n.code}
                            type="button"
                            onClick={() => addNAICS(n.code)}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0 flex items-center gap-3"
                          >
                            <span className="font-mono font-bold text-indigo-600 w-14 flex-shrink-0">{n.code}</span>
                            <span className="text-gray-700">{n.label.split(' — ')[1]}</span>
                            <span className="ml-auto text-xs text-indigo-500 flex-shrink-0">+ Add</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                    Maximum 5 NAICS codes reached. Remove one to add another.
                  </div>
                )}

                {selectedNAICS.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No NAICS codes added yet.</p>
                    <p className="text-xs mt-1">Search above to add your industry codes.</p>
                  </div>
                )}

                <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                  <strong>💡 Tip:</strong> Your NAICS codes control which contracts are fetched for you daily. More specific codes = more relevant matches.
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={saveNAICS}
                    disabled={naicsSaving || selectedNAICS.length === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {naicsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {naicsSaving ? 'Saving…' : 'Save NAICS Codes'}
                  </button>
                </div>
              </div>
            )}

            {/* ══ Notifications ══════════════════════════════════════════════ */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Notification Preferences</h2>
                <p className="text-sm text-gray-500 mb-5">Control how and when you receive alerts about new contracts.</p>
                <Toast msg={notifMsg.text} type={notifMsg.type} />

                {/* Email toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6 border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-500" /> Email Alerts
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Receive matching contracts in your inbox</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailAlerts(v => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailAlerts ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Frequency */}
                {emailAlerts && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Alert Frequency</p>
                    <div className="space-y-3">
                      {[
                        { value: 'realtime', label: 'Real-time',     desc: 'Instant email as soon as a match is found',  icon: Zap,      badge: 'Pro+' },
                        { value: 'daily',    label: 'Daily Digest',  desc: 'One consolidated email every morning',       icon: Clock,    badge: null   },
                        { value: 'weekly',   label: 'Weekly Digest', desc: 'One email per week with all new matches',    icon: Calendar, badge: null   },
                      ].map(opt => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-4 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                            alertFrequency === opt.value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input type="radio" name="freq" value={opt.value} checked={alertFrequency === opt.value}
                            onChange={() => setAlertFrequency(opt.value)} className="accent-indigo-600" />
                          <div className={`p-2 rounded-lg ${alertFrequency === opt.value ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                            <opt.icon className={`w-4 h-4 ${alertFrequency === opt.value ? 'text-indigo-600' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                              {opt.badge && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{opt.badge}</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Push notifications */}
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Push Notifications</p>
                  <PushNotificationToggle />
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={saveNotifications}
                    disabled={notifSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {notifSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {notifSaving ? 'Saving…' : 'Save Email Preferences'}
                  </button>
                </div>
              </div>
            )}

            {/* ══ Security ══════════════════════════════════════════════════ */}
            {activeTab === 'security' && (
              <>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Change Password</h2>
                <p className="text-sm text-gray-500 mb-5">Choose a strong password of at least 8 characters.</p>
                <Toast msg={secMsg.text} type={secMsg.type} />

                <div className="space-y-4 max-w-sm">
                  {/* Current password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={currentPw}
                        onChange={e => setCurrentPw(e.target.value)}
                        placeholder="Your current password"
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    {newPw && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4].map(n => (
                            <div key={n} className={`h-1 flex-1 rounded-full transition-all ${
                              n <= pwStrength
                                ? ['','bg-red-400','bg-yellow-400','bg-blue-400','bg-green-500'][pwStrength]
                                : 'bg-gray-200'
                            }`} />
                          ))}
                        </div>
                        <p className="text-xs text-gray-400">
                          Strength: {['','Weak','Fair','Good','Strong'][pwStrength]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Repeat new password"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${
                        confirmPw && confirmPw !== newPw ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {confirmPw && confirmPw !== newPw && (
                      <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={savePassword}
                    disabled={secSaving || !currentPw || !newPw || confirmPw !== newPw}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {secSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    {secSaving ? 'Updating…' : 'Update Password'}
                  </button>
                </div>

                {/* ── Two-Factor Authentication ─────────────────────────── */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      tfaEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tfaEnabled ? <CheckCircle className="w-3 h-3" /> : null}
                      {tfaEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {tfaMsg.text && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${tfaMsg.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                      {tfaMsg.text}
                    </div>
                  )}

                  {/* Idle — not enabled */}
                  {!tfaEnabled && tfaStep === 'idle' && (
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
                        Use an authenticator app like <strong>Google Authenticator</strong> or <strong>Authy</strong> to generate time-based codes that protect your account.
                      </div>
                      <button
                        onClick={start2FASetup}
                        disabled={tfaLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {tfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                        {tfaLoading ? 'Setting up…' : 'Enable 2FA'}
                      </button>
                    </div>
                  )}

                  {/* Step 1: Show QR code */}
                  {tfaStep === 'setup' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        <strong>Step 1:</strong> Scan this QR code with your authenticator app, then enter the 6-digit code below.
                      </p>
                      {tfaQR && (
                        <div className="flex justify-center">
                          <img src={tfaQR} alt="2FA QR Code" className="w-48 h-48 rounded-xl border border-gray-200 shadow-sm" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400 mb-1 text-center">Can't scan? Enter this secret manually:</p>
                        <p className="text-xs font-mono text-center bg-gray-50 border border-gray-200 rounded-lg py-2 px-4 break-all text-gray-700">{tfaSecret}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Authenticator Code <span className="text-gray-400 font-normal">(6 digits)</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={tfaOtp}
                          onChange={e => setTfaOtp(e.target.value.replace(/\D/g, '').substring(0, 8))}
                          placeholder="000000"
                          className="w-full sm:w-48 px-4 py-2.5 border border-gray-300 rounded-lg text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={confirm2FAEnable}
                          disabled={tfaLoading || tfaOtp.length < 6}
                          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                        >
                          {tfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Verify & Activate
                        </button>
                        <button
                          onClick={() => { setTfaStep('idle'); setTfaOtp(''); setTfaMsg({ text: '', type: '' }); }}
                          className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Show backup codes */}
                  {tfaStep === 'backup' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <p className="text-sm font-semibold text-green-800">2FA is now enabled!</p>
                        </div>
                        <p className="text-sm text-green-700">Save your backup codes below. Each code can be used once if you lose access to your authenticator app.</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <Key className="w-4 h-4 text-gray-400" />
                            Backup Codes
                          </p>
                          <button
                            onClick={copyAllBackupCodes}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedCode === 'all' ? 'Copied!' : 'Copy All'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {backupCodes.map((code) => (
                            <button
                              key={code}
                              onClick={() => copyBackupCode(code)}
                              className="font-mono text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left flex items-center justify-between group"
                            >
                              <span>{code}</span>
                              <Copy className={`w-3 h-3 shrink-0 transition-opacity ${copiedCode === code ? 'text-green-500 opacity-100' : 'text-gray-300 group-hover:opacity-100 opacity-0'}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setTfaStep('enabled')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        I've saved my backup codes
                      </button>
                    </div>
                  )}

                  {/* 2FA is enabled and confirmed */}
                  {tfaEnabled && (tfaStep === 'idle' || tfaStep === 'enabled') && (
                    <div className="space-y-3">
                      <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-sm text-green-800">
                        <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
                        Your account is protected with two-factor authentication.
                      </div>
                      <button
                        onClick={() => { setTfaStep('disable'); setTfaMsg({ text: '', type: '' }); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Disable 2FA
                      </button>
                    </div>
                  )}

                  {/* Disable flow */}
                  {tfaStep === 'disable' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        Disabling 2FA will make your account less secure. Confirm with your password and current OTP.
                      </div>
                      <div className="space-y-3 max-w-sm">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Your Password</label>
                          <input
                            type="password"
                            value={tfaDisablePw}
                            onChange={e => setTfaDisablePw(e.target.value)}
                            placeholder="Current account password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Authenticator Code or Backup Code</label>
                          <input
                            type="text"
                            value={tfaDisableOtp}
                            onChange={e => setTfaDisableOtp(e.target.value)}
                            placeholder="6-digit code"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-mono tracking-widest text-center"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={disable2FA}
                          disabled={tfaLoading}
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                        >
                          {tfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          Confirm Disable 2FA
                        </button>
                        <button
                          onClick={() => { setTfaStep('enabled'); setTfaDisablePw(''); setTfaDisableOtp(''); setTfaMsg({ text: '', type: '' }); }}
                          className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Privacy & Data ───────────────────────────────────────── */}
              <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Privacy & Data</h2>
                <p className="text-sm text-gray-500 mb-5">Export a copy of your data or permanently delete your account.</p>

                <Toast msg={exportMsg.text} type={exportMsg.type} />

                {/* Export */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Export My Data</h3>
                      <p className="text-xs text-gray-500">Download a JSON file with your profile, saved opportunities, alerts, and more.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleExportData}
                    disabled={exportLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {exportLoading ? 'Exporting…' : 'Export'}
                  </button>
                </div>

                {/* Danger zone */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Delete Account</h3>
                      <p className="text-sm text-gray-500">Permanently delete your account and personal data. This cannot be undone.</p>
                    </div>
                  </div>

                  {delMsg.text && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${delMsg.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                      {delMsg.text}
                    </div>
                  )}

                  {delStep === 'idle' && (
                    <button
                      onClick={() => { setDelStep('confirm'); setDelMsg({ text: '', type: '' }); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete My Account
                    </button>
                  )}

                  {delStep === 'confirm' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        This will permanently delete your account, saved opportunities, alerts, and notification settings. Invoices and support history are retained for accounting records.
                      </div>
                      <div className="space-y-3 max-w-sm">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Your Password</label>
                          <input
                            type="password"
                            value={delPassword}
                            onChange={e => setDelPassword(e.target.value)}
                            placeholder="Current account password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                          />
                        </div>
                        {tfaEnabled && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Authenticator Code or Backup Code</label>
                            <input
                              type="text"
                              value={delOtp}
                              onChange={e => setDelOtp(e.target.value)}
                              placeholder="6-digit code"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm font-mono tracking-widest text-center"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type <span className="font-mono font-bold">DELETE</span> to confirm
                          </label>
                          <input
                            type="text"
                            value={delConfirmText}
                            onChange={e => setDelConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={delLoading || delConfirmText !== 'DELETE' || !delPassword.trim()}
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                        >
                          {delLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          Permanently Delete Account
                        </button>
                        <button
                          onClick={() => { setDelStep('idle'); setDelPassword(''); setDelConfirmText(''); setDelOtp(''); setDelMsg({ text: '', type: '' }); }}
                          className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

            {/* ══ Appearance ════════════════════════════════════════════════ */}
            {activeTab === 'appearance' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Appearance</h2>
                <p className="text-sm text-gray-500 mb-6">Customize how Sambid Notify looks for you.</p>

                {/* Dark mode toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50">
                      {isDark ? <Moon className="w-5 h-5 text-indigo-600" /> : <Sun className="w-5 h-5 text-indigo-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Dark Mode</p>
                      <p className="text-xs text-gray-500 mt-0.5">{isDark ? 'Currently using dark theme' : 'Currently using light theme'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDark(v => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    aria-label="Toggle dark mode"
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Theme preview */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsDark(false)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${!isDark ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="w-full h-16 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
                      <div className="h-3 bg-indigo-500 rounded-t-lg" />
                      <div className="flex-1 p-1.5 space-y-1">
                        <div className="h-1.5 bg-gray-200 rounded w-3/4" />
                        <div className="h-1.5 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Light</span>
                      {!isDark && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                  </button>

                  <button
                    onClick={() => setIsDark(true)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${isDark ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="w-full h-16 bg-gray-900 rounded-lg border border-gray-700 flex flex-col overflow-hidden">
                      <div className="h-3 bg-indigo-700 rounded-t-lg" />
                      <div className="flex-1 p-1.5 space-y-1">
                        <div className="h-1.5 bg-gray-600 rounded w-3/4" />
                        <div className="h-1.5 bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Dark</span>
                      {isDark && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-4">Your theme preference is saved locally and will persist between sessions.</p>
              </div>
            )}

            {/* ══ Plan ══════════════════════════════════════════════════════ */}
            {activeTab === 'plan' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-5">Subscription Plan</h2>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl mb-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-0.5">Current Plan</p>
                    <p className="text-xl font-bold text-indigo-700 capitalize">{userData?.plan || 'Free'}</p>
                    {userData?.planExpiresAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Renews {new Date(userData.planExpiresAt).toLocaleDateString()}
                      </p>
                    )}
                    {userData?.plan === 'trial' && userData?.trialEndDate && (
                      <p className="text-xs text-amber-600 mt-1">
                        Trial ends {new Date(userData.trialEndDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Crown className="w-10 h-10 text-indigo-300" />
                </div>

                {/* Plan comparison */}
                <div className="space-y-3 mb-6">
                  {[
                    { name: 'Starter',    features: ['500 matches/month', '14-day source window', 'Priority email support'] },
                    { name: 'Pro',        features: ['3,000 matches/month', '60-day window', 'AI proposal generation', 'Real-time alerts'] },
                    { name: 'Enterprise', features: ['Unlimited matches', 'Dedicated manager', 'Custom integrations', 'Full API access'] },
                  ].map(plan => {
                    const mo = getMonthly(plan.name);
                    const yr = getYearly(plan.name);
                    const priceLabel = plan.name === 'Enterprise' && mo && yr
                      ? `$${mo}/mo · $${yr}/yr`
                      : mo != null ? `$${mo}/mo` : '…';
                    const isCurrent = userData?.plan?.toLowerCase() === plan.name.toLowerCase();
                    return (
                      <div key={plan.name} className={`flex items-center justify-between p-4 rounded-xl border ${isCurrent ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900">{plan.name}</span>
                            {isCurrent && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Current</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{plan.features.slice(0, 2).join(' · ')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-700">{priceLabel}</span>
                          {!isCurrent && (
                            <Link to="/pricing" className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                              Upgrade
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Link to="/pricing" className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity mb-3">
                  View All Plans & Pricing <ChevronRight className="w-4 h-4" />
                </Link>

                <Link to="/billing" className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors mb-4">
                  View Billing & Invoices
                </Link>

                {/* Cancel subscription */}
                {userData?.plan && !['free', 'trial'].includes(userData.plan) && (
                  <CancelSubscriptionSection
                    plan={userData.plan}
                    onCancelled={() => setUserData(d => ({ ...d, plan: 'free', planExpiresAt: null }))}
                  />
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function CancelSubscriptionSection({ plan, onCancelled }) {
  const [confirm,   setConfirm]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');

  const handleCancel = async () => {
    setLoading(true);
    setError('');
    try {
      await paymentAPI.cancelSubscription();
      localStorage.setItem('userPlan', 'free');
      sessionStorage.setItem('userPlan', 'free');
      setDone(true);
      setTimeout(() => onCancelled(), 1500);
    } catch (e) {
      setError(e.response?.data?.message || 'Cancellation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
        <CheckCircle className="w-4 h-4 shrink-0" />
        Subscription cancelled. Your plan has been reverted to Free.
      </div>
    );
  }

  return (
    <div className="border border-red-100 rounded-xl p-4 bg-red-50">
      <p className="text-sm font-semibold text-red-700 mb-1">Cancel Subscription</p>
      <p className="text-xs text-red-600 mb-3">
        Cancelling your <span className="font-semibold capitalize">{plan}</span> plan will immediately revert your account to the Free tier. This action cannot be undone.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-700 mb-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="text-xs font-semibold text-red-600 hover:text-red-800 underline transition-colors"
        >
          I want to cancel my subscription
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {loading ? 'Cancelling…' : 'Yes, Cancel My Plan'}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="flex-1 bg-white border border-gray-200 text-gray-600 text-xs font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Keep My Plan
          </button>
        </div>
      )}
    </div>
  );
}
