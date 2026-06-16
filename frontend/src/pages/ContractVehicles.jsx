import { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Bell, CheckCircle, Calendar, ExternalLink, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useUserPlan } from '../hooks/useUserPlan';
import PlanGate from '../components/PlanGate';

const COMMON_VEHICLES = [
  { name: 'GSA Multiple Award Schedule (MAS)', acronym: 'GSA MAS', agency: 'GSA' },
  { name: 'SEWP V', acronym: 'SEWP V', agency: 'NASA' },
  { name: 'CIO-SP3', acronym: 'CIO-SP3', agency: 'NIH' },
  { name: 'Alliant 2 SB', acronym: 'Alliant 2 SB', agency: 'GSA' },
  { name: '8(a) STARS III', acronym: 'STARS III', agency: 'GSA' },
  { name: 'VETS 2', acronym: 'VETS 2', agency: 'GSA' },
  { name: 'OASIS+', acronym: 'OASIS+', agency: 'GSA' },
  { name: 'DISA SITE III', acronym: 'SITE III', agency: 'DISA' },
  { name: 'Army ITES-3S', acronym: 'ITES-3S', agency: 'Army' },
  { name: 'NITAAC CIO-CS', acronym: 'CIO-CS', agency: 'NIH' },
];

export default function ContractVehicles() {
  const { plan: userPlan } = useUserPlan();
  const [vehicles,  setVehicles]  = useState([]);
  const [showAdd,   setShowAdd]   = useState(false);
  const [newV, setNewV] = useState({ name: '', acronym: '', agency: '', expiryDate: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load from localStorage for now (simple persistence without new DB model)
    const saved = JSON.parse(localStorage.getItem('contractVehicles') || '[]');
    setVehicles(saved);
  }, []);

  const save = (list) => {
    setVehicles(list);
    localStorage.setItem('contractVehicles', JSON.stringify(list));
  };

  const addVehicle = () => {
    if (!newV.name.trim()) return;
    save([...vehicles, { ...newV, id: Date.now(), addedAt: new Date().toISOString() }]);
    setNewV({ name: '', acronym: '', agency: '', expiryDate: '', notes: '' });
    setShowAdd(false);
  };

  const addCommon = (v) => {
    if (vehicles.find(x => x.name === v.name)) return;
    save([...vehicles, { ...v, id: Date.now(), expiryDate: '', notes: '', addedAt: new Date().toISOString() }]);
  };

  const remove = (id) => save(vehicles.filter(v => v.id !== id));

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
  };

  const expiryStatus = (days) => {
    if (days === null) return null;
    if (days < 0)   return { label: 'Expired', color: 'text-red-600 bg-red-50' };
    if (days <= 30) return { label: `${days}d left`, color: 'text-red-600 bg-red-50' };
    if (days <= 90) return { label: `${days}d left`, color: 'text-yellow-600 bg-yellow-50' };
    return { label: `${days}d left`, color: 'text-green-600 bg-green-50' };
  };

  if (!['starter', 'pro', 'enterprise'].includes(userPlan)) {
    return <PlanGate requiredPlan="starter"
      featureName="Contract Vehicles Tracker"
      description="Track your GSA schedules, GWAC vehicles, and IDIQ contracts with expiry alerts. Available on Starter, Pro, and Enterprise plans." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contract Vehicle Tracker</h1>
              <p className="text-gray-500 text-sm">Track your GWACs, IDIQs, and GSA schedules. Get expiry alerts.</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition">
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        </div>

        {/* Common Vehicles Quick Add */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">Quick Add — Common Contract Vehicles</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_VEHICLES.map(v => {
              const already = vehicles.find(x => x.name === v.name);
              return (
                <button key={v.name} onClick={() => addCommon(v)} disabled={!!already}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${already ? 'bg-green-50 text-green-700 border-green-200 cursor-default' : 'border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-600'}`}>
                  {already && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {v.acronym}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div className="bg-white rounded-2xl border border-orange-200 p-5 mb-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Add Custom Contract Vehicle</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Vehicle Name *</label>
                <input value={newV.name} onChange={e => setNewV(v => ({...v, name: e.target.value}))}
                  placeholder="e.g. GSA MAS IT 70" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Acronym</label>
                <input value={newV.acronym} onChange={e => setNewV(v => ({...v, acronym: e.target.value}))}
                  placeholder="e.g. GSA MAS" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Issuing Agency</label>
                <input value={newV.agency} onChange={e => setNewV(v => ({...v, agency: e.target.value}))}
                  placeholder="e.g. GSA, NASA, NIH" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Contract Expiry Date</label>
                <input type="date" value={newV.expiryDate} onChange={e => setNewV(v => ({...v, expiryDate: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <textarea value={newV.notes} onChange={e => setNewV(v => ({...v, notes: e.target.value}))} rows={2}
              placeholder="Contract number, ceiling value, special notes..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={addVehicle} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Save Vehicle</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            </div>
          </div>
        )}

        {/* Vehicle List */}
        {vehicles.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No contract vehicles added yet</p>
            <p className="text-sm">Add the GWACs and IDIQs your company is on to track expiry dates and get alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map(v => {
              const days = daysUntil(v.expiryDate);
              const status = expiryStatus(days);
              return (
                <div key={v.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4 hover:shadow-sm transition">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{v.name}</p>
                      {v.agency && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{v.agency}</span>}
                      {status && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                          {days < 0 ? <AlertTriangle className="w-3 h-3 inline mr-0.5" /> : <Calendar className="w-3 h-3 inline mr-0.5" />}
                          {status.label}
                        </span>
                      )}
                    </div>
                    {v.expiryDate && <p className="text-xs text-gray-400 mt-0.5">Expires: {new Date(v.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                    {v.notes && <p className="text-xs text-gray-500 mt-1">{v.notes}</p>}
                  </div>
                  <button onClick={() => remove(v.id)} className="text-gray-300 hover:text-red-400 transition shrink-0 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
