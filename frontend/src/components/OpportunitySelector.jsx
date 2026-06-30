import { useState, useEffect } from 'react';
import { Search, Building, Clock, CheckCircle, Loader2, DollarSign } from 'lucide-react';
import { opportunityAPI, savedAPI } from '../services/api';

export default function OpportunitySelector({ selected, onSelect, onClear }) {
  const [opportunities, setOpportunities] = useState([]);
  const [savedOpps, setSavedOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [source, setSource] = useState('saved');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [savedRes, feedRes] = await Promise.all([
        savedAPI.getAll().catch(() => ({ data: { data: [] } })),
        opportunityAPI.getAll({ limit: 50 }).catch(() => ({ data: { data: [] } })),
      ]);
      setSavedOpps((savedRes.data.data || []).filter(s => s.opportunity).map(s => ({
        ...s.opportunity,
        _savedStatus: s.status,
      })));
      setOpportunities(feedRes.data.data || []);
    } catch {}
    setLoading(false);
  };

  const list = source === 'saved' ? savedOpps : opportunities;
  const filtered = searchTerm.trim()
    ? list.filter(o => o.title?.toLowerCase().includes(searchTerm.toLowerCase()) || o.agency?.toLowerCase().includes(searchTerm.toLowerCase()) || o.sourceId?.toLowerCase().includes(searchTerm.toLowerCase()))
    : list;

  if (selected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{selected.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{selected.agency}</p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              {selected.sourceId && <span className="font-mono bg-white px-2 py-0.5 rounded border">{selected.sourceId}</span>}
              {selected.naicsCode && <span>NAICS: {selected.naicsCode}</span>}
              {selected.estimatedValue && <span className="text-green-700 font-semibold">${selected.estimatedValue.toLocaleString()}</span>}
              {selected.dueDate && <span className="text-orange-600">Due: {new Date(selected.dueDate).toLocaleDateString()}</span>}
              {selected.setAside && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{selected.setAside}</span>}
            </div>
          </div>
          <button onClick={onClear} className="text-xs text-red-500 hover:underline shrink-0 ml-2">Change</button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle className="w-3.5 h-3.5" /> Full opportunity data + your company profile will be used
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button onClick={() => setSource('saved')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${source === 'saved' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          My Saved ({savedOpps.length})
        </button>
        <button onClick={() => setSource('feed')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${source === 'feed' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          My Feed ({opportunities.length})
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          placeholder="Search by title, agency, solicitation #..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
        />
      </div>

      <div className="max-h-52 overflow-y-auto space-y-1.5 border rounded-xl p-2 bg-gray-50">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-xs py-6">{source === 'saved' ? 'No saved opportunities. Save some from Opportunities page.' : 'No opportunities in your feed.'}</p>
        ) : filtered.map(opp => (
          <button
            key={opp._id}
            onClick={() => onSelect(opp)}
            className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <p className="text-sm font-semibold text-gray-900 truncate">{opp.title}</p>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Building className="w-3 h-3" />{(opp.agency || '').substring(0, 30)}</span>
              {opp.estimatedValue && <span className="text-green-700 font-medium">${opp.estimatedValue.toLocaleString()}</span>}
              {opp.dueDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(opp.dueDate).toLocaleDateString()}</span>}
              {opp.naicsCode && <span className="font-mono">{opp.naicsCode}</span>}
              {opp._savedStatus && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded capitalize">{opp._savedStatus}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
