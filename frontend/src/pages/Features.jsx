import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import SEOHead from '../components/SEOHead';

const API = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';

function usePageMedia(page) {
  const [media, setMedia] = useState({});
  useEffect(() => {
    fetch(`${API}/api/media/page/${page}`)
      .then(r => r.json())
      .then(d => { if (d.success) setMedia(d.media || {}); })
      .catch(() => {});
  }, [page]);
  return media;
}
import {
  Search, Brain, Calendar, Trophy, Users, FileText, BarChart2, Shield,
  Target, Bell, TrendingUp, CheckCircle, ArrowRight, Zap, Star,
  Clock, Award, RefreshCw, Building2, Globe, Lock
} from 'lucide-react';

const ANIM_CSS = `
@keyframes _fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.feat-fade { animation: _fadeUp 0.6s ease-out both; }
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}
.reveal.in { opacity: 1; transform: translateY(0); }
`;

function FadeIn({ children, delay = 0, className = '' }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`reveal${inView ? ' in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

const FEATURES = [
  {
    icon: Search,
    color: 'indigo',
    title: 'Opportunity Discovery',
    tagline: 'Find every contract that matches your business — automatically',
    description:
      'Sambid scans SAM.gov, USASpending.gov, and FPDS every day and delivers only the opportunities that match your NAICS codes, certifications, and agency preferences. No more manual searching.',
    points: [
      'Live SAM.gov data refreshed every morning',
      'NAICS code matching — up to 5 codes on any plan',
      'Set-aside filtering: 8a, WOSB, HUBZone, SDVOSB, SDB',
      'Agency, value range, and keyword filters',
      'Match score — see how closely each contract fits your profile',
    ],
    badge: 'Core Feature',
  },
  {
    icon: Bell,
    color: 'blue',
    title: 'Smart Alerts',
    tagline: 'Know the moment a relevant contract is posted',
    description:
      'Create keyword and criteria-based alert rules. The moment a matching contract appears on SAM.gov, Sambid notifies you — so you always respond before the competition even knows it exists.',
    points: [
      'Keyword and phrase-based alert triggers',
      'Filter alerts by agency, set-aside, and value range',
      'Daily digest email — morning summary of new matches',
      'Real-time email alerts on Pro and Enterprise plans',
      'Deadline reminders — 7 days, 3 days, and 1 day before',
    ],
    badge: 'Core Feature',
  },
  {
    icon: Calendar,
    color: 'green',
    title: 'Deadline Calendar',
    tagline: 'Never miss a submission date again',
    description:
      'Every opportunity you track automatically appears on your visual calendar. See all your upcoming bid deadlines at a glance, with automated reminders so nothing slips through.',
    points: [
      'Visual monthly and weekly calendar view',
      'All tracked bids shown in one place',
      'Automated deadline reminders via email',
      'Submission countdown shown on every opportunity',
      'Color-coded by urgency and bid stage',
    ],
    badge: null,
  },
  {
    icon: Brain,
    color: 'purple',
    title: 'AI Win Predictions',
    tagline: 'Know your win probability before you invest time bidding',
    description:
      'Our AI analyzes historical award data, competition level, agency patterns, and your company profile to give you a win probability score on every opportunity — so you bid smarter.',
    points: [
      'AI win probability score (0–100%) per contract',
      'Go/No-Go decision support with reasoning',
      'Competition level analysis — low, medium, high',
      'Agency preference patterns from historical awards',
      'Bid/no-bid recommendation with key factors',
    ],
    badge: 'AI Powered',
  },
  {
    icon: FileText,
    color: 'violet',
    title: 'AI Proposal Writer',
    tagline: 'From RFP to proposal draft in under 2 minutes',
    description:
      'Upload or paste any RFP and Sambid\'s AI generates a complete, structured proposal draft aligned to the evaluation criteria. Cut proposal writing time from days to hours.',
    points: [
      'One-click proposal draft generation',
      'RFP requirement and evaluation criteria extraction',
      'Technical volume and management approach drafts',
      'Executive summary generator',
      'Compliance matrix builder — maps requirements to your response',
    ],
    badge: 'AI Powered',
  },
  {
    icon: Target,
    color: 'orange',
    title: 'RFP Analyzer',
    tagline: 'Understand every requirement before you commit',
    description:
      'Paste in any RFP and Sambid extracts the key requirements, evaluation criteria, deadlines, and compliance checklist — in seconds. Know exactly what the agency wants before writing a word.',
    points: [
      'Instant requirement extraction from any RFP',
      'Evaluation criteria breakdown by weight',
      'Key dates and submission requirements',
      'Compliance checklist — track what you\'ve addressed',
      'Red flag detection — unusual clauses or requirements',
    ],
    badge: 'AI Powered',
  },
  {
    icon: Trophy,
    color: 'amber',
    title: 'Past Performance Intelligence',
    tagline: 'See who is winning in your NAICS code and why',
    description:
      'Pull historical award data from USASpending.gov to see which companies win contracts in your space, what they charge, and which agencies award the most. Know your competition before you bid.',
    points: [
      'Historical award data by NAICS from USASpending.gov',
      'Incumbent contractor identification per opportunity',
      'Award amounts, price per unit, and typical margins',
      'Agency spending patterns over 1–5 year windows',
      'Winning contractor profiles and past performance',
    ],
    badge: null,
  },
  {
    icon: Users,
    color: 'teal',
    title: 'Teaming Finder',
    tagline: 'Find the right partners to win bigger contracts',
    description:
      'Search for verified contractors to form winning teams. Filter by NAICS codes, certifications, location, and past performance. Message them directly inside the platform.',
    points: [
      'Search teaming partners by NAICS and certifications',
      'Filter by small business type and set-asides',
      'Past performance and capability matching',
      'Direct messaging to potential partners',
      'Joint venture and subcontract support',
    ],
    badge: null,
  },
  {
    icon: BarChart2,
    color: 'cyan',
    title: 'Market Research',
    tagline: 'Understand the federal market before you enter it',
    description:
      'Deep market intelligence on any NAICS code, agency, or contract type. See spending trends, competition levels, and the best agencies to target — before you invest in a new market.',
    points: [
      'Agency spending trends by NAICS code',
      'Contract vehicle usage and award patterns',
      'Competition density analysis by region',
      'Set-aside percentage by agency and NAICS',
      'Year-over-year spending growth charts',
    ],
    badge: null,
  },
  {
    icon: Shield,
    color: 'gray',
    title: 'Capability Statement Builder',
    tagline: 'Professional capability statement in one click',
    description:
      'Auto-generate a professional federal capability statement PDF directly from your company profile. Ready to attach to any bid, cold outreach, or agency introduction.',
    points: [
      'Auto-filled from your Sambid profile',
      'Professional federal format',
      'PDF export, ready to send',
      'Includes NAICS codes, certifications, past performance',
      'Update instantly when your profile changes',
    ],
    badge: null,
  },
  {
    icon: TrendingUp,
    color: 'green',
    title: 'Bid Pipeline',
    tagline: 'Track every opportunity from discovery to award',
    description:
      'A visual Kanban-style pipeline for every bid you are pursuing. Move opportunities through stages, add notes, track team assignments, and never lose sight of where each bid stands.',
    points: [
      'Kanban board — Discovery, Qualifying, Bidding, Submitted, Won/Lost',
      'Add notes and documents to each opportunity',
      'Team assignment and collaboration',
      'Pipeline value and win-rate tracking',
      'Export pipeline report for leadership review',
    ],
    badge: null,
  },
  {
    icon: Building2,
    color: 'indigo',
    title: 'Contract Vehicles Tracker',
    tagline: 'Track the vehicles that open the most doors',
    description:
      'Monitor GSA schedules, GWACs, IDIQs, and BPA contract vehicles relevant to your business. Know expiry dates, on-ramp windows, and which vehicles your target agencies use most.',
    points: [
      'GSA schedule monitoring and expiry alerts',
      'GWAC and IDIQ vehicle tracking',
      'On-ramp opportunity alerts',
      'Which vehicles your target agencies use most',
      'Task order history under each vehicle',
    ],
    badge: null,
  },
];

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'text-green-600',  badge: 'bg-green-100 text-green-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   icon: 'text-teal-600',   badge: 'bg-teal-100 text-teal-700' },
  cyan:   { bg: 'bg-cyan-50',   border: 'border-cyan-200',   icon: 'text-cyan-600',   badge: 'bg-cyan-100 text-cyan-700' },
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   icon: 'text-gray-600',   badge: 'bg-gray-100 text-gray-700' },
};

export default function Features() {
  const { isAuthenticated } = useAuth();
  const ctaTo    = isAuthenticated ? '/dashboard' : '/signup';
  const pageMedia = usePageMedia('features');

  return (
    <div className="bg-white overflow-hidden">
      <style>{ANIM_CSS}</style>
      <SEOHead
        title="Sambid Features — Full Federal Contracting Platform"
        description="Explore all Sambid features: AI opportunity matching, proposal writer, win predictions, deadline calendar, teaming finder, past performance intelligence, and more."
        keywords="federal contracting software features, SAM.gov automation, AI proposal writer, federal contract alerts, teaming finder, past performance, bid pipeline"
        canonical="https://sambid.co/features"
      />

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="feat-fade">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-5">
              <Zap className="w-4 h-4 mr-2 text-yellow-400" />
              <span className="text-xs sm:text-sm font-medium">12 tools. One platform. Built for GovCon.</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent leading-tight">
              Every Feature You Need to Win Federal Contracts
            </h1>
            <p className="text-base sm:text-xl text-indigo-100 max-w-2xl mx-auto mb-8 leading-relaxed">
              From first discovery to signed award — Sambid covers the entire federal contracting lifecycle.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={ctaTo}
                className="inline-flex items-center justify-center px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold transition-all"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature count bar ── */}
      <section className="border-b border-gray-100 bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '12',    label: 'Platform features' },
              { value: '3',     label: 'AI-powered tools' },
              { value: '1',     label: 'Unified dashboard' },
              { value: 'Free',  label: 'Trial — no card needed' },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-2xl sm:text-3xl font-bold text-indigo-600 mb-1">{s.value}</div>
                <div className="text-xs sm:text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature list ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10 sm:space-y-14">
            {FEATURES.map((feat, idx) => {
              const c = COLOR_MAP[feat.color];
              const Icon = feat.icon;
              const reversed = idx % 2 !== 0;
              return (
                <FadeIn key={idx} delay={80}>
                  <div className={`grid lg:grid-cols-2 gap-8 lg:gap-14 items-center ${reversed ? 'lg:grid-flow-col-dense' : ''}`}>

                    {/* Icon / visual block — replaced by uploaded image when available */}
                    <div className={`${reversed ? 'lg:col-start-2' : ''}`}>
                      {(() => {
                        const slotKey = `feature_${String(idx + 1).padStart(2, '0')}`;
                        const imgUrl  = pageMedia[slotKey]?.image?.url ? `${API}${pageMedia[slotKey].image.url}` : null;
                        return imgUrl ? (
                          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md">
                            <img src={imgUrl} alt={feat.title} className="w-full h-auto block" />
                          </div>
                        ) : (
                          <div className={`rounded-2xl ${c.bg} border ${c.border} p-10 sm:p-14 flex flex-col items-center justify-center text-center min-h-[200px] sm:min-h-[260px]`}>
                            <div className={`w-20 h-20 rounded-2xl bg-white shadow-sm border ${c.border} flex items-center justify-center mb-5`}>
                              <Icon className={`w-10 h-10 ${c.icon}`} />
                            </div>
                            <p className={`text-sm font-bold ${c.icon} uppercase tracking-wider`}>{feat.title}</p>
                            <p className="text-gray-500 text-xs mt-1 max-w-[200px] leading-relaxed">{feat.tagline}</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Text block */}
                    <div className={reversed ? 'lg:col-start-1 lg:row-start-1' : ''}>
                      <div className="flex items-center gap-3 mb-4">
                        {feat.badge && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${c.badge}`}>
                            {feat.badge}
                          </span>
                        )}
                        <span className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
                          Feature {String(idx + 1).padStart(2, '0')}
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-snug">
                        {feat.title}
                      </h2>
                      <p className={`text-base font-medium ${c.icon} mb-4`}>{feat.tagline}</p>
                      <p className="text-gray-600 text-base leading-relaxed mb-6">{feat.description}</p>

                      <ul className="space-y-2.5">
                        {feat.points.map((pt, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-gray-700">
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 py-16 sm:py-20">
        <div className="absolute inset-0 bg-black opacity-20" />
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
            All Features. One Platform. Free to Try.
          </h2>
          <p className="text-base sm:text-xl text-indigo-100 mb-7 max-w-2xl mx-auto">
            Start your free trial and explore every feature — no credit card, no commitment.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={ctaTo}
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-100 transition-all hover:scale-105"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20"
            >
              See Pricing
            </Link>
          </div>
          <p className="mt-4 text-indigo-200 text-xs">No credit card required · Cancel anytime</p>
        </div>
      </section>
    </div>
  );
}
