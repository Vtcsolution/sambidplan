import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '../hooks/useAuth';
import SEOHead from '../components/SEOHead';
import {
  ChevronDown, ArrowRight, Zap, Search, Brain, Shield,
  DollarSign, Users, Clock, HelpCircle, Mail
} from 'lucide-react';

const ANIM_CSS = `
@keyframes _fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.faq-fade { animation: _fadeUp 0.6s ease-out both; }
.reveal {
  opacity: 0;
  transform: translateY(18px);
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

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? 'border-indigo-300 shadow-sm' : 'border-gray-200'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors gap-4"
      >
        <span className="font-semibold text-gray-900 text-sm sm:text-base">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-500' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white border-t border-gray-100">
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed pt-3">{a}</p>
        </div>
      )}
    </div>
  );
}

const CATEGORIES = [
  {
    icon: Search,
    color: 'indigo',
    title: 'Platform & Features',
    faqs: [
      {
        q: 'What exactly is Sambid?',
        a: 'Sambid is an AI-powered federal contract discovery platform. It connects to SAM.gov, USASpending.gov, and FPDS — and automatically finds, filters, and delivers federal contract opportunities matched to your business profile. Think of it as your automated federal business development team.',
      },
      {
        q: 'How is Sambid different from just searching SAM.gov manually?',
        a: 'SAM.gov is a raw database — you search it manually, wade through thousands of irrelevant listings, and repeat every day. Sambid does that work automatically: it scans every morning, filters to your NAICS codes and preferences, and delivers only the contracts you can actually win. Plus AI proposal tools, deadline tracking, teaming finder, and past performance intelligence — none of which SAM.gov offers.',
      },
      {
        q: 'What data sources does Sambid use?',
        a: 'All data comes directly from official US government databases: SAM.gov (primary contract postings), USASpending.gov (historical award data and past winners), and FPDS (Federal Procurement Data System for award history). We never use third-party data feeds.',
      },
      {
        q: 'How often is the data updated?',
        a: 'Contract opportunities are scanned and updated every morning. New SAM.gov postings from the previous day are processed overnight so your dashboard and email alerts are current each morning when you start work.',
      },
      {
        q: 'How does the AI proposal writer work?',
        a: 'Upload or paste the RFP text. Sambid\'s AI reads the solicitation, extracts all requirements and evaluation criteria, and generates a structured proposal draft — technical volume, management approach, executive summary — in under 2 minutes. You edit, refine, and submit. It does not replace your expertise; it eliminates the blank-page problem.',
      },
      {
        q: 'Can I use Sambid on mobile?',
        a: 'Yes. Sambid is fully responsive and works on any device — phone, tablet, or desktop. Email alerts work on any device too. For heavy proposal work, desktop is recommended.',
      },
    ],
  },
  {
    icon: DollarSign,
    color: 'green',
    title: 'Pricing & Plans',
    faqs: [
      {
        q: 'Is there a free trial?',
        a: 'Yes — sign up with no credit card required. Your free trial gives you 15 real contract matches from SAM.gov based on your NAICS codes so you can see exactly what Sambid finds for your business before paying anything.',
      },
      {
        q: 'What happens after the free trial?',
        a: 'After your trial, you can upgrade to a paid plan or your access pauses. We never charge you without you choosing to upgrade. You keep your account and settings so you can pick up instantly when you upgrade.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes — cancel anytime from your account settings. No cancellation fees, no calls required. If you cancel a monthly plan, you keep access until the end of the billing period.',
      },
      {
        q: 'What is the difference between the plans?',
        a: 'The main differences are: (1) number of contract matches per month — Starter: 500, Pro: 3,000, Enterprise: unlimited; (2) how far back SAM.gov data goes — Starter: 14 days, Pro: 60 days, Enterprise: 180 days; (3) Pro and Enterprise get real-time alerts instead of just daily digest. All plans include AI tools, deadline calendar, and the full feature set.',
      },
      {
        q: 'Do you offer annual plans?',
        a: 'Yes — annual plans are available at a discounted rate. Contact us or visit the pricing page to see annual pricing options.',
      },
    ],
  },
  {
    icon: Shield,
    color: 'blue',
    title: 'Data & Security',
    faqs: [
      {
        q: 'Is my company data secure?',
        a: 'Yes. All data is encrypted in transit (TLS 1.3) and at rest. We never sell or share your company information with third parties. Your NAICS codes, certifications, and bid history are private to your account.',
      },
      {
        q: 'Do you share my data with other companies?',
        a: 'No. Your account data, preferences, and bid pipeline are entirely private. We use anonymized aggregate usage data to improve the platform, but never sell individual company data.',
      },
      {
        q: 'Where is Sambid hosted?',
        a: 'Sambid is hosted on enterprise-grade cloud infrastructure with 99.9% uptime SLA. All servers are based in the United States.',
      },
    ],
  },
  {
    icon: Brain,
    color: 'purple',
    title: 'AI Tools',
    faqs: [
      {
        q: 'How accurate is the AI win prediction?',
        a: 'The win probability is based on historical award patterns in your NAICS code, competition level, agency spending behavior, and your company certifications. It is a data-informed estimate — not a guarantee. Customers report it accurately identifies high-probability bids vs. long-shots in most cases.',
      },
      {
        q: 'Can I use the AI proposal writer for any contract?',
        a: 'Yes — paste or upload any RFP from SAM.gov or any other source. The AI works with any federal solicitation including RFPs, RFQs, Sources Sought notices, and BAAs.',
      },
      {
        q: 'Will the AI proposal match my company\'s tone and style?',
        a: 'The AI generates a structural draft that you edit to match your voice. For best results, edit and personalize the output before submitting. You can also add your past performance, team bios, and company specifics after the AI creates the skeleton.',
      },
      {
        q: 'Does the AI generate false information (hallucinate)?',
        a: 'We use verified SAM.gov data as the grounding source for all AI-generated content. The AI works from the actual RFP text you provide — it does not invent facts about contracts. For proposals, it generates structure and language based on your input, not fabricated details.',
      },
    ],
  },
  {
    icon: Users,
    color: 'teal',
    title: 'Account & Setup',
    faqs: [
      {
        q: 'How long does setup take?',
        a: 'About 5 minutes. Create your account, enter your NAICS codes, set your preferences, and Sambid starts finding matches immediately. Your first email alert arrives the following morning.',
      },
      {
        q: 'Do I need to know my NAICS codes?',
        a: 'Most contractors already know their 1–2 primary NAICS codes. If not, search by industry keyword in our NAICS lookup and we will help you identify the right ones. You can also start with your best guess and refine later.',
      },
      {
        q: 'Can multiple team members use one account?',
        a: 'The current plans are designed for individual use or small teams. Enterprise plans support team collaboration features. Contact us if you need multi-user access.',
      },
      {
        q: 'Can I change my NAICS codes after signing up?',
        a: 'Yes — update your NAICS codes, certifications, and preferences any time from your Settings page. Changes take effect on the next morning scan.',
      },
      {
        q: 'What if I do not get any matches?',
        a: 'This usually means your NAICS codes are very narrow or there are few active solicitations in that space right now. Try adding adjacent NAICS codes or broadening your agency filters. You can also contact support and we will help optimize your settings.',
      },
    ],
  },
];

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-200' },
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-200' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
  teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   border: 'border-teal-200' },
};

export default function FAQ() {
  const { isAuthenticated } = useAuth();
  const ctaTo = isAuthenticated ? '/dashboard' : '/signup';
  const [activeCategory, setActiveCategory] = useState(null);

  const displayed = activeCategory
    ? CATEGORIES.filter(c => c.title === activeCategory)
    : CATEGORIES;

  return (
    <div className="bg-white overflow-hidden">
      <style>{ANIM_CSS}</style>
      <SEOHead
        title="FAQ — Sambid Federal Contract Platform"
        description="Frequently asked questions about Sambid — federal contract discovery, SAM.gov automation, AI proposal tools, pricing, and account setup."
        keywords="Sambid FAQ, federal contracting software questions, SAM.gov platform help, federal contract alerts FAQ"
        canonical="https://sambid.co/faq"
      />

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="faq-fade">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-5">
              <HelpCircle className="w-4 h-4 mr-2 text-indigo-300" />
              <span className="text-xs sm:text-sm font-medium">Everything answered before you sign up</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent leading-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-base sm:text-xl text-indigo-100 leading-relaxed">
              Everything you need to know about Sambid — platform, pricing, AI tools, and getting started.
            </p>
          </div>
        </div>
      </section>

      {/* ── Category filter ── */}
      <section className="border-b border-gray-100 bg-gray-50 py-5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-nowrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                !activeCategory
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              All Questions
            </button>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.title}
                  onClick={() => setActiveCategory(activeCategory === cat.title ? null : cat.title)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                    activeCategory === cat.title
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.title}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ content ── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 sm:space-y-16">
            {displayed.map((cat, cidx) => {
              const c = COLOR_MAP[cat.color];
              const Icon = cat.icon;
              return (
                <FadeIn key={cidx} delay={cidx * 80}>
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${c.icon}`} />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{cat.title}</h2>
                      <span className="text-xs text-gray-400 font-medium">{cat.faqs.length} questions</span>
                    </div>

                    <div className="space-y-3">
                      {cat.faqs.map((faq, fidx) => (
                        <AccordionItem key={fidx} q={faq.q} a={faq.a} />
                      ))}
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          {/* Still have questions */}
          <FadeIn className="mt-14 sm:mt-20">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Still have questions?</h3>
              <p className="text-gray-600 text-sm sm:text-base mb-5 max-w-sm mx-auto">
                Our team responds within a few hours during business days.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
                >
                  Contact Support
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors text-sm"
                >
                  See How It Works
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 py-16 sm:py-20">
        <div className="absolute inset-0 bg-black opacity-20" />
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-lg text-indigo-100 mb-7">
            Free trial — 15 real SAM.gov matches — no credit card required.
          </p>
          <Link
            to={ctaTo}
            className="inline-flex items-center px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-100 transition-all hover:scale-105"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <p className="mt-4 text-indigo-200 text-xs">No credit card required · Cancel anytime</p>
        </div>
      </section>
    </div>
  );
}
