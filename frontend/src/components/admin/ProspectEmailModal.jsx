// frontend/src/components/admin/ProspectEmailModal.jsx
import { useState, useEffect } from 'react';
import {
  X, Mail, Send, Loader2, CheckCircle, AlertCircle,
  Sparkles, RefreshCw, History, ChevronLeft, Users, Clock,
} from 'lucide-react';
import { adminProspectAPI } from '../../services/adminApi';

// ── Email type toggles ────────────────────────────────────────────────────────
const EMAIL_TYPES = [
  { id: 'intro',      label: 'Platform Intro',   emoji: '👋' },
  { id: 'features',   label: 'Key Features',      emoji: '⚡' },
  { id: 'competitor', label: 'vs Competitors',     emoji: '🏆' },
  { id: 'campaign',   label: 'Win Campaign',       emoji: '🎯' },
  { id: 'cost',       label: 'Cost Saving',        emoji: '💰' },
  { id: 'time',       label: 'Time Saving',        emoji: '⏱️' },
  { id: 'trial',      label: 'Free Trial',         emoji: '🎁' },
  { id: 'pricing',    label: 'Pricing & Plans',    emoji: '📋' },
  { id: 'success',    label: 'Success Stories',    emoji: '✅' },
  { id: 'followup',   label: 'Follow Up',          emoji: '🔁' },
];

