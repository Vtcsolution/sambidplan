import { useState, useEffect } from 'react';
import { TrendingUp, Search, DollarSign, Award, Calendar, Building2, History } from 'lucide-react';
import { opportunityAPI } from '../services/api';
import WinningBidsAnalysis from '../components/WinningBidsAnalysis';

export default function WinningBidsPage() {
  const [naicsCode, setNaicsCode] = useState('');
  const [selectedNaics, setSelectedNaics] = useState('');
  const [userNAICS, setUserNAICS] = useState([]);
  const [userBusiness, setUserBusiness] = useState('');

  useEffect(() => {
    // Get user's data from localStorage
    const storedNAICS = localStorage.getItem('userNAICS');
    const storedBusiness = localStorage.getItem('businessName');
    
    if (storedNAICS) {
      const parsed = JSON.parse(storedNAICS);
      setUserNAICS(parsed);
      if (parsed.length > 0 && !selectedNaics) {
        setSelectedNaics(parsed[0]);
      }
    }
    if (storedBusiness) {
      setUserBusiness(storedBusiness);
    }
  }, []);

  const handleAnalyze = () => {
    if (naicsCode.trim()) {
      setSelectedNaics(naicsCode.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-8 h-8 text-emerald-600" />
            Past Award Analysis (Winning Bids)
          </h1>
          <p className="text-gray-600 mt-2">
            Research already awarded contracts to understand pricing, winners, and market trends
          </p>
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              <strong>📊 Research Only:</strong> These are historical contracts that have already been awarded. 
              Use this data to price your bids competitively and identify potential agencies to target.
            </p>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Analyze Past Awards by NAICS Code</h2>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NAICS Code
              </label>
              <input
                type="text"
                value={naicsCode}
                onChange={(e) => setNaicsCode(e.target.value)}
                placeholder="Enter NAICS code (e.g., 541512)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAnalyze}
                disabled={!naicsCode.trim()}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Analyze
              </button>
            </div>
          </div>

          {/* Quick select from user's NAICS */}
          {userNAICS.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-2">Your NAICS codes:</p>
              <div className="flex flex-wrap gap-2">
                {userNAICS.map((code) => (
                  <button
                    key={code}
                    onClick={() => {
                      setNaicsCode(code);
                      setSelectedNaics(code);
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedNaics === code
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Analysis Results */}
        {selectedNaics && (
          <WinningBidsAnalysis naicsCode={selectedNaics} autoFetch={true} />
        )}

        {/* Explanation Section */}
        <div className="bg-blue-50 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to use this historical data</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>Pricing Strategy:</strong> Use average award values to price your bids competitively</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>Competitor Research:</strong> See which agencies and contractors are winning in your space</span>
            </li>
            <li className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>Market Timing:</strong> Understand when contracts are typically awarded</span>
            </li>
            <li className="flex items-start gap-2">
              <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>Agency Focus:</strong> Target agencies that frequently award contracts in your NAICS code</span>
            </li>
          </ul>
          <div className="mt-4 pt-3 border-t border-blue-200">
            <p className="text-xs text-blue-600">
              ⚠️ Note: These are historical contracts that have already been awarded. 
              Visit the <strong>Opportunities</strong> page for active bids you can apply to.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}