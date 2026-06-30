import { useState } from 'react';
import { Users, Search, Loader2, Lock, Mail, Building2, Award, Filter } from 'lucide-react';
import api from '../services/api';
import { useUserPlan } from '../hooks/useUserPlan';
import { usePlans } from '../hooks/usePlans';
import HowItWorks from '../components/HowItWorks';

const CERTS = ['8(a)', 'WOSB', 'HUBZone', 'SDVOSB', 'VOSB', 'SB', 'MBE'];

export default function TeamingFinder() {
  const { plan: userPlan, loading: planLoading } = useUserPlan();
  const { getMonthly, getYearly } = usePlans();
  const isEnterprise = userPlan === 'enterprise';

  const [naicsFilter,  setNaicsFilter]  = useState('');
  const [certFilters,  setCertFilters]  = useState([]);
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [searched,     setSearched]     = useState(false);
  const [requested,    setRequested]    = useState({});

  const toggleCert = (c) => setCertFilters(f => f.includes(c) ? f.filter(x => x !== c) : [...f, c]);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (naicsFilter) params.naics = naicsFilter;
      if (certFilters.length) params.certifications = certFilters.join(',');
      const res = await api.get('/auth/teaming-partners', { params });
      setResults(res.data.data || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = (userId) => {
    setRequested(r => ({ ...r, [userId]: true }));
  };

  if (planLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (!isEnterprise) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md text-center">
        <Lock className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Enterprise Feature</h2>
        <p className="text-gray-500 mb-5">
          Teaming Partner Finder is available on the Enterprise plan
          {getMonthly('enterprise') != null && getYearly('enterprise') != null
            ? ` ($${getMonthly('enterprise')}/mo or $${getYearly('enterprise')}/yr)` : ''}.
        </p>
        <a href="/contact" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition inline-block">Request Enterprise</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">Teaming Partner Finder
              <HowItWorks
                title="Teaming Partner Finder"
                steps={[
                  { title: 'Search by NAICS & certifications', description: 'Find businesses with complementary NAICS codes and certifications (8(a), WOSB, HUBZone, SDVOSB) to team with' },
                  { title: 'View partner profiles', description: 'See company name, NAICS codes, certifications, and contact info' },
                  { title: 'Request teaming', description: 'Connect with potential partners for joint ventures, mentor-protege, or prime/sub arrangements' },
                ]}
                dataUsed={['SAM.gov Entity Database', 'SamBid Company Profiles']}
              >
                <p className="text-sm font-semibold text-gray-700 mt-2">Why team up?</p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                  <li>Win contracts too large for your company alone</li>
                  <li>Fill capability gaps identified in <strong>Competitive Analysis</strong></li>
                  <li>Meet set-aside requirements you don't qualify for individually</li>
                  <li>The <strong>Go/No-Go</strong> tool suggests teaming when your score is low</li>
                </ul>
              </HowItWorks>
            </h1>
            <p className="text-gray-500 text-sm">Find complementary businesses to team with on federal contracts.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900 text-sm">Search Filters</span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">NAICS Code</label>
              <input value={naicsFilter} onChange={e => setNaicsFilter(e.target.value)}
                placeholder="e.g. 541512, 336411"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Certifications</label>
            <div className="flex flex-wrap gap-2">
              {CERTS.map(c => (
                <button key={c} onClick={() => toggleCert(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${certFilters.includes(c) ? 'bg-pink-600 text-white border-pink-600' : 'border-gray-200 text-gray-600 hover:border-pink-400'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-semibold hover:bg-pink-700 transition disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Searching...' : 'Find Partners'}
          </button>
        </div>

        {/* Results */}
        {searched && !loading && (
          results.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No partners found</p>
              <p className="text-sm">Try adjusting your NAICS code or certification filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map(partner => (
                <div key={partner._id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{partner.businessName || partner.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{partner.businessType?.replace('_', ' ') || 'Small Business'}</p>
                      </div>
                    </div>
                  </div>

                  {partner.naicsCodes?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">NAICS Codes</p>
                      <div className="flex flex-wrap gap-1">
                        {partner.naicsCodes.slice(0, 4).map(n => (
                          <span key={n} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{n}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {partner.certifications?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {partner.certifications.map(c => (
                        <span key={c} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{c}</span>
                      ))}
                    </div>
                  )}

                  {requested[partner._id] ? (
                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                      <Award className="w-3.5 h-3.5" /> Teaming request sent!
                    </div>
                  ) : (
                    <button onClick={() => handleRequest(partner._id)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition border border-pink-200">
                      <Mail className="w-3.5 h-3.5" /> Send Teaming Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
