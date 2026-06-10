import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, DollarSign, Building, FileText, Save, Sparkles, ChevronLeft, BookmarkCheck, ExternalLink, Search, Download, Copy, CheckCheck, Paperclip, AlertCircle, FileEdit, CalendarPlus, ChevronDown, Loader2, ScanSearch } from 'lucide-react';
import { opportunityAPI, savedAPI, aiAPI } from '../services/api';
import { googleCalendarUrl, outlookCalendarUrl, downloadICS } from '../utils/calendarUtils';
import { useUserPlan } from '../hooks/useUserPlan';
import Button from '../components/Button';
import Card from '../components/Card';
import AIPanel from '../components/AIPanel';
import { exportSingleOpportunityPDF } from '../utils/exportUtils';

export default function OpportunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposalOutline, setProposalOutline] = useState(null);
  const { plan: userPlan } = useUserPlan();

  // Save feature states
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calendar dropdown
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (calRef.current && !calRef.current.contains(e.target)) setCalOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Attachment analysis
  const [analyzingUrl, setAnalyzingUrl] = useState(null);
  const [attachAnalysis, setAttachAnalysis] = useState({});

  useEffect(() => {
    fetchOpportunity();
    checkIfSaved();
  }, [id]);

  const fetchOpportunity = async () => {
    setLoading(true);
    try {
      const response = await opportunityAPI.getById(id);
      if (response.data.success) {
        setOpportunity(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching opportunity:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfSaved = async () => {
    try {
      const response = await savedAPI.checkSaved(id);
      if (response.data.success) {
        setIsSaved(response.data.isSaved);
        setSavedId(response.data.savedId);
      }
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isSaved && savedId) {
        await savedAPI.unsave(savedId);
        setIsSaved(false);
        setSavedId(null);
        alert('Opportunity removed from saved');
      } else {
        const response = await savedAPI.save(id);
        if (response.data.success) {
          setIsSaved(true);
          setSavedId(response.data.data._id);
          alert('Opportunity saved successfully');
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert(error.response?.data?.message || 'Failed to save opportunity');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateProposal = async () => {
    setGeneratingProposal(true);
    try {
      const response = await opportunityAPI.generateProposal(id);
      if (response.data.success) {
        setProposalOutline(response.data.data.outline);
      }
    } catch (error) {
      console.error('Error generating proposal:', error);
      alert('Failed to generate proposal. Please try again.');
    } finally {
      setGeneratingProposal(false);
    }
  };

  // Extract solicitation number from the opportunity data
  const getSolicitationNumber = () => {
    // Try multiple possible fields where the solicitation number might be stored
    if (opportunity.sourceId && !opportunity.sourceId.includes('SAMPLE')) {
      return opportunity.sourceId;
    }
    if (opportunity.solicitationNumber) {
      return opportunity.solicitationNumber;
    }
    return null;
  };

  // Build a SAM.gov search URL using the solicitation number
  const getSamSearchUrl = () => {
    const solicitationNumber = getSolicitationNumber();
    if (solicitationNumber) {
      return `https://sam.gov/search/?page=1&searchType=opps&keyword=${encodeURIComponent(solicitationNumber)}`;
    }
    return null;
  };

  // Handle "Search on SAM.gov" action
  const handleSamSearch = () => {
    const searchUrl = getSamSearchUrl();
    if (searchUrl) {
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('No solicitation number available for this opportunity. Please try searching by agency or keyword on SAM.gov.');
    }
  };

  const handleCopySolicitation = () => {
    const num = getSolicitationNumber();
    if (num) {
      navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Direct link to the opportunity on SAM.gov.
  // Only use the stored url when it is actually a sam.gov link — records from
  // USASpending store a usaspending.gov URL which must not appear here.
  const getSamDirectUrl = () => {
    if (opportunity.url && opportunity.url !== '#' && opportunity.url.includes('sam.gov')) {
      return opportunity.url;
    }
    const sol = getSolicitationNumber();
    if (sol) return `https://sam.gov/opp/${sol}/view`;
    return getSamSearchUrl();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Opportunity not found</p>
          <button onClick={() => navigate('/opportunities')} className="mt-4 text-indigo-600">
            Back to Opportunities
          </button>
        </div>
      </div>
    );
  }

  const getMatchColor = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-700';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const solicitationNumber = getSolicitationNumber();
  const samSearchUrl = getSamSearchUrl();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/opportunities')}
          className="flex items-center text-sm sm:text-base text-gray-600 hover:text-indigo-600 mb-4 sm:mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
          Back to Opportunities
        </button>

        {/* Main Card */}
        <Card className="mb-5 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{opportunity.title}</h1>
            {opportunity.aiMatchScore && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getMatchColor(opportunity.aiMatchScore)}`}>
                {opportunity.aiMatchScore}% Match Score
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div className="flex items-center text-gray-600">
                <Building className="w-5 h-5 mr-2 text-indigo-500" />
                <span className="font-medium">Agency:</span>
                <span className="ml-2">{opportunity.agency}</span>
              </div>
              {opportunity.estimatedValue && (
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                  <span className="font-medium">Estimated Value:</span>
                  <span className="ml-2 text-green-600 font-semibold">
                    ${opportunity.estimatedValue.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center text-gray-600">
                <Clock className="w-5 h-5 mr-2 text-orange-500" />
                <span className="font-medium">Due Date:</span>
                <span className="ml-2">
                  {opportunity.dueDate ? new Date(opportunity.dueDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {opportunity.naicsCode && opportunity.naicsCode !== '000000' && (
                <div className="flex items-center text-gray-600">
                  <FileText className="w-5 h-5 mr-2 text-purple-500" />
                  <span className="font-medium">NAICS Code:</span>
                  <span className="ml-2">{opportunity.naicsCode}</span>
                </div>
              )}
              {opportunity.setAside && (
                <div className="flex items-center text-gray-600">
                  <span className="font-medium">Set-Aside:</span>
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm">
                    {opportunity.setAside}
                  </span>
                </div>
              )}
              {solicitationNumber && (
                <div className="flex items-center text-gray-600">
                  <span className="font-medium">Solicitation #:</span>
                  <span className="ml-2 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {solicitationNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{opportunity.description}</p>
          </div>

          {/* Match Reasons */}
          {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
              <h3 className="text-sm font-semibold text-indigo-800 mb-2">Why this matches you:</h3>
              <ul className="space-y-1">
                {opportunity.matchReasons.map((reason, idx) => (
                  <li key={idx} className="text-sm text-indigo-700 flex items-start">
                    <span className="mr-2">✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── SAM.gov Direct Access ───────────────────────────────────── */}
          <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">

            {/* Solicitation Number — prominent copy box */}
            {solicitationNumber && (
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-indigo-700 mb-0.5">Solicitation / Notice Number</p>
                  <p className="font-mono text-sm font-bold text-indigo-900 break-all">{solicitationNumber}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Use this code to search on SAM.gov or GSA eBuy</p>
                </div>
                <button
                  onClick={handleCopySolicitation}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-indigo-300 text-indigo-600 hover:bg-indigo-100'}`}
                >
                  {copied ? <><CheckCheck className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
            )}

            {/* Primary SAM.gov action buttons */}
            <div className="flex flex-wrap gap-2">
              {/* View directly on SAM.gov */}
              {getSamDirectUrl() && (
                <a
                  href={getSamDirectUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on SAM.gov
                </a>
              )}

              {/* Find solicitation documents */}
              {getSamDirectUrl() && (
                <a
                  href={getSamDirectUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  <Paperclip className="w-4 h-4" />
                  Download Official Documents
                </a>
              )}

              {/* Search by solicitation number */}
              {solicitationNumber && (
                <button
                  onClick={handleSamSearch}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:border-indigo-400 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Search className="w-4 h-4 text-indigo-500" />
                  Search by Solicitation #
                </button>
              )}
            </div>

            {/* Document guide banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 mb-1">How to download the official solicitation documents (RFP/SOW)</p>
                  <ol className="text-amber-700 space-y-1 text-xs list-decimal list-inside">
                    <li>Click <strong>"View on SAM.gov"</strong> or <strong>"Download Official Documents"</strong> above</li>
                    <li>On SAM.gov, click the <strong>"Attachments/Links"</strong> tab on the opportunity page</li>
                    <li>Download the RFP, Statement of Work, and any other attached files</li>
                    <li>Log in to your SAM.gov account to submit your response</li>
                  </ol>
                  {solicitationNumber && (
                    <p className="mt-2 text-amber-600">
                      Or search SAM.gov directly for: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">{solicitationNumber}</code>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Our app actions ─────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-4 border-t border-gray-100 mt-2">
            <Button
              variant={isSaved ? "secondary" : "primary"}
              onClick={handleSave}
              disabled={saving}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4 mr-2 text-green-600" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? 'Saving...' : (isSaved ? 'Saved to My List' : 'Save to My List')}
            </Button>

            {/* Add to Calendar dropdown */}
            {opportunity.dueDate && (
              <div className="relative" ref={calRef}>
                <button onClick={() => setCalOpen(s => !s)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  <CalendarPlus className="w-4 h-4" /> Add to Calendar <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {calOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-52 py-1">
                    <a href={googleCalendarUrl(opportunity)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" /> Google Calendar
                    </a>
                    <a href={outlookCalendarUrl(opportunity)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <img src="https://outlook.live.com/favicon.ico" className="w-4 h-4" alt="" /> Outlook / Office 365
                    </a>
                    <button onClick={() => { downloadICS([opportunity], `${opportunity.sourceId || 'deadline'}.ics`); setCalOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Download className="w-4 h-4 text-gray-400" /> Download .ics (Apple / Other)
                    </button>
                  </div>
                )}
              </div>
            )}

            {userPlan !== 'free' && userPlan !== 'starter' ? (
              <>
                <Button variant="outline" onClick={handleGenerateProposal} disabled={generatingProposal}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generatingProposal ? 'Generating...' : 'Generate Proposal Outline (AI)'}
                </Button>
                <button
                  onClick={() => navigate(`/proposal-builder?opportunityId=${opportunity._id}&title=${encodeURIComponent(opportunity.title || '')}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <FileEdit className="w-4 h-4" />
                  Write Full Proposal (AI)
                </button>
              </>
            ) : (
              <Button variant="outline" onClick={() => navigate('/pricing')}>
                Upgrade to Pro for AI Proposals
              </Button>
            )}

            <button
              onClick={() => exportSingleOpportunityPDF(opportunity, opportunity.matchReasons || [])}
              className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-sm border border-gray-200"
              title="Downloads a summary of this contract from our database — not the official SAM.gov documents"
            >
              <Download className="w-4 h-4" />
              Export Summary (PDF)
            </button>
          </div>

          {/* ── Attachments / Documents ──────────────────────────────────────── */}
          {opportunity.resourceLinks?.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4 text-gray-400" /> Solicitation Documents ({opportunity.resourceLinks.length})
              </h3>
              <div className="space-y-2">
                {opportunity.resourceLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="flex-1 text-sm text-gray-700 truncate">{link.name || `Document ${i + 1}`}</span>
                    <div className="flex gap-2 shrink-0">
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </a>
                      {(userPlan === 'pro' || userPlan === 'enterprise') && (
                        <button
                          disabled={analyzingUrl === link.url}
                          onClick={async () => {
                            setAnalyzingUrl(link.url);
                            try {
                              const res = await aiAPI.analyzeAttachment(link.url);
                              setAttachAnalysis(prev => ({ ...prev, [link.url]: res.data.data.analysis }));
                            } catch (err) {
                              setAttachAnalysis(prev => ({ ...prev, [link.url]: `Error: ${err.response?.data?.message || err.message}` }));
                            } finally {
                              setAnalyzingUrl(null);
                            }
                          }}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50">
                          {analyzingUrl === link.url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
                          {analyzingUrl === link.url ? 'Analyzing…' : 'Analyze with AI'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Show analysis results inline */}
              {Object.entries(attachAnalysis).map(([url, analysis]) => (
                <div key={url} className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1.5">
                    <ScanSearch className="w-3.5 h-3.5" /> AI Analysis — {opportunity.resourceLinks.find(r => r.url === url)?.name || 'Document'}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-gray-700 leading-relaxed max-h-80 overflow-y-auto">{analysis}</pre>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* AI Panel - Pro users only */}
        {userPlan === 'pro' || userPlan === 'enterprise' ? (
          <AIPanel opportunityId={id} userPlan={userPlan} />
        ) : (
          <Card className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">🤖 AI Assistant</h3>
                <p className="text-sm text-gray-600">Get AI-powered summaries, bid analysis, and proposal generation</p>
              </div>
              <Button variant="primary" onClick={() => navigate('/pricing')}>
                Upgrade to Pro
              </Button>
            </div>
          </Card>
        )}

        {/* Proposal Outline */}
        {proposalOutline && (
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-indigo-500" />
              AI Proposal Outline
            </h2>
            <div className="prose prose-indigo max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-700 bg-gray-50 p-4 rounded-lg">
                {proposalOutline}
              </pre>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ This is an AI-generated outline to help you get started. 
                Please review and customize before submitting your proposal.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}