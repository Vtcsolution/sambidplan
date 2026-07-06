// frontend/src/pages/Opportunities.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Search, ChevronRight, AlertCircle, Briefcase, History, Database, Crown, CheckCircle, ExternalLink, SlidersHorizontal, X, ChevronDown, CalendarDays, Hash, Building, Tag, AlertOctagon, Zap, Globe, BookOpen, XCircle } from 'lucide-react';
import { opportunityAPI } from '../services/api';
import ExportButton from '../components/ExportButton';
import { exportOpportunitiesPDF, exportOpportunitiesCSV } from '../utils/exportUtils';
import HowItWorks from '../components/HowItWorks';
import { usePlans } from '../hooks/usePlans';
import { searchNAICS, NAICS_CODES } from '../data/naicsCodes';

const SET_ASIDE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'SBA', label: 'Small Business (SBA)' },
  { value: 'WOSB', label: 'Women-Owned (WOSB)' },
  { value: '8A', label: '8(a)' },
  { value: 'HUBZone', label: 'HUBZone' },
  { value: 'SDVOSB', label: 'Service-Disabled Veteran' },
  { value: 'VOSB', label: 'Veteran-Owned' },
];

const NOTICE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'Solicitation', label: 'Solicitation' },
  { value: 'Combined Synopsis/Solicitation', label: 'Combined Synopsis' },
  { value: 'Presolicitation', label: 'Presolicitation' },
  { value: 'Sources Sought', label: 'Sources Sought' },
  { value: 'Award Notice', label: 'Award Notice' },
  { value: 'Special Notice', label: 'Special Notice' },
  { value: 'Justification and Authorization', label: 'Justification' },
];

// Top federal contracting states (used for one-click location pills)
const US_STATES = [
  { abbr: 'VA', name: 'Virginia' },
  { abbr: 'DC', name: 'Washington DC' },
  { abbr: 'TX', name: 'Texas' },
  { abbr: 'CA', name: 'California' },
  { abbr: 'MD', name: 'Maryland' },
  { abbr: 'GA', name: 'Georgia' },
  { abbr: 'FL', name: 'Florida' },
  { abbr: 'NY', name: 'New York' },
  { abbr: 'CO', name: 'Colorado' },
  { abbr: 'WA', name: 'Washington' },
  { abbr: 'OH', name: 'Ohio' },
  { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'IL', name: 'Illinois' },
];

// Contract value quick-select presets
const VALUE_PRESETS = [
  { label: '< $150k',   min: '',      max: '150000' },
  { label: '$150k–$1M', min: '150000', max: '1000000' },
  { label: '$1M–$10M',  min: '1000000', max: '10000000' },
  { label: '> $10M',    min: '10000000', max: '' },
];

const toDateStr = (d) => d.toISOString().slice(0, 10);

const DUE_DATE_PRESETS = [
  { label: 'Next 7 days',  from: () => toDateStr(new Date()), to: () => toDateStr(new Date(Date.now() + 7 * 86400000)) },
  { label: 'Next 15 days', from: () => toDateStr(new Date()), to: () => toDateStr(new Date(Date.now() + 15 * 86400000)) },
  { label: 'Next 30 days', from: () => toDateStr(new Date()), to: () => toDateStr(new Date(Date.now() + 30 * 86400000)) },
  { label: 'Next 60 days', from: () => toDateStr(new Date()), to: () => toDateStr(new Date(Date.now() + 60 * 86400000)) },
  { label: 'Next 90 days', from: () => toDateStr(new Date()), to: () => toDateStr(new Date(Date.now() + 90 * 86400000)) },
];

