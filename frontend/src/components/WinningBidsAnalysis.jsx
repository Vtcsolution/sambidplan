import { useState, useEffect } from 'react';
import { TrendingUp, Award, DollarSign, Calendar, AlertCircle, Building2, CheckCircle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { opportunityAPI } from '../services/api';

export default function WinningBidsAnalysis({ naicsCode, autoFetch = true }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userNAICS, setUserNAICS] = useState([]);
  const [selectedNAICS, setSelectedNAICS] = useState(naicsCode || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Load user's NAICS codes from localStorage
  useEffect(() => {
    const storedNAICS = localStorage.getItem('userNAICS');
    if (storedNAICS) {
      const parsed = JSON.parse(storedNAICS);
      setUserNAICS(parsed);
      if (!naicsCode && parsed.length > 0 && !selectedNAICS) {
        setSelectedNAICS(parsed[0]);
      }
    }
  }, []);

  // Fetch analysis when selectedNAICS or page changes
  useEffect(() => {
    if (autoFetch && selectedNAICS && selectedNAICS.trim()) {
      fetchAnalysis();
    }
  }, [selectedNAICS, currentPage, autoFetch]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await opportunityAPI.getWinningBidsAnalysis(selectedNAICS, currentPage, itemsPerPage);
      if (response.data.success) {
        setAnalysis(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
      setError(error.response?.data?.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleNAICSClick = (code) => {
    setSelectedNAICS(code);
    setCurrentPage(1); // Reset to first page when changing NAICS
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || analysis?.error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">No Data Available</h3>
        </div>
        <p className="text-yellow-700">{analysis?.errorMessage || error || 'No federal spending data found for this NAICS code.'}</p>
        {userNAICS.length > 0 && (
          <div className="mt-3">
            <p className="text-yellow-600 text-sm">Try one of your NAICS codes:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {userNAICS.map(code => (
                <button
                  key={code}
                  onClick={() => handleNAICSClick(code)}
                  className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm hover:bg-yellow-200"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!analysis || analysis.totalAwards === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <p className="text-gray-500">No past award data available for NAICS {selectedNAICS}</p>
        <p className="text-gray-400 text-sm mt-2">Try selecting a different NAICS code</p>
        {userNAICS.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {userNAICS.map(code => (
              <button
                key={code}
                onClick={() => handleNAICSClick(code)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300"
              >
                {code}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Past Award Analysis for NAICS {analysis.naicsCode}
          </h3>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-gray-400" />
            Data from USAspending.gov - Already awarded contracts (for research only)
          </p>
        </div>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
          {analysis.dataSource}
        </span>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Award className="w-4 h-4" />
            <span className="text-sm">Total Past Awards</span>
          </div>
          <p className="text-2xl font-bold">{analysis.totalAwards.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-1">Historical contract count</p>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Average Award Value</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analysis.averageAwardValue)}</p>
          <p className="text-xs text-blue-600 mt-1">Use for pricing your bids</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Total Contract Value</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analysis.totalContractValue)}</p>
          <p className="text-xs text-purple-600 mt-1">Market size in this NAICS</p>
        </div>
      </div>
      
      {/* Top Agencies */}
      {analysis.topWinningAgencies && analysis.topWinningAgencies.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            Top Agencies Awarding Contracts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {analysis.topWinningAgencies.map((agency, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                <span>{agency.name}</span>
                <span className="bg-gray-200 px-2 py-1 rounded">{agency.count} contracts</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* All Awards List with Pagination */}
      {analysis.awards && analysis.awards.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">All Past Awards ({analysis.pagination.total} total)</h4>
            <span className="text-xs text-gray-400">Showing {analysis.awards.length} of {analysis.pagination.total}</span>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {analysis.awards.map((award, idx) => (
              <div key={award.id || idx} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{award.title?.substring(0, 100)}...</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {award.agency}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(award.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-green-600">{formatCurrency(award.value)}</span>
                    {award.url && (
                      <a
                        href={award.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-gray-400 hover:text-indigo-600"
                      >
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination Controls */}
          {analysis.pagination && analysis.pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4 pt-3 border-t">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {analysis.pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === analysis.pagination.pages}
                className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-3 pt-2 border-t">
            * These contracts have already been awarded. Use for market research only.
          </p>
        </div>
      )}
      
      {/* User NAICS Quick Select */}
      {userNAICS.length > 1 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Quick select from your NAICS codes:</p>
          <div className="flex flex-wrap gap-2">
            {userNAICS.map(code => (
              <button
                key={code}
                onClick={() => handleNAICSClick(code)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  selectedNAICS === code
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-3 text-xs text-gray-400 border-t">
        Last updated: {new Date(analysis.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}