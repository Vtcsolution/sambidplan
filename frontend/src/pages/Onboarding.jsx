// frontend/src/pages/Onboarding.jsx
// 3-step wizard shown on first login:
//  Step 1 — Business info (name, type)
//  Step 2 — NAICS code selection (searchable)
//  Step 3 — Alert preferences (frequency, email opt-in)
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Search, Bell, Check, ChevronRight, ChevronLeft,
  X, Loader2, Sparkles, Briefcase
} from 'lucide-react';
import { authAPI, opportunityAPI } from '../services/api';
import { searchNAICS, NAICS_CODES } from '../data/naicsCodes';

const BUSINESS_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'llc',             label: 'LLC' },
  { value: 'corporation',     label: 'Corporation' },
  { value: 'nonprofit',       label: 'Nonprofit' },
  { value: 'other',           label: 'Other' },
];

const STEPS = [
  { id: 1, title: 'Your Business',     icon: Building2,  desc: 'Tell us about your company' },
  { id: 2, title: 'NAICS Codes',       icon: Briefcase,  desc: 'What industries do you work in?' },
  { id: 3, title: 'Alert Preferences', icon: Bell,       desc: 'How do you want to be notified?' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step,    setStep]    = useState(1);
  const [saving,  setSaving]  = useState(false);

  // Step 1
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('llc');

  // Step 2
  const [naicsQuery,   setNaicsQuery]   = useState('');
  const [naicsResults, setNaicsResults] = useState([]);
  const [selectedNAICS, setSelectedNAICS] = useState([]);
  const inputRef = useRef(null);

  // Step 3
  const [emailAlerts,    setEmailAlerts]    = useState(true);
  const [alertFrequency, setAlertFrequency] = useState('daily');

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authAPI.getProfile();
        if (res.data.success) {
          const u = res.data.data;
          if (u.businessName)     setBusinessName(u.businessName);
          if (u.businessType)     setBusinessType(u.businessType);
          if (u.naicsCodes?.length) setSelectedNAICS(u.naicsCodes);
          if (u.alertFrequency)   setAlertFrequency(u.alertFrequency);
          if (u.emailAlertsEnabled !== undefined) setEmailAlerts(u.emailAlertsEnabled);
          // If already onboarded, skip wizard
          if (u.onboardingCompleted) navigate('/dashboard');
        }
      } catch {}
    };
    loadProfile();
  }, []);

  // NAICS search
  useEffect(() => {
    if (naicsQuery.trim().length >= 2) {
      setNaicsResults(searchNAICS(naicsQuery));
    } else {
      setNaicsResults([]);
    }
  }, [naicsQuery]);

  const addNAICS = (code) => {
    if (!selectedNAICS.includes(code) && selectedNAICS.length < 5) {
      setSelectedNAICS(prev => [...prev, code]);
    }
    setNaicsQuery('');
    setNaicsResults([]);
    inputRef.current?.focus();
  };

  const removeNAICS = (code) => setSelectedNAICS(prev => prev.filter(c => c !== code));

  const canNext = () => {
    if (step === 1) return businessName.trim().length >= 2;
    if (step === 2) return selectedNAICS.length >= 1;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save business profile
      await opportunityAPI.updateProfile({
        companyName:  businessName,
        businessType: businessType,
        naicsCodes:   selectedNAICS,
      });
      // Save alert prefs
      await authAPI.updateProfile({
        emailAlertsEnabled: emailAlerts,
        alertFrequency:     alertFrequency,
        onboardingCompleted: true,
      });
      // Navigate to dashboard
      navigate('/dashboard?welcome=1');
    } catch (err) {
      console.error('Onboarding save error:', err.message);
      setSaving(false);
    }
  };

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-xl w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Let's set up your account
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Sambid Notify</h1>
          <p className="text-gray-500 mt-2">3 quick steps to start finding federal contracts</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.id  ? 'bg-indigo-600 text-white' :
                step === s.id ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                'bg-gray-200 text-gray-500'
              }`}>
                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
              </div>
              <div className="hidden sm:block flex-1">
                <p className={`text-xs font-medium ${step === s.id ? 'text-indigo-600' : 'text-gray-400'}`}>{s.title}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 bg-gray-200 hidden sm:block">
                  <div className={`h-full bg-indigo-600 transition-all`} style={{ width: step > s.id ? '100%' : '0%' }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* ── Step 1: Business Info ────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Your Business</h2>
                  <p className="text-sm text-gray-500">Tell us a bit about your company</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Solutions LLC"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business type</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {BUSINESS_TYPES.map(bt => (
                      <button
                        key={bt.value}
                        type="button"
                        onClick={() => setBusinessType(bt.value)}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                          businessType === bt.value
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {businessType === bt.value && <Check className="w-3 h-3 inline mr-1" />}
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: NAICS Codes ──────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">NAICS Industry Codes</h2>
                  <p className="text-sm text-gray-500">We'll match contracts to your industries (max 5)</p>
                </div>
              </div>

              {/* Selected chips */}
              {selectedNAICS.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-indigo-50 rounded-xl">
                  {selectedNAICS.map(code => {
                    const entry = NAICS_CODES.find(n => n.code === code);
                    return (
                      <span key={code} className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                        {code}
                        <span className="hidden sm:inline opacity-80 text-xs">
                          {entry?.label.split(' — ')[1]?.substring(0, 25)}
                        </span>
                        <button onClick={() => removeNAICS(code)} className="ml-1 hover:bg-indigo-500 rounded-full p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Search input */}
              {selectedNAICS.length < 5 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={naicsQuery}
                    onChange={e => setNaicsQuery(e.target.value)}
                    placeholder="Search by keyword or code (e.g. 'software' or '541512')"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  {/* Dropdown results */}
                  {naicsResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {naicsResults.map(n => (
                        <button
                          key={n.code}
                          type="button"
                          onClick={() => addNAICS(n.code)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors"
                        >
                          <span className="font-mono font-bold text-indigo-600 mr-2">{n.code}</span>
                          <span className="text-gray-700">{n.label.split(' — ')[1]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedNAICS.length === 0 && (
                <p className="text-sm text-gray-400 text-center mt-4">
                  Search above to add your industry codes. You need at least 1.
                </p>
              )}
              {selectedNAICS.length >= 5 && (
                <p className="text-xs text-amber-600 mt-2 text-center">Maximum 5 codes reached.</p>
              )}
            </div>
          )}

          {/* ── Step 3: Alert Preferences ────────────────────────────────── */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Alert Preferences</h2>
                  <p className="text-sm text-gray-500">Choose how you want to be notified about new contracts</p>
                </div>
              </div>

              {/* Email toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-5">
                <div>
                  <p className="font-medium text-gray-900 text-sm">Email notifications</p>
                  <p className="text-xs text-gray-500 mt-0.5">Get new matching contracts in your inbox</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailAlerts(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailAlerts ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Frequency */}
              {emailAlerts && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">How often?</p>
                  <div className="space-y-2">
                    {[
                      { value: 'realtime', label: 'Real-time',  desc: 'Instantly when a match is found (Pro/Enterprise)',  plan: 'pro' },
                      { value: 'daily',    label: 'Daily digest', desc: 'One email per day with all new matches',          plan: null },
                      { value: 'weekly',   label: 'Weekly digest', desc: 'One email per week — less noise',               plan: null },
                    ].map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          alertFrequency === opt.value
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="frequency"
                          value={opt.value}
                          checked={alertFrequency === opt.value}
                          onChange={() => setAlertFrequency(opt.value)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                            {opt.plan && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Pro+</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                ✅ You're all set! After finishing, we'll immediately search for contracts matching your NAICS codes.
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2"
            >
              Skip for now
            </button>
          )}

          {step < STEPS.length ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-semibold transition-colors"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</> : <><Check className="w-4 h-4" /> Finish & Find Contracts</>}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Step {step} of {STEPS.length} · You can change these settings anytime in Settings
        </p>
      </div>
    </div>
  );
}
