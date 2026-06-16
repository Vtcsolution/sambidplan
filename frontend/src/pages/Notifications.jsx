import { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCircle, TrendingUp, AlertCircle, Zap, Gift,
  MessageSquare, UserCheck, CreditCard, Star, Ticket,
  Check, Trash2, Filter, Settings, Mail, Volume2,
  RefreshCw, Loader2, BellOff, ToggleLeft, ToggleRight
} from 'lucide-react';
import { alertAPI } from '../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getIcon = (type) => {
  const cls = 'w-5 h-5';
  switch (type) {
    case 'contract_match':  return <Zap className={`${cls} text-indigo-500`} />;
    case 'payment':         return <CheckCircle className={`${cls} text-green-500`} />;
    case 'plan_upgraded':   return <TrendingUp className={`${cls} text-purple-500`} />;
    case 'plan_purchased':  return <CreditCard className={`${cls} text-green-600`} />;
    case 'plan_activated':  return <Star className={`${cls} text-yellow-500`} />;
    case 'referral':        return <Gift className={`${cls} text-amber-500`} />;
    case 'alert':           return <AlertCircle className={`${cls} text-yellow-500`} />;
    case 'ticket_reply':    return <MessageSquare className={`${cls} text-blue-500`} />;
    case 'ticket_created':  return <Ticket className={`${cls} text-indigo-400`} />;
    case 'account_created': return <UserCheck className={`${cls} text-emerald-500`} />;
    default:                return <Bell className={`${cls} text-gray-400`} />;
  }
};

const getBg = (type) => {
  switch (type) {
    case 'contract_match':  return 'bg-indigo-50';
    case 'plan_upgraded':
    case 'plan_purchased':
    case 'plan_activated':  return 'bg-purple-50';
    case 'ticket_reply':
    case 'ticket_created':  return 'bg-blue-50';
    case 'account_created': return 'bg-emerald-50';
    case 'referral':        return 'bg-amber-50';
    default:                return 'bg-gray-50';
  }
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TYPE_LABELS = {
  all:            'All',
  unread:         'Unread',
  contract_match: 'Contract Matches',
  ticket_reply:   'Support Replies',
  plan_purchased: 'Plan & Billing',
  account_created:'Account',
};

// ── Notification Settings (stored locally) ────────────────────────────────────
const SETTINGS_KEY = 'notif_prefs_v1';
const DEFAULT_SETTINGS = {
  email_contract_match: true,
  email_plan_expiry:    true,
  email_weekly_digest:  true,
  email_ticket_reply:   true,
  sound_enabled:        true,
};
const loadSettings = () => {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return DEFAULT_SETTINGS; }
};
const saveSettings = (s) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${on ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [filter,        setFilter]        = useState('all');
  const [tab,           setTab]           = useState('notifications'); // 'notifications' | 'settings'
  const [settings,      setSettings]      = useState(loadSettings);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await alertAPI.getNotifications();
      if (res.data.success) setNotifications(res.data.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await alertAPI.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await alertAPI.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  };

  // Filtered list
  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all')    return true;
    if (filter === 'plan_purchased') return ['plan_purchased','plan_upgraded','plan_activated','payment'].includes(n.type);
    return n.type === filter;
  });

  // Group by date
  const groups = filtered.reduce((acc, n) => {
    const d = new Date(n.createdAt);
    const now = new Date();
    const isToday     = d.toDateString() === now.toDateString();
    const isYesterday = d.toDateString() === new Date(now - 86400000).toDateString();
    const key = isToday ? 'Today' : isYesterday ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-7 h-7 text-indigo-600 shrink-0" />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1 text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Your alerts, matches, and account activity.</p>
          </div>
          <button
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            className="p-2 rounded-xl text-gray-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-6">
          <button
            onClick={() => setTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'notifications' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'settings' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>

        {tab === 'notifications' ? (
          <>
            {/* Filter + mark all read bar */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(TYPE_LABELS).map(([key, label]) => {
                  const count = key === 'unread' ? unreadCount
                    : key === 'all' ? notifications.length
                    : key === 'plan_purchased' ? notifications.filter(n => ['plan_purchased','plan_upgraded','plan_activated','payment'].includes(n.type)).length
                    : notifications.filter(n => n.type === key).length;
                  if (count === 0 && key !== 'all' && key !== 'unread') return null;
                  return (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filter === key
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                      {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
                    </button>
                  );
                })}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 bg-indigo-50 rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center">
                <BellOff className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {filter === 'unread' ? 'All caught up! No unread notifications.' : 'No notifications yet.'}
                </p>
                {filter !== 'all' && (
                  <button onClick={() => setFilter('all')} className="mt-3 text-sm text-indigo-600 hover:underline">
                    Show all notifications
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groups).map(([dateLabel, items]) => (
                  <div key={dateLabel}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{dateLabel}</p>
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-50">
                      {items.map(n => (
                        <div
                          key={n._id}
                          className={`flex gap-4 px-5 py-4 transition-colors ${!n.read ? 'bg-indigo-50/30' : 'hover:bg-gray-50/50'}`}
                        >
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-full ${getBg(n.type)} flex items-center justify-center shrink-0 mt-0.5`}>
                            {getIcon(n.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {n.title}
                              </p>
                              <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                            </div>
                            {n.message && (
                              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                            )}
                            {n.link && (
                              <a href={n.link} className="mt-1.5 inline-block text-xs text-indigo-600 hover:underline font-medium">
                                View →
                              </a>
                            )}
                          </div>

                          {/* Unread indicator + mark read */}
                          <div className="flex flex-col items-center gap-2 shrink-0">
                            {!n.read && (
                              <>
                                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                                <button
                                  onClick={() => markRead(n._id)}
                                  className="text-gray-300 hover:text-indigo-500 transition-colors"
                                  title="Mark as read"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── Settings tab ─────────────────────────────────────────────── */
          <div className="space-y-4">

            {/* Email notifications */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-900">Email Notifications</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  {
                    key:   'email_contract_match',
                    label: 'New contract matches',
                    desc:  'Get emailed when new federal contracts match your NAICS codes and alerts.',
                  },
                  {
                    key:   'email_weekly_digest',
                    label: 'Weekly opportunity digest',
                    desc:  'A weekly summary of the top contracts matching your profile.',
                  },
                  {
                    key:   'email_plan_expiry',
                    label: 'Plan expiry reminders',
                    desc:  'Reminder emails before your plan expires or needs renewal.',
                  },
                  {
                    key:   'email_ticket_reply',
                    label: 'Support ticket replies',
                    desc:  'Notify me by email when support replies to my tickets.',
                  },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between px-5 py-4 gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle on={settings[item.key]} onChange={v => updateSetting(item.key, v)} />
                  </div>
                ))}
              </div>
            </div>

            {/* In-app sounds */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-900">In-App Notifications</h2>
              </div>
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Notification sound</p>
                  <p className="text-xs text-gray-400 mt-0.5">Play a sound when a new notification arrives while you're using the app.</p>
                </div>
                <Toggle on={settings.sound_enabled} onChange={v => updateSetting('sound_enabled', v)} />
              </div>
            </div>

            {/* Note */}
            <p className="text-xs text-gray-400 text-center px-4">
              Email preferences are saved on this device. Contact support to manage email subscriptions globally.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
