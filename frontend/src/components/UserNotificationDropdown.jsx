import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, CheckCircle, TrendingUp, AlertCircle, Zap, Gift,
  MessageSquare, UserCheck, CreditCard, Star, Ticket
} from 'lucide-react';
import { alertAPI } from '../services/api';
import { getSocket } from '../hooks/useSocket';
import notificationSound from '../assets/sounds/admin_notification.mp3';

const getIcon = (type) => {
  switch (type) {
    case 'contract_match':  return <Zap className="w-4 h-4 text-indigo-500" />;
    case 'payment':         return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'plan_upgraded':   return <TrendingUp className="w-4 h-4 text-purple-500" />;
    case 'plan_purchased':  return <CreditCard className="w-4 h-4 text-green-600" />;
    case 'plan_activated':  return <Star className="w-4 h-4 text-yellow-500" />;
    case 'referral':        return <Gift className="w-4 h-4 text-amber-500" />;
    case 'alert':           return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case 'ticket_reply':    return <MessageSquare className="w-4 h-4 text-blue-500" />;
    case 'ticket_created':  return <Ticket className="w-4 h-4 text-indigo-400" />;
    case 'account_created': return <UserCheck className="w-4 h-4 text-emerald-500" />;
    default:                return <Bell className="w-4 h-4 text-gray-400" />;
  }
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function UserNotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [isOpen,        setIsOpen]        = useState(false);
  const [isPlaying,     setIsPlaying]     = useState(false);

  const navigate     = useNavigate();
  const dropdownRef  = useRef(null);
  const audioRef     = useRef(null);
  const seenIds      = useRef(new Set());

  // Init audio
  useEffect(() => {
    audioRef.current = new Audio(notificationSound);
    audioRef.current.preload = 'auto';
    audioRef.current.onended = () => setIsPlaying(false);
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  const playSound = () => {
    if (!audioRef.current || isPlaying) return;
    setIsPlaying(true);
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => setIsPlaying(false));
    setTimeout(() => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      setIsPlaying(false);
    }, 2000);
  };

  const fetchAll = async () => {
    try {
      const res = await alertAPI.getNotifications();
      if (res.data.success) {
        const items = res.data.data || [];
        // Sound on truly new unread items
        const hasNew = items.some(n => !n.read && !seenIds.current.has(n._id));
        items.forEach(n => seenIds.current.add(n._id));
        if (hasNew) playSound();
        setNotifications(items);
        setUnreadCount(items.filter(n => !n.read).length);
      }
    } catch {}
  };

  useEffect(() => {
    fetchAll();
    // Poll every 30s as fallback
    const timer = setInterval(() => { if (document.visibilityState === 'visible') fetchAll(); }, 30000);
    const outside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', outside);

    // Real-time socket: ring immediately on any ticket or notification event
    const socket = getSocket('authToken');
    const onAdminReply = (data) => {
      playSound();
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => [{
        _id:       `live_${Date.now()}`,
        type:      'ticket_reply',
        title:     `${data.adminName || 'Support'} replied to ${data.ticketNumber}`,
        message:   data.message?.content?.slice(0, 100) || '',
        read:      false,
        createdAt: new Date().toISOString(),
        link:      '/help',
      }, ...prev]);
    };
    const onStatusChanged = (data) => {
      if (data.status === 'resolved') {
        playSound();
        setUnreadCount(prev => prev + 1);
        setNotifications(prev => [{
          _id: `live_${Date.now()}`,
          type: 'ticket_reply',
          title: `Ticket ${data.ticketNumber} resolved`,
          message: 'Your support ticket has been marked as resolved.',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/help',
        }, ...prev]);
      }
    };

    if (socket) {
      socket.on('ticket:admin_reply',   onAdminReply);
      socket.on('ticket:status_changed', onStatusChanged);
    }

    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', outside);
      if (socket) {
        socket.off('ticket:admin_reply',   onAdminReply);
        socket.off('ticket:status_changed', onStatusChanged);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = async (id) => {
    try {
      await alertAPI.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await alertAPI.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotifClick = (n) => {
    if (!n.read) markRead(n._id);
    if (n.link) { setIsOpen(false); navigate(n.link); }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setIsOpen(v => !v); if (!isOpen) fetchAll(); }}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 ${isPlaying ? 'animate-bounce text-indigo-600' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 animate-pulse font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-2rem))] sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">
              Notifications {unreadCount > 0 && <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{unreadCount} new</span>}
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => handleNotifClick(n)}
                  className={`px-4 py-3 flex gap-3 transition-colors ${n.link ? 'cursor-pointer hover:bg-gray-50' : ''} ${!n.read ? 'bg-indigo-50/40' : ''}`}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <button
                          onClick={e => { e.stopPropagation(); markRead(n._id); }}
                          className="text-xs text-indigo-500 hover:text-indigo-700 shrink-0"
                        >✓</button>
                      )}
                    </div>
                    {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 shrink-0" />}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <Link to="/notifications" onClick={() => setIsOpen(false)} className="block text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
