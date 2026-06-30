// frontend/src/pages/Alerts.jsx - SIMPLIFIED VERSION
import { useState, useEffect } from 'react';
import { Bell, Zap, Clock, Eye, Target, TrendingUp } from 'lucide-react';
import { opportunityAPI } from '../services/api';
import HowItWorks from '../components/HowItWorks';
import { useUserPlan } from '../hooks/useUserPlan';
import PlanGate from '../components/PlanGate';
import Card from '../components/Card';

export default function Alerts() {
  const { plan: userPlan } = useUserPlan();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchMatches();
    // Refresh every 30 seconds for real-time feel
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await opportunityAPI.getAll({ limit: 100 });
      if (response.data.success) {
        // Only show high matches (50%+)
        const highMatches = response.data.data.filter(opp => opp.aiMatchScore >= 50);
        setMatches(highMatches);
        setUserProfile(response.data.userProfile);
        setLastFetched(new Date());
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-emerald-100 text-emerald-700';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  const getMatchEmoji = (score) => {
    if (score >= 80) return '🔥';
    if (score >= 60) return '⭐';
    if (score >= 40) return '👀';
    return '📌';
  };

  const totalPages = Math.ceil(matches.length / pageSize);
  if (!['starter', 'pro', 'enterprise'].includes(userPlan)) {
    return <PlanGate requiredPlan="starter"
      featureName="Smart Alerts"
      description="Get real-time contract match alerts filtered by your NAICS codes and scoring. Available on Starter, Pro, and Enterprise plans." />;
  }

  const paginatedMatches = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Header */}
        <div className="mb-5 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 shrink-0" />
            Your Matched Opportunities
            <HowItWorks
              title="Smart Alerts & Matching"
              steps={[
                { title: 'NAICS-based matching', description: 'System automatically matches SAM.gov opportunities to YOUR registered NAICS codes every hour' },
                { title: 'AI Match Score (0-100%)', description: 'Each opportunity is scored based on: NAICS code match, set-aside eligibility for your business type, contract value vs your past contract sizes, and agency alignment' },
                { title: 'Email alerts', description: 'Enterprise: real-time email on new matches. Pro: daily digest. Free/Starter: weekly summary. Configure frequency in Settings → Notifications' },
                { title: 'Push notifications', description: 'Enable browser push notifications for instant alerts when new high-match opportunities appear' },
              ]}
              dataUsed={['SAM.gov (hourly fetch)', 'Your NAICS Codes', 'Your Business Type', 'Your Past Performance']}
            >
              <p className="text-sm font-semibold text-gray-700 mt-2">How profile matching works:</p>
              <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                <li><strong>NAICS match</strong> — your registered codes are compared against each opportunity's NAICS</li>
                <li><strong>Set-aside fit</strong> — if it's 8(a), WOSB, HUBZone, SDVOSB — does your certification qualify?</li>
                <li><strong>Value range</strong> — is the contract value within your proven range based on past wins?</li>
                <li><strong>Agency history</strong> — have you or similar companies won from this agency before?</li>
                <li><strong>Competition level</strong> — how many competitors have won similar contracts recently?</li>
              </ul>
            </HowItWorks>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1">
            Automatically matched from SAM.gov based on your NAICS codes
          </p>
          
          {/* User Profile Info */}
          {userProfile && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Your NAICS Codes</p>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.naicsCodes?.map((code, i) => (
                      <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs sm:text-sm font-mono">
                        {code}
                      </span>
                    ))}
                    {(!userProfile.naicsCodes || userProfile.naicsCodes.length === 0) && (
                      <span className="text-gray-400 text-sm">No NAICS codes configured</span>
                    )}
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-500">Your Plan</p>
                  <p className="text-base sm:text-lg font-semibold capitalize text-indigo-600">{userProfile.plan}</p>
                  <p className="text-xs text-gray-400">
                    {userProfile.monthlyLimit === 'Unlimited'
                      ? 'Unlimited matches'
                      : `${userProfile.remainingThisMonth ?? userProfile.remainingMatches ?? 0} remaining this month`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Auto-Fetch Status */}
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700">
              🤖 Auto-matching active - Fetching from SAM.gov every hour
            </span>
          </div>
          {lastFetched && (
            <span className="text-xs text-green-600">
              Last checked: {lastFetched.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Matches List */}
        {matches.length === 0 ? (
          <Card className="text-center py-16">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No matching opportunities yet</h3>
            <p className="text-gray-500">
              The system is automatically checking SAM.gov for opportunities matching your NAICS codes.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              New opportunities will appear here as soon as they are found.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedMatches.map((match) => (
              <div
                key={match._id}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 border-l-indigo-500"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    {/* Match Score Badge */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getMatchColor(match.aiMatchScore)}`}>
                        <span>{getMatchEmoji(match.aiMatchScore)}</span>
                        {match.aiMatchScore}% Match
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        {match.source === 'sam' ? 'SAM.gov' : 'USAspending'}
                      </span>
                      {match.dueDate && new Date(match.dueDate) > new Date() && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Active Opportunity
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{match.title}</h3>
                    
                    {/* Agency */}
                    <p className="text-sm text-gray-600 mb-2">{match.agency}</p>
                    
                    {/* Details */}
                    <div className="flex flex-wrap gap-4 text-sm mb-3">
                      {match.estimatedValue && (
                        <span className="text-green-600 font-medium">
                          ${match.estimatedValue.toLocaleString()}
                        </span>
                      )}
                      {match.dueDate && (
                        <span className="flex items-center text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          Due: {new Date(match.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {match.naicsCode && match.naicsCode !== '000000' && (
                        <span className="text-gray-500 font-mono">NAICS: {match.naicsCode}</span>
                      )}
                    </div>

                    {/* Match Reasons */}
                    {match.matchReasons && match.matchReasons.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {match.matchReasons.slice(0, 3).map((reason, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex shrink-0">
                    <a
                      href={`/opportunity/${match._id}`}
                      className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">View Details</span>
                      <span className="sm:hidden">View</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination + Rows per page */}
        {matches.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 sm:mt-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {[10, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-gray-400 hidden sm:inline">
                Showing {Math.min((currentPage - 1) * pageSize + 1, matches.length)}–{Math.min(currentPage * pageSize, matches.length)} of {matches.length}
              </span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-3 sm:px-4 py-2 text-sm text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tip Section */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">How Auto-Matching Works</p>
              <p className="text-sm text-blue-700 mt-1">
                The system automatically fetches opportunities from SAM.gov based on <strong>your NAICS codes</strong>.
                Matches are calculated in real-time and appear here automatically.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                💡 To get more matches, add more NAICS codes to your profile in Settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}