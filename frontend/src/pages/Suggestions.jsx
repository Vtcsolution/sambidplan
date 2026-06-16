import { useState, useEffect } from 'react';
import { suggestionAPI } from '../services/api';
import { Lightbulb, Send, CheckCircle, Clock, Loader2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

const CATEGORIES = [
  { value: 'feature_request', label: 'Feature Request', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'improvement',     label: 'Improvement',     color: 'bg-blue-100 text-blue-700' },
  { value: 'bug_report',      label: 'Bug Report',      color: 'bg-red-100 text-red-700' },
  { value: 'general',         label: 'General Feedback',color: 'bg-gray-100 text-gray-700' },
];

const STATUS_CONFIG = {
  pending:      { label: 'Pending',      color: 'bg-yellow-100 text-yellow-700' },
  under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-700' },
  in_progress:  { label: 'In Progress',  color: 'bg-indigo-100 text-indigo-700' },
  implemented:  { label: 'Implemented',  color: 'bg-green-100 text-green-700' },
  declined:     { label: 'Declined',     color: 'bg-red-100 text-red-700' },
};

export default function Suggestions() {
  const [form, setForm] = useState({ title: '', category: 'feature_request', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchMy();
  }, []);

  const fetchMy = async () => {
    try {
      const r = await suggestionAPI.getMy({ limit: 50 });
      setSuggestions(r.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required.');
      return;
    }
    setSubmitting(true);
    try {
      const r = await suggestionAPI.create(form);
      setSuggestions(prev => [r.data.data, ...prev]);
      setForm({ title: '', category: 'feature_request', description: '' });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const catConfig = (val) => CATEGORIES.find(c => c.value === val) || CATEGORIES[3];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
              <Lightbulb className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suggestions & Feedback</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Help us improve Sambid — every idea matters</p>
            </div>
          </div>
        </div>

        {/* Submit Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            Submit a Suggestion
          </h2>

          {submitted && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-3 mb-4 text-sm font-medium">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Suggestion submitted! We'll review it shortly. Thank you!
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: c.value }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.category === c.value
                        ? 'border-indigo-500 bg-indigo-600 text-white'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300'
                    }`}
                  >{c.label}</button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={200}
                placeholder="Short, clear summary of your idea"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description <span className="text-red-500">*</span></label>
              <textarea
                rows={5}
                maxLength={5000}
                placeholder="Describe your idea, the problem it solves, or how it would improve your experience..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/5000</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Submitting…' : 'Submit Suggestion'}
            </button>
          </form>
        </div>

        {/* My Submissions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            My Submissions ({suggestions.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
          ) : suggestions.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No suggestions yet. Be the first to share an idea!</p>
          ) : (
            <div className="space-y-3">
              {suggestions.map(s => {
                const statusCfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
                const cat = catConfig(s.category);
                const isOpen = expanded === s._id;
                return (
                  <div key={s._id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : s._id)}
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-400">{s.suggestionNumber}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</p>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{s.description}</p>

                        {s.adminResponse?.note && (
                          <div className="mt-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Admin Response · {s.adminResponse.adminName}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-200">{s.adminResponse.note}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
