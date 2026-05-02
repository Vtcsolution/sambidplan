// frontend/src/pages/admin/AdminSettings.jsx
import { useState, useEffect } from 'react';
import { 
  Save, 
  Globe, 
  Mail, 
  CreditCard, 
  Shield, 
  Bell,
  Users,
  Database,
  Key,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [settings, setSettings] = useState({
    general: {
      siteName: 'Sambid',
      siteUrl: 'https://sambid.co',
      supportEmail: 'support@sambid.co',
      contactEmail: 'contact@sambid.co'
    },
    email: {
      smtpHost: 'smtp.hostinger.com',
      smtpPort: '465',
      smtpUser: '',
      smtpPass: '',
      fromEmail: 'noreply@sambid.co',
      fromName: 'Sambid'
    },
    payment: {
      payoneerApiUrl: 'https://api.sandbox.payoneer.com/v4',
      payoneerClientId: '',
      payoneerClientSecret: '',
      payoneerPartnerId: '',
      currency: 'USD'
    },
    api: {
      geminiApiKey: '',
      samApiKey: '',
      samApiUrl: 'https://api.sam.gov/opportunities/v2/search'
    },
    limits: {
      freePlanMaxSaved: 10,
      freePlanMaxAlerts: 5,
      starterPlanMaxSaved: 100,
      starterPlanMaxAlerts: 50,
      proPlanMaxSaved: -1,
      proPlanMaxAlerts: -1
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSettings();
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Using mock settings for demo
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      const response = await adminAPI.updateSettings(settings);
      if (response.data.success) {
        setMessage({ text: 'Settings saved successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ text: 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleGeneralChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      general: { ...prev.general, [field]: value }
    }));
  };

  const handleEmailChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      email: { ...prev.email, [field]: value }
    }));
  };

  const handlePaymentChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      payment: { ...prev.payment, [field]: value }
    }));
  };

  const handleApiChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      api: { ...prev.api, [field]: value }
    }));
  };

  const handleLimitChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      limits: { ...prev.limits, [field]: parseInt(value) || 0 }
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage platform configuration and preferences</p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end mb-6">
        <Button 
          variant="primary" 
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <div className="flex items-center gap-3 mb-4 border-b pb-3">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Site Name"
              value={settings.general.siteName}
              onChange={(e) => handleGeneralChange('siteName', e.target.value)}
              placeholder="Sambid"
            />
            <Input
              label="Site URL"
              value={settings.general.siteUrl}
              onChange={(e) => handleGeneralChange('siteUrl', e.target.value)}
              placeholder="https://sambid.co"
            />
            <Input
              label="Support Email"
              value={settings.general.supportEmail}
              onChange={(e) => handleGeneralChange('supportEmail', e.target.value)}
              placeholder="support@sambid.co"
            />
            <Input
              label="Contact Email"
              value={settings.general.contactEmail}
              onChange={(e) => handleGeneralChange('contactEmail', e.target.value)}
              placeholder="contact@sambid.co"
            />
          </div>
        </Card>

        {/* Email Settings */}
        <Card>
          <div className="flex items-center gap-3 mb-4 border-b pb-3">
            <Mail className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Email Configuration</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SMTP Host"
              value={settings.email.smtpHost}
              onChange={(e) => handleEmailChange('smtpHost', e.target.value)}
              placeholder="smtp.hostinger.com"
            />
            <Input
              label="SMTP Port"
              value={settings.email.smtpPort}
              onChange={(e) => handleEmailChange('smtpPort', e.target.value)}
              placeholder="465"
            />
            <Input
              label="SMTP Username"
              value={settings.email.smtpUser}
              onChange={(e) => handleEmailChange('smtpUser', e.target.value)}
              placeholder="user@example.com"
            />
            <Input
              label="SMTP Password"
              type="password"
              value={settings.email.smtpPass}
              onChange={(e) => handleEmailChange('smtpPass', e.target.value)}
              placeholder="••••••••"
            />
            <Input
              label="From Email"
              value={settings.email.fromEmail}
              onChange={(e) => handleEmailChange('fromEmail', e.target.value)}
              placeholder="noreply@sambid.co"
            />
            <Input
              label="From Name"
              value={settings.email.fromName}
              onChange={(e) => handleEmailChange('fromName', e.target.value)}
              placeholder="Sambid"
            />
          </div>
        </Card>

        {/* Payment Settings */}
        <Card>
          <div className="flex items-center gap-3 mb-4 border-b pb-3">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Configuration</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Payoneer API URL"
              value={settings.payment.payoneerApiUrl}
              onChange={(e) => handlePaymentChange('payoneerApiUrl', e.target.value)}
              placeholder="https://api.sandbox.payoneer.com/v4"
            />
            <Input
              label="Payoneer Client ID"
              value={settings.payment.payoneerClientId}
              onChange={(e) => handlePaymentChange('payoneerClientId', e.target.value)}
            />
            <Input
              label="Payoneer Client Secret"
              type="password"
              value={settings.payment.payoneerClientSecret}
              onChange={(e) => handlePaymentChange('payoneerClientSecret', e.target.value)}
            />
            <Input
              label="Payoneer Partner ID"
              value={settings.payment.payoneerPartnerId}
              onChange={(e) => handlePaymentChange('payoneerPartnerId', e.target.value)}
            />
            <Input
              label="Currency"
              value={settings.payment.currency}
              onChange={(e) => handlePaymentChange('currency', e.target.value)}
              placeholder="USD"
            />
          </div>
        </Card>

        {/* API Settings */}
        <Card>
          <div className="flex items-center gap-3 mb-4 border-b pb-3">
            <Key className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">API Configuration</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Gemini API Key"
              type="password"
              value={settings.api.geminiApiKey}
              onChange={(e) => handleApiChange('geminiApiKey', e.target.value)}
              placeholder="AIzaSy..."
            />
            <Input
              label="SAM.gov API Key"
              type="password"
              value={settings.api.samApiKey}
              onChange={(e) => handleApiChange('samApiKey', e.target.value)}
              placeholder="SAM-xxx..."
            />
            <Input
              label="SAM.gov API URL"
              value={settings.api.samApiUrl}
              onChange={(e) => handleApiChange('samApiUrl', e.target.value)}
              placeholder="https://api.sam.gov/opportunities/v2/search"
            />
          </div>
        </Card>

        {/* Plan Limits */}
        <Card>
          <div className="flex items-center gap-3 mb-4 border-b pb-3">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Plan Limits</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Free Plan</p>
              <Input
                label="Max Saved Opportunities"
                type="number"
                value={settings.limits.freePlanMaxSaved}
                onChange={(e) => handleLimitChange('freePlanMaxSaved', e.target.value)}
              />
              <Input
                label="Max Alerts"
                type="number"
                value={settings.limits.freePlanMaxAlerts}
                onChange={(e) => handleLimitChange('freePlanMaxAlerts', e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Starter Plan</p>
              <Input
                label="Max Saved Opportunities"
                type="number"
                value={settings.limits.starterPlanMaxSaved}
                onChange={(e) => handleLimitChange('starterPlanMaxSaved', e.target.value)}
              />
              <Input
                label="Max Alerts"
                type="number"
                value={settings.limits.starterPlanMaxAlerts}
                onChange={(e) => handleLimitChange('starterPlanMaxAlerts', e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Pro Plan</p>
              <Input
                label="Max Saved Opportunities (-1 = unlimited)"
                type="number"
                value={settings.limits.proPlanMaxSaved}
                onChange={(e) => handleLimitChange('proPlanMaxSaved', e.target.value)}
              />
              <Input
                label="Max Alerts (-1 = unlimited)"
                type="number"
                value={settings.limits.proPlanMaxAlerts}
                onChange={(e) => handleLimitChange('proPlanMaxAlerts', e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}