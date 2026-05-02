// frontend/src/components/AIPanel.jsx
import { useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  TrendingUp, 
  Shield, 
  Users, 
  MessageCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import { aiAPI } from '../services/api';
import Button from './Button';
import Card from './Card';

export default function AIPanel({ opportunityId, userPlan }) {
  const [activeFeature, setActiveFeature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [question, setQuestion] = useState('');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const features = [
    {
      id: 'summarize',
      name: 'AI Summarize',
      icon: FileText,
      description: 'Get a quick summary of the RFP',
      color: 'blue',
      action: async () => {
        const res = await aiAPI.summarize(opportunityId);
        return res.data.data.summary;
      }
    },
    {
      id: 'bidAnalysis',
      name: 'Bid Analysis',
      icon: TrendingUp,
      description: 'Should you bid? AI recommendation',
      color: 'green',
      action: async () => {
        const res = await aiAPI.bidAnalysis(opportunityId);
        return res.data.data.analysis;
      }
    },
    {
      id: 'fullProposal',
      name: 'Full Proposal',
      icon: Sparkles,
      description: 'Generate complete proposal',
      color: 'purple',
      action: async () => {
        const res = await aiAPI.fullProposal(opportunityId);
        return res.data.data.proposal;
      }
    },
    {
      id: 'competitive',
      name: 'Competitive Analysis',
      icon: Users,
      description: 'Analyze competitors',
      color: 'orange',
      action: async () => {
        const res = await aiAPI.competitiveAnalysis(opportunityId);
        return res.data.data.analysis;
      }
    },
    {
      id: 'risk',
      name: 'Risk Assessment',
      icon: Shield,
      description: 'Identify potential risks',
      color: 'red',
      action: async () => {
        const res = await aiAPI.riskAssessment(opportunityId);
        return res.data.data.assessment;
      }
    }
  ];

  const handleFeatureClick = async (feature) => {
    if (userPlan !== 'pro' && userPlan !== 'enterprise') {
      alert('Pro plan required for AI features. Please upgrade.');
      return;
    }

    setActiveFeature(feature.id);
    setLoading(true);
    setResult(null);
    
    try {
      const content = await feature.action();
      setResult(content);
    } catch (error) {
      console.error('AI feature error:', error);
      setResult('⚠️ AI service temporarily unavailable. Please try again later.\n\nError: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    
    if (userPlan !== 'pro' && userPlan !== 'enterprise') {
      alert('Pro plan required for AI features. Please upgrade.');
      return;
    }

    setLoading(true);
    setActiveFeature('ask');
    setResult(null);
    
    try {
      const res = await aiAPI.askQuestion(opportunityId, question);
      setResult(res.data.data.answer);
      setQuestion('');
    } catch (error) {
      console.error('Question error:', error);
      setResult('⚠️ Failed to get answer. Please try again.\n\nError: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700',
      green: 'border-green-200 bg-green-50 hover:bg-green-100 text-green-700',
      purple: 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700',
      orange: 'border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700',
      red: 'border-red-200 bg-red-50 hover:bg-red-100 text-red-700',
    };
    return colors[color] || colors.blue;
  };

  return (
    <Card className="mb-6 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>
          <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full">Powered by Gemini</span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 border-t border-gray-100">
          {/* Feature Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => handleFeatureClick(feature)}
                disabled={loading && activeFeature === feature.id}
                className={`p-3 rounded-xl border-2 transition-all text-center ${getColorClasses(feature.color)} ${
                  activeFeature === feature.id && loading ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                <feature.icon className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs font-medium">{feature.name}</span>
              </button>
            ))}
          </div>

          {/* Q&A Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ask AI about this opportunity
            </label>
            <div className="flex gap-2">
              <input
                id="ai-question-input"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What are the key evaluation criteria? Who are the likely competitors?"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
              />
              <Button 
                variant="primary" 
                onClick={handleAskQuestion}
                disabled={loading || !question.trim()}
              >
                {loading && activeFeature === 'ask' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Try: "What are the risks?", "How should we price this?", "What experience do we need?"
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="ml-2 text-gray-600">AI is analyzing...</span>
            </div>
          )}

          {/* Result Display */}
          {result && !loading && (
            <div className="relative mt-4">
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm">
                  {result}
                </pre>
              </div>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          )}

          {/* Quick Tips */}
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
            <p className="text-xs text-indigo-700">
              <strong>✨ Pro Tips:</strong> 
              • Ask specific questions for better answers
              • Use "Generate Full Proposal" for complete RFP response
              • Run "Risk Assessment" before bidding
              • Copy responses to use in your proposal
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}