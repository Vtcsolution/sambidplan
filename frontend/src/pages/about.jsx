import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Target, Heart, Lightbulb, Shield, TrendingUp, ArrowRight, Search, Globe, CheckCircle } from 'lucide-react';
import SEOHead from '../components/SEOHead';

const values = [
  { icon: Target,    title: 'Accuracy First',       description: 'Every contract match is filtered to your exact NAICS codes. We surface what\'s relevant — nothing else.' },
  { icon: Heart,     title: 'Built for Small Business', description: 'Most federal contracting tools are built for large primes. Sambid is designed for small businesses competing for their first contracts.' },
  { icon: Lightbulb, title: 'AI That Actually Helps', description: 'AI proposal tools, RFP analysis, and Go/No-Go scoring — built to save hours of work on every bid you pursue.' },
  { icon: Shield,    title: 'Data You Can Trust',   description: 'All contract data comes directly from SAM.gov — the official US federal procurement database. No stale third-party feeds.' },
];

const problems = [
  'Hours spent manually searching SAM.gov every morning',
  'Wading through hundreds of irrelevant contracts to find one that fits',
  'Missing opportunities because the deadline passed before you saw it',
  'Not knowing who your competition is or what the incumbent charged',
  'Writing proposals from scratch for every bid, even similar ones',
];

export default function About() {
  const { isAuthenticated } = useAuth();
  const ctaTo = isAuthenticated ? '/dashboard' : '/signup';

  return (
    <div className="bg-white">
      <SEOHead
        title="About Sambid — Our Mission to Help Federal Contractors Win"
        description="Sambid was built to level the playing field for small and mid-size businesses competing for US federal contracts. Learn about our mission, our team, and why we built the smartest federal contract alert platform."
        keywords="about Sambid, federal contracting company, government contract alert startup, small business federal contracting tools, federal procurement platform mission, GovCon software company, federal contracting technology startup, best federal contracting platform"
        canonical="https://sambid.co/about"
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-20 sm:py-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5">
              Federal Contract Intelligence<br />for Every Small Business
            </h1>
            <p className="text-base sm:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
              Sambid was built to solve one problem: making it easy for small businesses to find, track, and win federal contracts — without spending hours on SAM.gov every day.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The problem we solve */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-5">The Problem</h2>
              <p className="text-gray-600 mb-6 leading-relaxed text-sm sm:text-base">
                The US federal government awards over <strong>$700 billion</strong> in contracts every year. More than
                <strong> $160 billion</strong> of that goes to small businesses. But most small contractors never see
                the majority of opportunities they qualify for — because finding them takes too much time and the tools that exist were built for large primes.
              </p>
              <ul className="space-y-3">
                {problems.map((problem, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-gray-700">
                    <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-red-600 font-bold text-xs">✕</span>
                    {problem}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-5">How Sambid Fixes It</h2>
              <p className="text-gray-600 mb-6 leading-relaxed text-sm sm:text-base">
                Enter your NAICS codes once. Sambid scans SAM.gov daily, filters every active contract to what matches your industry, and puts the results in a clean dashboard — with alerts, AI proposal tools, and competitive intelligence built in.
              </p>
              <ul className="space-y-3">
                {[
                  'Matched contracts delivered to your dashboard every day',
                  'Email alerts the moment a new opportunity appears',
                  'AI proposal builder cuts response time from hours to minutes',
                  'Winning bids data shows you what competitors are charging',
                  'Deadline calendar keeps every submission date visible',
                ].map((sol, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    {sol}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { value: 'SAM.gov',  label: 'Official data source' },
              { value: 'Daily',    label: 'Contract database refresh' },
              { value: '5 NAICS', label: 'Codes per account' },
              { value: '4 plans', label: 'For every stage of growth' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-2xl sm:text-3xl font-bold text-indigo-600 mb-1">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">What We Stand For</h2>
            <p className="text-base sm:text-lg text-gray-600">The principles behind every feature we build</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {values.map((value, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 rounded-2xl p-6 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Who Uses Sambid</h2>
            <p className="text-base sm:text-lg text-gray-600">Built for small businesses at every stage of federal contracting</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: 'New to Federal Contracting',
                desc: 'Just registered on SAM.gov and not sure where to start? Sambid surfaces real opportunities matched to your NAICS codes so you can start identifying which agencies buy what you sell.',
                icon: Search,
              },
              {
                title: 'Active Bidders',
                desc: 'Already submitting proposals but spending too much time sourcing? Sambid automates discovery, sends alerts, and cuts proposal writing time with AI tools.',
                icon: TrendingUp,
              },
              {
                title: 'Growing Contractors',
                desc: 'Have past performance and want more contract volume? Sambid\'s Pro and Enterprise plans give you deep SAM.gov history, competitive intelligence, and unlimited matches.',
                icon: Globe,
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  <card.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-14 sm:py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            See What Contracts You're Missing
          </h2>
          <p className="text-base sm:text-lg text-indigo-100 mb-7">
            Start your free 3-day trial. Get 15 real SAM.gov matches for your NAICS codes today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
