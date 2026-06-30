import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, DollarSign, Building, FileText, Save, Sparkles, ChevronLeft, BookmarkCheck, ExternalLink, Search, Download, Copy, CheckCheck, Paperclip, AlertCircle, FileEdit, CalendarPlus, ChevronDown, Loader2, ScanSearch, MapPin, User, Phone, Mail, Award, Calendar, Briefcase, Shield, Hash, Globe, Users } from 'lucide-react';
import { opportunityAPI, savedAPI, aiAPI } from '../services/api';
import { googleCalendarUrl, outlookCalendarUrl, downloadICS } from '../utils/calendarUtils';
import { useUserPlan } from '../hooks/useUserPlan';
import Button from '../components/Button';
import Card from '../components/Card';
import AIPanel from '../components/AIPanel';
import { exportSingleOpportunityPDF } from '../utils/exportUtils';
import AIResponseRenderer from '../components/AIResponseRenderer';
import HowItWorks from '../components/HowItWorks';

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

  // Build SAM.gov search URL that auto-searches by solicitation number
  const getSamSearchUrl = () => {
    const sol = getSolicitationNumber();
    if (sol) {
      return `https://sam.gov/search/?index=opp&q=${encodeURIComponent(sol)}&is_active=true&sort=-relevance`;
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
  // SAM.gov direct view requires the internal noticeId (UUID), not the solicitation number.
  // If we have a stored sam.gov URL with the correct noticeId, use it.
  // Otherwise fall back to the search URL which auto-searches by solicitation number.
  const getSamDirectUrl = () => {
    if (opportunity.url && opportunity.url !== '#' && opportunity.url.includes('sam.gov')) {
      return opportunity.url;
    }
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
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
          {/* Header with title, match score, and notice type badge */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-start gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{opportunity.title}</h1>
              <HowItWorks title="Opportunity Detail" steps={[
                { title: 'Full SAM.gov data', description: 'All 40+ fields: dates, contracting office chain, award details, awardee, contacts, performance period, place of performance' },
                { title: 'Run AI analysis', description: '5 AI tools: Summarize, Bid Analysis, Competitive Analysis, Risk Assessment, Q&A — all powered by real USASpending + SAM.gov data' },
                { title: 'Save & track', description: 'Save to your list, add deadline to Google/Outlook/Apple calendar, export as PDF' },
                { title: 'View on SAM.gov', description: 'One-click auto-search on SAM.gov — downloads official documents directly' },
              ]} dataUsed={['SAM.gov (40+ fields)', 'USASpending (competitors)', 'Your Company Profile']} >
                <p className="text-sm font-semibold text-gray-700 mt-2">Connected to:</p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                  <li><strong>Saved Opportunities</strong> → "Save to My List" adds it to your saved list and all AI tools</li>
                  <li><strong>Go/No-Go</strong> → run a full bid decision from here</li>
                  <li><strong>Proposal Builder</strong> → "Write Full Proposal" sends all data to the proposal builder</li>
                  <li><strong>Deadline Calendar</strong> → "Add to Calendar" syncs with Google/Outlook/Apple</li>
                  <li><strong>Bid Pipeline</strong> → saved contracts appear as pipeline cards</li>
                </ul>
              </HowItWorks>
            </div>
              {opportunity.noticeType && (
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  opportunity.noticeType === 'Award Notice' ? 'bg-green-100 text-green-700' :
                  opportunity.noticeType === 'Solicitation' || opportunity.noticeType === 'Combined Synopsis/Solicitation' ? 'bg-blue-100 text-blue-700' :
                  opportunity.noticeType === 'Presolicitation' ? 'bg-yellow-100 text-yellow-700' :
                  opportunity.noticeType === 'Sources Sought' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {opportunity.noticeType}
                </span>
              )}
            </div>
            {opportunity.aiMatchScore && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold shrink-0 ${getMatchColor(opportunity.aiMatchScore)}`}>
                {opportunity.aiMatchScore}% Match Score
              </span>
            )}
          </div>

          {/* ── Overview Grid ─────────────────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div className="flex items-start text-gray-600">
                <Building className="w-5 h-5 mr-2 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Agency:</span>
                  <span className="ml-2">{opportunity.agency}</span>
                </div>
              </div>
              {opportunity.estimatedValue && (
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-5 h-5 mr-2 text-green-500 shrink-0" />
                  <span className="font-medium">Total Value:</span>
                  <span className="ml-2 text-green-600 font-semibold">
                    ${opportunity.estimatedValue.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center text-gray-600">
                <Clock className="w-5 h-5 mr-2 text-orange-500 shrink-0" />
                <span className="font-medium">Response Due:</span>
                <span className="ml-2">
                  {opportunity.dueDate
                    ? new Date(opportunity.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-2 text-blue-500 shrink-0" />
                <span className="font-medium">Posted:</span>
                <span className="ml-2">
                  {new Date(opportunity.postedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              {opportunity.modifiedDate && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-2 text-gray-400 shrink-0" />
                  <span className="font-medium">Last Updated:</span>
                  <span className="ml-2">
                    {new Date(opportunity.modifiedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
              {opportunity.archiveDate && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-2 text-red-400 shrink-0" />
                  <span className="font-medium">Archive Date:</span>
                  <span className="ml-2">
                    {new Date(opportunity.archiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {opportunity.naicsCode && opportunity.naicsCode !== '000000' && (
                <div className="flex items-start text-gray-600">
                  <Hash className="w-5 h-5 mr-2 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">NAICS Code:</span>
                    <span className="ml-2 font-mono">{opportunity.naicsCode}</span>
                    {opportunity.naicsDescription && (
                      <p className="text-xs text-gray-500 mt-0.5">{opportunity.naicsDescription}</p>
                    )}
                  </div>
                </div>
              )}
              {opportunity.pscCode && (
                <div className="flex items-start text-gray-600">
                  <Hash className="w-5 h-5 mr-2 text-teal-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">PSC Code:</span>
                    <span className="ml-2 font-mono">{opportunity.pscCode}</span>
                    {opportunity.pscDescription && (
                      <p className="text-xs text-gray-500 mt-0.5">{opportunity.pscDescription}</p>
                    )}
                  </div>
                </div>
              )}
              {opportunity.setAside && (
                <div className="flex items-center text-gray-600">
                  <Shield className="w-5 h-5 mr-2 text-blue-500 shrink-0" />
                  <span className="font-medium">Set-Aside:</span>
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm">
                    {opportunity.setAside}
                  </span>
                </div>
              )}
              {solicitationNumber && (
                <div className="flex items-center text-gray-600">
                  <FileText className="w-5 h-5 mr-2 text-indigo-500 shrink-0" />
                  <span className="font-medium">Solicitation #:</span>
                  <span className="ml-2 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {solicitationNumber}
                  </span>
                </div>
              )}
              {opportunity.organizationType && (
                <div className="flex items-center text-gray-600">
                  <Briefcase className="w-5 h-5 mr-2 text-gray-500 shrink-0" />
                  <span className="font-medium">Org Type:</span>
                  <span className="ml-2 text-sm">{opportunity.organizationType}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Contracting Office Hierarchy ───────────────────────── */}
          {(opportunity.department || opportunity.subTier || opportunity.office) && (
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                <Building className="w-4 h-4 text-slate-500" /> Contracting Organization
              </h3>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                {opportunity.department && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Department</p>
                    <p className="text-slate-800 font-medium mt-0.5">{opportunity.department}</p>
                  </div>
                )}
                {opportunity.subTier && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sub-Tier</p>
                    <p className="text-slate-800 font-medium mt-0.5">{opportunity.subTier}</p>
                  </div>
                )}
                {opportunity.office && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Office</p>
                    <p className="text-slate-800 font-medium mt-0.5">{opportunity.office}</p>
                  </div>
                )}
              </div>
              {opportunity.officeAddress && (opportunity.officeAddress.city || opportunity.officeAddress.state) && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[opportunity.officeAddress.city, opportunity.officeAddress.state, opportunity.officeAddress.zipCode].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* ── Award Details ──────────────────────────────────────── */}
          {opportunity.award?.awardee?.name && (
            <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
              <h3 className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-green-600" /> Contract Award Details
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Awardee</p>
                    <p className="text-green-900 font-semibold mt-0.5">{opportunity.award.awardee.name}</p>
                  </div>
                  {opportunity.award.awardee.uei && (
                    <div>
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Unique Entity ID (UEI)</p>
                      <p className="text-green-800 font-mono text-xs mt-0.5">{opportunity.award.awardee.uei}</p>
                    </div>
                  )}
                  {opportunity.award.awardee.cageCode && (
                    <div>
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wide">CAGE Code</p>
                      <p className="text-green-800 font-mono text-xs mt-0.5">{opportunity.award.awardee.cageCode}</p>
                    </div>
                  )}
                  {opportunity.award.awardee.location?.city && (
                    <div>
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Awardee Location</p>
                      <p className="text-green-800 text-xs mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[
                          opportunity.award.awardee.location.streetAddress,
                          opportunity.award.awardee.location.city,
                          opportunity.award.awardee.location.state,
                          opportunity.award.awardee.location.zipCode,
                          opportunity.award.awardee.location.country
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {opportunity.award.date && (
                    <div>
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Award Date</p>
                      <p className="text-green-900 font-semibold mt-0.5">
                        {new Date(opportunity.award.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {opportunity.award.amount && (
                    <div>
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Award Amount</p>
                      <p className="text-green-900 font-bold text-lg mt-0.5">${opportunity.award.amount.toLocaleString()}</p>
                    </div>
                  )}
                  {opportunity.award.number && (
                    <div>
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Award Number</p>
                      <p className="text-green-800 font-mono text-xs mt-0.5">{opportunity.award.number}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Performance Period ─────────────────────────────────── */}
          {(opportunity.performancePeriod?.startDate || opportunity.performancePeriod?.endDate) && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-600" /> Period of Performance
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {opportunity.performancePeriod.startDate && (
                  <div>
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Start Date</p>
                    <p className="text-blue-900 font-semibold mt-0.5">
                      {new Date(opportunity.performancePeriod.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                )}
                {opportunity.performancePeriod.endDate && (
                  <div>
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Estimated Completion Date</p>
                    <p className="text-blue-900 font-semibold mt-0.5">
                      {new Date(opportunity.performancePeriod.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Place of Performance ──────────────────────────────── */}
          {(opportunity.placeOfPerformance?.city || opportunity.placeOfPerformance?.state) && (
            <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-amber-600" /> Place of Performance
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {opportunity.placeOfPerformance.city && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">City</p>
                    <p className="text-amber-900 mt-0.5">{opportunity.placeOfPerformance.city}</p>
                  </div>
                )}
                {opportunity.placeOfPerformance.state && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">State</p>
                    <p className="text-amber-900 mt-0.5">{opportunity.placeOfPerformance.state}</p>
                  </div>
                )}
                {opportunity.placeOfPerformance.zipCode && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">ZIP Code</p>
                    <p className="text-amber-900 mt-0.5">{opportunity.placeOfPerformance.zipCode}</p>
                  </div>
                )}
                {opportunity.placeOfPerformance.country && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Country</p>
                    <p className="text-amber-900 mt-0.5">{opportunity.placeOfPerformance.country}</p>
                  </div>
                )}
                {opportunity.placeOfPerformance.congressionalDistrict && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Congressional District</p>
                    <p className="text-amber-900 mt-0.5">{opportunity.placeOfPerformance.congressionalDistrict}</p>
                  </div>
                )}
                {opportunity.placeOfPerformance.county && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">County</p>
                    <p className="text-amber-900 mt-0.5">{opportunity.placeOfPerformance.county}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Point of Contact ──────────────────────────────────── */}
          {((opportunity.pointOfContacts && opportunity.pointOfContacts.length > 0) || opportunity.contactInfo?.name) && (
            <div className="mb-6 p-4 bg-violet-50 rounded-xl border border-violet-200">
              <h3 className="text-sm font-semibold text-violet-800 flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-violet-600" /> Point(s) of Contact
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {(opportunity.pointOfContacts && opportunity.pointOfContacts.length > 0
                  ? opportunity.pointOfContacts
                  : opportunity.contactInfo?.name ? [{ fullName: opportunity.contactInfo.name, email: opportunity.contactInfo.email, phone: opportunity.contactInfo.phone }] : []
                ).map((contact, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-violet-100">
                    {contact.type && <p className="text-xs font-medium text-violet-500 uppercase tracking-wide mb-1">{contact.type}</p>}
                    {contact.fullName && (
                      <p className="text-sm font-semibold text-violet-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-violet-400" /> {contact.fullName}
                      </p>
                    )}
                    {contact.title && <p className="text-xs text-violet-600 ml-5">{contact.title}</p>}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-xs text-violet-700 hover:underline flex items-center gap-1.5 mt-1">
                        <Mail className="w-3 h-3" /> {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <p className="text-xs text-violet-700 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3" /> {contact.phone}
                      </p>
                    )}
                    {contact.fax && (
                      <p className="text-xs text-violet-600 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3" /> Fax: {contact.fax}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  <div className="max-h-80 overflow-y-auto"><AIResponseRenderer content={analysis} className="text-xs" /></div>
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
            <div className="bg-gray-50 p-4 rounded-lg">
              <AIResponseRenderer content={proposalOutline} />
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