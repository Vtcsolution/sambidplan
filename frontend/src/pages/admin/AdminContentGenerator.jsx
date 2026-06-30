import { useState } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import PermissionGuard from '../../components/admin/PermissionGuard';
import { Sparkles, Copy, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { adminAIAPI } from '../../services/adminApi';

const CONTENT_TYPES = [
  { value: 'email_subject',      label: 'Email Subject Lines',    desc: '5 compelling subject lines' },
  { value: 'email_body',         label: 'Email Body',             desc: 'Full marketing email' },
  { value: 'announcement',       label: 'Platform Announcement',  desc: 'Feature launch or update' },
  { value: 'push_notification',  label: 'Push Notifications',     desc: '5 push notification messages' },
  { value: 'blog_intro',         label: 'Blog Post Intro',        desc: '200-word SEO intro' },
];

export default function AdminContentGenerator() {
  const [type,    setType]    = useState('email_subject');
  const [context, setContext] = useState('');
  const [result,  setResult]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  const generate = async () => {
    if (!context.trim()) { setError('Please describe what you want to create.'); return; }
    setLoading(true); setError(''); setResult('');
    try {
      const res = await adminAIAPI.generateContent({ type, context });
      setResult(res.data.data.content);
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const CONTEXT_EXAMPLES = {
    email_subject:     'New AI features launched: capability statement generator, RFP analyzer, go/no-go workflow',
    email_body:        'Re-engage trial users who haven\'t logged in for 7 days. Remind them of matching contracts.',
    announcement:      'We\'ve just launched 6 new AI tools for federal contractors including RFP Analyzer and Market Research reports.',
    push_notification: 'Alert users that new contracts matched their NAICS codes today',
    blog_intro:        'How small businesses can win more federal contracts using AI-powered tools in 2024',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Content Generator<AdminHowItWorks page="contentGenerator" /></h1>
        <p className="text-gray-500 text-sm mt-1">Generate marketing copy, announcements, and notifications with AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          {/* Content Type */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Content Type</h3>
            <div className="space-y-2">
              {CONTENT_TYPES.map(t => (
                <label key={t.value} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${type === t.value ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                  <input type="radio" name="type" value={t.value} checked={type === t.value}
                    onChange={() => { setType(t.value); setContext(CONTEXT_EXAMPLES[t.value] || ''); }}
                    className="text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.label}</p>
                    <p className="text-xs text-gray-400">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Context */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              What do you want to create?
            </label>
            <textarea value={context} onChange={e => { setContext(e.target.value); setError(''); }} rows={5}
              placeholder={CONTEXT_EXAMPLES[type]}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          <button onClick={generate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-60">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Content</>}
          </button>
        </div>

        {/* Output */}
        <div>
          {result ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Generated Content</h3>
                <div className="flex gap-2">
                  <button onClick={generate} title="Regenerate" className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={copy} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    {copied ? <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-[500px] overflow-y-auto">
                {result}
              </pre>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center min-h-[300px] text-center">
              <Sparkles className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium">Generated content appears here</p>
              <p className="text-gray-300 text-sm mt-1">Select a type, describe your need, and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
