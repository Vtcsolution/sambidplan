// frontend/src/pages/admin/AdminNotifications.jsx
import { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Users, 
  CreditCard,
  RefreshCw,
  Trash2,
  Eye,
  Send,
  AlertCircle
} from 'lucide-react';
import { adminPanelAPI as adminAPI } from '../../services/adminApi';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
    recipientType: 'all',
    customEmails: ''
  });
  const [markingRead, setMarkingRead] = useState(null);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await adminAPI.getNotifications();
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    setMarkingRead(id);
    try {
      await adminAPI.markNotificationAsRead(id);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
      alert('Failed to mark as read');
    } finally {
      setMarkingRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
    if (unreadIds.length === 0) {
      alert('No unread notifications');
      return;
    }
    
    for (const id of unreadIds) {
      try {
        await adminAPI.markNotificationAsRead(id);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
    
    // Refresh notifications
    fetchNotifications();
    alert(`Marked ${unreadIds.length} notifications as read`);
  };

  const handleDeleteNotification = async (id) => {
    if (window.confirm('Delete this notification?')) {
      try {
        await adminAPI.deleteNotification(id);
        setNotifications(prev => prev.filter(n => n._id !== id));
      } catch (error) {
        console.error('Error deleting notification:', error);
        alert('Failed to delete notification');
      }
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.subject || !emailData.message) {
      alert('Please fill in subject and message');
      return;
    }

    try {
      await adminAPI.sendBroadcastEmail(emailData);
      alert('Email sent successfully!');
      setShowSendModal(false);
      setEmailData({
        subject: '',
        message: '',
        recipientType: 'all',
        customEmails: ''
      });
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'plan_request': return <Users className="w-5 h-5 text-yellow-500" />;
      case 'payment': return <CreditCard className="w-5 h-5 text-green-500" />;
      case 'user_signup': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'system': return <AlertCircle className="w-5 h-5 text-purple-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'urgent') return 'bg-red-50 border-red-200';
    if (priority === 'high') return 'bg-orange-50 border-orange-200';
    
    switch(type) {
      case 'plan_request': return 'bg-yellow-50 border-yellow-200';
      case 'payment': return 'bg-green-50 border-green-200';
      case 'user_signup': return 'bg-blue-50 border-blue-200';
      case 'system': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
   <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-4 mb-2">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Mark All as Read
            </button>
          )}
          
         
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Notifications</p>
              <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Unread</p>
              <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Action Required</p>
              <p className="text-2xl font-bold text-orange-600">
                {notifications.filter(n => n.actionRequired && !n.read).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <Card>
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Notifications will appear here when users sign up or make payments
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-4 rounded-lg border transition-all ${
                  notification.read ? 'bg-white' : getNotificationColor(notification.type, notification.priority)
                } ${!notification.read ? 'border-l-4 border-l-indigo-500' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 flex-1">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                        {!notification.read && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                            New
                          </span>
                        )}
                        {notification.priority === 'high' && !notification.read && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                            High Priority
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">{notification.message}</p>
                      {notification.metadata && (
                        <div className="mt-2 text-xs text-gray-400">
                          {notification.metadata.userEmail && (
                            <span>User: {notification.metadata.userEmail}</span>
                          )}
                          {notification.metadata.plan && (
                            <span className="ml-2">Plan: {notification.metadata.plan}</span>
                          )}
                          {notification.metadata.amount && (
                            <span className="ml-2">Amount: ${notification.metadata.amount}</span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        disabled={markingRead === notification._id}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                        title="Mark as read"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notification._id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Send Broadcast Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Send Broadcast Email</h2>
              <button
                onClick={() => setShowSendModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Type
                </label>
                <select
                  value={emailData.recipientType}
                  onChange={(e) => setEmailData({...emailData, recipientType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Users</option>
                  <option value="free">Free Users</option>
                  <option value="starter">Starter Plan Users</option>
                  <option value="pro">Pro Plan Users</option>
                  <option value="enterprise">Enterprise Users</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Write your message here..."
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">
                  ⚠️ This email will be sent to all selected users. Please review your message carefully.
                </p>
              </div>
            </div>

          
          </div>
        </div>
      )}
    </div>
    </div>
  );
}