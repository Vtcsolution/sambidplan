import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { usePlans } from '../hooks/usePlans';
import SEOHead from '../components/SEOHead';
import {
  UserPlus, Search, Bell, TrendingUp, CheckCircle, ArrowRight,
  Shield, Clock, Target, BarChart2, FileText, Brain, Zap, Star
} from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Create Your Account & Add NAICS Codes',
    description: 'Sign up and tell Sambid what industry you\'re in. Your NAICS codes are the foundation — everything we surface is matched to them.',
    icon: UserPlus,
    color: 'blue',
    details: [
      'Takes under 2 minutes to set up',
      'Add up to 5 NAICS codes covering your capabilities',
      'Set your business type (LLC, 8a, WOSB, HUBZone, etc.)',
      'Add your company name and business information',
    ],
  },
  {
    number: '02',
    title: 'Get Matched Federal Contracts',
    description: 'Sambid pulls live data from SAM.gov daily and filters it to contracts that match your NAICS codes — no manual searching required.',
    icon: Search,
    color: 'green',
    details: [
      'Live SAM.gov contract data, refreshed daily',
      'Filtered to your NAICS codes automatically',
      'Filter further by agency, set-aside type, or value range',
      'Each match is scored by how closely it fits your profile',
    ],
  },
  {
    number: '03',
    title: 'Set Alerts So You Never Miss a Bid',
    description: 'Create keyword-based alerts for your target agencies or contract types. Get notified by email the moment a new match appears.',
    icon: Bell,
    color: 'purple',
    details: [
      'Keyword and phrase-based alert triggers',
      'Filter by agency, set-aside, and contract value',
      'Email notifications — daily digest or real-time (Pro+)',
      'Deadline reminders so you never miss a submission date',
    ],
  },
  {
    number: '04',
    title: 'Save, Analyze & Win',
    description: 'Save the contracts you want to pursue, build your proposal with AI tools, and track your pipeline from discovery to award.',
    icon: TrendingUp,
    color: 'orange',
    details: [
      'Save opportunities to your personal bid pipeline',
      'Use AI Proposal Builder to draft responses fast',
      'Analyze RFPs and get Go/No-Go scoring in seconds',
      'Track deadlines on a calendar view',
    ],
  },
];

const features = [
  { icon: BarChart2, title: 'Winning Bids Analysis',   description: 'See who\'s winning contracts in your NAICS codes, what they charged, and incumbent patterns — so you know what you\'re up against.' },
  { icon: FileText,  title: 'Capability Statement',     description: 'Auto-generate a professional federal capability statement from your profile, ready to attach to any bid.' },
  { icon: Brain,     title: 'AI Proposal Builder',      description: 'Paste in an RFP and get a structured draft proposal back in seconds. Edit, refine, and submit faster.' },
  { icon: Target,    title: 'Go/No-Go Analysis',        description: 'Score each opportunity against your capabilities, past performance, and competition before committing time to a bid.' },
  { icon: Zap,       title: 'RFP Analyzer',             description: 'Upload or paste an RFP and let AI extract the key requirements, evaluation criteria, and deadlines.' },
  { icon: Shield,    title: 'Contract Vehicles Tracker', description: 'Track GSA schedules, GWACs, and other contract vehicles relevant to your business.' },
];

