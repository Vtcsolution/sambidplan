// frontend/src/pages/Opportunities.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Search, Filter, ChevronRight, AlertCircle, Briefcase, History, Database, Crown, CheckCircle, ExternalLink, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { opportunityAPI } from '../services/api';
import ExportButton from '../components/ExportButton';
import { exportOpportunitiesPDF, exportOpportunitiesCSV } from '../utils/exportUtils';

const SET_ASIDE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'SBA', label: 'Small Business (SBA)' },
  { value: 'WOSB', label: 'Women-Owned (WOSB)' },
  { value: '8A', label: '8(a)' },
  { value: 'HUBZone', label: 'HUBZone' },
  { value: 'SDVOSB', label: 'Service-Disabled Veteran' },
  { value: 'VOSB', label: 'Veteran-Owned' },
];

export default function Opportunities() {
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

  const location = useLocation();

  useEffect(() => {
    // Show plan-activated banner when redirected from payment success
    const params = new URLSearchParams(location.search);
    if (params.get('activated') === '1') {
      setActivatedBanner(true);
      setTimeout(() => setActivatedBanner(false), 8000);
      window.history.replaceState({}, '', '/opportunities');
    }
    fetchOpportunities();
  }, [pagination.page, pageSize, searchTerm, statusFilter, minValue, maxValue, setAsideFilter, sortBy]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMinValue('');
    setMaxValue('');
    setSetAsideFilter('');
    setSortBy('matchScore');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || minValue || maxValue || setAsideFilter || sortBy !== 'matchScore';

  const fetchOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pageSize,
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(minValue && { minValue }),
        ...(maxValue && { maxValue }),
        ...(setAsideFilter && { setAside: setAsideFilter }),
        ...(sortBy !== 'matchScore' && { sortBy }),
      };
      const response = await opportunityAPI.getAll(params);
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        setOpportunities(response.data.data || []);
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
    if (plan === 'trial') return `${remainingThisMonth ?? 0} of 15 trial matches remaining`;
    return `${remainingThisMonth ?? 0} matches remaining this month`;
  };

  const isAdmin = localStorage.getItem('userRole') === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

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
            <strong>Trial: 15 matches over 3 days • Free: 50/month • Starter: 500/month • Pro: 3,000/month • Enterprise: Unlimited</strong><br />
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
          {/* Row 1: search + advanced toggle */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, agency…"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Sort */}
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
              {/* Status tabs — admins see historical records too; regular users only see active */}
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
                <span className="hidden xs:inline sm:inline">Filters</span>
                {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Row 2: advanced filter panel */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Set-Aside Type</label>
                <select value={setAsideFilter} onChange={e => { setSetAsideFilter(e.target.value); setPagination(p => ({...p, page:1})); }}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500">
                  {SET_ASIDE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min Value ($)</label>
                <input type="number" placeholder="e.g. 50000" value={minValue}
                  onChange={e => { setMinValue(e.target.value); setPagination(p => ({...p, page:1})); }}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max Value ($)</label>
                <input type="number" placeholder="e.g. 5000000" value={maxValue}
                  onChange={e => { setMaxValue(e.target.value); setPagination(p => ({...p, page:1})); }}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex items-end">
                {hasActiveFilters && (
                  <button onClick={resetFilters}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-100 transition">
                    <X className="w-3.5 h-3.5" /> Clear All Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {opportunities.length} of {pagination.total} opportunities</span>
          {hasActiveFilters && <span className="text-indigo-600 font-medium">Filters active</span>}
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
              return (
                <div key={opp._id || opp.sourceId || index} className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-5 ${isActive ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'}`}>
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
                        {isActive ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium shrink-0">✓ Open</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <History className="w-3 h-3" /> Past Award
                          </span>
                        )}
                      </div>

                      {/* Agency */}
                      <p className="text-sm text-gray-600 mb-2">{opp.agency}</p>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                        {opp.estimatedValue && (
                          <span className="text-green-700 font-semibold">${opp.estimatedValue.toLocaleString()}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className={opp.dueDate ? getDaysLeft(opp.dueDate) : ''}>
                            Due: {opp.dueDate ? new Date(opp.dueDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </span>
                        {opp.naicsCode && opp.naicsCode !== '000000' && (
                          <span>NAICS: <span className="font-mono">{opp.naicsCode}</span></span>
                        )}
                        {/* Solicitation number — key for SAM.gov search */}
                        {opp.sourceId && !opp.sourceId.startsWith('sam_') && (
                          <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                            {opp.sourceId}
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
                      <Link
                        to={`/opportunity/${opp._id}`}
                        className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap"
                      >
                        View Details <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                      {(opp.sourceId || (opp.url && opp.url !== '#')) && (
                        <a
                          href={opp.sourceId
                            ? `https://sam.gov/opp/${opp.sourceId}/view`
                            : `https://sam.gov/search/?keywords=${encodeURIComponent(opp.title || '')}`}
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
      </div>
    </div>
  );
}