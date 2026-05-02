// frontend/src/pages/Settings.jsx - Add EmailPreferences component
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import EmailPreferences from '../components/EmailPreferences';  // ← ADD THIS

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    naicsCodes: '',
    email: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getProfile();
      if (response.data.success) {
        const userData = response.data.data;
        setUser(userData);
        setFormData({
          name: userData.name || '',
          businessName: userData.businessName || '',
          naicsCodes: userData.naicsCodes?.join(', ') || '',
          email: userData.email || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ text: 'Failed to load profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const naicsArray = formData.naicsCodes
        .split(',')
        .map(code => code.trim())
        .filter(code => code.length > 0);

      const response = await authAPI.updateProfile({
        businessName: formData.businessName,
        naicsCodes: naicsArray
      });

      if (response.data.success) {
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
        if (formData.name) localStorage.setItem('userName', formData.name);
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ text: error.response?.data?.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Profile Information */}
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
            <div className="space-y-4">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
                disabled
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                disabled
              />
              <Input
                label="Business Name"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Your Company LLC"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NAICS Codes
                </label>
                <textarea
                  name="naicsCodes"
                  value={formData.naicsCodes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="541511, 541512, 541513"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter comma-separated NAICS codes for contract matching
                </p>
              </div>
            </div>
          </Card>

          {/* Plan Information */}
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Plan</h2>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600">Current Plan: <span className="font-semibold text-gray-900 capitalize">{user?.plan || 'Free'}</span></p>
                {user?.plan === 'free' && (
                  <p className="text-sm text-gray-500 mt-1">Upgrade to Pro for unlimited saved opportunities and AI proposals</p>
                )}
              </div>
              {user?.plan === 'free' && (
                <Button variant="primary" onClick={() => navigate('/pricing')}>
                  Upgrade Plan
                </Button>
              )}
            </div>
          </Card>

          {/* Email Preferences - NEW */}
          <EmailPreferences />

          {/* Save Button */}
          <div className="flex justify-end mt-6">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}