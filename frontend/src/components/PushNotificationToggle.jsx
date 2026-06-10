// frontend/src/components/PushNotificationToggle.jsx
// Self-contained toggle card — drop it anywhere in the app.
import { useState } from 'react';
import { Bell, BellOff, BellRing, Loader2, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function PushNotificationToggle({ compact = false }) {
  const { supported, permission, subscribed, loading, error, subscribe, unsubscribe, sendTest } = usePushNotifications();
  const [testMsg, setTestMsg] = useState('');

  const handleTest = async () => {
    setTestMsg('');
    const res = await sendTest();
    setTestMsg(res.message || (res.success ? 'Sent!' : 'Failed'));
    setTimeout(() => setTestMsg(''), 4000);
  };

  if (!supported) {
    return compact ? null : (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
        <BellOff className="w-4 h-4 inline mr-2" />
        Push notifications are not supported in this browser.
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
        <AlertCircle className="w-4 h-4 inline mr-2" />
        Push notifications are blocked. To enable: click the lock icon in your browser address bar → Allow notifications.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 text-sm">
          {subscribed ? <BellRing className="w-4 h-4 text-indigo-500" /> : <Bell className="w-4 h-4 text-gray-400" />}
          <span className="font-medium text-gray-700">Push alerts</span>
          <span className="text-xs text-gray-400">{subscribed ? 'On' : 'Off'}</span>
        </div>
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${subscribed ? 'bg-indigo-600' : 'bg-gray-300'}`}
        >
          {loading
            ? <Loader2 className="w-3 h-3 animate-spin text-white mx-auto" />
            : <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${subscribed ? 'translate-x-4' : 'translate-x-0.5'}`} />
          }
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${subscribed ? 'bg-indigo-600' : 'bg-gray-200'}`}>
            {subscribed
              ? <BellRing className="w-5 h-5 text-white" />
              : <Bell className="w-5 h-5 text-gray-500" />
            }
          </div>
          <div>
            <p className="font-semibold text-gray-900">Browser Push Notifications</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {subscribed
                ? 'Enabled — you\'ll get instant alerts when new contracts match your NAICS codes'
                : 'Get notified instantly when new matching contracts are found, even with the tab closed'
              }
            </p>
          </div>
        </div>
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${subscribed ? 'bg-indigo-600' : 'bg-gray-300'} disabled:opacity-50`}
        >
          {loading
            ? <Loader2 className="w-3 h-3 animate-spin text-white mx-auto" />
            : <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${subscribed ? 'translate-x-6' : 'translate-x-1'}`} />
          }
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-3 bg-red-50 border-t border-red-100 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Active state details */}
      {subscribed && (
        <div className="p-5 border-t border-gray-100 bg-white">
          <div className="flex items-start gap-3 mb-4">
            <Smartphone className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-600">
              <p className="font-medium mb-1">When you'll receive notifications:</p>
              <ul className="space-y-0.5 text-gray-500">
                <li>• New contracts matching your NAICS codes are distributed to your feed</li>
                <li>• A saved opportunity deadline is within 3 days</li>
                <li>• Your plan is upgraded after a payment</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTest}
              disabled={loading}
              className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
            >
              Send Test Notification
            </button>
            {testMsg && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <CheckCircle className="w-3.5 h-3.5" /> {testMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Not subscribed CTA */}
      {!subscribed && (
        <div className="p-5 border-t border-gray-100 bg-white">
          <button
            onClick={subscribe}
            disabled={loading}
            className="flex items-center gap-2 w-full justify-center py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {loading ? 'Enabling…' : 'Enable Push Notifications'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Your browser will ask for permission. You can disable anytime.
          </p>
        </div>
      )}
    </div>
  );
}
