import { useState, useEffect } from 'react';
import { User, Mail, Building, Briefcase, Save, Target } from 'lucide-react';
import { opportunityAPI } from '../services/api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [naicsInput, setNaicsInput] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await opportunityAPI.getProfile();
      if (response.data.success) {
        setProfile(response.data.user);
        setNaicsInput(response.data.user.naicsCodes?.join(', ') || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const naicsArray = naicsInput.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
    
    try {
      const response = await opportunityAPI.updateProfile({
        naicsCodes: naicsArray,
        companyName: profile.businessName,
        businessType: profile.businessType
      });
      if (response.data.success) {
        setProfile(response.data.user);
        alert('Profile updated successfully');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-indigo-600" />
          My Profile
        </h1>
        <p className="text-gray-600 mt-1">Manage your account and business information</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleUpdateProfile}>
          {/* Basic Info */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profile?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-gray-500" />
              Business Information
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={profile?.businessName || ''}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Your company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select
                  value={profile?.businessType || 'other'}
                  onChange={(e) => setProfile({ ...profile, businessType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="sole_proprietor">Sole Proprietor</option>
                  <option value="llc">LLC</option>
                  <option value="corporation">Corporation</option>
                  <option value="nonprofit">Nonprofit</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* NAICS Codes */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-500" />
              NAICS Codes
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your NAICS Codes (comma separated)
              </label>
              <input
                type="text"
                value={naicsInput}
                onChange={(e) => setNaicsInput(e.target.value)}
                placeholder="e.g., 541511, 541512, 541513"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter up to 5 NAICS codes separated by commas
              </p>
            </div>
          </div>

          {/* Plan Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-500" />
              Current Plan
            </h2>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium capitalize">{profile?.plan || 'Free'}</p>
                {profile?.planExpiresAt && (
                  <p className="text-sm text-gray-500">
                    Expires: {new Date(profile.planExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Link
                to="/pricing"
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Upgrade
              </Link>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}