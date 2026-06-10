import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, CheckCircle } from 'lucide-react';

const STORAGE_KEY = 'sambid_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      // Small delay so page loads first
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = (type) => {
    localStorage.setItem(STORAGE_KEY, type);
    setSaved(true);
    setTimeout(() => setVisible(false), 800);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[9998] animate-fade-in-up"
    >
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-5">

        {saved ? (
          <div className="flex items-center gap-3 py-1">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-sm font-medium text-gray-700">Preferences saved.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                  <Cookie className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900">We use cookies</p>
              </div>
              <button
                onClick={() => accept('essential')}
                className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              We use essential cookies to keep you logged in and optional analytics cookies to improve the platform. Read our{' '}
              <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link> for details.
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => accept('all')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={() => accept('essential')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors"
              >
                Essential Only
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
