// frontend/src/pages/SavedOpportunities.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2, ExternalLink, BookmarkCheck, ChevronRight } from 'lucide-react';
import { savedAPI } from '../services/api';
import Card from '../components/Card';
import ExportButton from '../components/ExportButton';
import { exportSavedCSV, exportSavedPDF } from '../utils/exportUtils';

export default function SavedOpportunities() {
  const [savedOpportunities, setSavedOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchSaved();
  }, []);

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const response = await savedAPI.getAll();
      if (response.data.success) {
        setSavedOpportunities(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching saved:', error);
      setError('Failed to load saved opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (savedId, title) => {
    if (window.confirm(`Remove "${title?.substring(0, 50)}..." from saved?`)) {
      try {
        await savedAPI.unsave(savedId);
        setSavedOpportunities(prev => prev.filter(s => s._id !== savedId));
        alert('Opportunity removed');
      } catch (error) {
        alert('Failed to remove');
      }
    }
  };

  const handleUpdateStatus = async (savedId, status) => {
    try {
      await savedAPI.updateStatus(savedId, status);
      fetchSaved();
      alert(`Status updated to ${status}`);
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      saved: 'bg-gray-100 text-gray-600',
      applied: 'bg-blue-100 text-blue-600',
      won: 'bg-green-100 text-green-600',
      lost: 'bg-red-100 text-red-600'
    };
    return badges[status] || badges.saved;
  };

  const getStatusIcon = (status) => {
    const icons = {
      saved: '📌',
      applied: '📝',
      won: '🏆',
      lost: '❌'
    };
    return icons[status] || '📌';
  };

  const totalPages = Math.ceil(savedOpportunities.length / pageSize);
  const paginatedItems = savedOpportunities.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="mb-5 sm:mb-8 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Saved Opportunities</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1">
              {savedOpportunities.length} saved contract{savedOpportunities.length !== 1 ? 's' : ''}
            </p>
          </div>
          <ExportButton
            disabled={savedOpportunities.length === 0}
            onExportPDF={() => exportSavedPDF(savedOpportunities)}
            onExportCSV={() => exportSavedCSV(savedOpportunities)}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {savedOpportunities.length === 0 ? (
          <Card className="text-center py-12">
            <BookmarkCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No saved opportunities</h3>
            <p className="text-gray-500 mb-4">Start saving contracts you're interested in</p>
            <Link to="/opportunities" className="text-indigo-600 hover:text-indigo-700 inline-flex items-center">
              Browse Opportunities
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedItems.map((item) => (
              <Card key={item._id} className="hover:shadow-md transition-all">
                <div className="flex flex-col gap-3">
                  {/* Top row: title + status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start gap-2 mb-1">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug">
                          {item.opportunity?.title || 'Unknown Opportunity'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${getStatusBadge(item.status)}`}>
                          {getStatusIcon(item.status)} {item.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600">{item.opportunity?.agency || 'Unknown Agency'}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                    {item.opportunity?.estimatedValue && (
                      <span className="text-green-600 font-semibold">
                        ${item.opportunity.estimatedValue.toLocaleString()}
                      </span>
                    )}
                    <span className="flex items-center text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.opportunity?.dueDate ? new Date(item.opportunity.dueDate).toLocaleDateString() : 'N/A'}
                    </span>
                    {item.opportunity?.naicsCode && item.opportunity.naicsCode !== '000000' && (
                      <span className="text-gray-500">NAICS: {item.opportunity.naicsCode}</span>
                    )}
                    {item.opportunity?.aiMatchScore && (
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        item.opportunity.aiMatchScore >= 70 ? 'bg-green-100 text-green-700' :
                        item.opportunity.aiMatchScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.opportunity.aiMatchScore}% match
                      </span>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-xs sm:text-sm text-gray-500 italic">📝 {item.notes}</p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                    <select
                      value={item.status}
                      onChange={(e) => handleUpdateStatus(item._id, e.target.value)}
                      className="flex-1 min-w-0 px-2.5 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="saved">📌 Saved</option>
                      <option value="applied">📝 Applied</option>
                      <option value="won">🏆 Won</option>
                      <option value="lost">❌ Lost</option>
                    </select>
                    <Link
                      to={`/opportunity/${item.opportunity?._id}`}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Link>
                    <button
                      onClick={() => handleUnsave(item._id, item.opportunity?.title)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination + Rows per page */}
        {savedOpportunities.length > 0 && (
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
                Showing {Math.min((currentPage - 1) * pageSize + 1, savedOpportunities.length)}–{Math.min(currentPage * pageSize, savedOpportunities.length)} of {savedOpportunities.length}
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
      </div>
    </div>
  );
}