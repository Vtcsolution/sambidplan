// frontend/src/components/admin/NotificationDropdown.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, CreditCard, Users, AlertCircle, MessageSquare, Ticket, Star } from 'lucide-react';
import { adminPanelAPI as adminAPI } from '../../services/adminApi';
import { getSocket } from '../../hooks/useSocket';
import notificationSound from '../../assets/sounds/admin_notification.mp3';

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const audioRef = useRef(null);
  const lastNotificationIds = useRef(new Set());

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(notificationSound);
    audioRef.current.preload = 'auto';
    
    // Optional: Handle when sound ends
    audioRef.current.onended = () => {
      setIsPlaying(false);
    };
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    if (audioRef.current && !isPlaying) {
      setIsPlaying(true);
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Audio play failed:', err);
        setIsPlaying(false);
      });
      
      // Stop sound after 2 seconds (or when ended)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      }, 2000);
    }
  };

  // Check for new notifications
  const checkForNewNotifications = (newNotifications) => {
    const newUnreadNotifications = newNotifications.filter(n => !n.read);
    const currentUnreadIds = new Set(newUnreadNotifications.map(n => n._id));
    
    // Check for new IDs not in previous set
    let hasNewNotification = false;
    newUnreadNotifications.forEach(notification => {
      if (!lastNotificationIds.current.has(notification._id)) {
        hasNewNotification = true;
        lastNotificationIds.current.add(notification._id);
      }
    });
    
    // Also clean up old IDs from set (keep last 100)
    if (lastNotificationIds.current.size > 100) {
      const idsArray = Array.from(lastNotificationIds.current);
      const toKeep = idsArray.slice(-50);
      lastNotificationIds.current = new Set(toKeep);
    }
    
    return hasNewNotification;
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') { fetchNotifications(); fetchUnreadCount(); }
    }, 30000);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Real-time socket events
    const socket = getSocket('adminToken');
    const injectLive = (type, title, message, link) => {
      playNotificationSound();
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => [{
        _id: `live_${Date.now()}`,
        type, title, message, read: false,
        createdAt: new Date().toISOString(),
        metadata: {},
        _link: link,
      }, ...prev.slice(0, 19)]);
    };

    const onTicketNew   = (d) => injectLive('ticket_created',
      `🎫 New ticket: ${d.ticketNumber}`,
      `${d.userName} — ${d.subject}`, '/admin/tickets');
    const onUserReply   = (d) => injectLive('ticket_reply',
      `💬 User replied: ${d.ticketNumber}`,
      `${d.userName}: ${d.message?.content?.slice(0, 80) || ''}`, '/admin/tickets');
    const onTicketUpdate = (d) => {
      // Just refresh counts silently
      fetchUnreadCount();
      // Update status in the displayed list without a full refetch
      setNotifications(prev => prev.map(n =>
        n.metadata?.ticketNumber === d.ticketNumber
          ? { ...n, message: `Status: ${d.status}` } : n
      ));
    };

    if (socket) {
      socket.on('ticket:new',         onTicketNew);
      socket.on('ticket:user_reply',  onUserReply);
      socket.on('ticket:updated',     onTicketUpdate);
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
      if (socket) {
        socket.off('ticket:new',        onTicketNew);
        socket.off('ticket:user_reply', onUserReply);
        socket.off('ticket:updated',    onTicketUpdate);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await adminAPI.getNotifications({ limit: 20 });
      if (response.data.success) {
        const newNotifications = response.data.data;
        
        // Check for new notifications
        const hasNew = checkForNewNotifications(newNotifications);
        
        if (hasNew) {
          playNotificationSound();
        }
        
        setNotifications(newNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await adminAPI.getUnreadNotificationsCount();
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await adminAPI.markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
    for (const id of unreadIds) {
      try {
        await adminAPI.markNotificationAsRead(id);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
    fetchNotifications();
    fetchUnreadCount();
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'payment':        return <CreditCard   className="w-4 h-4 text-green-500" />;
      case 'user_signup':    return <Users         className="w-4 h-4 text-blue-500" />;
      case 'plan_request':   return <AlertCircle  className="w-4 h-4 text-yellow-500" />;
      case 'ticket_created': return <Ticket        className="w-4 h-4 text-indigo-500" />;
      case 'ticket_reply':   return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'plan_activated': return <Star          className="w-4 h-4 text-amber-500" />;
      default:               return <Bell          className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotifLink = (n) => {
    if (n._link) return n._link;
    if (n.type === 'ticket_created' || n.type === 'ticket_reply') return '/admin/tickets';
    if (n.type === 'payment') return '/admin/invoices';
    if (n.type === 'user_signup') return '/admin/plan-requests';
    return null;
  };

  const handleNotifClick = async (n) => {
    if (!n.read) await handleMarkAsRead(n._id);
    const link = getNotifLink(n);
    if (link) { setIsOpen(false); navigate(link); }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 relative transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-2rem))] sm:w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotifClick(notification)}
                  className={`p-4 border-b border-gray-100 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-sm truncate ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <button
                            onClick={e => { e.stopPropagation(); handleMarkAsRead(notification._id); }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 flex-shrink-0"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-400">
                          {getTimeAgo(notification.createdAt)}
                        </span>
                        {notification.metadata?.amount && (
                          <span className="text-xs font-medium text-green-600">
                            ${notification.metadata.amount}
                          </span>
                        )}
                      </div>
                    </div>
                    {!notification.read && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <Link
              to="/admin/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-xs text-indigo-600 hover:text-indigo-700"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}