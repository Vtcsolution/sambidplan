import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { usePlans } from '../hooks/usePlans';
import {
  ArrowRight, Bell, Search, Brain, TrendingUp, Shield, Clock,
  CheckCircle, Star, Users, Award, Zap, Target, FileText, BarChart2
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

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { getMonthly } = usePlans();
  const ctaTo = isAuthenticated ? '/dashboard' : '/signup';
  const ctaLabel = isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial';

  return (
    <div className="overflow-hidden">
      <SEOHead
        title="Federal Contract Opportunity Alerts & SAM.gov Notifications"
        description="Sambid delivers daily federal contract opportunities from SAM.gov, USASpending.gov & FPDS straight to your inbox. AI-matched alerts for small businesses. Start free — no credit card needed."
        keywords="federal contract opportunities, SAM.gov alerts, government contracting software, federal procurement notifications, FPDS contract search, small business federal contracts, USASpending opportunities, federal RFP alerts"
        canonical="https://sambid.co/"
        jsonLd={HOME_JSON_LD}
      />

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-5 sm:mb-6">
              <Zap className="w-4 h-4 mr-2 text-yellow-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">SAM.gov Contracts · Matched to Your NAICS Codes</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-5 sm:mb-6 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent leading-tight">
              Federal Contracts,<br />Found For You
            </h1>

            <p className="text-base sm:text-xl md:text-2xl text-indigo-100 mb-7 sm:mb-8 leading-relaxed max-w-2xl mx-auto px-2">
              Sambid scans SAM.gov daily and delivers matching federal contract opportunities straight to your dashboard — filtered by your NAICS codes, set-asides, and agency preferences.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
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
          </motion.div>
        </div>
      </section>

      {/* ── How the platform works — quick visual ── */}
      <section className="py-12 sm:py-16 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-8">
            How Sambid works
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { icon: Users,    step: '1', label: 'Create account',        sub: 'Add your NAICS codes' },
              { icon: Search,   step: '2', label: 'Get matched contracts',  sub: 'From SAM.gov daily' },
              { icon: Bell,     step: '3', label: 'Set smart alerts',       sub: 'Never miss a bid' },
              { icon: TrendingUp, step: '4', label: 'Track & win',          sub: 'Save, analyze, propose' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-xs font-bold text-indigo-500">Step {item.step}</div>
                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          >
            {[
              { value: '$160B+', label: 'Federal contracts awarded annually to small businesses', icon: Award },
              { value: 'SAM.gov', label: 'Official source — live contract data, updated daily',    icon: Shield },
              { value: 'NAICS',  label: 'Matched to your industry codes — no irrelevant noise',    icon: Target },
              { value: '3 days', label: 'Free trial — see real matches for your business today',   icon: Clock },
            ].map((stat, idx) => (
              <motion.div key={idx} variants={fadeInUp} className="text-center px-2">
                <div className="flex justify-center mb-2 sm:mb-3">
                  <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-14 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Everything You Need to Win Federal Contracts
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-2">
              One platform from discovery to proposal — built specifically for federal contractors
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: Search,
                title: 'NAICS-Based Matching',
                description: 'Enter your NAICS codes once. Sambid scans SAM.gov and delivers contracts that match your industry every day.',
                features: ['Live SAM.gov data', 'Set-aside filtering (8a, WOSB, HUBZone…)', 'Agency & value range filters'],
              },
              {
                icon: Bell,
                title: 'Smart Alerts',
                description: 'Create keyword and criteria-based alerts so the moment a relevant contract is posted, you know about it.',
                features: ['Email notifications', 'Daily or real-time frequency', 'Never miss a deadline'],
              },
              {
                icon: Brain,
                title: 'AI Proposal Tools',
                description: 'Use built-in AI to generate proposal drafts, analyze RFPs, and assess Go/No-Go decisions in seconds.',
                features: ['Proposal builder', 'RFP analyzer', 'Go/No-Go scoring'],
              },
              {
                icon: BarChart2,
                title: 'Winning Bids Analysis',
                description: 'See who\'s winning contracts in your NAICS codes, what they\'re charging, and what incumbent patterns look like.',
                features: ['Award amounts by agency', 'Incumbent contractor data', 'Market intelligence'],
              },
              {
                icon: FileText,
                title: 'Capability Statement',
                description: 'Generate a professional federal capability statement from your profile in one click — ready to attach to bids.',
                features: ['Auto-filled from your profile', 'PDF export', 'Agency-ready format'],
              },
              {
                icon: TrendingUp,
                title: 'Bid Pipeline',
                description: 'Track every opportunity you\'re pursuing from discovery through submission with a visual pipeline board.',
                features: ['Stage tracking', 'Deadline calendar', 'Saved opportunities'],
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 sm:p-8 border border-gray-100"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-1.5 sm:space-y-2">
                  {feature.features.map((feat, i) => (
                    <li key={i} className="flex items-center text-xs sm:text-sm text-gray-500">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plan overview ── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Start with a free trial. Upgrade when you're ready.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { name: 'Trial',      key: null,           period: '3 days',  matches: '15 matches',  color: 'border-gray-200',   badge: null,           free: true },
              { name: 'Starter',    key: 'starter',      period: '/month',  matches: '500/month',   color: 'border-blue-200',   badge: null,           free: false },
              { name: 'Pro',        key: 'pro',          period: '/month',  matches: '3,000/month', color: 'border-indigo-400', badge: 'Most Popular', free: false },
              { name: 'Enterprise', key: 'enterprise',   period: '/month',  matches: 'Unlimited',   color: 'border-amber-300',  badge: null,           free: false },
            ].map((plan, i) => {
              const mo = plan.key ? getMonthly(plan.key) : null;
              const priceDisplay = plan.free ? 'Free' : mo != null ? `$${mo}` : '…';
              return (
              <div key={i} className={`bg-white rounded-2xl border-2 ${plan.color} p-5 relative`}>
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <p className="text-sm font-semibold text-gray-500 mb-1">{plan.name}</p>
                <p className="text-3xl font-bold text-gray-900">{priceDisplay}<span className="text-sm font-normal text-gray-500">{plan.free ? '' : plan.period}</span></p>
                <p className="text-sm text-indigo-600 font-medium mt-2">{plan.matches}</p>
                <p className="text-xs text-gray-500 mt-1">SAM.gov contract matches</p>
              </div>
            )})}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-shadow"
              >
                <div className="flex mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-700 mb-5 sm:mb-6 italic leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{testimonial.name}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </motion.div>
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
