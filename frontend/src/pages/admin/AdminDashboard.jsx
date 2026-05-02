// frontend/src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  CreditCard, 
  FileText,
  DollarSign,
  UserCheck,
  Calendar,
  RefreshCw,
  Eye
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import Card from '../../components/Card';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsResponse = await adminAPI.getStats();
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
        if (statsResponse.data.data.recentInvoices) {
          setRecentInvoices(statsResponse.data.data.recentInvoices);
        }
      }
      
      // Fetch recent plan requests
      const requestsResponse = await adminAPI.getPlanRequests({ status: 'all', limit: 5 });
      if (requestsResponse.data.success) {
        setRecentRequests(requestsResponse.data.data);
      }
      
      // Fetch recent activity
      const activityResponse = await adminAPI.getRecentActivity();
      if (activityResponse.data.success) {
        setActivityFeed(activityResponse.data.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total Users', 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      color: 'bg-blue-500',
      change: '+12%'
    },
    { 
      title: 'Pending Requests', 
      value: stats?.pendingRequests || 0, 
      icon: Clock, 
      color: 'bg-yellow-500',
      change: stats?.pendingRequests > 0 ? `${stats.pendingRequests} waiting` : 'All clear'
    },
    { 
      title: 'Pro Users', 
      value: stats?.proUsers || 0, 
      icon: TrendingUp, 
      color: 'bg-purple-500',
      change: `+${stats?.proUsers || 0} active`
    },
    { 
      title: 'Revenue (30 days)', 
      value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`, 
      icon: DollarSign, 
      color: 'bg-green-500',
      change: 'This month'
    },
  ];

  const getStatusBadge = (status) => {
    switch(status) {
      case 'paid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Expired</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Cancelled</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
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
   <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        
       
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.change}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Plan Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Free Users</span>
                <span className="font-medium">{stats?.freeUsers || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gray-500 h-2 rounded-full" 
                  style={{ width: `${((stats?.freeUsers || 0) / (stats?.totalUsers || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Starter Users</span>
                <span className="font-medium">{stats?.starterUsers || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${((stats?.starterUsers || 0) / (stats?.totalUsers || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Pro Users</span>
                <span className="font-medium">{stats?.proUsers || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${((stats?.proUsers || 0) / (stats?.totalUsers || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Enterprise Users</span>
                <span className="font-medium">{stats?.enterpriseUsers || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full" 
                  style={{ width: `${((stats?.enterpriseUsers || 0) / (stats?.totalUsers || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Plan Requests */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Plan Requests</h2>
            <Link to="/admin/plan-requests" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent requests</p>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div key={request._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{request.userName}</p>
                    <p className="text-sm text-gray-500">{request.userEmail}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      request.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      request.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {request.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1 capitalize">{request.requestedPlan}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
          <Link to="/admin/invoices" className="text-sm text-indigo-600 hover:underline">
            View all invoices
          </Link>
        </div>
        
        {recentInvoices.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No invoices yet</p>
            <p className="text-sm text-gray-400">Invoices will appear here when users upgrade plans</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentInvoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invoice.user?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{invoice.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm capitalize font-medium ${
                        invoice.plan === 'pro' ? 'text-purple-600' : 
                        invoice.plan === 'starter' ? 'text-blue-600' : 
                        'text-amber-600'
                      }`}>
                        {invoice.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">${invoice.amount}</td>
                    <td className="px-4 py-3">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/invoices/${invoice._id}`}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {activityFeed.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activityFeed.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'payment' ? 'bg-green-500' :
                  activity.type === 'user_signup' ? 'bg-blue-500' :
                  'bg-yellow-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.message}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(activity.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/admin/plan-requests?status=pending"
            className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-700">Pending</p>
              <p className="text-xs text-yellow-600">{stats?.pendingRequests || 0} requests</p>
            </div>
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-700">Manage Users</p>
              <p className="text-xs text-blue-600">View all users</p>
            </div>
          </Link>
          <Link
            to="/admin/invoices"
            className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <CreditCard className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">Invoices</p>
              <p className="text-xs text-green-600">View all</p>
            </div>
          </Link>
          <Link
            to="/admin/settings"
            className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <FileText className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium text-purple-700">Settings</p>
              <p className="text-xs text-purple-600">Configure platform</p>
            </div>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}