export default function HowItWorks() {
  const { isAuthenticated } = useAuth();
  const { getMonthly, getYearly } = usePlans();
  const ctaTo = isAuthenticated ? '/dashboard' : '/signup';

  return (
    <div className="bg-white">
      <SEOHead
        title="How It Works — Find Federal Contracts in 3 Steps"
        description="Sambid scans SAM.gov, USASpending.gov, and FPDS daily, matches contracts to your NAICS codes using AI, and sends alerts straight to your inbox. See exactly how federal contract discovery works."
        keywords="how to find federal contracts, SAM.gov search guide, federal contracting process, government contract notification system, NAICS code matching, federal RFP discovery"
        canonical="https://sambid.co/how-it-works"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white py-12 sm:py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm">4 simple steps to your first federal contract match</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              How Sambid Works
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto">
              From sign-up to your first matched contract in minutes — here's exactly what happens
            </p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-16 items-center mb-14 sm:mb-20 last:mb-0`}
            >
              {/* Content */}
              <div className="w-full lg:w-1/2">
                <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-${step.color}-100 rounded-2xl mb-3 sm:mb-4`}>
                  <step.icon className={`w-6 h-6 sm:w-7 sm:h-7 text-${step.color}-600`} />
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-gray-100 mb-1 sm:mb-2 leading-none">{step.number}</div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">{step.title}</h2>
                <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-4 sm:mb-6 leading-relaxed">{step.description}</p>
                <ul className="space-y-2.5 sm:space-y-3">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual block */}
              <div className="w-full lg:w-1/2">
                <div className={`bg-gradient-to-br from-${step.color}-50 to-indigo-50 rounded-2xl p-8 sm:p-10 flex items-center justify-center min-h-[200px] sm:min-h-[260px]`}>
                  <div className="text-center">
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 bg-${step.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                      <step.icon className={`w-10 h-10 sm:w-12 sm:h-12 text-${step.color}-600`} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-200">{step.number}</p>
                    <p className="text-sm font-semibold text-gray-500 mt-1">{step.title}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Additional features */}
      <section className="py-12 sm:py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
              More Tools Built Into the Platform
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Sambid is more than contract discovery — it's a full federal contracting workspace
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl p-6 hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans quick ref */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Which plan is right for you?</h2>
            <p className="text-base text-gray-600">All plans include NAICS matching, alerts, and the full tool suite.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 pr-4 text-gray-500 font-medium">Plan</th>
                  <th className="text-left py-3 pr-4 text-gray-500 font-medium">Matches</th>
                  <th className="text-left py-3 pr-4 text-gray-500 font-medium">SAM.gov window</th>
                  <th className="text-left py-3 text-gray-500 font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { plan: 'Trial',      matches: '15 total',        window: 'Last 3 days',   key: null,           freeLabel: 'Free (3 days)' },
                  { plan: 'Free',       matches: '50/month',        window: 'Last 7 days',   key: null,           freeLabel: 'Free' },
                  { plan: 'Starter',    matches: '500/month',       window: 'Last 14 days',  key: 'starter',      freeLabel: null },
                  { plan: 'Pro',        matches: '3,000/month',     window: 'Last 60 days',  key: 'pro',          freeLabel: null },
                  { plan: 'Enterprise', matches: 'Unlimited',       window: 'Last 180 days', key: 'enterprise',   freeLabel: null },
                ].map((row, i) => {
                  const mo = row.key ? getMonthly(row.key) : null;
                  const yr = row.key === 'enterprise' ? getYearly(row.key) : null;
                  const priceLabel = row.freeLabel
                    ? row.freeLabel
                    : row.key === 'enterprise' && mo != null && yr != null
                      ? `$${mo}/mo · $${yr}/yr`
                      : mo != null ? `$${mo}/mo` : '…';
                  return (
                  <tr key={i} className={i === 2 ? 'bg-indigo-50' : ''}>
                    <td className={`py-3 pr-4 font-semibold ${i === 2 ? 'text-indigo-700' : 'text-gray-900'}`}>
                      {row.plan} {i === 2 && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full ml-1">Popular</span>}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{row.matches}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.window}</td>
                    <td className="py-3 text-gray-700 font-medium">{priceLabel}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-8">
            <Link to="/pricing" className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-700 text-sm">
              See full pricing & features <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Ready to See Your First Matches?
          </h2>
          <p className="text-base sm:text-xl text-indigo-100 mb-6 sm:mb-8">
            Create your account, add your NAICS codes, and get 15 real SAM.gov matches free — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              to={ctaTo}
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-100 transition-all"
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
        </div>
      </section>
    </div>
  );
}
