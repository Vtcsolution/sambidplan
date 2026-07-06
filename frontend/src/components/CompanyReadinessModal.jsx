import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, X, ArrowRight, Building2, Loader2 } from 'lucide-react';
import { companyAPI } from '../services/api';

export default function CompanyReadinessModal({ featureName, onProceed, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    companyAPI.aiReadiness()
      .then(res => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handleGoToProfile = (link) => {
    onClose();
    navigate(link);
  };

  // If everything is 100% complete, skip modal and proceed immediately
  useEffect(() => {
    if (data && data.score === 100) onProceed();
  }, [data]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3 shadow-2xl">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span className="text-gray-700 font-medium">Checking your profile...</span>
        </div>
      </div>
    );
  }

  // If API failed just proceed
  if (!data) { onProceed(); return null; }

  const missing = data.items.filter(i => !i.complete);
  const complete = data.items.filter(i => i.complete);

  const scoreColor =
    data.score >= 80 ? 'text-green-600' :
    data.score >= 50 ? 'text-amber-600' : 'text-red-600';

  const scoreBg =
    data.score >= 80 ? 'bg-green-50 border-green-200' :
    data.score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  const barColor =
    data.score >= 80 ? 'bg-green-500' :
    data.score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Profile Completeness Check</h2>
              <p className="text-sm text-gray-500">For best {featureName} results</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score */}
        <div className={`mx-6 mt-4 rounded-xl border p-4 ${scoreBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">AI Analysis Quality Score</span>
            <span className={`text-2xl font-bold ${scoreColor}`}>{data.score}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${barColor}`}
              style={{ width: `${data.score}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {data.score === 100
              ? 'Perfect! The AI has everything it needs for a highly accurate analysis.'
              : data.score >= 80
              ? 'Good profile — analysis will be accurate. A few items can make it even better.'
              : data.score >= 50
              ? 'Partial profile — the AI will make assumptions for missing items. Fill in more for better results.'
              : 'Basic profile only — the AI will give a generic analysis. Please complete your profile for real results.'}
          </p>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">

          {missing.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Missing ({missing.length})</p>
              {missing.map(item => (
                <button
                  key={item.key}
                  onClick={() => handleGoToProfile(item.link)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 transition-colors text-left group"
                >
                  <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-red-700">{item.label}</span>
                      {item.required && (
                        <span className="text-[10px] bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">Required</span>
                      )}
                    </div>
                    <p className="text-xs text-red-600 mt-0.5">{item.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-red-400 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </>
          )}

          {complete.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Complete ({complete.length})</p>
              {complete.map(item => (
                <div key={item.key} className="flex items-start gap-3 p-3 rounded-xl border border-green-100 bg-green-50">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold text-green-700">{item.label}</span>
                    <p className="text-xs text-green-600 mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-100 flex gap-3">
          {missing.length > 0 && (
            <button
              onClick={() => handleGoToProfile(missing[0].link)}
              className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Complete Profile
            </button>
          )}
          <button
            onClick={onProceed}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
              missing.length === 0
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {missing.length === 0 ? (
              <>Run Analysis <ArrowRight className="w-4 h-4" /></>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Analyze Anyway ({data.score}%)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
