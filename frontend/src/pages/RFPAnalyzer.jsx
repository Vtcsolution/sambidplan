import { useState, useRef } from 'react';
import { ScanSearch, Upload, FileText, Loader2, Copy, Download, CheckCircle, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { aiAPI } from '../services/api';
import AIResponseRenderer from '../components/AIResponseRenderer';
import { useUserPlan } from '../hooks/useUserPlan';
import { AICreditsBar } from '../components/AICreditsBar';
import HowItWorks from '../components/HowItWorks';
import OpportunitySelector from '../components/OpportunitySelector';
import jsPDF from 'jspdf';

export default function RFPAnalyzer() {
  const { plan: userPlan, loading: planLoading } = useUserPlan();
  const isPro = ['pro', 'enterprise'].includes(userPlan);

  const [mode,     setMode]    = useState('paste'); // 'paste' | 'upload'
  const [rfpText,  setRfpText] = useState('');
  const [fileObj,  setFileObj] = useState(null);   // File object for PDFs
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [result,   setResult]  = useState('');
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [copied,   setCopied]  = useState(false);
  const fileRef   = useRef(null);
  const resultRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (isPdf) {
      // Store the raw File object — backend will parse the PDF
      setFileObj(file);
      setRfpText('');
    } else {
      // Plain text files — read on the client side
      setFileObj(null);
      const reader = new FileReader();
      reader.onload = (e) => setRfpText(e.target.result);
      reader.readAsText(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!fileObj && (!rfpText.trim() || rfpText.trim().length < 100)) {
      setError('Please paste RFP text or upload a file (minimum 100 characters).');
      return;
    }
    setLoading(true);
    setError('');
    setResult('');
    try {
      let payload;
      if (fileObj) {
        payload = new FormData();
        payload.append('rfp', fileObj);
      } else {
        payload = { rfpText };
      }
      const res = await aiAPI.analyzeRFP(payload);
      setResult(res.data.data.analysis);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
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
    doc.setFillColor(79, 70, 229); doc.rect(0, 0, pageW, 20, 'F');
    doc.setFontSize(12); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('RFP Analysis Report', margin, 13);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Sambid Notify — ${new Date().toLocaleDateString()}`, pageW - margin, 13, { align: 'right' });
    doc.setTextColor(30, 30, 30); doc.setFontSize(9);
    const lines = doc.splitTextToSize(result, maxW);
    let y = 28;
    lines.forEach(line => { if (y > 275) { doc.addPage(); y = 18; } doc.text(line, margin, y); y += 5; });
    doc.save(`rfp-analysis-${Date.now()}.pdf`);
  };

  if (planLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (!isPro) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md text-center">
        <Lock className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Pro Feature</h2>
        <p className="text-gray-500 mb-5">RFP Analyzer is available on Pro and Enterprise plans.</p>
        <a href="/pricing" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition inline-block">Upgrade Now</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <AICreditsBar feature="rfp_analyzer" />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <ScanSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">AI RFP Analyzer</h1>
              <HowItWorks
                title="RFP Analyzer"
                steps={[
                  { title: 'Select opportunity, paste text, or upload PDF', description: 'Choose from your saved opportunities to auto-load the SOW, or paste/upload RFP text manually' },
                  { title: 'AI parses the full document', description: 'Extracts requirements, evaluation criteria, deadlines, compliance items, and red flags' },
                  { title: 'Get compliance checklist', description: '15-20 specific items your proposal must address, plus a GO/NO-GO recommendation' },
                  { title: 'Export or copy', description: 'Download as PDF or copy to clipboard for your proposal team' },
                ]}
                dataUsed={['RFP/SOW Text', 'Your NAICS Codes', 'Your Company Profile']}
              >
                <p className="text-sm font-semibold text-gray-700 mt-2">Connected to:</p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                  <li><strong>Saved Opportunities</strong> → select a saved opportunity to auto-load its SOW text</li>
                  <li><strong>Opportunity Detail</strong> → "Analyze with AI" on attachments sends the document here</li>
                  <li><strong>Proposal Builder</strong> → use the compliance checklist to guide your proposal writing</li>
                  <li><strong>Go/No-Go</strong> → the GO/NO-GO recommendation here feeds your bid decision</li>
                  <li><strong>Document Library</strong> → upload RFP documents for your team, then analyze</li>
                </ul>
              </HowItWorks>
            </div>
            <p className="text-gray-500 text-sm">Select an opportunity, paste text, or upload a PDF — AI extracts everything you need.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
              {['opportunity', 'paste', 'upload'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${mode === m ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {m === 'opportunity' ? 'Select Opportunity' : m === 'paste' ? 'Paste Text' : 'Upload File'}
                </button>
              ))}
            </div>

            {mode === 'opportunity' ? (
              <div className="bg-white rounded-2xl border p-4">
                <OpportunitySelector
                  selected={null}
                  onSelect={(opp) => {
                    setRfpText(opp.description || '');
                    setMode('paste');
                  }}
                  onClear={() => {}}
                />
              </div>
            ) : mode === 'paste' ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">RFP / Solicitation Text</label>
                <textarea
                  value={rfpText}
                  onChange={e => setRfpText(e.target.value)}
                  rows={16}
                  placeholder="Paste the full RFP text here... (copy from SAM.gov, agency website, or email)"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">{rfpText.length.toLocaleString()} characters</p>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`bg-white rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
              >
                <input ref={fileRef} type="file" accept=".txt,.pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                {fileName ? (
                  <p className="text-sm font-medium text-blue-600">{fileName}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600">Drop your RFP file here or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">Supports PDF and .txt — up to 15 MB</p>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <button onClick={handleAnalyze} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-60">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing RFP...</> : <><ScanSearch className="w-4 h-4" /> Analyze RFP</>}
            </button>

            {loading && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
                <p className="font-medium">AI is reading your RFP...</p>
                <p className="text-xs mt-0.5 text-blue-500">Extracting deadlines, requirements, compliance checklist. This takes 15–30 seconds.</p>
              </div>
            )}
          </div>

          {/* Result */}
          <div ref={resultRef}>
            {result ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Analysis Report</h3>
                  <div className="flex gap-2">
                    <button onClick={handleAnalyze} title="Re-analyze" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><RefreshCw className="w-4 h-4" /></button>
                    <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                      {copied ? <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                    <button onClick={handlePDF} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 max-h-[620px] overflow-y-auto border border-gray-100"><AIResponseRenderer content={result} /></div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
                <ScanSearch className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">Analysis will appear here</p>
                <p className="text-gray-300 text-sm mt-1">Paste RFP text and click Analyze</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
