// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileText, Bookmark, Bell, Target, Clock, ChevronRight,
  TrendingUp, Zap, ArrowUpRight, AlertTriangle, CheckCircle,
  Sparkles, Crown, RefreshCw, Loader2, BarChart3, Activity, Mail
} from 'lucide-react';
import { dashboardAPI, contactAPI, authAPI } from '../services/api';
import PushNotificationToggle from '../components/PushNotificationToggle';
import AIPredictionsWidget from '../components/AIPredictionsWidget';
import TrialBanner from '../components/TrialBanner';

// ── Helper: days-left colour ──────────────────────────────────────────────
const deadlineColor = (days) => {
  if (days <= 3)  return 'text-red-600 bg-red-50 border-red-200';
  if (days <= 7)  return 'text-orange-600 bg-orange-50 border-orange-200';
  if (days <= 14) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-green-600 bg-green-50 border-green-200';
};

const planColor = {
  trial:      'bg-gray-100 text-gray-700',
  free:       'bg-gray-100 text-gray-700',
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

const planGradient = {
  trial:      'from-gray-500 to-gray-600',
  free:       'from-gray-500 to-gray-600',
  starter:    'from-blue-500 to-blue-600',
  pro:        'from-purple-500 to-indigo-600',
  enterprise: 'from-amber-500 to-orange-500',
};

export default function Dashboard() {
  const [data,            setData]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [openInquiry,     setOpenInquiry]     = useState(null);
  const [resendSent,      setResendSent]      = useState(false);
  const [resendLoading,   setResendLoading]   = useState(false);
  const location = useLocation();
  const isWelcome = new URLSearchParams(location.search).get('welcome') === '1';

  useEffect(() => {
    if (isWelcome) window.history.replaceState({}, '', '/dashboard');
    loadStats();
    contactAPI.myInquiries()
      .then(res => {
        const open = res.data.data?.find(i => !['closed'].includes(i.status));
        if (open) setOpenInquiry(open);
      })
      .catch(() => {});
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getStats();
      if (res.data.success) {
        const serverData = res.data.data;
        setData(serverData);

        // Sync plan to localStorage so Navbar/Sidebar reflects plan change immediately
        // (happens when admin activates an Enterprise plan while user is logged in)
        const storedPlan = localStorage.getItem('userPlan') || sessionStorage.getItem('userPlan');
        const serverPlan = serverData.user?.plan;
        if (serverPlan && storedPlan !== serverPlan) {
          localStorage.setItem('userPlan', serverPlan);
          sessionStorage.setItem('userPlan', serverPlan);
          // If plan just got activated (was trial/free → enterprise/pro/starter), reload inquiry
          if (['enterprise', 'pro', 'starter'].includes(serverPlan) && ['trial', 'free'].includes(storedPlan)) {
            setOpenInquiry(null); // clear the banner — plan is now active
          }
        }
      }
    } catch (err) {
      setError('Failed to load dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">{error || 'Could not load dashboard'}</p>
          <button onClick={loadStats} className="mt-4 text-indigo-600 underline text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const { user, opportunities, saved, alerts, upcomingDeadlines, recentOpportunities } = data;
  const firstName = user.name?.split(' ')[0] || 'Contractor';

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await authAPI.resendVerificationEmail();
      setResendSent(true);
    } catch (e) {
      console.error('Resend failed:', e);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* ── Trial expiry banner ── */}
        <TrialBanner userProfile={user} />

        {/* ── Email verification banner ── */}
        {!user.isEmailVerified && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 rounded-xl border bg-amber-50 border-amber-300 text-amber-900">
            <div className="flex items-start sm:items-center gap-3">
              <Mail className="w-5 h-5 shrink-0 text-amber-600 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-sm font-semibold">Please verify your email address</p>
                <p className="text-xs opacity-75 mt-0.5">Check your inbox for a verification link. Some features may be limited until you verify.</p>
              </div>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resendLoading || resendSent}
              className="self-start sm:self-auto shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-200 hover:bg-amber-300 disabled:opacity-60 transition"
            >
              {resendLoading ? 'Sending…' : resendSent ? 'Sent ✓' : 'Resend email'}
            </button>
          </div>
        )}

        {/* ── Onboarding nudge ── */}
        {!loading && user?.naicsCodes?.length === 0 && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-900">
            <div className="flex items-start sm:items-center gap-3">
              <Target className="w-5 h-5 shrink-0 text-indigo-600 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-sm font-semibold">Set up your NAICS codes to see matched opportunities</p>
                <p className="text-xs opacity-75 mt-0.5">Tell us your industry codes so we can show contracts that match your business.</p>
              </div>
            </div>
            <a href="/settings?tab=naics"
              className="self-start sm:self-auto shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition">
              Add NAICS Codes →
            </a>
          </div>
        )}

        {/* ── Welcome banner ── */}
        {isWelcome && (
          <div className="mb-5 sm:mb-6 flex items-start sm:items-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 sm:px-6 py-4 rounded-2xl shadow-lg">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-base sm:text-lg">Welcome to Sambid Notify, {firstName}! 🎉</p>
              <p className="text-indigo-100 text-xs sm:text-sm mt-0.5">Your account is set up. We're fetching contracts that match your NAICS codes right now.</p>
            </div>
          </div>
        )}

        {/* ── Enterprise inquiry status banner ────────────────────────────── */}
        {openInquiry && (
          <div className={`mb-4 flex items-center justify-between gap-4 px-5 py-4 rounded-xl border ${
            openInquiry.status === 'resolved'
              ? 'bg-green-50 border-green-300 text-green-900'
              : openInquiry.status === 'in_progress'
              ? 'bg-yellow-50 border-yellow-300 text-yellow-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center gap-3">
              {openInquiry.status === 'resolved'
                ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                : <Clock className="w-5 h-5 shrink-0" />}
              <div>
                {openInquiry.status === 'new' && (
                  <>
                    <p className="text-sm font-semibold">Enterprise plan request received ✓</p>
                    <p className="text-xs opacity-75 mt-0.5">Our team will review and activate your plan within 1 business day. You'll get an email once it's live.</p>
                  </>
                )}
                {openInquiry.status === 'in_progress' && (
                  <>
                    <p className="text-sm font-semibold">Your plan request is being reviewed</p>
                    <p className="text-xs opacity-75 mt-0.5">Our team is processing your Enterprise plan. You'll receive an email as soon as it's activated.</p>
                  </>
                )}
                {openInquiry.status === 'resolved' && (
                  <>
                    <p className="text-sm font-semibold">🎉 Your Enterprise plan has been activated!</p>
                    <p className="text-xs opacity-75 mt-0.5">All features are now unlocked. Refresh the page to see your updated opportunities feed.</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {openInquiry.status === 'resolved' && (
                <button
                  onClick={loadStats}
                  className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition"
                >
                  Refresh Now
                </button>
              )}
              <Link to="/contact" className="text-xs font-semibold bg-white px-3 py-1.5 rounded-lg border hover:shadow-sm transition-shadow">
                View Status →
              </Link>
            </div>
          </div>
        )}

        {/* ── Trial / expiry alert ─────────────────────────────────────────── */}
        {user.plan === 'trial' && user.trialDaysLeft !== null && (
          <div className={`mb-6 flex items-center justify-between gap-4 px-5 py-3 rounded-xl border ${
            user.trialDaysLeft <= 2 ? 'bg-red-50 border-red-200 text-red-800' :
            user.trialDaysLeft <= 5 ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                {user.trialDaysLeft === 0
                  ? 'Your free trial expires today!'
                  : `Free trial: ${user.trialDaysLeft} day${user.trialDaysLeft !== 1 ? 's' : ''} remaining`}
              </span>
            </div>
            <Link to="/pricing" className="text-xs font-semibold bg-white px-3 py-1 rounded-lg border hover:shadow-sm transition-shadow shrink-0">
              Upgrade Now →
            </Link>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {firstName} 👋
            </h1>
            <p className="text-gray-500 mt-1 text-xs sm:text-sm flex flex-wrap items-center gap-1">
              {user.businessName && <span className="truncate max-w-[120px] sm:max-w-none">{user.businessName} ·</span>}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${planColor[user.plan] || planColor.free}`}>
                {user.plan?.charAt(0).toUpperCase() + user.plan?.slice(1)} Plan
              </span>
              {user.naicsCodes?.length > 0 && (
                <span className="text-gray-400 hidden sm:inline">· NAICS: {user.naicsCodes.slice(0, 2).join(', ')}{user.naicsCodes.length > 2 ? ` +${user.naicsCodes.length - 2}` : ''}</span>
              )}
            </p>
          </div>
          <button onClick={loadStats} className="shrink-0 flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-indigo-600 border border-gray-200 bg-white px-2.5 sm:px-3 py-1.5 rounded-lg hover:border-indigo-300 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            {
              label: 'Contracts in Your Feed',
              value: opportunities.total.toLocaleString(),
              sub:   user.plan === 'enterprise'
                ? (opportunities.today > 0 ? `${opportunities.today} posted today` : 'All open solicitations')
                : `${opportunities.today} new today`,
              icon:  FileText,
              color: 'bg-indigo-500',
              border: 'border-indigo-500',
              link:  '/opportunities'
            },
            {
              label: user.plan === 'enterprise' ? 'Bidding Window Open' : 'High-Match (≥70%)',
              value: opportunities.highMatch.toLocaleString(),
              sub:   user.plan === 'enterprise' ? 'Due date 7+ days away' : 'Strong NAICS match',
              icon:  Target,
              color: 'bg-green-500',
              border: 'border-green-500',
              link:  '/opportunities?filter=highMatch'
            },
            {
              label: 'Saved Opportunities',
              value: saved.total.toLocaleString(),
              sub:   `${saved.thisWeek} this week`,
              icon:  Bookmark,
              color: 'bg-blue-500',
              border: 'border-blue-500',
              link:  '/saved'
            },
            {
              label: 'Active Alerts',
              value: alerts.active.toLocaleString(),
              sub:   `${alerts.unreadNotifications} unread notifications`,
              icon:  Bell,
              color: 'bg-purple-500',
              border: 'border-purple-500',
              link:  '/alerts'
            }
          ].map((card, i) => (
            <Link key={i} to={card.link} className={`bg-white rounded-xl shadow-sm p-3 sm:p-5 border-l-4 ${card.border} hover:shadow-md transition-shadow group`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`${card.color} p-2 sm:p-2.5 rounded-xl`}>
                  <card.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5 leading-tight">{card.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{card.sub}</p>
            </Link>
          ))}
        </div>

        {/* ── Monthly usage bar ──────────────────────────────────────────────── */}
        {user.monthlyLimit !== 'Unlimited' && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700">Monthly Match Usage</span>
              </div>
              <span className="text-sm text-gray-500">
                {user.monthlyMatchesUsed} / {user.monthlyLimit} used this month
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${opportunities.usagePercent >= 90 ? 'bg-red-500' : opportunities.usagePercent >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(100, opportunities.usagePercent)}%` }}
              />
            </div>
            {opportunities.usagePercent >= 80 && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {opportunities.usagePercent >= 100 ? 'Monthly limit reached. Resets on the 1st.' : 'Approaching monthly limit.'}
                <Link to="/pricing" className="ml-1 underline font-medium">Upgrade for more →</Link>
              </p>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">

          {/* ── Recent opportunities ────────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden min-w-0">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Top Matches
              </h2>
              <Link to="/opportunities" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentOpportunities.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No opportunities yet.</p>
                  <Link to="/opportunities" className="text-indigo-600 text-sm underline mt-1 inline-block">
                    Go to Opportunities to load data
                  </Link>
                </div>
              ) : recentOpportunities.map((opp) => (
                <Link key={opp.id} to={`/opportunity/${opp.id}`}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                  {/* Match score circle */}
                  <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    opp.matchScore >= 70 ? 'bg-green-100 text-green-700' :
                    opp.matchScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {opp.matchScore}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                      {opp.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opp.agency}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                      {opp.estimatedValue > 0 && (
                        <span className="text-green-600 font-medium">${opp.estimatedValue.toLocaleString()}</span>
                      )}
                      {opp.dueDate && (
                        <span className={`flex items-center gap-1 ${opp.isActive ? 'text-orange-600' : 'text-gray-400'}`}>
                          <Clock className="w-3 h-3" />
                          {new Date(opp.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {opp.setAside && (
                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                          {opp.setAside.substring(0, 25)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────────────────────── */}
          <div className="space-y-5 min-w-0">

            {/* Upcoming deadlines */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Upcoming Deadlines
                </h2>
                <Link to="/opportunities?filter=urgent" className="text-xs text-indigo-600 hover:underline">View all</Link>
              </div>
              {upcomingDeadlines.length === 0 ? (
                <div className="p-5 text-center text-sm text-gray-400">No upcoming deadlines</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {upcomingDeadlines.map((d) => (
                    <Link key={d.id} to={`/opportunity/${d.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-xs font-medium text-gray-900 truncate">{d.title?.substring(0, 50)}</p>
                        <p className="text-xs text-gray-400 truncate">{d.agency}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg border flex-shrink-0 ${deadlineColor(d.daysLeft)}`}>
                        {d.daysLeft === 0 ? 'Today' : `${d.daysLeft}d`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Plan card */}
            <div className={`bg-gradient-to-br ${planGradient[user.plan] || planGradient.free} rounded-xl p-5 text-white`}>
              <div className="flex items-center gap-2 mb-3">
                {user.plan === 'pro' || user.plan === 'enterprise'
                  ? <Crown className="w-5 h-5" />
                  : <Zap className="w-5 h-5" />}
                <span className="font-bold capitalize">{user.plan} Plan</span>
              </div>

              {user.plan === 'trial' && (
                <p className="text-sm opacity-90 mb-3">
                  {user.trialDaysLeft} day{user.trialDaysLeft !== 1 ? 's' : ''} left in free trial
                </p>
              )}
              {user.planExpiresDays !== null && user.plan !== 'trial' && (
                <p className="text-sm opacity-90 mb-3">
                  Renews in {user.planExpiresDays} day{user.planExpiresDays !== 1 ? 's' : ''}
                </p>
              )}

              <ul className="text-xs opacity-80 space-y-1 mb-4">
                {user.plan === 'trial' || user.plan === 'free' ? (
                  <>
                    <li>· 50 contract matches/month</li>
                    <li>· 10 saved opportunities</li>
                    <li>· Basic email alerts</li>
                  </>
                ) : user.plan === 'starter' ? (
                  <>
                    <li>· 500 contract matches/month</li>
                    <li>· 100 saved opportunities</li>
                    <li>· Priority email support</li>
                  </>
                ) : (
                  <>
                    <li>· {user.plan === 'pro' ? '3,000 matches/month' : 'Unlimited matches'}</li>
                    <li>· AI proposal generation</li>
                    <li>· Real-time alerts</li>
                  </>
                )}
              </ul>

              {(user.plan === 'trial' || user.plan === 'free' || user.plan === 'starter') && (
                <Link to="/pricing"
                  className="block text-center bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                  Upgrade Plan →
                </Link>
              )}
            </div>

            {/* ── AI Predictions Widget ─────────────────────────────────── */}
            <AIPredictionsWidget userPlan={user.plan} />

            {/* Push notification compact toggle */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Instant Alerts</p>
              <PushNotificationToggle compact />
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { label: 'Browse Contracts',     to: '/opportunities', icon: FileText, color: 'text-indigo-600 bg-indigo-50' },
                  { label: 'Manage Alerts',         to: '/alerts',        icon: Bell,     color: 'text-purple-600 bg-purple-50' },
                  { label: 'Past Award Analysis',   to: '/winning-bids',  icon: BarChart3, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Saved Opportunities',   to: '/saved',         icon: Bookmark, color: 'text-blue-600 bg-blue-50' },
                  { label: 'AI Assistant',          to: '/opportunities', icon: Sparkles, color: 'text-pink-600 bg-pink-50' },
                ].map(({ label, to, icon: Icon, color }) => (
                  <Link key={label} to={to}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className={`${color} p-2 rounded-lg`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-indigo-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
