// frontend/src/pages/Profile.jsx
// Read-only profile overview — edits go through /settings
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Building2, Briefcase, Target, Crown, Clock,
  Settings, ChevronRight, Loader2, Calendar, CheckCircle
} from 'lucide-react';
import { authAPI } from '../services/api';
import { NAICS_CODES } from '../data/naicsCodes';

const planColors = {
  trial:      'bg-gray-100 text-gray-700 border-gray-200',
  free:       'bg-gray-100 text-gray-700 border-gray-200',
  starter:    'bg-blue-100 text-blue-700 border-blue-200',
  pro:        'bg-purple-100 text-purple-700 border-purple-200',
  enterprise: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function Profile() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.getProfile()
      .then(res => { if (res.data.success) setUser(res.data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) return null;

  const daysLeft = user.plan === 'trial'
    ? Math.max(0, Math.ceil((new Date(user.trialEndDate) - new Date()) / 86400000))
    : null;
  const expiresDays = user.planExpiresAt
    ? Math.ceil((new Date(user.planExpiresAt) - new Date()) / 86400000)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-5 sm:py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-8 gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">My Profile</h1>
          <Link to="/settings" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors whitespace-nowrap">
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Edit Settings</span>
            <span className="sm:hidden">Edit</span>
          </Link>
        </div>

        {/* Avatar + name card */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-5 flex items-center gap-3 sm:gap-5">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{user.name}</h2>
            <p className="text-gray-500 text-xs sm:text-sm truncate">{user.email}</p>
            {user.businessName && (
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 flex items-center gap-1 truncate">
                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> {user.businessName}
              </p>
            )}
          </div>
          <span className={`text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border capitalize flex-shrink-0 ${planColors[user.plan] || planColors.free}`}>
            {user.plan}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">

          {/* Business info */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <Briefcase className="w-4 h-4 text-indigo-500" /> Business Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Company</span>
                <span className="font-medium text-gray-900">{user.businessName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Business type</span>
                <span className="font-medium text-gray-900 capitalize">{user.businessType?.replace('_', ' ') || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Member since</span>
                <span className="font-medium text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Onboarding</span>
                <span className={`flex items-center gap-1 font-medium ${user.onboardingCompleted ? 'text-green-600' : 'text-amber-600'}`}>
                  {user.onboardingCompleted ? <><CheckCircle className="w-3.5 h-3.5" /> Complete</> : 'Incomplete'}
                </span>
              </div>
            </div>
            <Link to="/settings?tab=profile" className="mt-4 flex items-center gap-1 text-xs text-indigo-600 hover:underline">
              Edit <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Plan info */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <Crown className="w-4 h-4 text-indigo-500" /> Subscription
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium capitalize text-gray-900">{user.plan}</span>
              </div>
              {daysLeft !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Trial ends</span>
                  <span className={`font-medium ${daysLeft <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                    {daysLeft === 0 ? 'Today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                  </span>
                </div>
              )}
              {expiresDays !== null && user.plan !== 'trial' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Renews in</span>
                  <span className="font-medium text-gray-900">{expiresDays} days</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Monthly limit</span>
                <span className="font-medium text-gray-900">
                  {user.plan === 'enterprise' ? 'Unlimited' : user.plan === 'pro' ? '3,000' : user.plan === 'starter' ? '500' : user.plan === 'trial' ? '15 (trial)' : '50'} {user.plan !== 'enterprise' && (user.plan === 'trial' ? 'matches total' : 'matches/month')}
                </span>
              </div>
            </div>
            <Link to="/pricing" className="mt-4 flex items-center gap-1 text-xs text-indigo-600 hover:underline">
              {user.plan === 'pro' || user.plan === 'enterprise' ? 'View plan details' : 'Upgrade plan'} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* NAICS codes */}
          <div className="bg-white rounded-2xl shadow-sm p-5 sm:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-indigo-500" /> NAICS Codes
              <span className="text-xs text-gray-400 font-normal">({user.naicsCodes?.length || 0}/5 added)</span>
            </h3>
            {user.naicsCodes?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.naicsCodes.map(code => {
                  const entry = NAICS_CODES.find(n => n.code === code);
                  return (
                    <div key={code} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                      <span className="font-mono font-bold text-indigo-700 text-sm">{code}</span>
                      {entry && <span className="text-xs text-gray-500">{entry.label.split(' — ')[1]?.substring(0, 35)}</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No NAICS codes added.</p>
            )}
            <Link to="/settings?tab=naics" className="mt-4 flex items-center gap-1 text-xs text-indigo-600 hover:underline">
              Manage NAICS codes <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Usage stats */}
          <div className="bg-white rounded-2xl shadow-sm p-5 sm:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-indigo-500" /> Today's Usage
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Monthly matches used</span>
                  <span className="font-medium">
                    {user.monthlyMatchesUsed || 0} / {user.plan === 'enterprise' ? '∞' : user.plan === 'pro' ? '3,000' : user.plan === 'starter' ? '500' : user.plan === 'trial' ? '15' : '50'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: user.plan === 'enterprise' ? '0%' : `${Math.min(100, ((user.monthlyMatchesUsed || 0) / (user.plan === 'pro' ? 3000 : user.plan === 'starter' ? 500 : user.plan === 'trial' ? 15 : 50)) * 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0">Resets on the 1st</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
