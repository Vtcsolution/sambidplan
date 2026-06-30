import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Play, ArrowRight, ChevronLeft, Loader2, Sparkles, Zap } from 'lucide-react';
import api from '../services/api';
import SEOHead from '../components/SEOHead';

// Per-feature keyword targeting — long-tail search intent for each tool
const FEATURE_KEYWORDS = {
  'contract-opportunities': 'federal contract opportunities, SAM.gov contract search, NAICS code matching, government contract finder, federal bid opportunities',
  'deadline-calendar':      'federal contract deadline tracker, SAM.gov submission deadlines, government bid calendar, contract due date reminders',
  'past-award-analysis':    'USASpending.gov award history, federal contract award data, who won government contracts, past performance research',
  'saved-opportunities':    'bookmark federal contracts, saved SAM.gov opportunities, government bid tracker, contract shortlist tool',
  'matched-opportunities':  'federal contract alerts, SAM.gov email notifications, government contract matching, real-time bid alerts',
  'ai-summarize':           'AI contract summarizer, SAM.gov RFP summary tool, federal solicitation analysis, AI government contract reader',
  'bid-analysis':           'federal bid no-bid analysis, AI bid decision tool, government contract win probability, should I bid on this contract',
  'proposal-builder':       'AI government proposal writer, federal proposal generator, RFP response tool, AI federal proposal software',
  'go-no-go':               'go no-go decision matrix, federal bid decision tool, government contract scoring, bid qualification checklist',
  'competitive-analysis':   'federal contract competitor analysis, government contracting competitive intelligence, who are my competitors federal contracts',
  'risk-assessment':        'federal contract risk assessment, government bid risk analysis, contract risk matrix tool',
  'rfp-analyzer':           'RFP analyzer tool, federal RFP requirement extraction, government solicitation analysis software',
  'capability-statement':   'AI capability statement generator, federal capability statement template, government contracting one-pager',
  'sources-sought':         'sources sought response generator, federal RFI response tool, government sources sought template',
  'bid-pipeline':           'federal bid pipeline tracker, government contract Kanban board, bid management software',
  'past-performance':       'SF-330 citation builder, federal past performance repository, government contract past performance tool',
  'teaming-finder':         'federal teaming partner finder, government contracting joint venture partner, subcontractor finder federal',
  'managed-service':        'managed federal bidding service, done-for-you government contract bidding, federal proposal writing service',
};

