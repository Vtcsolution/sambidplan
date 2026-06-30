import { useState } from 'react';
import { HelpCircle, X, ChevronRight, Database, Sparkles } from 'lucide-react';

export default function HowItWorks({ title, steps = [], dataUsed = [], children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
        title="How this works"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="hidden sm:inline">How it works</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-indigo-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <HelpCircle className="w-5 h-5" />
                <h2 className="font-bold text-lg">{title || 'How This Works'}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Steps */}
              {steps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Workflow</h3>
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                        {step.description && <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Data Sources */}
              {dataUsed.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-500" /> Data Used
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {dataUsed.map((d, i) => (
                      <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra content */}
              {children && <div className="text-sm text-gray-600">{children}</div>}

              {/* AI badge */}
              <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
                <Sparkles className="w-3.5 h-3.5" />
                AI-powered with real government data
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
