import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Search, DollarSign, Award, Calendar, Building2, History, Plus, X, Loader2 } from 'lucide-react';
import { opportunityAPI } from '../services/api';
import WinningBidsAnalysis from '../components/WinningBidsAnalysis';
import HowItWorks from '../components/HowItWorks';

export default function WinningBidsPage() {
  const [userNAICS, setUserNAICS] = useState([]);        // NAICS from user profile
  const [extraNAICS, setExtraNAICS] = useState([]);      // manually added codes (session only)
  const [selectedNAICS, setSelectedNAICS] = useState(''); // currently analysed code
  const [customInput, setCustomInput] = useState('');     // text in the custom input
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const inputRef = useRef(null);

  // All NAICS codes available as tabs (profile + extra)
  const allNAICS = [...new Set([...userNAICS, ...extraNAICS])];

  // Load user profile → get NAICS codes → auto-select first
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await opportunityAPI.getProfile();
        if (res.data.success) {
          const codes = res.data.user?.naicsCodes || [];
          setUserNAICS(codes);
          if (codes.length > 0) {
            setSelectedNAICS(codes[0]); // auto-select first → triggers auto-fetch in WinningBidsAnalysis
          }
        }
      } catch {
        setProfileError('Could not load profile. Enter a NAICS code manually below.');
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleTabClick = (code) => {
    setSelectedNAICS(code);
  };

  const handleCustomAnalyze = () => {
    const code = customInput.trim();
    if (!/^\d{6}$/.test(code)) {
      inputRef.current?.focus();
      return;
    }
    // Add to extra codes if not already there
    if (!allNAICS.includes(code)) {
      setExtraNAICS(prev => [...prev, code]);
    }
    setSelectedNAICS(code);
    setCustomInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCustomAnalyze();
  };

  const removeExtraCode = (code) => {
    setExtraNAICS(prev => prev.filter(c => c !== code));
    if (selectedNAICS === code) {
      setSelectedNAICS(allNAICS.find(c => c !== code) || '');
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Header */}
        <div className="mb-5 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
            <History className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 shrink-0" />
            Past Award Analysis
            <HowItWorks title="Winning Bids Analysis" steps={[
              { title: 'Enter any NAICS code', description: 'Search by your NAICS codes (auto-loaded) or add custom codes to research any market' },
              { title: 'See real USASpending awards', description: 'Who won contracts in this NAICS in the last 3-5 years — real company names, real dollar amounts, real agencies' },
              { title: 'Benchmark your pricing', description: 'See average award values, top agencies, contract types — know exactly what the market pays' },
              { title: 'Identify competitors', description: 'The same companies that appear here are the ones you compete against in Bid Analysis and Competitive Analysis' },
            ]} dataUsed={['USASpending.gov (3-5 years)', 'Your NAICS Codes']} >
              <p className="text-sm font-semibold text-gray-700 mt-2">Connected to:</p>
              <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                <li><strong>AI Bid Analysis</strong> → same USASpending data feeds the bid recommendation</li>
                <li><strong>AI Competitive Analysis</strong> → competitors named here appear in your analysis</li>
                <li><strong>AI Proposals</strong> → pricing strategy references these real award amounts</li>
                <li><strong>Go/No-Go</strong> → pricing intelligence from this data informs the scoring</li>
              </ul>
            </HowItWorks>
          </h1>
          <p className="text-gray-500 mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Research already-awarded federal contracts to benchmark pricing and identify target agencies.
          </p>
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <strong>📊 Research only —</strong> these contracts are already awarded. For open bids you can apply to, visit the <strong>Opportunities</strong> page.
          </div>
        </div>

        {/* NAICS selector panel */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">

          {/* Your NAICS codes row */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500 mb-2">Your NAICS codes</p>

            {profileLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading your profile…
              </div>
            ) : profileError ? (
              <p className="text-sm text-red-500">{profileError}</p>
            ) : userNAICS.length === 0 ? (
              <p className="text-sm text-gray-400">No NAICS codes on your profile. Add one below.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userNAICS.map(code => (
                  <button
                    key={code}
                    onClick={() => handleTabClick(code)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedNAICS === code
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manually added codes */}
          {extraNAICS.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500 mb-2">Other codes you've searched</p>
              <div className="flex flex-wrap gap-2">
                {extraNAICS.map(code => (
                  <span
                    key={code}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                      selectedNAICS === code
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}
                    onClick={() => handleTabClick(code)}
                  >
                    {code}
                    <X
                      className="w-3 h-3 ml-0.5 opacity-70 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); removeExtraCode(code); }}
                    />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Custom NAICS input */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-500 mb-2">Analyse any NAICS code</p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 541512"
                maxLength={6}
                className="flex-1 sm:w-48 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                onClick={handleCustomAnalyze}
                disabled={!/^\d{6}$/.test(customInput.trim())}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                Analyse
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Must be exactly 6 digits</p>
          </div>
        </div>

        {/* Analysis results — auto-fetched whenever selectedNAICS changes */}
        {selectedNAICS ? (
          <WinningBidsAnalysis key={selectedNAICS} naicsCode={selectedNAICS} autoFetch={true} />
        ) : !profileLoading && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Select or enter a NAICS code above to load analysis</p>
          </div>
        )}

        {/* How-to guide */}
        <div className="bg-blue-50 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-3">How to use this data</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>Pricing:</strong> Use average award values to price your bids competitively</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>Competition:</strong> See which agencies award the most in your space</span>
            </li>
            <li className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>Timing:</strong> Understand seasonal contract award patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>Agency targeting:</strong> Focus on agencies that frequently award in your NAICS</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