export default function FeatureShowcase() {
  const { slug } = useParams();
  const [feature, setFeature] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/features/${slug}`)
      .then(r => { if (r.data.success) setFeature(r.data.data); else setError('Feature not found.'); })
      .catch(() => setError('Failed to load feature.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (error || !feature) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">{error || 'Feature not found.'}</p>
        <Link to="/features" className="text-indigo-600 hover:underline">← Back to Features</Link>
      </div>
    </div>
  );

  const getVideoEmbed = (url) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vmMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
    if (url.endsWith('.mp4') || url.endsWith('.webm')) return 'direct';
    return url;
  };

  const embedUrl = getVideoEmbed(feature.videoUrl);

  const featureJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${feature.title} — Sambid`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: feature.subtitle,
    offers: { '@type': 'Offer', price: '49', priceCurrency: 'USD' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '127' },
  };

  return (
    <div className="bg-white overflow-hidden">
      <SEOHead
        title={`${feature.title} — Sambid`}
        description={`${feature.subtitle} Try Sambid free — AI-powered federal contract discovery for small businesses.`}
        keywords={FEATURE_KEYWORDS[slug] || `${feature.title.toLowerCase()}, federal contracting software, SAM.gov tools, government contract platform`}
        canonical={`https://sambid.co/features/${slug}`}
        jsonLd={featureJsonLd}
      />

      {/* ── Hero — same as home page dark gradient ── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-black opacity-20" />
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — text */}
            <div>
              <Link to="/features" className="inline-flex items-center gap-1 text-indigo-300 hover:text-white text-sm mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4" /> All Features
              </Link>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-5">
                <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                <span className="text-xs sm:text-sm font-medium">SamBid Feature</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent leading-tight">
                {feature.title}
              </h1>
              <p className="text-base sm:text-xl text-indigo-100 mb-8 leading-relaxed max-w-lg">
                {feature.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to={feature.ctaLink || '/signup'}
                  className="inline-flex items-center justify-center px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold transition-all hover:scale-105 text-sm sm:text-base">
                  {feature.ctaText || 'Try It Free'} <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link to="/pricing"
                  className="inline-flex items-center justify-center px-6 py-3.5 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all border border-white/20 text-sm sm:text-base">
                  View Pricing
                </Link>
              </div>
            </div>

            {/* Right — main video or thumbnail */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white/5" style={{ aspectRatio: '16/9' }}>
                {embedUrl && embedUrl !== 'direct' ? (
                  <iframe src={embedUrl} className="w-full h-full" frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen title={feature.title} />
                ) : embedUrl === 'direct' ? (
                  <video controls className="w-full h-full" preload="metadata">
                    <source src={feature.videoUrl} type="video/mp4" />
                  </video>
                ) : feature.thumbnailUrl ? (
                  <img src={feature.thumbnailUrl} alt={feature.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-3">
                        <Play className="w-7 h-7 text-white ml-1" />
                      </div>
                      <p className="text-indigo-300 text-sm font-medium">{feature.title}</p>
                      <p className="text-indigo-400/60 text-xs mt-1">Video demo</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Steps — alternating layout like home page phases ── */}
      {feature.steps?.length > 0 && (
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                How It Works
              </h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                Step-by-step walkthrough of {feature.title}
              </p>
            </div>

            <div className="space-y-20 sm:space-y-28">
              {feature.steps.map((step, idx) => {
                const reversed = idx % 2 !== 0;
                const stepNum = String(idx + 1).padStart(2, '0');
                return (
                  <div key={idx}
                    className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center rounded-3xl p-6 sm:p-10 ${
                      idx % 2 !== 0 ? 'bg-gray-50 border border-gray-100 shadow-sm' : 'bg-white'
                    } ${reversed ? 'lg:grid-flow-col-dense' : ''}`}
                  >
                    {/* Visual block — video, image, or placeholder */}
                    <div className={reversed ? 'lg:col-start-2' : ''}>
                      <div className="relative rounded-2xl overflow-hidden bg-indigo-50 border border-indigo-100 shadow-lg"
                        style={{ aspectRatio: '16/9' }}>
                        {step.videoUrl ? (() => {
                          const ve = getVideoEmbed(step.videoUrl);
                          if (ve && ve !== 'direct') return <iframe src={ve} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={step.title} />;
                          if (ve === 'direct') return <video controls className="w-full h-full" preload="metadata"><source src={step.videoUrl} type="video/mp4" /></video>;
                          return null;
                        })() : step.imageUrl ? (
                          <img src={step.imageUrl} alt={step.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center p-8">
                              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                                <span className="text-white font-bold text-xl">{stepNum}</span>
                              </div>
                              <p className="text-indigo-700 text-sm font-medium">{step.title}</p>
                              <p className="text-indigo-400 text-xs mt-1">Step {idx + 1}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Text block */}
                    <div className={reversed ? 'lg:col-start-1 lg:row-start-1' : ''}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold">
                          {stepNum}
                        </span>
                        <span className="text-indigo-600 text-sm font-semibold uppercase tracking-wide">
                          Step {idx + 1}
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-snug">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Benefits ── */}
      {feature.benefits?.length > 0 && (
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Why You'll Love It
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {feature.benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                  <CheckCircle className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-base leading-relaxed">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── AI Badge ── */}
      <section className="py-8 bg-white">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-sm text-indigo-700 font-medium">
            <Sparkles className="w-4 h-4" />
            AI-powered with real government data from SAM.gov & USASpending.gov
          </div>
        </div>
      </section>

      {/* ── CTA — same style as home page ── */}
      <section className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 py-16 sm:py-20">
        <div className="absolute inset-0 bg-black opacity-20" />
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-xl text-indigo-100 mb-7 max-w-2xl mx-auto">
            Join thousands of small businesses using SamBid to find, win, and deliver federal contracts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={feature.ctaLink || '/signup'}
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-100 transition-all hover:scale-105">
              {feature.ctaText || 'Try It Free'} <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link to="/pricing"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20">
              View Plans & Pricing
            </Link>
          </div>
          <p className="mt-4 text-indigo-200 text-xs">No credit card required · Cancel anytime</p>
        </div>
      </section>
    </div>
  );
}
