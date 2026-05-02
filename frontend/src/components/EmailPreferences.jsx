// frontend/src/components/EmailPreferences.jsx
import { useState, useEffect } from 'react';
import { Bell, Mail, Zap, Clock, Calendar, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import Card from './Card';
import Button from './Button';

export default function EmailPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [preferences, setPreferences] = useState({
    emailAlertsEnabled: true,
    alertFrequency: 'daily'
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getProfile();
      if (response.data.success) {
        setPreferences({
          emailAlertsEnabled: response.data.data.emailAlertsEnabled !== false,
          alertFrequency: response.data.data.alertFrequency || 'daily'
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      const response = await authAPI.updateProfile({
        emailAlertsEnabled: preferences.emailAlertsEnabled,
        alertFrequency: preferences.alertFrequency
      });
      
      if (response.data.success) {
        setMessage({ text: 'Email preferences saved successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ text: 'Failed to save preferences', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const frequencies = [
    {
      id: 'realtime',
      name: 'Real-time',
      icon: Zap,
      description: 'Get instant email notifications for new matches',
      color: 'orange',
      plans: ['Enterprise', 'Pro']
    },
    {
      id: 'daily',
      name: 'Daily Digest',
      icon: Clock,
      description: 'Receive a daily summary of new opportunities',
      color: 'blue',
      plans: ['Starter', 'Pro', 'Enterprise']
    },
    {
      id: 'weekly',
      name: 'Weekly Digest',
      icon: Calendar,
      description: 'Get a weekly roundup of opportunities',
      color: 'green',
      plans: ['Free', 'Starter', 'Pro', 'Enterprise']
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6 border-b pb-4">
        <Mail className="w-6 h-6 text-indigo-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Email Notifications</h2>
          <p className="text-sm text-gray-500">Manage how you receive email alerts</p>
        </div>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              <span className="font-medium text-gray-900">Email Alerts</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Receive email notifications when new opportunities match your profile
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.emailAlertsEnabled}
              onChange={(e) => setPreferences({...preferences, emailAlertsEnabled: e.target.checked})}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* Frequency Selection */}
      {preferences.emailAlertsEnabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Alert Frequency
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {frequencies.map((freq) => (
              <div
                key={freq.id}
                onClick={() => setPreferences({...preferences, alertFrequency: freq.id})}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  preferences.alertFrequency === freq.id
                    ? `border-${freq.color}-500 bg-${freq.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <freq.icon className={`w-5 h-5 text-${freq.color}-600`} />
                  <h3 className="font-semibold text-gray-900">{freq.name}</h3>
                </div>
                <p className="text-xs text-gray-500">{freq.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {freq.plans.map((plan) => (
                    <span key={plan} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {plan}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Note: Some frequencies may not be available for your current plan
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-700">
          💡 <strong>Tip:</strong> Enterprise users get real-time alerts, Pro users get daily digest, 
          and Free users get weekly digest. Upgrade your plan for more frequent notifications.
        </p>
      </div>
    </Card>
  );
}