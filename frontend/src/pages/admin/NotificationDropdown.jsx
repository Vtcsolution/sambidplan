// frontend/src/components/admin/NotificationDropdown.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle, CreditCard, Users, AlertCircle } from 'lucide-react';
import { adminAPI } from '../../services/api';
import notificationSound from '../../assets/sounds/admin_notification.mp3';

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
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
    // Initial fetch
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 3 seconds (faster for real-time)
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 3000);

    // Click outside to close
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      case 'payment':
        return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'user_signup':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'plan_request':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
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
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 flex-shrink-0"
                          >
                            Mark read
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