import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, Filter, RefreshCw, ChevronRight, AlertCircle, Target, Briefcase, History } from 'lucide-react';
import { opportunityAPI } from '../services/api';

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [userPlan, setUserPlan] = useState('free');
  const [userNAICS, setUserNAICS] = useState([]);
  const [userBusiness, setUserBusiness] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    fetchOpportunities();
    getUserData();
  }, [pagination.page]);

  const getUserData = () => {
    const plan = localStorage.getItem('userPlan') || 'free';
    const naics = localStorage.getItem('userNAICS') ? JSON.parse(localStorage.getItem('userNAICS')) : [];
    const business = localStorage.getItem('businessName') || '';
    setUserPlan(plan);
    setUserNAICS(naics);
    setUserBusiness(business);
  };

  const fetchOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await opportunityAPI.getAll({ 
        page: pagination.page, 
        limit: 20 
      });
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        setOpportunities(response.data.data || []);
        setUserProfile(response.data.userProfile);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          pages: response.data.pagination?.pages || 1
        }));
        
        if (response.data.userProfile?.naicsCodes) {
          setUserNAICS(response.data.userProfile.naicsCodes);
          localStorage.setItem('userNAICS', JSON.stringify(response.data.userProfile.naicsCodes));
        }
        
        // Update user plan from response
        if (response.data.userProfile?.plan) {
          setUserPlan(response.data.userProfile.plan);
          localStorage.setItem('userPlan', response.data.userProfile.plan);
        }
      } else {
        setError(response.data.message || 'Failed to load opportunities');
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setError(error.response?.data?.message || 'Failed to load opportunities. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const refreshResponse = await opportunityAPI.refresh();
      console.log('Refresh Response:', refreshResponse.data);
      
      if (refreshResponse.data.success) {
        await fetchOpportunities();
        setLastRefreshed(new Date());
      } else {
        setError(refreshResponse.data.message || 'Refresh failed');
      }
    } catch (error) {
      console.error('Error refreshing:', error);
      setError(error.response?.data?.message || 'Failed to refresh. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          opp.agency?.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'highMatch') {
      return matchesSearch && opp.aiMatchScore >= 70;
    }
    if (filter === 'urgent') {
      const daysLeft = opp.dueDate ? Math.ceil((new Date(opp.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
      return matchesSearch && daysLeft <= 14 && daysLeft > 0;
    }
    return matchesSearch;
  });

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
    return dueDate && new Date(dueDate) > new Date();
  };

  // Get remaining matches display
  const getRemainingMatchesText = () => {
    if (!userProfile) return '';
    const { dailyLimit, remainingMatches, plan } = userProfile;
    if (plan === 'pro' || plan === 'enterprise') return 'Unlimited matches';
    if (remainingMatches === 'Unlimited') return 'Unlimited matches';
    return `${remainingMatches || 0} matches remaining today`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-indigo-600" />
              Contract Opportunities
            </h1>
            <p className="text-gray-600 mt-1">
              Federal contract opportunities matched to your NAICS codes
            </p>
            {userBusiness && (
              <p className="text-sm text-gray-500 mt-1">
                Welcome back, {userBusiness}
              </p>
            )}
            {userNAICS.length > 0 && (
              <p className="text-sm text-indigo-600 mt-1">
                🎯 Your NAICS codes: {userNAICS.join(', ')}
              </p>
            )}
            {userProfile && (
              <p className="text-xs text-gray-500 mt-1">
                {getRemainingMatchesText()} • {userProfile.plan?.charAt(0).toUpperCase() + userProfile.plan?.slice(1)} Plan
                {userProfile.daysLeft > 0 && ` • ${userProfile.daysLeft} days left in trial`}
              </p>
            )}
            {lastRefreshed && (
              <p className="text-xs text-gray-400 mt-1">
                Last refreshed: {lastRefreshed.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Fetching...' : 'Refresh Data'}
          </button>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
          <Target className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <strong>Matching opportunities from USAspending.gov</strong> - Past awards and active contracts.
            <Link to="/winning-bids" className="ml-2 text-blue-800 underline">
              View detailed market analysis →
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
              <button 
                onClick={handleRefresh}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Try Again →
              </button>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or agency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('highMatch')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'highMatch' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                High Match (70%+)
              </button>
              <button
                onClick={() => setFilter('urgent')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'urgent' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Urgent (2 weeks)
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-500">
          Showing {filteredOpportunities.length} of {opportunities.length} opportunities
          {opportunities.length === 0 && !loading && (
            <span className="ml-2 text-indigo-600">
              <button onClick={handleRefresh} className="hover:underline">
                Click here to fetch opportunities
              </button>
            </span>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 mb-4">No opportunities found</p>
            {userNAICS.length === 0 && (
              <p className="text-gray-400 mb-4 text-sm">
                Please add NAICS codes to your profile to see matching opportunities
              </p>
            )}
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Fetch Opportunities
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOpportunities.map((opp, index) => {
              const isActive = isActiveOpportunity(opp.dueDate);
              return (
                <div key={opp._id || opp.sourceId || index} className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 ${isActive ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'}`}>
                  <Link to={`/opportunity/${opp._id}`} className="block">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{opp.title}</h3>
                          {opp.aiMatchScore !== undefined && (
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getMatchColor(opp.aiMatchScore)}`}>
                              {opp.aiMatchScore}% Match
                            </span>
                          )}
                          {isActive ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              ✓ Active - Apply Now
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">
                              <History className="w-3 h-3" />
                              Past Award - Research Only
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{opp.agency}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          {opp.estimatedValue && (
                            <span className="text-green-600 font-medium">
                              ${opp.estimatedValue.toLocaleString()}
                            </span>
                          )}
                          <span className="flex items-center text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            <span className={opp.dueDate ? getDaysLeft(opp.dueDate) : ''}>
                              {opp.dueDate ? new Date(opp.dueDate).toLocaleDateString() : 'Date N/A'}
                            </span>
                          </span>
                          {opp.naicsCode && opp.naicsCode !== '000000' && (
                            <span className="text-gray-500">NAICS: {opp.naicsCode}</span>
                          )}
                        </div>
                        {opp.matchReasons && opp.matchReasons.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {opp.matchReasons.slice(0, 2).map((reason, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-indigo-600">
                          <span className="text-sm font-medium">View Details</span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}