const fmt = d =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Props ─────────────────────────────────────────────────────────────────────
// selectedProspects: [{_id, companyName, primaryEmail, ...}]
// onClose, onSent
// ─────────────────────────────────────────────────────────────────────────────
export default function ProspectEmailModal({ selectedProspects = [], onClose, onSent }) {
  const [view, setView]               = useState('compose'); // 'compose' | 'history'
  const [activeType, setActiveType]   = useState(null);
  const [generating, setGenerating]   = useState(false);
  const [subject, setSubject]         = useState('');
  const [bodyText, setBodyText]       = useState('');
  const [aiSource, setAiSource]       = useState('');
  const [sending, setSending]         = useState(false);
  const [result, setResult]           = useState(null);
  const [genError, setGenError]       = useState('');

  // History
  const [history, setHistory]         = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const emailableProspects = selectedProspects.filter(p => p.primaryEmail);
  const emailCount = emailableProspects.length;

  // Auto-generate when a type is selected
  const handleTypeSelect = async (type) => {
    if (activeType === type.id) return; // already selected
    setActiveType(type.id);
    setGenError('');
    setResult(null);
    setGenerating(true);
    setSubject('');
    setBodyText('');
    try {
      // Use the first emailable prospect as context for generation
      const contextProspect = emailableProspects[0] || selectedProspects[0] || {};
      const { data } = await adminProspectAPI.generateEmail({
        templateType: type.id,
        prospectData: {
          companyName:       contextProspect.companyName,
          contactPersonName: contextProspect.contactPersonName,
          state:             contextProspect.state,
          city:              contextProspect.city,
          naicsCode:         contextProspect.naicsCode,
          naicsDescription:  contextProspect.naicsDescription,
          totalContractsWon: contextProspect.totalContractsWon,
          totalAwardAmount:  contextProspect.totalAwardAmount,
        },
      });
      if (data.success) {
        setSubject(data.data.subject);
        setBodyText(data.data.bodyText);
        setAiSource(data.data.source);
      }
    } catch (err) {
      setGenError(err.response?.data?.message || 'AI generation failed. Check API keys.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeType) return;
    await handleTypeSelect(EMAIL_TYPES.find(t => t.id === activeType));
  };

  const handleSend = async () => {
    if (!subject.trim() || !bodyText.trim() || !emailCount) return;
    setSending(true);
    setResult(null);
    try {
      const ids = emailableProspects.map(p => p._id);
      const { data } = await adminProspectAPI.sendProspectEmails({
        prospectIds: ids,
        subject:     subject.trim(),
        bodyText:    bodyText.trim(),
        templateType: activeType || 'custom',
      });
      setResult(data.data);
      if (onSent) onSent(data.data);
    } catch (err) {
      setResult({ sent: 0, failed: emailCount, noEmail: 0, errors: [{ error: err.response?.data?.message || err.message }] });
    } finally {
      setSending(false);
    }
  };

  const loadHistory = async () => {
    if (!selectedProspects[0]) return;
    setHistoryLoading(true);
    setView('history');
    try {
      const { data } = await adminProspectAPI.getEmailHistory(selectedProspects[0]._id);
      setHistory(data.data);
    } catch {
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5" />
            <div>
              <h2 className="font-bold text-base leading-tight">Email Outreach</h2>
              <p className="text-indigo-200 text-xs mt-0.5">
                {selectedProspects.length} selected · {emailCount} with email
                {emailCount < selectedProspects.length && (
                  <span className="ml-1 opacity-80">({selectedProspects.length - emailCount} skipped — no email)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === 'compose' && selectedProspects.length === 1 && (
              <button onClick={loadHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors">
                <History className="w-3.5 h-3.5" /> History
              </button>
            )}
            {view === 'history' && (
              <button onClick={() => setView('compose')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium">
                <ChevronLeft className="w-3.5 h-3.5" /> Compose
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── History view ── */}
        {view === 'history' && (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="font-semibold text-gray-800 mb-1">
              Email History — {selectedProspects[0]?.companyName}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{selectedProspects[0]?.primaryEmail}</p>
            {historyLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              </div>
            ) : !history?.emailHistory?.length ? (
              <div className="text-center py-12 text-gray-400">
                <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No emails sent to this company yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...history.emailHistory].reverse().map((e, i) => (
                  <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{e.subject}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            {e.templateName || e.templateId}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {fmt(e.sentAt)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{e.sentBy || 'Admin'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Compose view ── */}
        {view === 'compose' && (
          <div className="flex-1 overflow-y-auto flex flex-col">

            {/* Recipients strip */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To:</span>
                {emailableProspects.slice(0, 6).map(p => (
                  <span key={p._id} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-full">
                    <Users className="w-3 h-3" /> {p.companyName}
                  </span>
                ))}
                {emailCount > 6 && (
                  <span className="text-xs text-gray-400">+{emailCount - 6} more</span>
                )}
                {emailCount === 0 && (
                  <span className="text-xs text-red-500">None of the selected companies have email addresses</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Type toggles */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  1. Select Email Type — AI will generate it automatically
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {EMAIL_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => handleTypeSelect(type)}
                      disabled={generating}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-xs font-medium transition-all ${
                        activeType === type.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-gray-50'
                      } ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-base leading-none">{type.emoji}</span>
                      <span className="text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generating spinner */}
              {generating && (
                <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-700">AI is writing your email…</p>
                    <p className="text-xs text-indigo-500 mt-0.5">Gemini is generating a personalised email for {emailableProspects[0]?.companyName || 'the company'}</p>
                  </div>
                </div>
              )}

              {/* Gen error */}
              {genError && !generating && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {genError}
                </div>
              )}

              {/* Editable email */}
              {!generating && (subject || bodyText) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      2. Review & Edit Email
                      {aiSource && (
                        <span className="ml-2 text-indigo-500 normal-case font-normal">
                          <Sparkles className="w-3 h-3 inline -mt-0.5" /> Generated by {aiSource === 'gemini' ? 'Gemini' : 'GPT'}
                        </span>
                      )}
                    </p>
                    <button
                      onClick={handleRegenerate}
                      disabled={generating}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Subject</label>
                    <input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none text-gray-900 font-medium"
                      placeholder="Email subject…"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Body
                      <span className="ml-1 text-gray-400 font-normal">(editable — {emailCount > 1 ? '{{companyName}} personalises per recipient' : 'plain text'})</span>
                    </label>
                    <textarea
                      value={bodyText}
                      onChange={e => setBodyText(e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none text-gray-700 leading-relaxed resize-none font-mono"
                      placeholder="Email body…"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Tip: use <code className="bg-gray-100 px-1 rounded">{'{{companyName}}'}</code> anywhere to personalise per recipient.
                    </p>
                  </div>
                </div>
              )}

              {/* Empty state — no type selected */}
              {!generating && !subject && !bodyText && !genError && (
                <div className="text-center py-10 text-gray-400">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Select an email type above to generate content with AI</p>
                </div>
              )}

              {/* Send result */}
              {result && (
                <div className={`p-4 rounded-xl border ${result.sent > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {result.sent > 0
                      ? <CheckCircle className="w-5 h-5 text-green-600" />
                      : <AlertCircle className="w-5 h-5 text-red-600" />
                    }
                    <span className={`font-semibold text-sm ${result.sent > 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {result.sent > 0 ? `${result.sent} email${result.sent > 1 ? 's' : ''} sent successfully` : 'Send failed'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    {result.sent > 0    && <span className="text-green-700">✓ Sent: {result.sent}</span>}
                    {result.noEmail > 0 && <span className="text-amber-600">⚠ No email: {result.noEmail}</span>}
                    {result.failed > 0  && <span className="text-red-600">✗ Failed: {result.failed}</span>}
                  </div>
                  {result.errors?.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs text-red-600 mt-1">{e.name || ''}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-gray-200 px-5 py-4 bg-gray-50 shrink-0 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                {activeType
                  ? <span>Template: <strong className="text-gray-700">{EMAIL_TYPES.find(t => t.id === activeType)?.emoji} {EMAIL_TYPES.find(t => t.id === activeType)?.label}</strong></span>
                  : <span className="text-gray-400">No template selected</span>
                }
              </div>
              <div className="flex items-center gap-2">
                {result?.sent > 0 && (
                  <button onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg">
                    Done
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={!subject.trim() || !bodyText.trim() || !emailCount || sending || generating}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    : <><Send className="w-4 h-4" /> Send to {emailCount} {emailCount === 1 ? 'Company' : 'Companies'}</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
