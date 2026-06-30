import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePlans } from '../hooks/usePlans';

const API = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';
import {
  ArrowRight, Search, Brain, TrendingUp, Shield, Clock,
  CheckCircle, Star, Users, Award, Zap, Target, FileText, BarChart2,
  Calendar, Trophy, Play, Bell
} from 'lucide-react';
import SEOHead from '../components/SEOHead';

const HOME_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sambid',
    url: 'https://sambid.co',
    logo: 'https://sambid.co/logo.png',
    description: 'Sambid delivers real-time federal contract opportunity alerts from SAM.gov, USASpending.gov, and FPDS directly to small and mid-size contractors.',
    sameAs: [
      'https://twitter.com/sambidco',
      'https://linkedin.com/company/sambid',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@sambid.co',
      url: 'https://sambid.co/contact',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Sambid',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: 'https://sambid.co',
    description: 'AI-powered federal contract opportunity discovery and alert platform for US government contractors.',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '0',
      highPrice: '499',
      offerCount: '4',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '120',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sambid',
    url: 'https://sambid.co',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://sambid.co/opportunities?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
];

const ANIM_CSS = `
@keyframes _fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
.hero-fade { animation: _fadeUp 0.75s ease-out both; }
.reveal {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.55s ease-out, transform 0.55s ease-out;
}
.reveal.in { opacity: 1; transform: translateY(0); }
`;

function FadeIn({ children, delay = 0, className = '' }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.12 });
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

function VideoBlock({ videoSrc, posterSrc, title }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-indigo-50 border border-indigo-100 shadow-lg"
      style={{ aspectRatio: '16/9' }}
    >
      {videoSrc ? (
        <video
          className="w-full h-full object-cover"
          controls
          poster={posterSrc}
          preload="none"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : posterSrc ? (
        <img src={posterSrc} alt={title} className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(99,102,241,0.06) 1px,transparent 1px),linear-gradient(to right,rgba(99,102,241,0.06) 1px,transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-3 hover:bg-indigo-700 transition-colors cursor-pointer shadow-lg">
              <Play className="w-7 h-7 text-white" style={{ marginLeft: '3px' }} />
            </div>
            <p className="text-indigo-700 text-sm font-medium">{title}</p>
            <p className="text-indigo-400 text-xs mt-1">Video demo</p>
          </div>
        </div>
      )}
    </div>
  );
}