export default function Opportunities() {
  const { plans: livePlans } = usePlans();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [pageSize, setPageSize] = useState(10);
  const [userProfile, setUserProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activatedBanner, setActivatedBanner] = useState(false);

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [setAsideFilter, setSetAsideFilter] = useState('');
  const [sortBy, setSortBy] = useState('matchScore');

  // Smart filters
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [postedFrom, setPostedFrom] = useState('');
  const [postedTo, setPostedTo] = useState('');
  const [naicsFilter, setNaicsFilter] = useState('');
  const [noticeTypeFilter, setNoticeTypeFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [activePreset, setActivePreset] = useState('');

  // New filters
  const [keywordMode, setKeywordMode] = useState('any'); // any | all | exact
  const [pscFilter, setPscFilter] = useState('');
  const [popFilter, setPopFilter] = useState('');        // place of performance (state/city)
  const [daysLeftFilter, setDaysLeftFilter] = useState(''); // e.g. '15', '30', '60', '90'

  // NAICS autocomplete state
  const [naicsQuery, setNaicsQuery] = useState('');
  const [naicsDropdown, setNaicsDropdown] = useState([]);
  const [showNaicsDropdown, setShowNaicsDropdown] = useState(false);

  // Active value preset label
  const [activeValuePreset, setActiveValuePreset] = useState('');

  // Potential matches + expired popup
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [showPotential, setShowPotential] = useState(true);
  const [expiredPopup, setExpiredPopup] = useState(null); // opp object to show warning for

  const location = useLocation();

  // Deadline badge for Problem 2
  const getDeadlineBadge = (opp) => {
    const status = opp.deadlineStatus;
    if (status === 'expired' || opp.isExpired) return { label: 'EXPIRED', cls: 'bg-red-100 text-red-700 border border-red-300', icon: XCircle };
    if (status === 'closing_soon') return { label: 'Closing Soon', cls: 'bg-amber-100 text-amber-700 border border-amber-300', icon: AlertOctagon };
    if (status === 'due_soon') return { label: 'Due Soon', cls: 'bg-orange-100 text-orange-700 border border-orange-200', icon: Clock };
    return null;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('activated') === '1') {
      setActivatedBanner(true);
      setTimeout(() => setActivatedBanner(false), 8000);
      window.history.replaceState({}, '', '/opportunities');
    }
    fetchOpportunities();
  }, [pagination.page, pageSize, searchTerm, keywordMode, statusFilter, minValue, maxValue, setAsideFilter, sortBy, dueDateFrom, dueDateTo, postedFrom, postedTo, naicsFilter, noticeTypeFilter, agencyFilter, pscFilter, popFilter, daysLeftFilter]);

  // NAICS autocomplete — search predefined list + support any 6-digit code
  useEffect(() => {
    if (!naicsQuery.trim()) { setNaicsDropdown([]); return; }
    const q = naicsQuery.trim();
    const results = searchNAICS(q);
    // Also prepend user's own NAICS codes that match
    const userMatches = (userProfile?.naicsCodes || [])
      .filter(c => c.includes(q))
      .filter(c => !results.find(r => r.code === c))
      .map(c => {
        const entry = NAICS_CODES.find(n => n.code === c);
        return { code: c, label: entry?.label || `${c} — Your Code`, isUserCode: true };
      });
    setNaicsDropdown([...userMatches, ...results].slice(0, 12));
  }, [naicsQuery, userProfile]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMinValue('');
    setMaxValue('');
    setSetAsideFilter('');
    setSortBy('matchScore');
    setDueDateFrom('');
    setDueDateTo('');
    setPostedFrom('');
    setPostedTo('');
    setNaicsFilter('');
    setNaicsQuery('');
    setNoticeTypeFilter('');
    setAgencyFilter('');
    setActivePreset('');
    setKeywordMode('any');
    setPscFilter('');
    setPopFilter('');
    setDaysLeftFilter('');
    setActiveValuePreset('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const selectNaics = (code) => {
    setNaicsFilter(code);
    setNaicsQuery(code);
    setShowNaicsDropdown(false);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const clearNaicsFilter = () => {
    setNaicsFilter('');
    setNaicsQuery('');
    setNaicsDropdown([]);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const selectState = (abbr) => {
    setPopFilter(prev => prev === abbr ? '' : abbr);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const applyValuePreset = (preset) => {
    if (activeValuePreset === preset.label) {
      setMinValue(''); setMaxValue(''); setActiveValuePreset('');
    } else {
      setMinValue(preset.min); setMaxValue(preset.max); setActiveValuePreset(preset.label);
    }
    setPagination(p => ({ ...p, page: 1 }));
  };

  const applyDueDatePreset = (preset) => {
    setDueDateFrom(preset.from());
    setDueDateTo(preset.to());
    setActivePreset(preset.label);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearDueDateRange = () => {
    setDueDateFrom('');
    setDueDateTo('');
    setActivePreset('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || minValue || maxValue || setAsideFilter || sortBy !== 'matchScore' || dueDateFrom || dueDateTo || postedFrom || postedTo || naicsFilter || noticeTypeFilter || agencyFilter || pscFilter || popFilter || daysLeftFilter || keywordMode !== 'any';
  const activeFilterCount = [searchTerm, statusFilter !== 'all', minValue, maxValue, setAsideFilter, dueDateFrom, dueDateTo, postedFrom, postedTo, naicsFilter, noticeTypeFilter, agencyFilter, pscFilter, popFilter, daysLeftFilter, keywordMode !== 'any'].filter(Boolean).length;

  const fetchOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pageSize,
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
        ...(keywordMode !== 'any' && { keywordMode }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(minValue && { minValue }),
        ...(maxValue && { maxValue }),
        ...(setAsideFilter && { setAside: setAsideFilter }),
        ...(sortBy !== 'matchScore' && { sortBy }),
        ...(dueDateFrom && { dueDateFrom }),
        ...(dueDateTo && { dueDateTo }),
        ...(postedFrom && { postedFrom }),
        ...(postedTo && { postedTo }),
        ...(naicsFilter && { naicsCode: naicsFilter }),
        ...(noticeTypeFilter && { noticeType: noticeTypeFilter }),
        ...(agencyFilter && { agency: agencyFilter }),
        ...(pscFilter && { pscCode: pscFilter }),
        ...(popFilter && { placeOfPerformance: popFilter }),
        ...(daysLeftFilter && { daysLeft: daysLeftFilter }),
      };
      const response = await opportunityAPI.getAll(params);

      if (response.data.success) {
        setOpportunities(response.data.data || []);
        setPotentialMatches(response.data.potentialMatches || []);
        setUserProfile(response.data.userProfile);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          pages: response.data.pagination?.pages || 1
        }));
      } else {
        setError(response.data.message || 'Failed to load opportunities');
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setError(error.response?.data?.message || 'Failed to load opportunities.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Admins: fetch fresh data from SAM.gov into the master store
      // Users:  clear their stale feed and refill based on their current plan
      const response = isAdmin
        ? await opportunityAPI.refresh()
        : await opportunityAPI.refreshMyFeed();
      if (response.data.success) {
        await fetchOpportunities();
      } else {
        alert(response.data.message || 'Refresh failed');
      }
    } catch (error) {
      console.error('Refresh error:', error);
      alert(error.response?.data?.message || 'Failed to refresh feed.');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredOpportunities = opportunities; // Server-side filtering now handles this

  const getMatchColor = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-700';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  const getDaysLeft = (dueDate) => {
    if (!dueDate) return 'text-gray-500';
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days <= 3) return 'text-red-600 font-bold';
    if (days <= 7) return 'text-orange-600';
    if (days > 0) return 'text-green-600';
    return 'text-gray-500';
  };

  const isActiveOpportunity = (dueDate) => {
    if (!dueDate) return false;
    // Treat the dueDate as end-of-day so contracts due today stay active all day
    const due = new Date(dueDate);
    due.setHours(23, 59, 59, 999);
    return due > new Date();
  };

  const getRemainingMatchesText = () => {
    if (!userProfile) return '';
    const { monthlyLimit, remainingThisMonth, plan } = userProfile;
    if (plan === 'enterprise' || monthlyLimit === 'Unlimited') return '♾️ Unlimited matches';
    if (plan === 'trial' || plan === 'free') return `${remainingThisMonth ?? 0} of ${monthlyLimit ?? 3} matches remaining today`;
    return `${remainingThisMonth ?? 0} matches remaining this month`;
  };

  // Build the plan-limits banner text live from admin-configured Plan data
  const getPlanLimitsBannerText = () => {
    if (!livePlans?.length) return '';
    const byName = (n) => livePlans.find(p => p.name === n);
    const free = byName('free');
    const starter = byName('starter');
    const pro = byName('pro');
    const enterprise = byName('enterprise');

    const dailyTxt = free?.dailyLimit > 0 ? `${free.dailyLimit} matches/day` : '3 matches/day';
    const fmtMonthly = (p, fallback) => {
      const v = p?.opportunitiesPerMonth;
      if (v === undefined || v === null) return fallback;
      return v > 0 ? `${v.toLocaleString()}/month` : 'Unlimited';
    };

    return `Trial: ${dailyTxt} • Free: ${dailyTxt} • Starter: ${fmtMonthly(starter, '500/month')} • Pro: ${fmtMonthly(pro, '3,000/month')} • Enterprise: ${fmtMonthly(enterprise, 'Unlimited')}`;
  };

  const isAdmin = localStorage.getItem('userRole') === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Plan activation banner */}
        {activatedBanner && (
          <div className="mb-5 flex items-start sm:items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-5 py-4 rounded-xl shadow-lg animate-pulse">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold text-sm sm:text-base">Your plan is now active!</p>
              <p className="text-xs sm:text-sm text-green-100 mt-0.5">We've fetched the latest opportunities for your upgraded plan. Enjoy!</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 shrink-0" />
              Contract Opportunities
              <HowItWorks
                title="Contract Opportunities"
                steps={[
                  { title: 'Auto-matched to your NAICS', description: 'System fetches opportunities from SAM.gov every hour and matches them to your registered NAICS codes' },
                  { title: 'AI Match Score', description: 'Each opportunity is scored 0-100% based on NAICS fit, set-aside eligibility, value range, and your past performance' },
                  { title: 'Smart Filters', description: 'Filter by due date (presets: next 7/15/30/60/90 days), NAICS code, notice type, agency, set-aside, value range' },
                  { title: 'View Details', description: 'Click any opportunity to see full SAM.gov data, run AI analysis, save to your list, or add deadline to calendar' },
                ]}
                dataUsed={['SAM.gov API', 'Your NAICS Codes', 'USASpending Awards']}
              >
                <p className="text-sm font-semibold text-gray-700 mt-2">Connected to:</p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                  <li><strong>Opportunity Detail</strong> → click any contract to see full SAM.gov data + run AI analysis</li>
                  <li><strong>Saved Opportunities</strong> → save contracts here, they appear in your saved list and all AI tools</li>
                  <li><strong>Go/No-Go</strong> → select any opportunity for a full bid decision analysis</li>
                  <li><strong>Deadline Calendar</strong> → due dates from this feed populate your calendar</li>
                  <li><strong>Alerts</strong> → new matches trigger email/push notifications based on your settings</li>
                </ul>
                <p className="text-sm font-semibold text-gray-700 mt-2">How matching works:</p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                  <li>System fetches from SAM.gov every 60 minutes for your NAICS codes</li>
                  <li>Each opportunity scored 0-100%: NAICS match + set-aside fit + value range + agency alignment</li>
                  <li>Enterprise: sees ALL active contracts. Other plans: distributed based on monthly limits</li>
                </ul>
              </HowItWorks>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Federal contracts matched to your NAICS codes
            </p>
            {userProfile?.businessName && (
              <p className="text-sm text-gray-500 mt-1">
                Welcome back, {userProfile.businessName}
              </p>
            )}
            {userProfile?.naicsCodes?.length > 0 && (
              <p className="text-sm text-indigo-600 mt-1">
                🎯 Your NAICS codes: {userProfile.naicsCodes.join(', ')}
              </p>
            )}
            {userProfile && (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs text-gray-500">
                  {getRemainingMatchesText()} • {userProfile.plan?.charAt(0).toUpperCase() + userProfile.plan?.slice(1)} Plan
                  {userProfile.daysLeft > 0 && ` • ${userProfile.daysLeft} days left in trial`}
                </p>
                {userProfile.plan === 'free' && (
                  <Link to="/pricing" className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Upgrade
                  </Link>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <ExportButton
              disabled={opportunities.length === 0}
              onExportPDF={() => exportOpportunitiesPDF(
                filteredOpportunities,
                localStorage.getItem('userName') || '',
                userProfile?.naicsCodes || []
              )}
              onExportCSV={() => exportOpportunitiesCSV(filteredOpportunities)}
            />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
            >
              <Database className="w-4 h-4" />
              {refreshing ? 'Refreshing…' : isAdmin ? 'Fetch from SAM.gov' : 'Refresh My Feed'}
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
          <Database className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <strong>{getPlanLimitsBannerText()}</strong><br />
            {!isAdmin && 'Showing all open opportunities from the database matched to your NAICS codes. Due dates are always in the future.'}
            {isAdmin && 'As admin, use "Fetch from SAM.gov" to pull the latest opportunities into the master store.'}
          </div>
        </div>

        {/* Monthly / Trial Limit Warning */}
        {userProfile?.remainingThisMonth === 0 && userProfile?.monthlyLimit !== 'Unlimited' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {userProfile.plan === 'trial' ? (
                <>
                  <p className="text-yellow-800 font-medium">Trial match limit reached</p>
                  <p className="text-yellow-700 text-sm">You've used all 15 matches included in your 3-day trial. Upgrade to keep discovering federal contracts.</p>
                </>
              ) : (
                <>
                  <p className="text-yellow-800 font-medium">Monthly match limit reached</p>
                  <p className="text-yellow-700 text-sm">You've used all {userProfile.monthlyLimit} of your matches for this month. Upgrade your plan or wait until the 1st.</p>
                </>
              )}
              <Link to="/pricing" className="inline-block mt-2 text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700">
                Upgrade Now
              </Link>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-5 sm:mb-6">
          {/* Row 1: search + sort + toggle */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, agency, description…"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              {searchTerm && (
                <select value={keywordMode} onChange={e => { setKeywordMode(e.target.value); setPagination(p => ({...p, page:1})); }}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-2 bg-white focus:ring-2 focus:ring-indigo-500 shrink-0">
                  <option value="any">Any Words</option>
                  <option value="all">All Words</option>
                  <option value="exact">Exact Phrase</option>
                </select>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                className="text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="matchScore">Best Match</option>
                <option value="dueDate">Due Date</option>
                <option value="value">Highest Value</option>
                <option value="posted">Newest</option>
              </select>
              {(isAdmin ? ['all','active','historical'] : ['all','active']).map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); setPagination(p => ({...p, page:1})); }}
                  className={`px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors ${showAdvanced ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Smart Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold">{activeFilterCount}</span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
              {hasActiveFilters && (
                <button onClick={resetFilters}
                  className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
                  <X className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </div>
          </div>

          {/* Smart Filters Panel */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-5">

              {/* ══ NICHE + CITY smart row ══════════════════════════════════════ */}
              <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Smart Search — Niche + Location
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  {/* NAICS / Niche autocomplete */}
                  <div className="relative">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                      <Hash className="w-3.5 h-3.5 text-purple-500" /> Industry / NAICS Code
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Type industry or code — e.g. 'IT services', '541511'…"
                        value={naicsQuery}
                        onChange={e => { setNaicsQuery(e.target.value); setShowNaicsDropdown(true); if (!e.target.value.trim()) clearNaicsFilter(); }}
                        onFocus={() => setShowNaicsDropdown(true)}
                        onBlur={() => setTimeout(() => setShowNaicsDropdown(false), 200)}
                        className={`w-full pl-8 pr-8 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 ${naicsFilter ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-white'}`}
                      />
                      {naicsFilter && (
                        <button onClick={clearNaicsFilter}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {showNaicsDropdown && naicsDropdown.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        {naicsDropdown.map(n => (
                          <button key={n.code} type="button" onMouseDown={() => selectNaics(n.code)}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0 flex items-center gap-2.5">
                            <span className={`font-mono font-bold text-xs w-14 flex-shrink-0 ${n.isUserCode ? 'text-indigo-700' : 'text-purple-600'}`}>
                              {n.code}
                            </span>
                            <span className="text-gray-700 flex-1 truncate text-xs">{n.label.split(' — ')[1]}</span>
                            {n.isUserCode && <span className="text-xs text-indigo-400 flex-shrink-0">My code</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {naicsFilter && (
                      <p className="mt-1 text-xs text-indigo-600">
                        Filtering: <span className="font-mono font-semibold">{naicsFilter}</span>
                        {(() => { const e = NAICS_CODES.find(n => n.code === naicsFilter); return e ? ` — ${e.label.split(' — ')[1]}` : ''; })()}
                      </p>
                    )}
                  </div>

                  {/* Location / State */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                      <Globe className="w-3.5 h-3.5 text-blue-500" /> City / State
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type city or state — e.g. 'Virginia', 'Austin TX'…"
                        value={popFilter}
                        onChange={e => { setPopFilter(e.target.value); setPagination(p => ({...p, page:1})); }}
                        className={`w-full pr-8 py-2.5 px-3 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 ${popFilter ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white'}`}
                      />
                      {popFilter && (
                        <button onClick={() => { setPopFilter(''); setPagination(p => ({...p, page:1})); }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* State quick-select pills */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {US_STATES.map(s => (
                        <button key={s.abbr} onClick={() => selectState(s.abbr)}
                          title={s.name}
                          className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                            popFilter === s.abbr
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                          }`}>
                          {s.abbr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Due Date Range with Quick Presets ──────────────── */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-500" /> Due Date Range
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DUE_DATE_PRESETS.map(p => (
                    <button key={p.label} onClick={() => applyDueDatePreset(p)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${activePreset === p.label ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                      {p.label}
                    </button>
                  ))}
                  {(dueDateFrom || dueDateTo) && (
                    <button onClick={clearDueDateRange}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">From</label>
                    <input type="date" value={dueDateFrom}
                      onChange={e => { setDueDateFrom(e.target.value); setActivePreset(''); setPagination(p => ({...p, page:1})); }}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">To</label>
                    <input type="date" value={dueDateTo}
                      onChange={e => { setDueDateTo(e.target.value); setActivePreset(''); setPagination(p => ({...p, page:1})); }}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>

              {/* ── Days Remaining Quick Filter ────────────────────── */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  <Clock className="w-3.5 h-3.5 text-orange-500" /> Days Left to Apply
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Due in 15 days', value: '15' },
                    { label: 'Due in 30 days', value: '30' },
                    { label: 'Due in 60 days', value: '60' },
                    { label: 'Due in 90 days', value: '90' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setDaysLeftFilter(prev => prev === opt.value ? '' : opt.value);
                        setPagination(p => ({ ...p, page: 1 }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        daysLeftFilter === opt.value
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Secondary Filters Grid ─────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                {/* Notice Type */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    <Tag className="w-3.5 h-3.5 text-blue-500" /> Notice Type
                  </label>
                  <select value={noticeTypeFilter} onChange={e => { setNoticeTypeFilter(e.target.value); setPagination(p => ({...p, page:1})); }}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500">
                    {NOTICE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Set-Aside Type */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-green-500" /> Set-Aside
                  </label>
                  <select value={setAsideFilter} onChange={e => { setSetAsideFilter(e.target.value); setPagination(p => ({...p, page:1})); }}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500">
                    {SET_ASIDE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Agency Search */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    <Building className="w-3.5 h-3.5 text-orange-500" /> Agency
                  </label>
                  <input type="text" placeholder="e.g. Defense, NASA, VA…" value={agencyFilter}
                    onChange={e => { setAgencyFilter(e.target.value); setPagination(p => ({...p, page:1})); }}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* ── Contract Value ────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Contract Value</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {VALUE_PRESETS.map(p => (
                    <button key={p.label} onClick={() => applyValuePreset(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        activeValuePreset === p.label
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Custom Min ($)</label>
                    <input type="number" placeholder="e.g. 50,000" value={minValue}
                      onChange={e => { setMinValue(e.target.value); setActiveValuePreset(''); setPagination(p => ({...p, page:1})); }}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Custom Max ($)</label>
                    <input type="number" placeholder="e.g. 5,000,000" value={maxValue}
                      onChange={e => { setMaxValue(e.target.value); setActiveValuePreset(''); setPagination(p => ({...p, page:1})); }}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>

              {/* ── PSC Code + Posted Date ────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-teal-500" /> PSC Code
                  </label>
                  <input type="text" placeholder="e.g. D307, IT Software…" value={pscFilter}
                    onChange={e => { setPscFilter(e.target.value); setPagination(p => ({...p, page:1})); }}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Posted From</label>
                  <input type="date" value={postedFrom}
                    onChange={e => { setPostedFrom(e.target.value); setPagination(p => ({...p, page:1})); }}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Posted To</label>
                  <input type="date" value={postedTo}
                    onChange={e => { setPostedTo(e.target.value); setPagination(p => ({...p, page:1})); }}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* ── Active Filter Tags ────────────────────────────── */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400 py-1">Active:</span>
                  {dueDateFrom && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                      Due from {dueDateFrom}
                      <button onClick={() => { setDueDateFrom(''); setActivePreset(''); }} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {dueDateTo && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                      Due until {dueDateTo}
                      <button onClick={() => { setDueDateTo(''); setActivePreset(''); }} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {naicsFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                      NAICS: {naicsFilter}
                      <button onClick={clearNaicsFilter} className="hover:text-purple-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {noticeTypeFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {noticeTypeFilter}
                      <button onClick={() => setNoticeTypeFilter('')} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {setAsideFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                      {SET_ASIDE_OPTIONS.find(o => o.value === setAsideFilter)?.label || setAsideFilter}
                      <button onClick={() => setSetAsideFilter('')} className="hover:text-green-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {agencyFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                      Agency: {agencyFilter}
                      <button onClick={() => setAgencyFilter('')} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {minValue && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                      Min ${Number(minValue).toLocaleString()}
                      <button onClick={() => setMinValue('')} className="hover:text-emerald-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {maxValue && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                      Max ${Number(maxValue).toLocaleString()}
                      <button onClick={() => setMaxValue('')} className="hover:text-emerald-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {(postedFrom || postedTo) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      Posted: {postedFrom || '…'} to {postedTo || '…'}
                      <button onClick={() => { setPostedFrom(''); setPostedTo(''); }} className="hover:text-gray-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {pscFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
                      PSC: {pscFilter}
                      <button onClick={() => setPscFilter('')} className="hover:text-teal-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {popFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      Location: {popFilter}
                      <button onClick={() => setPopFilter('')} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {keywordMode !== 'any' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      Mode: {keywordMode === 'all' ? 'All Words' : 'Exact Phrase'}
                      <button onClick={() => setKeywordMode('any')} className="hover:text-gray-900"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active filter chips — always visible when any filter is on */}
        {hasActiveFilters && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-400 mr-0.5">Filtering by:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                "{searchTerm}" {keywordMode !== 'any' && `(${keywordMode})`}
                <button onClick={() => { setSearchTerm(''); setKeywordMode('any'); setPagination(p=>({...p,page:1})); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {naicsFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <Hash className="w-3 h-3" />{naicsFilter}
                <button onClick={clearNaicsFilter}><X className="w-3 h-3" /></button>
              </span>
            )}
            {popFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                <Globe className="w-3 h-3" />{popFilter}
                <button onClick={() => { setPopFilter(''); setPagination(p=>({...p,page:1})); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {setAsideFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                {SET_ASIDE_OPTIONS.find(o => o.value === setAsideFilter)?.label || setAsideFilter}
                <button onClick={() => { setSetAsideFilter(''); setPagination(p=>({...p,page:1})); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {noticeTypeFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {noticeTypeFilter}
                <button onClick={() => { setNoticeTypeFilter(''); setPagination(p=>({...p,page:1})); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {agencyFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                Agency: {agencyFilter}
                <button onClick={() => { setAgencyFilter(''); setPagination(p=>({...p,page:1})); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {(activeValuePreset || minValue || maxValue) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                {activeValuePreset || `$${minValue ? Number(minValue).toLocaleString() : '0'} – $${maxValue ? Number(maxValue).toLocaleString() : '∞'}`}
                <button onClick={() => { setMinValue(''); setMaxValue(''); setActiveValuePreset(''); setPagination(p=>({...p,page:1})); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {(dueDateFrom || dueDateTo) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                <CalendarDays className="w-3 h-3" />{activePreset || `${dueDateFrom || '…'} → ${dueDateTo || '…'}`}
                <button onClick={clearDueDateRange}><X className="w-3 h-3" /></button>
              </span>
            )}
            {pscFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                PSC: {pscFilter}
                <button onClick={() => { setPscFilter(''); setPagination(p=>({...p,page:1})); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={resetFilters}
              className="ml-1 text-xs text-red-500 hover:text-red-700 font-medium underline underline-offset-2">
              Clear all
            </button>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {opportunities.length} of {pagination.total} opportunities</span>
          {hasActiveFilters && <span className="text-indigo-600 font-medium">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No opportunities available</p>
            {userProfile?.naicsCodes?.length === 0 && (
              <p className="text-gray-400 mb-4 text-sm">
                Please add NAICS codes to your profile to see matching opportunities
              </p>
            )}
            <p className="text-sm text-gray-400">
              {isAdmin
                ? 'Click "Fetch from SAM.gov" to pull fresh opportunities.'
                : 'Click "Refresh My Feed" above to populate your feed based on your current plan.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOpportunities.map((opp, index) => {
              const isActive = isActiveOpportunity(opp.dueDate);
              const deadlineBadge = getDeadlineBadge(opp);
              const borderColor = opp.isExpired ? 'border-l-red-500' : opp.deadlineStatus === 'closing_soon' ? 'border-l-amber-400' : isActive ? 'border-l-green-500' : 'border-l-gray-300';
              return (
                <div key={opp._id || opp.sourceId || index} className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-5 border-l-4 ${borderColor} ${opp.isExpired ? 'opacity-80' : ''}`}>
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">

                      {/* Title + badges */}
                      <div className="flex items-start gap-3 flex-wrap mb-1.5">
                        <Link to={`/opportunity/${opp._id}`} className="flex-1">
                          <h3 className="text-base font-semibold text-gray-900 hover:text-indigo-700 transition-colors">{opp.title}</h3>
                        </Link>
                        {opp.aiMatchScore !== undefined && (
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold shrink-0 ${getMatchColor(opp.aiMatchScore)}`}>
                            {opp.aiMatchScore}% Match
                          </span>
                        )}
                        {/* Deadline status badge (Problem 2) */}
                        {deadlineBadge ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded shrink-0 ${deadlineBadge.cls}`}>
                            <deadlineBadge.icon className="w-3 h-3" /> {deadlineBadge.label}
                          </span>
                        ) : isActive ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium shrink-0">✓ Open</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <History className="w-3 h-3" /> Past Award
                          </span>
                        )}
                      </div>
                      {/* Expired warning bar */}
                      {opp.isExpired && (
                        <div className="mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span><strong>Deadline has passed.</strong> This opportunity is shown for research purposes only. You cannot submit a response.</span>
                        </div>
                      )}
                      {opp.deadlineStatus === 'closing_soon' && (
                        <div className="mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                          <AlertOctagon className="w-4 h-4 shrink-0" />
                          <span><strong>Less than 24 hours left.</strong> Deadline is {opp.hoursUntilDue ? `in ~${Math.round(opp.hoursUntilDue)}h` : 'very soon'} — act immediately.</span>
                        </div>
                      )}

                      {/* Agency */}
                      <p className="text-sm text-gray-600 mb-2">{opp.agency}</p>

                      {/* Notice type badge */}
                      {opp.noticeType && (
                        <span className={`inline-block mb-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                          opp.noticeType === 'Award Notice' ? 'bg-green-100 text-green-700' :
                          opp.noticeType === 'Solicitation' || opp.noticeType === 'Combined Synopsis/Solicitation' ? 'bg-blue-100 text-blue-700' :
                          opp.noticeType === 'Presolicitation' ? 'bg-yellow-100 text-yellow-700' :
                          opp.noticeType === 'Sources Sought' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {opp.noticeType}
                        </span>
                      )}

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                        {opp.estimatedValue && (
                          <span className="text-green-700 font-semibold">${opp.estimatedValue.toLocaleString()}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className={opp.dueDate ? getDaysLeft(opp.dueDate) : ''}>
                            Due: {opp.dueDate ? new Date(opp.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </span>
                        </span>
                        <span className="text-gray-400">
                          Posted: {new Date(opp.postedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        {opp.naicsCode && opp.naicsCode !== '000000' && (
                          <span>NAICS: <span className="font-mono">{opp.naicsCode}</span></span>
                        )}
                        {opp.sourceId && !opp.sourceId.startsWith('sam_') && (
                          <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                            {opp.sourceId}
                          </span>
                        )}
                        {opp.award?.awardee?.name && (
                          <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                            Awarded: {opp.award.awardee.name}
                          </span>
                        )}
                      </div>

                      {/* Match reason chips */}
                      {opp.matchReasons && opp.matchReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {opp.matchReasons.slice(0, 2).map((reason, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{reason}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right-side actions */}
                    <div className="flex sm:flex-col gap-2 shrink-0 mt-2 sm:mt-0">
                      {opp.isExpired ? (
                        <button
                          onClick={() => setExpiredPopup(opp)}
                          className="flex items-center gap-1 px-3 py-2 bg-gray-400 text-white rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Expired
                        </button>
                      ) : (
                        <Link
                          to={`/opportunity/${opp._id}`}
                          className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap"
                        >
                          View Details <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      {(opp.sourceId || (opp.url && opp.url !== '#')) && (
                        <a
                          href={opp.url && opp.url !== '#' && opp.url.includes('sam.gov')
                            ? opp.url
                            : opp.sourceId
                              ? `https://sam.gov/search/?index=opp&q=${encodeURIComponent(opp.sourceId)}&is_active=true&sort=-relevance`
                              : `https://sam.gov/search/?index=opp&q=${encodeURIComponent(opp.title || '')}&is_active=true&sort=-relevance`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 px-3 py-2 bg-white border border-blue-300 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          SAM.gov
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination + Rows per page */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 sm:mt-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPagination(p => ({ ...p, page: 1 })); }}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {[10, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-gray-400 hidden sm:inline">
                Showing {Math.min((pagination.page - 1) * pageSize + 1, pagination.total)}–{Math.min(pagination.page * pageSize, pagination.total)} of {pagination.total}
              </span>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 sm:px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-3 sm:px-4 py-2 text-sm text-gray-600">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 sm:px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
        {/* ── Potential Matches (Problem 1: wrong NAICS by CO) ───────────────── */}
        {potentialMatches.length > 0 && (
          <div className="mt-8">
            <button onClick={() => setShowPotential(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-800 text-sm">
                  Potential Matches — {potentialMatches.length} opportunities in your industry sector
                </span>
                <span className="text-xs text-amber-600 hidden sm:inline">
                  (Contracting officers sometimes enter incorrect NAICS codes — these are in your same sector)
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-amber-600 transition-transform ${showPotential ? 'rotate-180' : ''}`} />
            </button>

            {showPotential && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-gray-500 px-1">
                  ⚠️ These opportunities have different NAICS codes but are in the same industry sector as your registered codes. They may be worth reviewing — a CO may have entered the wrong code.
                </p>
                {potentialMatches.map((opp, i) => (
                  <div key={opp._id || i} className="bg-white rounded-xl border border-amber-200 border-l-4 border-l-amber-400 shadow-sm p-5 hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap mb-1">
                          <Link to={`/opportunity/${opp._id}`} className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 hover:text-indigo-700 transition-colors">{opp.title}</h3>
                          </Link>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300 shrink-0">
                            ⚠️ Potential Match
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${getMatchColor(opp.aiMatchScore)}`}>
                            {opp.aiMatchScore}% Match
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{opp.agency}</p>
                        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mb-2">{opp.potentialMatchReason}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          {opp.estimatedValue && <span className="text-green-700 font-semibold">${opp.estimatedValue.toLocaleString()}</span>}
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {opp.dueDate ? new Date(opp.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                          <span>NAICS: <span className="font-mono">{opp.naicsCode}</span></span>
                          {opp.naicsDescription && <span className="text-gray-400">({opp.naicsDescription})</span>}
                          {opp.noticeType && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{opp.noticeType}</span>}
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <Link to={`/opportunity/${opp._id}`}
                          className="flex items-center gap-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap">
                          Review <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <a href={`https://sam.gov/search/?index=opp&q=${encodeURIComponent(opp.sourceId || opp.title || '')}&is_active=true`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-2 bg-white border border-blue-300 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap">
                          <ExternalLink className="w-3.5 h-3.5" /> SAM.gov
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Expired Opportunity Popup (Problem 2) ───────────────────────────── */}
        {expiredPopup && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setExpiredPopup(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Submission Deadline Passed</h3>
                  <p className="text-xs text-gray-500">This opportunity is no longer accepting responses</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{expiredPopup.title}</p>
                <p className="text-xs text-gray-500 mb-2">{expiredPopup.agency}</p>
                <div className="flex items-center gap-2 text-xs text-red-700 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Deadline: {expiredPopup.dueDate ? new Date(expiredPopup.dueDate).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'N/A'}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                The proposal submission window for this opportunity has closed. You can still view it for <strong>market research</strong> and <strong>past performance tracking</strong>, but no new bids can be submitted.
              </p>
              <div className="flex gap-3">
                <Link to={`/opportunity/${expiredPopup._id}`}
                  className="flex-1 text-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  onClick={() => setExpiredPopup(null)}>
                  View for Research
                </Link>
                <button onClick={() => setExpiredPopup(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}