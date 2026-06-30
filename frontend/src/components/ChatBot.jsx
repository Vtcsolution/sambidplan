import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2, Bot, User, Phone, Sparkles, ArrowRight, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import api from '../services/api';

const QUICK_QUESTIONS = [
  { label: 'How do I find contracts?', q: 'How do I find and search federal contracts on this platform?' },
  { label: 'How does AI proposal work?', q: 'How does the AI Proposal Builder work and how many credits does it cost?' },
  { label: 'What are AI credits?', q: 'Explain the AI credits system — how many credits do I get and what do they cost?' },
  { label: 'How to track my bids?', q: 'How do I use the bid pipeline to track my proposals?' },
  { label: 'How to set up alerts?', q: 'How do I create smart alerts to get notified about new contracts?' },
  { label: 'What plan should I get?', q: 'What are the differences between Starter, Pro, and Enterprise plans?' },
];

function BotMessage({ text }) {
  // Clean up any leftover markdown bold ** → <b> tags
  let cleaned = text
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/^### (.+)$/gm, '<b style="color:#4f46e5">$1</b>')
    .replace(/^## (.+)$/gm, '<b style="color:#4f46e5">$1</b>')
    .replace(/^# (.+)$/gm, '<b style="color:#4f46e5">$1</b>')
    .replace(/^---$/gm, '');

  // Split on markdown links
  const parts = cleaned.split(/(\[[^\]]+\]\([^)]+\))/g);

  return (
    <div className="space-y-1.5">
      {parts.map((part, i) => {
        const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          const [, label, href] = linkMatch;
          if (href.startsWith('/')) {
            return (
              <Link key={i} to={href}
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition-colors text-xs">
                <ArrowRight className="w-3 h-3" />{label}
              </Link>
            );
          }
          return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-medium underline">{label}</a>;
        }
        // Render HTML (bold, colored spans, etc.) safely
        // Strip any script tags for safety
        const safe = part.replace(/<script[^>]*>.*?<\/script>/gi, '');
        return <span key={i} dangerouslySetInnerHTML={{ __html: safe }} />;
      })}
    </div>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [pulse, setPulse] = useState(true);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, showContact]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (open) setPulse(false);
  }, [open]);

  const send = async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await api.post('/chatbot/message', { message: q });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.data.reply }]);
    } catch (err) {
      const msg = err.response?.status === 402
        ? 'You\'ve used all AI credits this month. Upgrade your plan for more credits.'
        : 'Sorry, I\'m temporarily unavailable. Please try again or contact our support team.';
      setMessages(prev => [...prev, { role: 'bot', text: msg, error: true }]);
    }
    setLoading(false);
  };

  const handleContact = async () => {
    if (!contactMsg.trim()) return;
    setContactSending(true);
    try {
      await api.post('/chatbot/contact-support', { message: contactMsg, page: location.pathname });
      setContactSent(true);
    } catch {
      alert('Failed to send. Please try again.');
    }
    setContactSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${open ? 'hidden' : ''} ${pulse ? 'animate-bounce' : ''}`}
        style={{ animationDuration: '2s', animationIterationCount: 3 }}
      >
        <MessageCircle className="w-6 h-6" />
        {pulse && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />}
      </button>

      {/* Chat window */}
      {open && (
        <>
        {/* Fullscreen backdrop */}
        {expanded && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[59]" onClick={() => setExpanded(false)} />}

        <div className={`fixed z-[60] bg-white flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          expanded
            ? 'inset-4 sm:inset-8 lg:inset-16 rounded-3xl shadow-2xl border border-gray-200'
            : 'bottom-5 right-5 w-[380px] max-w-[calc(100vw-40px)] h-[560px] max-h-[calc(100vh-100px)] rounded-2xl shadow-2xl border border-gray-200'
        }`}>

          {/* Header */}
          <div className={`bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center justify-between shrink-0 ${expanded ? 'px-6 py-4' : 'px-4 py-3'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`bg-white/20 rounded-full flex items-center justify-center ${expanded ? 'w-10 h-10' : 'w-8 h-8'}`}>
                <Bot className={`text-white ${expanded ? 'w-5 h-5' : 'w-4 h-4'}`} />
              </div>
              <div>
                <p className={`text-white font-semibold ${expanded ? 'text-base' : 'text-sm'}`}>SamBid AI Assistant</p>
                <p className="text-indigo-200 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Online
                  {expanded && <span className="ml-1">· Ask me anything about the platform</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="text-white/50 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition" title="Clear chat">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setExpanded(e => !e)} className="text-white/50 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition" title={expanded ? 'Minimize' : 'Full screen'}>
                {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => { setOpen(false); setExpanded(false); }} className="text-white/50 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className={`flex-1 overflow-y-auto py-3 space-y-3 bg-gray-50 ${expanded ? 'px-6 sm:px-10 lg:px-20' : 'px-4'}`}>

            {/* Welcome message */}
            {messages.length === 0 && !showContact && (
              <div className={`space-y-4 ${expanded ? 'max-w-2xl mx-auto pt-8' : ''}`}>
                <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${expanded ? 'p-6' : 'p-3.5'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className={`text-indigo-500 ${expanded ? 'w-5 h-5' : 'w-4 h-4'}`} />
                    <span className={`font-semibold text-gray-900 ${expanded ? 'text-base' : 'text-sm'}`}>Hi! I'm your SamBid assistant.</span>
                  </div>
                  <p className={`text-gray-500 leading-relaxed ${expanded ? 'text-sm' : 'text-xs'}`}>
                    I know every feature, page, and workflow on this platform. Ask me anything — how features work, where to find things, or how to get started.
                  </p>
                </div>

                {/* Quick questions */}
                <div>
                  <p className={`font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1 ${expanded ? 'text-xs' : 'text-xs'}`}>Quick questions</p>
                  <div className={`${expanded ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}`}>
                    {QUICK_QUESTIONS.map((qq, i) => (
                      <button key={i} onClick={() => send(qq.q)}
                        className={`w-full text-left bg-white border border-gray-200 rounded-lg text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center gap-2 ${expanded ? 'px-4 py-3 text-sm' : 'px-3 py-2 text-sm'}`}>
                        <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                        {qq.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Message bubbles */}
            <div className={expanded ? 'max-w-3xl mx-auto space-y-3' : 'space-y-3'}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className={`bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mt-1 mr-2 ${expanded ? 'w-8 h-8' : 'w-6 h-6'}`}>
                    <Bot className={`text-indigo-600 ${expanded ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                  </div>
                )}
                <div className={`rounded-2xl leading-relaxed ${
                  expanded ? 'max-w-[75%] px-5 py-3.5 text-[15px]' : 'max-w-[80%] px-3.5 py-2.5 text-sm'
                } ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : msg.error
                      ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                      : 'bg-white text-gray-700 border border-gray-200 shadow-sm rounded-bl-md'
                }`}>
                  {msg.role === 'bot' ? (
                    <div className="whitespace-pre-wrap chatbot-reply"><BotMessage text={msg.text} /></div>
                  ) : msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className={`bg-gray-200 rounded-full flex items-center justify-center shrink-0 mt-1 ml-2 ${expanded ? 'w-8 h-8' : 'w-6 h-6'}`}>
                    <User className={`text-gray-600 ${expanded ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                  </div>
                )}
              </div>
            ))}
            </div>

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Contact support form */}
            {showContact && !contactSent && (
              <div className="bg-white rounded-xl border border-indigo-200 p-3.5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-gray-900">Contact Our Team</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">Describe what you need help with. All support team members will be notified instantly.</p>
                <textarea
                  value={contactMsg}
                  onChange={e => setContactMsg(e.target.value)}
                  placeholder="What do you need help with?"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 h-20"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleContact} disabled={contactSending || !contactMsg.trim()}
                    className="flex-1 bg-indigo-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {contactSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {contactSending ? 'Sending…' : 'Send to Team'}
                  </button>
                  <button onClick={() => setShowContact(false)}
                    className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {contactSent && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 text-center">
                <p className="text-sm font-semibold text-green-700">Support request sent!</p>
                <p className="text-xs text-green-600 mt-1">Our team has been notified and will respond shortly via email.</p>
                <button onClick={() => { setShowContact(false); setContactSent(false); setContactMsg(''); }}
                  className="mt-2 text-xs text-indigo-600 hover:underline">Back to chat</button>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className={`border-t border-gray-200 bg-white shrink-0 ${expanded ? 'px-6 sm:px-10 lg:px-20 py-4' : 'px-3 py-2.5'}`}>
            <div className={`flex items-end gap-2 ${expanded ? 'max-w-3xl mx-auto' : ''}`}>
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about any feature…"
                  rows={expanded ? 2 : 1}
                  className={`w-full border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent ${
                    expanded ? 'px-4 py-3 text-base max-h-32' : 'px-3 py-2.5 text-sm max-h-20'
                  }`}
                  style={{ minHeight: expanded ? '52px' : '40px' }}
                />
              </div>
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className={`bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  expanded ? 'w-11 h-11' : 'w-9 h-9'
                }`}>
                {loading ? <Loader2 className={`text-white animate-spin ${expanded ? 'w-5 h-5' : 'w-4 h-4'}`} /> : <Send className={`text-white ${expanded ? 'w-5 h-5' : 'w-4 h-4'}`} />}
              </button>
            </div>

            {/* Contact team button */}
            <div className={expanded ? 'max-w-3xl mx-auto' : ''}>
              <button onClick={() => { setShowContact(true); setContactSent(false); }}
                className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 py-1.5 hover:bg-indigo-50 rounded-lg transition-colors">
                <Phone className="w-3 h-3" /> Need human help? Contact our team
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
}
