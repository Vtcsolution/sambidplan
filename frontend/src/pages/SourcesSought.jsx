import { useState } from 'react';
import {
  FileSearch, Loader2, Copy, Download, CheckCircle, Lock,
  RefreshCw, AlertCircle, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';
import { aiAPI } from '../services/api';
import { useUserPlan } from '../hooks/useUserPlan';
import { AICreditsBar } from '../components/AICreditsBar';
import jsPDF from 'jspdf';

const CONTRACT_TYPES = ['Services', 'Products', 'IT/Technology', 'Construction', 'Research', 'A&E', 'Other'];

const EMPTY = {
  title: '', agency: '', solicitationNumber: '', naicsCode: '',
  description: '', requirements: '', responseDeadline: '',
  contractType: 'Services', coreCompetencies: '', pastPerformance: '',
};

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

export default function SourcesSought() {
  const { plan: userPlan, loading: planLoading } = useUserPlan();
  const isPro = ['pro', 'enterprise'].includes(userPlan);

  const [form, setForm]       = useState({ ...EMPTY });
  const [section, setSection] = useState('opportunity'); // opportunity | company | advanced
  const [result,  setResult]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);
  const [showTips, setShowTips] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    if (!form.title.trim() || !form.agency.trim()) {
      setError('Opportunity title and agency are required.');
      return;
    }
    setLoading(true); setError(''); setResult('');
    try {
      const res = await aiAPI.sourcesSought(form);
      setResult(res.data.data.response);
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 18; const pageW = doc.internal.pageSize.getWidth(); const maxW = pageW - margin * 2;
    doc.setFillColor(126, 34, 206); doc.rect(0, 0, pageW, 20, 'F');
    doc.setFontSize(12); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('Sources Sought Response', margin, 13);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Sambid Notify — ${new Date().toLocaleDateString()}`, pageW - margin, 13, { align: 'right' });
    doc.setTextColor(30, 30, 30); doc.setFontSize(9);
    const lines = doc.splitTextToSize(result, maxW);
    let y = 28;
    lines.forEach(line => { if (y > 275) { doc.addPage(); y = 18; } doc.text(line, margin, y); y += 5; });
    doc.save(`sources-sought-${Date.now()}.pdf`);
  };

  if (planLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );

  if (!isPro) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md text-center">
        <Lock className="w-10 h-10 text-purple-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Pro Feature</h2>
        <p className="text-gray-500 mb-5">Sources Sought Generator is available on Pro and Enterprise plans.</p>
        <a href="/pricing" className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition inline-block">Upgrade Now</a>
      </div>
    </div>
  );

  const tabs = [
    { id: 'opportunity', label: 'Opportunity Info' },
    { id: 'company',     label: 'Your Capabilities' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <AICreditsBar feature="sources_sought" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <FileSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sources Sought Generator</h1>
            <p className="text-gray-500 text-sm">Respond to RFIs and Sources Sought notices before the full RFP drops — 60–90 day head start.</p>
          </div>
        </div>

        {/* What is Sources Sought tip */}
        <div className="mb-5 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
          <button onClick={() => setShowTips(s => !s)}
            className="flex items-center justify-between w-full text-sm font-medium text-purple-700">
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> What is a Sources Sought notice?</span>
            {showTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showTips && (
            <div className="mt-2 text-xs text-purple-700 space-y-1.5">
              <p>A <strong>Sources Sought</strong> or <strong>RFI (Request for Information)</strong> is a market research notice agencies post on SAM.gov <strong>before</strong> releasing a formal RFP. Responding lets you:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Get your company known to the contracting officer <strong>before competitors</strong></li>
                <li>Influence the acquisition strategy (set-aside type, NAICS code, scope)</li>
                <li>Demonstrate technical credibility before the RFP evaluation begins</li>
                <li>Build relationships 60–90 days ahead of proposal due date</li>
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setSection(t.id)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${section === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              {section === 'opportunity' && (
                <>
                  <div>
                    <label className={labelCls}>Opportunity / RFI Title *</label>
                    <input value={form.title} onChange={e => set('title', e.target.value)}
                      className={inputCls} placeholder="e.g. Sources Sought for Cybersecurity Services" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Agency *</label>
                      <input value={form.agency} onChange={e => set('agency', e.target.value)}
                        className={inputCls} placeholder="e.g. Dept of Veterans Affairs" />
                    </div>
                    <div>
                      <label className={labelCls}>Solicitation Number</label>
                      <input value={form.solicitationNumber} onChange={e => set('solicitationNumber', e.target.value)}
                        className={inputCls} placeholder="e.g. 36C10X24R0001" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>NAICS Code</label>
                      <input value={form.naicsCode} onChange={e => set('naicsCode', e.target.value)}
                        className={inputCls} placeholder="e.g. 541512" />
                    </div>
                    <div>
                      <label className={labelCls}>Contract Type</label>
                      <select value={form.contractType} onChange={e => set('contractType', e.target.value)} className={inputCls}>
                        {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Scope / Description</label>
                    <textarea value={form.description} onChange={e => set('description', e.target.value)}
                      rows={4} className={inputCls}
                      placeholder="Paste the description from the SAM.gov notice — the more detail the better..." />
                  </div>
                  <div>
                    <label className={labelCls}>Key Requirements <span className="font-normal text-gray-400">(bullet points or list)</span></label>
                    <textarea value={form.requirements} onChange={e => set('requirements', e.target.value)}
                      rows={3} className={inputCls}
                      placeholder="e.g. Must have TS/SCI clearance, FedRAMP experience, prior DoD work..." />
                  </div>
                  <div>
                    <label className={labelCls}>Response Deadline</label>
                    <input type="date" value={form.responseDeadline} onChange={e => set('responseDeadline', e.target.value)} className={inputCls} />
                  </div>
                </>
              )}

              {section === 'company' && (
                <>
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    Your business name, NAICS codes, and certifications are pulled from your profile automatically. Add specific talking points below.
                  </p>
                  <div>
                    <label className={labelCls}>Core Competencies to Highlight</label>
                    <textarea value={form.coreCompetencies} onChange={e => set('coreCompetencies', e.target.value)}
                      rows={4} className={inputCls}
                      placeholder="e.g. Zero Trust Architecture, cloud migration, CMMC compliance, DevSecOps pipelines, 15+ years DoD IT experience..." />
                  </div>
                  <div>
                    <label className={labelCls}>Relevant Past Performance</label>
                    <textarea value={form.pastPerformance} onChange={e => set('pastPerformance', e.target.value)}
                      rows={4} className={inputCls}
                      placeholder="e.g. Supported DISA for 3 years on cybersecurity monitoring ($2.4M), VA network modernization (prime, $8M), Army cloud migration (sub to Leidos)..." />
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <button onClick={handleGenerate} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-60">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Response…</>
                : <><FileSearch className="w-4 h-4" /> Generate Sources Sought Response</>}
            </button>

            {loading && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-sm text-purple-700">
                <p className="font-medium">AI is writing your response…</p>
                <p className="text-xs mt-0.5 text-purple-500">Crafting capability narrative, past performance, and agency questions. ~20 seconds.</p>
              </div>
            )}
          </div>

          {/* Result */}
          <div>
            {result ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-500" /> Response Ready
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={handleGenerate} title="Regenerate" className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                      {copied ? <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                    <button onClick={handlePDF} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 max-h-[640px] overflow-y-auto border border-gray-100">{result}</pre>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center min-h-[440px] text-center">
                <FileSearch className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">Response will appear here</p>
                <p className="text-gray-300 text-sm mt-1">Fill in the opportunity info and click Generate</p>
                <div className="mt-6 text-left bg-gray-50 rounded-xl p-4 max-w-xs w-full">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Your response will include:</p>
                  {[
                    'Company identification block',
                    'Executive summary',
                    'Capability narrative',
                    'Relevant past performance',
                    'Preliminary technical approach',
                    'Teaming strategy',
                    'Questions for the agency',
                    'Statement of interest',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
