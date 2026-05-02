import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, DollarSign, Building, FileText, Save, Sparkles, ChevronLeft, BookmarkCheck, ExternalLink, Search } from 'lucide-react';
import { opportunityAPI, authAPI, savedAPI } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import AIPanel from '../components/AIPanel';

export default function OpportunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposalOutline, setProposalOutline] = useState(null);
  const [userPlan, setUserPlan] = useState('free');
  
  // Save feature states
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOpportunity();
    getUserPlan();
    checkIfSaved();
  }, [id]);

  const getUserPlan = async () => {
    try {
      const response = await authAPI.getProfile();
      if (response.data.success) {
        setUserPlan(response.data.data.plan);
      }
    } catch (error) {
      console.error('Error getting user plan:', error);
    }
  };

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/opportunities')}
          className="flex items-center text-gray-600 hover:text-indigo-600 mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Opportunities
        </button>

        {/* Main Card */}
        <Card className="mb-6">
          <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{opportunity.title}</h1>
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

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
            <Button 
              variant={isSaved ? "secondary" : "primary"} 
              onClick={handleSave}
              disabled={saving}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4 mr-2 text-green-600" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Saving...' : (isSaved ? 'Saved' : 'Save Opportunity')}
            </Button>
            {userPlan !== 'free' && userPlan !== 'starter' ? (
              <Button 
                variant="outline" 
                onClick={handleGenerateProposal}
                disabled={generatingProposal}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generatingProposal ? 'Generating...' : 'Generate Proposal Outline'}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => navigate('/pricing')}
              >
                Upgrade to Pro for AI Proposals
              </Button>
            )}
            
            {/* Search on SAM.gov Button - Replaces the broken direct link */}
            {solicitationNumber && (
              <button
                onClick={handleSamSearch}
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search on SAM.gov
              </button>
            )}
          </div>
          
          {/* Help Text for SAM.gov Navigation */}
          {solicitationNumber && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>How to apply:</strong> Click "Search on SAM.gov" above. Once on SAM.gov, log in to your account, 
                  then search for Solicitation Number: <code className="bg-gray-200 px-1 rounded">{solicitationNumber}</code>. 
                  The full opportunity details and submission instructions will appear.
                </span>
              </p>
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