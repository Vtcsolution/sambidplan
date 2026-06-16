// frontend/src/pages/admin/AdminEmailSettings.jsx
import { useState, useEffect } from 'react';
import PermissionGuard from '../../components/admin/PermissionGuard';
import { Mail, Save, RefreshCw, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { adminPanelAPI as adminAPI } from '../../services/adminApi';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function AdminEmailSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [testAddr, setTestAddr] = useState('');
  const [testStatus, setTestStatus] = useState({}); // { noreply, support, billing } → { sending, ok, err }
  const [settings, setSettings] = useState({
    smtpHost: '',
    smtpPort: '465',
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    fromName: 'Sambid',
    sendGridApiKey: '',
    useSendGrid: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSettings();
      if (response.data.success) {
        setSettings(prev => ({
          ...prev,
          ...response.data.data.email
        }));
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      const response = await adminAPI.updateSettings({
        email: settings
      });
      
      if (response.data.success) {
        setMessage({ text: 'Email settings saved successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (error) {
      console.error('Error saving email settings:', error);
      setMessage({ text: 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async (type) => {
    if (!testAddr) return;
    setTestStatus(prev => ({ ...prev, [type]: { sending: true } }));
    try {
      const response = await adminAPI.testEmail({ email: testAddr, type });
      if (response.data.success) {
        setTestStatus(prev => ({ ...prev, [type]: { ok: true } }));
      } else {
        setTestStatus(prev => ({ ...prev, [type]: { err: response.data.message || 'Failed' } }));
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || 'Failed';
      setTestStatus(prev => ({ ...prev, [type]: { err: msg } }));
    }
    setTimeout(() => setTestStatus(prev => ({ ...prev, [type]: {} })), 5000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Email Settings</h1>
          <p className="text-gray-600 mt-1 text-sm">Configure email delivery settings</p>
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SMTP Host"
              value={settings.smtpHost}
              onChange={(e) => setSettings({...settings, smtpHost: e.target.value})}
              placeholder="smtp.hostinger.com"
            />
            <Input
              label="SMTP Port"
              value={settings.smtpPort}
              onChange={(e) => setSettings({...settings, smtpPort: e.target.value})}
              placeholder="465"
            />
            <Input
              label="SMTP Username"
              value={settings.smtpUser}
              onChange={(e) => setSettings({...settings, smtpUser: e.target.value})}
              placeholder="user@example.com"
            />
            <Input
              label="SMTP Password"
              type="password"
              value={settings.smtpPass}
              onChange={(e) => setSettings({...settings, smtpPass: e.target.value})}
              placeholder="••••••••"
            />
            <Input
              label="From Email"
              value={settings.fromEmail}
              onChange={(e) => setSettings({...settings, fromEmail: e.target.value})}
              placeholder="noreply@sambid.co"
            />
            <Input
              label="From Name"
              value={settings.fromName}
              onChange={(e) => setSettings({...settings, fromName: e.target.value})}
              placeholder="Sambid"
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">SendGrid Integration (Optional)</p>
                <p className="text-sm text-gray-500">Use SendGrid for better deliverability</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useSendGrid}
                  onChange={(e) => setSettings({...settings, useSendGrid: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            {settings.useSendGrid && (
              <div className="mt-4">
                <Input
                  label="SendGrid API Key"
                  type="password"
                  value={settings.sendGridApiKey}
                  onChange={(e) => setSettings({...settings, sendGridApiKey: e.target.value})}
                  placeholder="SG.xxxxxxxxxxxx"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Card>

      {/* SMTP Test */}
      <Card className="mt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">Test SMTP Configuration</h2>
          </div>
          <p className="text-sm text-gray-500">Send a test email from each sender address to verify your Hostinger SMTP is working.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={testAddr}
              onChange={e => setTestAddr(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: 'noreply', label: 'System / No-Reply', addr: 'noreply@sambid.co', idle: 'border-indigo-200 hover:bg-indigo-50 text-indigo-700' },
              { type: 'support', label: 'Support',           addr: 'support@sambid.co', idle: 'border-blue-200 hover:bg-blue-50 text-blue-700'       },
              { type: 'billing', label: 'Billing',           addr: 'billing@sambid.co', idle: 'border-green-200 hover:bg-green-50 text-green-700'     },
            ].map(({ type, label, addr, idle }) => {
              const s = testStatus[type] || {};
              const cls = s.ok  ? 'border-green-300 bg-green-50 text-green-700'
                        : s.err ? 'border-red-300 bg-red-50 text-red-700'
                        : idle;
              return (
                <button
                  key={type}
                  onClick={() => sendTestEmail(type)}
                  disabled={!testAddr || s.sending}
                  className={`flex flex-col items-start gap-1 px-4 py-3 border rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {s.sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> :
                     s.ok      ? <CheckCircle className="w-3.5 h-3.5" />            :
                     s.err     ? <AlertCircle className="w-3.5 h-3.5" />            :
                                 <Mail className="w-3.5 h-3.5" />}
                    {label}
                  </div>
                  <span className="text-xs opacity-70">{s.ok ? 'Sent!' : s.err ? s.err.slice(0, 40) : addr}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Email Templates Preview */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="text-center">
            <Mail className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <h3 className="font-medium">Trial Reminder</h3>
            <p className="text-xs text-gray-500 mt-1">Sent at 7, 3, 1 days before trial ends</p>
          </Card>
          <Card className="text-center">
            <Mail className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-medium">Daily Digest</h3>
            <p className="text-xs text-gray-500 mt-1">Sent daily at 8 AM to Pro users</p>
          </Card>
          <Card className="text-center">
            <Mail className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <h3 className="font-medium">Real-time Alert</h3>
            <p className="text-xs text-gray-500 mt-1">Instant alerts for Enterprise users</p>
          </Card>
        </div>
      </div>
    </div>
  );
}