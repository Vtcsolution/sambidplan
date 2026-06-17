import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '../hooks/useAuth';
import { usePlans } from '../hooks/usePlans';
import SEOHead from '../components/SEOHead';
import {
  UserPlus, Search, Bell, TrendingUp, CheckCircle, ArrowRight,
  Shield, Clock, Target, BarChart2, FileText, Brain, Zap, Star,
  Calendar, Trophy, Users, Building2, ChevronRight, Play,
  RefreshCw, Mail, MousePointer, Award, AlertCircle, Settings
} from 'lucide-react';

const ANIM_CSS = `
@keyframes _fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.hw-fade { animation: _fadeUp 0.6s ease-out both; }
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

const SETUP_STEPS = [
  {
    number: '1',
    icon: UserPlus,
    title: 'Create Your Account',
    time: '2 minutes',
    description: 'Sign up and enter your company details — business type, certifications (8a, WOSB, HUBZone), and NAICS codes.',
    points: ['Takes under 2 minutes', 'No credit card required', 'Start with 15 free matches'],
    color: 'blue',
  },
  {
    number: '2',
    icon: Settings,
    title: 'Set Your Preferences',
    time: '3 minutes',
    description: 'Tell Sambid what agencies you target, your contract value range, and set-aside types. One-time setup, never repeat it.',
    points: ['NAICS codes (up to 5)', 'Agency & set-aside filters', 'Value range preferences'],
    color: 'indigo',
  },
  {
    number: '3',
    icon: Bell,
    title: 'Receive Matched Contracts',
    time: 'Every morning',
    description: 'Sambid scans SAM.gov every day and delivers your matches. Check your dashboard or email — contracts come to you.',
    points: ['Daily email digest', 'Real-time alerts (Pro+)', 'Your dashboard always updated'],
    color: 'green',
  },
];

const AUTO_FLOW = [
  { time: '6:00 AM', icon: RefreshCw,    label: 'Sambid scans SAM.gov',        sub: 'All new federal postings captured' },
  { time: '6:10 AM', icon: Target,        label: 'Matches your NAICS codes',     sub: 'AI filters to your exact profile' },
  { time: '6:20 AM', icon: Mail,          label: 'You get an email alert',       sub: 'Only relevant opportunities' },
  { time: 'Anytime', icon: MousePointer,  label: 'You review on your dashboard', sub: 'Full contract details in one click' },
  { time: 'Your pace', icon: FileText,   label: 'AI writes your proposal draft', sub: 'Upload RFP — get draft in minutes' },
  { time: 'Deadline', icon: Award,        label: 'You submit and win',           sub: 'Calendar tracks every deadline' },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Opportunity Discovery',
    description: 'Live SAM.gov data filtered to your NAICS codes. Never search manually again.',
    color: 'indigo',
  },
  {
    icon: Calendar,
    title: 'Deadline Calendar',
    description: 'Every bid you track shown on one calendar. Automated reminders keep you on time.',
    color: 'blue',
  },
  {
    icon: Brain,
    title: 'AI Win Predictions',
    description: 'AI scores your win probability on each contract before you invest time bidding.',
    color: 'purple',
  },
  {
    icon: FileText,
    title: 'AI Proposal Writer',
    description: 'Upload any RFP. Get a structured proposal draft aligned to evaluation criteria in minutes.',
    color: 'green',
  },
  {
    icon: Trophy,
    title: 'Past Performance Intel',
    description: 'See who is winning contracts in your NAICS from USASpending.gov data.',
    color: 'amber',
  },
  {
    icon: Users,
    title: 'Teaming Finder',
    description: 'Find complementary contractors with the right certifications to team up and win bigger contracts.',
    color: 'teal',
  },
  {
    icon: BarChart2,
    title: 'Market Research',
    description: 'Understand agency spending patterns, competition levels, and award history in your space.',
    color: 'red',
  },
  {
    icon: Shield,
    title: 'Capability Statement',
    description: 'Auto-generate a professional federal capability statement PDF from your profile in one click.',
    color: 'gray',
  },
];

const WHO_FOR = [
  {
    icon: Building2,
    title: 'Small Businesses',
    description: 'Save 2–3 hours daily on SAM.gov searching. Get matched contracts automatically, focus on bidding.',
    tags: ['8a', 'WOSB', 'HUBZone', 'SDVOSB'],
  },
  {
    icon: TrendingUp,
    title: 'GovCon Consultants',
    description: 'Manage multiple clients from one dashboard. Track pipelines, deadlines, and proposals in one place.',
    tags: ['Multi-client', 'Pipeline', 'Proposals'],
  },
  {
    icon: Users,
    title: 'Growing Contractors',
    description: 'Use AI tools to scale — submit more bids, find teaming partners, and enter new agency markets faster.',
    tags: ['AI tools', 'Teaming', 'Scale'],
  },
];

const FAQS = [
  {
    q: 'Where does Sambid get its data?',
    a: 'Sambid pulls live data from SAM.gov (primary), USASpending.gov (award history), and FPDS — all official US government databases.',
  },
  {
    q: 'Do I need to know my NAICS codes?',
    a: 'You can search by industry keyword and we help you find the right codes. Most contractors already know their 1–2 primary NAICS codes.',
  },
  {
    q: 'How is Sambid different from just searching SAM.gov?',
    a: 'SAM.gov gives you a raw search engine. Sambid gives you daily automatic matching, AI analysis, proposal tools, deadline tracking, and teaming — all in one platform.',
  },
  {
    q: 'Can I try before paying?',
    a: 'Yes — sign up free, no credit card needed. You get 15 real contract matches from SAM.gov to see exactly what Sambid finds for your NAICS codes.',
  },
  {
    q: 'How fast does the AI proposal tool work?',
    a: 'Upload or paste an RFP and get a structured draft back in under 2 minutes. The AI extracts requirements, evaluation criteria, and builds a response outline.',
  },
];

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-100',   icon: 'text-blue-600',   border: 'border-blue-200' },
  indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600', border: 'border-indigo-200' },
  green:  { bg: 'bg-green-100',  icon: 'text-green-600',  border: 'border-green-200' },
  purple: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-200' },
  amber:  { bg: 'bg-amber-100',  icon: 'text-amber-600',  border: 'border-amber-200' },
  teal:   { bg: 'bg-teal-100',   icon: 'text-teal-600',   border: 'border-teal-200' },
  red:    { bg: 'bg-red-100',    icon: 'text-red-600',    border: 'border-red-200' },
  gray:   { bg: 'bg-gray-100',   icon: 'text-gray-600',   border: 'border-gray-200' },
};

function AccordionItem({ q, a }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm sm:text-base pr-4">{q}</span>
        <ChevronRight
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 bg-white">
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

import React from 'react';

export default function HowItWorks() {
  const { isAuthenticated } = useAuth();
  const { getMonthly, getYearly } = usePlans();
  const ctaTo = isAuthenticated ? '/dashboard' : '/signup';

  return (
    <div className="bg-white overflow-hidden">
      <style>{ANIM_CSS}</style>
      <SEOHead
        title="How Sambid Works — Federal Contract Discovery Automated"
        description="Sambid scans SAM.gov daily, matches federal contracts to your NAICS codes using AI, and delivers them straight to your dashboard. See the full platform tour."
        keywords="how to find federal contracts, SAM.gov automation, federal contracting platform, government contract alerts, NAICS code matching, federal RFP discovery"
        canonical="https://sambid.co/how-it-works"
      />

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="hw-fade">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-5">
              <Zap className="w-4 h-4 mr-2 text-yellow-400" />
              <span className="text-xs sm:text-sm font-medium">Setup once. Contracts come to you every day.</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent leading-tight">
              How Sambid Works
            </h1>
            <p className="text-base sm:text-xl text-indigo-100 max-w-2xl mx-auto mb-8 leading-relaxed">
              5 minutes to set up. Then Sambid finds, filters, and delivers federal contracts automatically — every single day.
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

      {/* ── 3-Step Setup ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-3">
              Getting Started
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Ready in 5 Minutes
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Three quick steps — then Sambid runs automatically every day without you doing anything.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-14 left-1/3 right-1/3 h-0.5 bg-indigo-100 z-0" />

            {SETUP_STEPS.map((step, idx) => {
              const c = COLOR_MAP[step.color];
              const Icon = step.icon;
              return (
                <FadeIn key={idx} delay={idx * 120}>
                  <div className="relative bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow p-6 sm:p-8 h-full z-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${c.icon}`} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step {step.number}</span>
                        <div className="text-xs text-indigo-600 font-semibold">{step.time}</div>
                      </div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600 text-sm sm:text-base mb-4 leading-relaxed">{step.description}</p>
                    <ul className="space-y-2">
                      {step.points.map((pt, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Daily Automation Flow ── */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-3">
              Full Automation
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              What Happens Every Day — Automatically
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              After your 5-minute setup, this is what Sambid does for you every single morning without you lifting a finger.
            </p>
          </FadeIn>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-indigo-200" />

            <div className="space-y-6">
              {AUTO_FLOW.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <FadeIn key={idx} delay={idx * 80}>
                    <div className="flex items-start gap-5 sm:gap-6 pl-14 sm:pl-20 relative">
                      {/* Icon on the line */}
                      <div className="absolute left-0 sm:left-2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-indigo-200 flex items-center justify-center shadow-sm">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                      </div>

                      <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-4 sm:p-5 flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm sm:text-base">{item.label}</span>
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs sm:text-sm">{item.sub}</p>
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>

          <FadeIn className="mt-10 text-center">
            <p className="text-indigo-700 font-semibold text-sm sm:text-base">
              You only spend time on contracts that actually match your business.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Full Feature Grid ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-3">
              Platform Features
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Every Tool You Need to Win Federal Contracts
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Sambid is more than contract discovery — it is a full federal contracting workspace
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {FEATURES.map((f, idx) => {
              const c = COLOR_MAP[f.color];
              const Icon = f.icon;
              return (
                <FadeIn key={idx} delay={(idx % 4) * 80}>
                  <div className={`group bg-white rounded-2xl border ${c.border} p-5 sm:p-6 hover:shadow-md transition-all h-full`}>
                    <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-5 h-5 ${c.icon}`} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-2">{f.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{f.description}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Who is Sambid For ── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-3">
              Who Uses Sambid
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Built for Every Federal Contractor
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you are just starting in GovCon or scaling a full contracting operation
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {WHO_FOR.map((w, idx) => {
              const Icon = w.icon;
              return (
                <FadeIn key={idx} delay={idx * 100}>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-8 h-full">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">{w.title}</h3>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">{w.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {w.tags.map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing Overview ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-3">
              Pricing
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Which Plan is Right for You?
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              All plans include NAICS matching, alerts, and full platform access.
            </p>
          </FadeIn>

          <FadeIn>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-4 text-gray-500 font-semibold">Plan</th>
                    <th className="text-left px-5 py-4 text-gray-500 font-semibold">Matches / mo</th>
                    <th className="text-left px-5 py-4 text-gray-500 font-semibold">SAM.gov window</th>
                    <th className="text-left px-5 py-4 text-gray-500 font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { plan: 'Trial',      matches: '15 total',    window: 'Last 3 days',   key: null,         freeLabel: 'Free (3 days)' },
                    { plan: 'Starter',    matches: '500',         window: 'Last 14 days',  key: 'starter',    freeLabel: null },
                    { plan: 'Pro',        matches: '3,000',       window: 'Last 60 days',  key: 'pro',        freeLabel: null,  popular: true },
                    { plan: 'Enterprise', matches: 'Unlimited',   window: 'Last 180 days', key: 'enterprise', freeLabel: null },
                  ].map((row, i) => {
                    const mo = row.key ? getMonthly(row.key) : null;
                    const priceLabel = row.freeLabel
                      ? row.freeLabel
                      : mo != null ? `$${mo}/mo` : '…';
                    return (
                      <tr key={i} className={`${row.popular ? 'bg-indigo-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                        <td className="px-5 py-4">
                          <span className={`font-semibold ${row.popular ? 'text-indigo-700' : 'text-gray-900'}`}>
                            {row.plan}
                          </span>
                          {row.popular && (
                            <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Popular</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-700">{row.matches}</td>
                        <td className="px-5 py-4 text-gray-700">{row.window}</td>
                        <td className="px-5 py-4 font-semibold text-gray-900">{priceLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </FadeIn>

          <FadeIn className="text-center mt-6">
            <Link
              to="/pricing"
              className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-700 text-sm"
            >
              See full pricing & feature comparison
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Common Questions
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Everything you need to know before signing up
            </p>
          </FadeIn>

          <FadeIn>
            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <AccordionItem key={idx} q={faq.q} a={faq.a} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 py-16 sm:py-20">
        <div className="absolute inset-0 bg-black opacity-20" />
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
            Ready to See Your First Matches?
          </h2>
          <p className="text-base sm:text-xl text-indigo-100 mb-7 sm:mb-8 max-w-2xl mx-auto">
            Create your account, add your NAICS codes, and get 15 real SAM.gov matches free — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              to={ctaTo}
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-100 transition-all hover:scale-105"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20"
            >
              Talk to Us
            </Link>
          </div>
          <p className="mt-5 text-indigo-200 text-xs sm:text-sm">
            No credit card required · Cancel anytime · Setup in 5 minutes
          </p>
        </div>
      </section>
    </div>
  );
}
