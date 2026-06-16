// frontend/src/pages/admin/AdminOpportunities.jsx
import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Search,
  Clock,
  Building,
  CheckCircle,
  AlertCircle,
  Zap,
  Database,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { adminOpportunityAPI as opportunityAPI } from '../../services/adminApi';
import Button from '../../components/Button';

export default function AdminOpportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [pageSize, setPageSize] = useState(10);
  const [fetchResult, setFetchResult] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    historical: 0,
    lastFetched: null
  });

  useEffect(() => {
    fetchAllOpportunities();
    fetchStats();
  }, [pagination.page, pageSize]);

  const fetchAllOpportunities = async () => {
    setLoading(true);
    try {
      const response = await opportunityAPI.getAll({
        page: pagination.page,
        limit: pageSize
      });
      if (response.data.success) {
        setOpportunities(response.data.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          pages: response.data.pagination?.pages || 1
        }));
        
        if (response.data.stats) {
          setStats({
            total: response.data.stats.total || 0,
            active: response.data.stats.activeOpportunities || 0,
            historical: (response.data.stats.total || 0) - (response.data.stats.activeOpportunities || 0),
            lastFetched: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await opportunityAPI.getAll({ limit: 1 });
      if (response.data.success && response.data.stats) {
        setStats({
          total: response.data.stats.total || 0,
          active: response.data.stats.activeOpportunities || 0,
          historical: (response.data.stats.total || 0) - (response.data.stats.activeOpportunities || 0),
          lastFetched: new Date()
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleManualFetch = async () => {
    setFetching(true);
    setFetchResult(null);
    
    try {
      const response = await opportunityAPI.refresh();
      
      if (response.data.success) {
        setFetchResult({
          success: true,
          message: response.data.message,
          count: response.data.count,
          saved: response.data.totalSaved
        });
        
        setTimeout(() => {
          fetchAllOpportunities();
          fetchStats();
        }, 2000);
      } else {
        setFetchResult({
          success: false,
          message: response.data.message || 'Failed to fetch opportunities'
        });
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setFetchResult({
        success: false,
        message: error.response?.data?.message || 'Failed to connect to SAM.gov API'
      });
    } finally {
      setFetching(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllOpportunities();
    await fetchStats();
    setRefreshing(false);
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          opp.agency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          opp.naicsCode?.includes(searchTerm);
    
    if (filter === 'active') {
      return matchesSearch && opp.status === 'active';
    }
    if (filter === 'historical') {
      return matchesSearch && opp.status === 'historical';
    }
    if (filter === 'highMatch') {
      return matchesSearch && opp.aiMatchScore >= 70;
    }
    return matchesSearch;
  });

  const getMatchColor = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-700';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Historical</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Opportunities Management</h1>
          <p className="text-gray-600 mt-1 text-sm">Fetch and manage contract opportunities from SAM.gov</p>
        </div>
        <div className="flex gap-3 shrink-0 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh List
          </button>
          <Button
            variant="primary"
            onClick={handleManualFetch}
            disabled={fetching}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {fetching ? 'Fetching from SAM.gov...' : 'Fetch Opportunities'}
          </Button>
        </div>
      </div>

      {/* Fetch Result Alert */}
      {fetchResult && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          fetchResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {fetchResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className={`font-medium ${fetchResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {fetchResult.message}
            </p>
            {fetchResult.count && (
              <p className="text-sm text-green-700 mt-1">
                Total: {fetchResult.count} | Saved: {fetchResult.saved}
              </p>
            )}
          </div>
          <button
            onClick={() => setFetchResult(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Opportunities</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Database className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Opportunities</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Historical Awards</p>
              <p className="text-2xl font-bold text-gray-600">{stats.historical}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Last Fetch</p>
              <p className="text-sm font-medium text-gray-600">
                {stats.lastFetched ? stats.lastFetched.toLocaleTimeString() : 'Not yet'}
              </p>
            </div>
            <RefreshCw className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
        <Zap className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <strong>Auto-fetch active:</strong> SAM.gov opportunities fetch every 5 minutes based on user NAICS codes.
          Click "Fetch Opportunities" to trigger an immediate fetch.
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, agency, or NAICS code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'historical', 'highMatch'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status 
                    ? status === 'active' ? 'bg-green-500 text-white'
                      : status === 'historical' ? 'bg-gray-500 text-white'
                      : status === 'highMatch' ? 'bg-indigo-500 text-white'
                      : 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status === 'active' ? 'Active' : status === 'historical' ? 'Historical' : 'High Match'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No opportunities found in database</p>
          <button
            onClick={handleManualFetch}
            className="mt-4 text-indigo-600 hover:text-indigo-700"
          >
            Fetch opportunities from SAM.gov →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title / Agency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NAICS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOpportunities.map((opp) => (
                  <tr key={opp._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">{opp.title}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Building className="w-3 h-3" />
                          {opp.agency}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{opp.naicsCode}</code>
                    </td>
                    <td className="px-4 py-3">
                      {opp.estimatedValue ? (
                        <span className="text-sm font-medium text-green-600">
                          ${opp.estimatedValue.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {opp.dueDate ? new Date(opp.dueDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {opp.aiMatchScore ? (
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getMatchColor(opp.aiMatchScore)}`}>
                          {opp.aiMatchScore}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(opp.status)}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/opportunity/${opp._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination + Rows per page */}
      {pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
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
                className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                disabled={pagination.page === pagination.pages}
                className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}