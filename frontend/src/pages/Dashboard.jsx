// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Save, 
  Bell, 
  FileText, 
  ChevronRight,
  Clock,
  Award,
  Target,
  Activity,
  TrendingUp
} from 'lucide-react';
import { opportunityAPI, authAPI } from '../services/api';

export default function Dashboard() {
  const [userStats, setUserStats] = useState({
    totalOpportunities: 0,
    savedOpportunities: 0,
    activeAlerts: 0,
    subscriptionPlan: 'Free',
    paymentStatus: 'Active'
  });
  const [recentOpportunities, setRecentOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState('free');

  // Get user from localStorage
  const userName = localStorage.getItem('userName') || 'Contractor';
  const userEmail = localStorage.getItem('userEmail') || 'contractor@example.com';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Get user profile for plan info
      const profileRes = await authAPI.getProfile();
      if (profileRes.data.success) {
        const user = profileRes.data.data;
        setUserPlan(user.plan);
        setUserStats(prev => ({
          ...prev,
          subscriptionPlan: user.plan === 'free' ? 'Free' : 
                           user.plan === 'starter' ? 'Starter' :
                           user.plan === 'pro' ? 'Pro' : 'Enterprise',
          paymentStatus: user.plan === 'free' ? 'Active' : 'Premium'
        }));
      }

      // Get opportunities
      const oppRes = await opportunityAPI.getAll({ limit: 5 });
      if (oppRes.data.success) {
        setRecentOpportunities(oppRes.data.data);
        setUserStats(prev => ({
          ...prev,
          totalOpportunities: oppRes.data.pagination?.total || oppRes.data.data.length
        }));
      }

      // TODO: Get saved count from saved API
      // TODO: Get alerts count from alerts API
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total Opportunities',
      value: userStats.totalOpportunities,
      change: '+12%',
      icon: FileText,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      title: 'Saved Opportunities',
      value: userStats.savedOpportunities,
      change: '+5%',
      icon: Save,
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      title: 'Active Alerts',
      value: userStats.activeAlerts,
      change: '+3',
      icon: Bell,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    },
    {
      title: 'Match Rate',
      value: '94%',
      change: '+8%',
      icon: Target,
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600'
    }
  ];

  const quickActions = [
    { title: 'Browse Opportunities', link: '/opportunities', icon: FileText, color: 'indigo' },
    { title: 'Manage Alerts', link: '/alerts', icon: Bell, color: 'green' },
    { title: 'View Settings', link: '/settings', icon: Activity, color: 'purple' },
    { title: 'Upgrade Plan', link: '/pricing', icon: Award, color: 'orange' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {userName.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your federal contract opportunities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <span className="text-sm text-green-600 font-semibold">{stat.change}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-gray-600 text-sm mt-1">{stat.title}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-4 text-center group"
              >
                <div className={`w-12 h-12 bg-${action.color}-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className={`w-6 h-6 text-${action.color}-600`} />
                </div>
                <div className="text-gray-700 font-medium">{action.title}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Opportunities */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Recent Opportunities</h2>
              <Link to="/opportunities" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentOpportunities.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No opportunities found. Click refresh to load contracts.
                </div>
              ) : (
                recentOpportunities.map((opp) => (
                  <Link
                    key={opp._id}
                    to={`/opportunity/${opp._id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{opp.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{opp.agency}</p>
                        <div className="flex items-center space-x-4 text-sm">
                          {opp.estimatedValue && (
                            <span className="text-green-600 font-medium">
                              ${opp.estimatedValue.toLocaleString()}
                            </span>
                          )}
                          <span className="flex items-center text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {opp.dueDate ? new Date(opp.dueDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                      {opp.aiMatchScore && (
                        <div className="ml-4">
                          <div className={`px-2 py-1 rounded-lg text-sm font-semibold ${
                            opp.aiMatchScore >= 70 ? 'bg-green-100 text-green-600' :
                            opp.aiMatchScore >= 40 ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {opp.aiMatchScore}% Match
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Activity & Tips */}
          <div className="space-y-8">
            {/* Subscription Status */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Status</h2>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-600">Current Plan</span>
                <span className="font-semibold text-gray-900">{userStats.subscriptionPlan}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Status</span>
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  {userStats.paymentStatus}
                </span>
              </div>
              {userPlan === 'free' && (
                <Link
                  to="/pricing"
                  className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Upgrade Plan
                </Link>
              )}
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-orange-500" />
                Upcoming Deadlines
              </h2>
              <div className="space-y-3">
                {recentOpportunities.slice(0, 3).map((opp) => (
                  <div key={opp._id} className="flex justify-between items-center py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{opp.title?.substring(0, 50)}...</p>
                      <p className="text-xs text-gray-500">{opp.agency}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-600">
                        {opp.dueDate ? new Date(opp.dueDate).toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">Deadline</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips Section */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
              <h2 className="text-xl font-semibold mb-3">Pro Tip 💡</h2>
              <p className="text-indigo-100 mb-4">
                Set up custom alerts for your specific NAICS codes to get instant notifications when relevant opportunities appear.
              </p>
              <Link
                to="/alerts"
                className="inline-flex items-center text-white font-medium hover:text-indigo-100"
              >
                Configure Alerts
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}