const PHASES = [
  {
    phase: '01',
    icon: Search,
    label: 'Find Every Opportunity',
    headline: 'Find Every Government Opportunity',
    description:
      'Sambid scans SAM.gov, USASpending.gov, and FPDS around the clock — delivering matched federal contract opportunities directly to your dashboard, filtered by your NAICS codes, set-asides, and agency preferences.',
    points: [
      'Live SAM.gov data updated daily',
      'NAICS code + set-aside filtering (8a, WOSB, HUBZone…)',
      'Agency, value range & keyword filters',
      'Email & in-app alerts the moment contracts post',
    ],
    video: '',
    videoTitle: 'Watch: Opportunity discovery dashboard',
  },
  {
    phase: '02',
    icon: Target,
    label: 'Search & Discover',
    headline: 'Deep Search with Solicitation Numbers',
    description:
      'Search any federal contract by keyword, solicitation number, or NAICS code. Get full details including evaluation criteria, incumbents, attachments, and SAM.gov links — all in one place.',
    points: [
      'Solicitation number direct lookup',
      'Full contract details from SAM.gov',
      'Download SOWs, PWS, and attachments',
      'Competition history and award patterns',
    ],
    video: '',
    videoTitle: 'Watch: SAM.gov contract search in action',
  },
  {
    phase: '03',
    icon: Calendar,
    label: 'Deadline Calendar',
    headline: 'Win Contracts Up to 12 Months Early',
    description:
      'Never miss a submission deadline again. Our visual calendar shows all upcoming deadlines for opportunities you are tracking — with automated reminders so you can plan bids well in advance.',
    points: [
      'Visual calendar with all tracked bids',
      'Automated deadline reminders via email',
      'Countdown timers for each submission',
      'Track multiple concurrent opportunities',
    ],
    video: '',
    videoTitle: 'Watch: Deadline calendar walkthrough',
  },
  {
    phase: '04',
    icon: Brain,
    label: 'AI Predictions',
    headline: 'Know Your Win Probability Before You Bid',
    description:
      'Our AI analyzes historical award patterns, competition level, agency preferences, and your company profile to predict win probability on every opportunity — so you bid smarter, not harder.',
    points: [
      'AI win probability score per contract',
      'Go/No-Go decision support',
      'Competition level analysis',
      'Award timeline and renewal predictions',
    ],
    video: '',
    videoTitle: 'Watch: AI prediction model demo',
  },
  {
    phase: '05',
    icon: Users,
    label: 'Build Winning Teams',
    headline: 'Find the Right Teaming Partners Instantly',
    description:
      'Connect with complementary contractors to form winning teams. Find verified partners with matching NAICS codes, required certifications, and relevant past performance — all searchable in seconds.',
    points: [
      'Teaming partner search by NAICS & certifications',
      'Past performance and capability matching',
      'Joint venture and subcontract support',
      'Direct messaging to partners inside the platform',
    ],
    video: '',
    videoTitle: 'Watch: Teaming finder in action',
  },
  {
    phase: '06',
    icon: Trophy,
    label: 'Past Performance Intelligence',
    headline: 'See Who Is Winning in Your NAICS Code',
    description:
      'Pull historical award data from USASpending.gov to discover which companies are winning contracts in your space, what agencies are awarding, and how much — so you can benchmark and position to win.',
    points: [
      'Historical winner data by NAICS from USASpending',
      'Award amounts and agency patterns',
      'Incumbent contractor identification',
      'Market intelligence by industry and region',
    ],
    video: '',
    videoTitle: 'Watch: Past performance intelligence',
  },
  {
    phase: '07',
    icon: FileText,
    label: 'AI Proposal Writing',
    headline: 'Respond to RFPs with One Click',
    description:
      "Upload any RFP and Sambid's AI generates a complete, structured proposal draft aligned to evaluation criteria — in minutes. Cut proposal writing time from days to hours.",
    points: [
      'One-click proposal draft generation',
      'RFP requirement and criteria extraction',
      'Compliance matrix builder',
      'Executive summary and technical volume drafts',
    ],
    video: '',
    videoTitle: 'Watch: AI proposal writing demo',
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { getMonthly } = usePlans();
  const ctaTo    = isAuthenticated ? '/dashboard' : '/signup';
  const ctaLabel = isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial';
  const pageMedia = usePageMedia('home');

  const heroImage = pageMedia?.hero?.image?.url ? `${API}${pageMedia.hero.image.url}` : null;

  return (
    <div className="overflow-hidden">
      <style>{ANIM_CSS}</style>
      <SEOHead
        title="Federal Contract Opportunity Alerts & SAM.gov Notifications"
        description="Sambid delivers daily federal contract opportunities from SAM.gov, USASpending.gov & FPDS straight to your inbox. AI-matched alerts for small businesses. Start free — no credit card needed."
        keywords="federal contract opportunities, SAM.gov alerts, government contracting software, federal procurement notifications, FPDS contract search, small business federal contracts, USASpending opportunities, federal RFP alerts, government contract finder, federal bid alerts, SAM.gov notification tool, AI federal contract matching, GovCon software, federal contracting platform for small business, win government contracts, federal contract bidding software, government RFP alerts, SAM.gov opportunity tracker, federal procurement software, contract opportunity finder"
        canonical="https://sambid.co/"
        jsonLd={HOME_JSON_LD}
      />

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — text */}
            <div className="hero-fade">
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-6">
                <Zap className="w-4 h-4 mr-2 text-yellow-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  SAM.gov Contracts · Matched to Your NAICS Codes
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-5 sm:mb-6 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent leading-tight">
                Federal Contracts,<br />Found For You
              </h1>

              <p className="text-base sm:text-xl text-indigo-100 mb-7 sm:mb-8 leading-relaxed max-w-lg">
                Sambid scans SAM.gov daily and delivers matching federal contract opportunities straight to your dashboard — filtered by your NAICS codes, set-asides, and agency preferences.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to={ctaTo}
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 text-sm sm:text-base"
                >
                  {ctaLabel}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl font-semibold transition-all duration-200 border border-white/20 text-sm sm:text-base"
                >
                  See How It Works
                </Link>
              </div>

              <p className="mt-5 text-indigo-300 text-xs sm:text-sm">
                3-day free trial · 15 contract matches included · No credit card required
              </p>
            </div>

            {/* Right — dashboard screenshot (uploaded via admin) */}
            <div className="hero-fade relative" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                {heroImage ? (
                  <img src={heroImage} alt="Sambid federal contract dashboard" className="w-full h-auto block" />
                ) : (
                  <div className="w-full flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl" style={{ aspectRatio: '16/9' }}>
                    <div className="text-center p-8">
                      <BarChart2 className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                      <p className="text-white/70 font-medium">Dashboard Preview</p>
                      <p className="text-white/40 text-sm mt-1">Upload via Admin → Page Media</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-12 sm:py-16 bg-gray-50 border-b border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-8">
            Proven ROI, Trusted by Contractors
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { value: '$160B+', label: 'Federal contracts awarded to small businesses yearly', icon: Award },
              { value: '50K+',   label: 'Active opportunities tracked from SAM.gov & FPDS',   icon: Shield },
              { value: '90%',    label: 'Time saved vs manual SAM.gov search every day',       icon: Target },
              { value: '3x',     label: 'More bids submitted by Sambid users on average',      icon: TrendingUp },
            ].map((stat, idx) => (
              <FadeIn key={idx} delay={idx * 80} className="px-2">
                <div className="flex justify-center mb-2 sm:mb-3">
                  <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-500 leading-relaxed">{stat.label}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7 Phases ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Everything You Need to Win Federal Contracts
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              One automated platform — from discovery to signed contract
            </p>
          </FadeIn>

          <div className="space-y-20 sm:space-y-28">
            {PHASES.map((phase, idx) => {
              const reversed = idx % 2 !== 0;
              const Icon = phase.icon;
              const bg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
              return (
                <FadeIn key={idx} delay={80}>
                  <div
                    className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center rounded-3xl p-6 sm:p-10 ${bg} ${
                      idx % 2 !== 0 ? 'border border-gray-100 shadow-sm' : ''
                    } ${reversed ? 'lg:grid-flow-col-dense' : ''}`}
                  >
                    {/* Video block */}
                    <div className={reversed ? 'lg:col-start-2' : ''}>
                      {(() => {
                        const slotKey = `phase_${phase.phase}`;
                        const slotMedia = pageMedia[slotKey] || {};
                        const vSrc = slotMedia.video?.url ? `${API}${slotMedia.video.url}` : '';
                        const pSrc = slotMedia.image?.url ? `${API}${slotMedia.image.url}` : '';
                        return (
                          <VideoBlock
                            videoSrc={vSrc}
                            posterSrc={pSrc}
                            title={phase.videoTitle}
                          />
                        );
                      })()}
                    </div>

                    {/* Text block */}
                    <div className={reversed ? 'lg:col-start-1 lg:row-start-1' : ''}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold">
                          {phase.phase}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="text-indigo-600 text-sm font-semibold uppercase tracking-wide">
                          {phase.label}
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-snug">
                        {phase.headline}
                      </h3>
                      <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6">
                        {phase.description}
                      </p>

                      <ul className="space-y-3">
                        {phase.points.map((point, i) => (
                          <li key={i} className="flex items-start gap-3 text-gray-700 text-sm sm:text-base">
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            {point}
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

      {/* ── Pricing overview ── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Start with a free trial. Upgrade when you are ready.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { name: 'Trial',      key: null,         period: '3 days',  matches: '15 matches',  color: 'border-gray-200',   badge: null },
              { name: 'Starter',    key: 'starter',    period: '/month',  matches: '500/month',   color: 'border-blue-200',   badge: null },
              { name: 'Pro',        key: 'pro',        period: '/month',  matches: '3,000/month', color: 'border-indigo-400', badge: 'Most Popular' },
              { name: 'Enterprise', key: 'enterprise', period: '/month',  matches: 'Unlimited',   color: 'border-amber-300',  badge: null },
            ].map((plan, i) => {
              const mo = plan.key ? getMonthly(plan.key) : null;
              const priceDisplay = !plan.key ? 'Free' : mo != null ? `$${mo}` : '…';
              return (
                <div key={i} className={`bg-white rounded-2xl border-2 ${plan.color} p-5 relative`}>
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-gray-500 mb-1">{plan.name}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {priceDisplay}
                    <span className="text-sm font-normal text-gray-500">
                      {!plan.key ? '' : plan.period}
                    </span>
                  </p>
                  <p className="text-sm text-indigo-600 font-medium mt-2">{plan.matches}</p>
                  <p className="text-xs text-gray-500 mt-1">SAM.gov contract matches</p>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Link
              to="/pricing"
              className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-700 text-sm sm:text-base"
            >
              See full pricing details
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              What Contractors Say
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Small businesses finding and winning federal contracts with Sambid
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                name: 'Sarah Johnson',
                role: 'CEO, Tech Solutions LLC',
                content: 'Before Sambid I was spending hours on SAM.gov every morning. Now the matches come to me — filtered to exactly what we qualify for.',
                rating: 5,
              },
              {
                name: 'Michael Chen',
                role: 'Owner, Chen IT Consulting',
                content: 'The NAICS filtering is spot-on. I stopped seeing irrelevant contracts and started actually responding to bids we could win.',
                rating: 5,
              },
              {
                name: 'David Williams',
                role: 'Director, Williams Engineering Group',
                content: 'The AI proposal builder cut our response time in half. We went from 2 bids a month to 6. Worth every penny.',
                rating: 5,
              },
            ].map((t, idx) => (
              <FadeIn key={idx} delay={idx * 100}>
                <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-shadow h-full">
                  <div className="flex mb-3 sm:mb-4">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 mb-5 sm:mb-6 italic leading-relaxed">
                    "{t.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{t.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{t.role}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 py-16 sm:py-20">
        <div className="absolute inset-0 bg-black opacity-20" />
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
            Start Finding Federal Contracts Today
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-indigo-100 mb-7 sm:mb-8">
            3-day free trial. 15 real contract matches from SAM.gov. No credit card needed.
          </p>
          <Link
            to={ctaTo}
            className="inline-flex items-center px-7 sm:px-8 py-3.5 sm:py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 hover:scale-105 text-sm sm:text-base"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <p className="mt-4 text-indigo-200 text-xs sm:text-sm">
            No credit card required · Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
