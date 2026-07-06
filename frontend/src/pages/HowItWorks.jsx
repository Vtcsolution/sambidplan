import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Zap, AlertCircle, CheckCircle,
  TrendingUp, Shield, Target, Award,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import SEOHead from '../components/SEOHead';

const ANIM_CSS = `
@keyframes _fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
.hw-fade { animation: _fadeUp 0.75s ease-out both; }
.reveal {
  opacity: 0; transform: translateY(22px);
  transition: opacity 0.55s ease-out, transform 0.55s ease-out;
}
.reveal.in { opacity: 1; transform: translateY(0); }
`;

function FadeIn({ children, delay = 0, className = '' }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.08 });
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

function FlowChip({ kind, children }) {
  const cls =
    kind === 'out'  ? 'bg-green-100 text-green-700 border-green-200' :
    kind === 'eng'  ? 'bg-slate-800 text-sky-300 border-slate-700' :
    kind === 'gold' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                     'bg-white text-indigo-700 border-indigo-200';
  return (
    <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${cls} leading-snug`}>
      {children}
    </span>
  );
}

const BEFORE = [
  '20-person team monitoring SAM.gov manually',
  '150 solicitations/day — 90% irrelevant',
  '$50,000/proposal for a human writer',
  'Missed deadlines, wrong NAICS, lost bids',
  'Bid decision: 3 days + consultant fees',
];
const AFTER = [
  '1–2 people, fully automated daily discovery',
  'Only matched, scored, ranked opportunities',
  'AI proposal draft in under 3 minutes',
  'Alerts at 7d / 24h / 1h — never miss a deadline',
  'Go/No-Go answer in 30 seconds',
];

const HERO_STATS = [
  { icon: Award,     val: '$760B',  lbl: 'Federal spend / year' },
  { icon: Target,    val: '$174B',  lbl: 'Mandated for small biz' },
  { icon: Shield,    val: '95%',    lbl: 'Small biz never win' },
  { icon: TrendingUp,val: '17',     lbl: 'Automated workflows' },
];

const AI_ENGINE = [
  { label: 'SAM.gov Opportunity', kind: 'in' }, { sep: '+' },
  { label: 'Company Profile', kind: 'in' }, { sep: '+' },
  { label: 'USASpending Awards', kind: 'gold' }, { sep: '→' },
  { label: 'Sambid AI Engine', kind: 'eng' }, { sep: '→' },
  { label: 'Company-Specific Output', kind: 'out' },
];

const PAIN_POINTS = [
  {
    num: '01',
    title: 'Wrong NAICS Code — $4B Opportunity Invisible to Everyone',
    pain: 'Contracting Officer enters wrong NAICS → your filter never sees it → competitor wins unopposed',
    solve: 'Sambid downloads every SAM.gov solicitation daily with no category filter — then runs a secondary keyword search per industry ("IT services", "cybersecurity", "cloud infrastructure") to catch postings where the contracting officer used the wrong code. A $4B IT contract mislabeled under a different industry code still lands in your feed. No other platform does this.',
    flow: [
      { label: 'All SAM.gov solicitations — no filter', kind: 'in' }, { sep: '→' },
      { label: 'Industry keyword cross-check', kind: 'in' }, { sep: '→' },
      { label: 'Marked relevant to your business', kind: 'in' }, { sep: '→' },
      { label: 'Your feed — including misclassified contracts', kind: 'out' },
    ],
  },
  {
    num: '02',
    title: 'Go / No-Go Decision — 3 Days of Consultant Time → 30 Seconds',
    pain: 'Bid decisions made on gut feel or skipped entirely — wasting proposal budget on unwinnable contracts',
    solve: 'AI reads the full opportunity (scope, set-aside, timeline, incumbent signals, value) against your Company Profile (UEI, CAGE, certifications, NAICS, capabilities) and USASpending history. Outputs a confidence-scored recommendation: Go / Lean Go / No-Go — with the 12 specific factors behind the call.',
    flow: [
      { label: 'Full opportunity + attachments', kind: 'in' }, { sep: '+' },
      { label: 'Company profile (UEI/CAGE/certs)', kind: 'in' }, { sep: '+' },
      { label: 'USASpending incumbent data', kind: 'gold' }, { sep: '→' },
      { label: 'Sambid AI', kind: 'eng' }, { sep: '→' },
      { label: 'Scored Go/No-Go + rationale', kind: 'out' },
    ],
  },
  {
    num: '03',
    title: 'Deadline Passed at 4:50 PM — You Opened It at 4:55 PM',
    pain: 'Federal deadlines are hard stops — one minute late = automatic disqualification, no exceptions, no appeal',
    solve: 'Three-stage automated alert system per opportunity: 7-day email (plan your team), 24-hour email + push notification (final review), 1-hour push to all devices + browser tab badge (last chance). If response deadline passes, opportunity is flagged "Expired — Do Not Submit" and removed from active pipeline automatically.',
    flow: [
      { label: 'Your saved opportunity deadlines', kind: 'in' }, { sep: '→' },
      { label: 'Background monitor — 24/7', kind: 'in' }, { sep: '→' },
      { label: '7-day / 24-hour / 1-hour triggers', kind: 'in' }, { sep: '→' },
      { label: 'Email + Chrome push + in-app — all at once', kind: 'out' },
    ],
  },
  {
    num: '04',
    title: 'Smart Filters — Find Winnable Contracts in 10 Seconds',
    pain: '1,500 new solicitations daily — your team reads hundreds of irrelevant ones before finding one worth pursuing',
    solve: 'Multi-dimensional real-time filter: NAICS code or industry keyword, city/state location, due date range (next 7/15/30/60/90 days), days left to apply, notice type, set-aside type, specific agency (DoD, NASA, VA...), contract value bracket, PSC code, and custom posted-date range.',
    flow: [
      { label: 'Your filter selections', kind: 'in' }, { sep: '→' },
      { label: 'Instant search across all live solicitations', kind: 'in' }, { sep: '→' },
      { label: 'Only the contracts that fit — ranked by match score', kind: 'out' },
    ],
  },
  {
    num: '05',
    title: 'Complete Opportunity Data — Nothing Missing, Direct SAM.gov Link',
    pain: 'Incomplete listings — no description, no attachments, no contact — waste hours chasing information that should be instant',
    solve: 'Sambid fetches every field SAM.gov returns: title, agency chain (department → subTier → office), NAICS + description, PSC code, set-aside type, place of performance, all points of contact, resource/attachment links, notice type, archive date, award details, and performance period. Every opportunity shows a direct "View on SAM.gov" button.',
    flow: [
      { label: 'SAM.gov daily download — all categories', kind: 'in' }, { sep: '→' },
      { label: 'Every field captured and stored', kind: 'in' }, { sep: '→' },
      { label: 'Matched and scored against your profile', kind: 'in' }, { sep: '→' },
      { label: 'Complete listing + one-click SAM.gov link', kind: 'out' },
    ],
  },
  {
    num: '06',
    title: 'Submission Deadline Calendar — Every Active Bid, Visible at Once',
    pain: 'Teams track deadlines in shared spreadsheets that get out of sync — someone always has the wrong date',
    solve: 'Full calendar view of every opportunity in your bid pipeline with response deadlines plotted by day. Color-coded urgency (green → yellow → red as deadline approaches). Team members all see the same live calendar — no spreadsheet, no manual updates.',
    flow: [
      { label: 'Your saved and pipeline opportunities', kind: 'in' }, { sep: '→' },
      { label: 'Auto-plotted on shared team calendar', kind: 'in' }, { sep: '→' },
      { label: 'Live deadline view — same for every team member', kind: 'out' },
    ],
  },
  {
    num: '07',
    title: 'Who Won — Stop Bidding Blind, Know the Incumbent',
    pain: 'You bid $2.1M. Incumbent renewed at $1.8M for the 4th time. You had no idea they existed.',
    solve: "USASpending.gov historical award data matched against the active opportunity by NAICS code, agency, and contract type. Sambid shows who won this or a similar contract before, what they were paid, what certifications they hold, and how many times they've renewed — turning history into tactical advantage.",
    flow: [
      { label: 'USASpending past awards', kind: 'in' }, { sep: '+' },
      { label: 'Opportunity NAICS + agency', kind: 'in' }, { sep: '+' },
      { label: 'Your company profile', kind: 'in' }, { sep: '→' },
      { label: 'Incumbent ID + price benchmarks + your advantage points', kind: 'out' },
    ],
  },
  {
    num: '08',
    title: 'Smart Alerts — Relevant Opportunities Find You in Real Time',
    pain: 'By the time your team finds a new solicitation manually, the best teaming partners are already taken',
    solve: 'Custom alert rules by keyword, NAICS code, agency name, set-aside type, and contract value range. When a match fires: in-app notification, email digest (real-time for Pro/Enterprise, daily for Starter), and Chrome push notification to desktop/mobile even when the browser tab is closed.',
    flow: [
      { label: 'New opportunity posted', kind: 'in' }, { sep: '→' },
      { label: 'Alert rule match check', kind: 'in' }, { sep: '→' },
      { label: 'Email + Chrome push + in-app — simultaneously', kind: 'out' },
    ],
  },
  {
    num: '09',
    title: 'AI Proposal Builder — Full Draft in 3 Minutes, Not 3 Weeks',
    pain: "$5,000–$50,000 per proposal for a human writer. Lose the bid, lose the investment. Most small businesses can't afford to bid.",
    solve: "AI reads the full RFP (including attached PDFs), extracts all technical requirements, evaluation criteria, and submission format rules — then writes a structured, compliant proposal draft: Executive Summary, Technical Approach, Management Plan, Past Performance, and Pricing Narrative. Upload a sample winning proposal — the AI adopts its structure and tone.",
    flow: [
      { label: 'RFP full text + attachments', kind: 'in' }, { sep: '+' },
      { label: 'Company profile + past performance', kind: 'in' }, { sep: '+' },
      { label: 'Sample proposal (optional)', kind: 'gold' }, { sep: '→' },
      { label: 'Sambid AI', kind: 'eng' }, { sep: '→' },
      { label: 'Complete compliant proposal draft', kind: 'out' },
    ],
  },
  {
    num: '10',
    title: 'Past Performance — Your Win History Becomes a Competitive Weapon',
    pain: 'Every proposal needs Past Performance citations. Pulling them from old contracts takes days and produces inconsistent write-ups.',
    solve: 'Structured Past Performance database inside your Company Profile. USASpending integration auto-imports your historical federal awards by UEI — no manual entry for existing federal work. When AI Proposal Builder runs, it selects and formats the 3 most relevant citations automatically based on scope match.',
    flow: [
      { label: 'Federal award history (auto-imported by UEI)', kind: 'in' }, { sep: '+' },
      { label: 'Manually added past contracts', kind: 'in' }, { sep: '→' },
      { label: 'Saved as ready-to-use citations', kind: 'in' }, { sep: '→' },
      { label: 'Best-fit citations auto-selected in every proposal', kind: 'out' },
    ],
  },
  {
    num: '11',
    title: 'Sources Sought Generator — Turn Market Research Notices into Pipeline',
    pain: 'Most companies ignore Sources Sought notices — the companies that respond shape the requirement and often win the follow-on contract.',
    solve: 'When you save a Sources Sought notice, Sambid AI drafts a response: capability narrative tailored to the stated requirement, relevant NAICS and PSC codes, certifications highlighted (8(a), WOSB, HUBZone, SDVOSB), and a concise past performance example from your profile. Responding is now a 2-minute action, not a half-day project.',
    flow: [
      { label: 'Saved Sources Sought notice', kind: 'in' }, { sep: '+' },
      { label: 'Company profile + certs + past perf', kind: 'in' }, { sep: '→' },
      { label: 'Sambid AI', kind: 'eng' }, { sep: '→' },
      { label: 'Targeted response — ready to submit', kind: 'out' },
    ],
  },
  {
    num: '12',
    title: 'Capability Statement Generator — One Page That Opens Doors',
    pain: "A federal cap statement that's outdated, generic, or formatted wrong gets discarded by procurement officers in under 5 seconds.",
    solve: 'Pulls directly from your Company Profile (UEI, CAGE, NAICS codes with descriptions, core capabilities, certifications, differentiators, past performance highlights, contact info) and generates a formatted, one-page federal capability statement. Tailored version available per opportunity.',
    flow: [
      { label: 'Company Profile (all fields)', kind: 'in' }, { sep: '+' },
      { label: 'Target opportunity (optional)', kind: 'gold' }, { sep: '→' },
      { label: 'Sambid AI', kind: 'eng' }, { sep: '→' },
      { label: 'Formatted 1-page federal cap statement PDF', kind: 'out' },
    ],
  },
  {
    num: '13',
    title: 'RFP Analyzer — 400-Page Document Understood in 3 Minutes',
    pain: 'A 400-page RFP with 12 attachments takes 3 days for a compliance team to parse. Small businesses simply skip it and lose.',
    solve: "Upload any RFP PDF. AI extracts: mandatory requirements (M-sections), evaluation criteria with point weights, submission format checklist, key dates, incumbent information, and red-flag clauses (unusual IP ownership, unrealistic timelines, vague acceptance criteria). Outputs a compliance matrix — green/yellow/red on every requirement.",
    flow: [
      { label: 'RFP PDF (uploaded or from SAM.gov)', kind: 'in' }, { sep: '+' },
      { label: 'Company capabilities', kind: 'in' }, { sep: '→' },
      { label: 'Sambid AI', kind: 'eng' }, { sep: '→' },
      { label: 'Compliance matrix + red-flag report', kind: 'out' },
    ],
  },
  {
    num: '14',
    title: 'Teaming Finder — Win Contracts That Are Too Big to Win Alone',
    pain: "A $50M contract needs capabilities you don't have. The contract goes to someone who found a partner at last year's conference.",
    solve: "Sambid identifies which capabilities the opportunity requires that your company doesn't cover, then searches the federal vendor registry (140K+ registered businesses) for verified companies with complementary expertise, active federal registrations, and compatible set-aside certifications.",
    flow: [
      { label: 'Your capability gaps vs opportunity requirements', kind: 'in' }, { sep: '→' },
      { label: 'Federal vendor registry — 140K+ businesses', kind: 'in' }, { sep: '→' },
      { label: 'Ranked teaming partner suggestions — ready to contact', kind: 'out' },
    ],
  },
  {
    num: '15',
    title: 'Market Intelligence — Know Where the Money Is Going Before Others Do',
    pain: "You're bidding in markets that agencies are quietly exiting, while missing sectors where spending is accelerating.",
    solve: 'USASpending historical award data aggregated by agency, NAICS, quarter, and fiscal year. Shows which agencies increased spending in the last 4 quarters, which NAICS codes have the highest award volume and lowest competition density, and which agencies have upcoming recompete cycles.',
    flow: [
      { label: 'Federal award history — multiple years', kind: 'in' }, { sep: '+' },
      { label: 'Your industry and certifications', kind: 'in' }, { sep: '→' },
      { label: 'Spend trends + competition density + recompete radar', kind: 'out' },
    ],
  },
  {
    num: '16',
    title: 'Contract Vehicle Tracker — Stop Missing On-Ramp Windows',
    pain: 'GSA Schedule, SEWP V, CIO-SP3, OASIS+ — on-ramp windows open once every few years. Missing them locks you out for the next 5–10 years.',
    solve: 'Tracks all major IDIQ, GWAC, and BPA contract vehicles: type, eligibility requirements, current on-ramp status (open / closed / upcoming), expiration dates, ceiling values, and which agencies use them most. Matches your Company Profile against eligibility and flags vehicles you qualify for today.',
    flow: [
      { label: 'Contract vehicle database', kind: 'in' }, { sep: '+' },
      { label: 'Company certs + NAICS', kind: 'in' }, { sep: '→' },
      { label: 'Eligibility match + on-ramp alerts', kind: 'out' },
    ],
  },
  {
    num: '17',
    title: 'Company Workspace — One Source of Truth for Everything',
    pain: 'Company info scattered across email threads, SharePoint folders, and old proposal hard drives. Every proposal starts from scratch — the same mistakes repeated.',
    solve: "Company Profile (UEI, CAGE, certifications, NAICS codes, core capabilities) is the single context layer all 17 AI features pull from. Team Management with role-based access (admin / analyst / viewer). Document Library for past proposals, cap statements, teaming agreements. Managed Service: Sambid's team monitors, writes, and submits bids on your behalf.",
    flow: [
      { label: 'Company profile — registrations, certs, capabilities', kind: 'in' }, { sep: '→' },
      { label: 'Powers all 17 features as shared context', kind: 'in' }, { sep: '→' },
      { label: 'Team roles control what each person sees', kind: 'in' }, { sep: '→' },
      { label: 'Every output is company-specific, never generic', kind: 'out' },
    ],
  },
];

export default function HowItWorks() {
  const { isAuthenticated } = useAuth();
  const ctaHref  = isAuthenticated ? '/dashboard' : '/signup';
  const ctaLabel = isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial';

  return (
    <div className="overflow-hidden bg-white">
      <style>{ANIM_CSS}</style>
      <SEOHead
        title="How Sambid Works — Federal Contract Intelligence Platform"
        description="Sambid replaces a 20-person federal BD team with 17 automated workflows. See every pain point and exactly how we solve it."
        keywords="how sambid works, federal contract automation, SAM.gov intelligence, bid intelligence, federal BD automation, government contract AI"
        canonical="https://sambid.co/how-it-works"
      />

      {/* ── Hero — 2-column matching home page ───────────────── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left — text */}
            <div className="hw-fade">
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-6">
                <Zap className="w-4 h-4 mr-2 text-yellow-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  Intelligence Brief — Expert Edition
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-5 sm:mb-6 leading-tight">
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  Federal BD Intelligence.
                </span>
                <span className="block text-2xl sm:text-4xl md:text-5xl mt-2 text-indigo-200 font-semibold">
                  Automated.
                </span>
              </h1>

              <p className="text-base sm:text-xl text-indigo-100 mb-7 sm:mb-8 leading-relaxed max-w-lg">
                Sambid replaces a 20-person BD team with 17 automated workflows — daily contract discovery, AI-drafted proposals, deadline alerts, and Go/No-Go decisions. One platform, one person, maximum wins.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to={ctaHref}
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105 text-sm sm:text-base"
                >
                  {ctaLabel}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl font-semibold transition-all duration-200 border border-white/20 text-sm sm:text-base"
                >
                  View Pricing
                </Link>
              </div>

              <p className="mt-5 text-indigo-300 text-xs sm:text-sm">
                No credit card required · Cancel anytime · Setup in 5 minutes
              </p>
            </div>

            {/* Right — platform overview card */}
            <div className="hw-fade" style={{ animationDelay: '0.2s' }}>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 sm:p-8 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs text-indigo-300 uppercase tracking-widest mb-1">Platform Overview</p>
                    <p className="text-white font-bold text-lg">17 Automated Workflows</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {HERO_STATS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={i} className="bg-white/8 rounded-xl p-4 border border-white/10">
                        <Icon className="w-4 h-4 text-indigo-300 mb-2" />
                        <div className="text-xl font-bold text-white">{s.val}</div>
                        <div className="text-xs text-indigo-300 mt-0.5">{s.lbl}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Before → After compact */}
                <div className="rounded-xl border border-white/10 overflow-hidden text-xs">
                  <div className="flex">
                    <div className="flex-1 bg-red-500/10 border-r border-white/10 px-3 py-2.5">
                      <p className="text-red-300 font-bold uppercase tracking-wider text-[10px] mb-1">Before</p>
                      <p className="text-white/70">20-person team · $50K proposals · missed deadlines</p>
                    </div>
                    <div className="flex-1 bg-green-500/10 px-3 py-2.5">
                      <p className="text-green-300 font-bold uppercase tracking-wider text-[10px] mb-1">After</p>
                      <p className="text-white/70">1–2 people · AI drafts · 30-sec decisions</p>
                    </div>
                  </div>
                </div>

                {/* AI Engine mini flow */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">AI Engine</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { t: 'SAM.gov', c: 'bg-indigo-500/20 text-indigo-200' },
                      { t: '+', c: 'text-white/40 font-bold' },
                      { t: 'Company Profile', c: 'bg-indigo-500/20 text-indigo-200' },
                      { t: '+', c: 'text-white/40 font-bold' },
                      { t: 'USASpending', c: 'bg-amber-500/20 text-amber-300' },
                      { t: '→', c: 'text-white/40 font-bold' },
                      { t: 'Sambid AI', c: 'bg-slate-700 text-sky-300' },
                      { t: '→', c: 'text-white/40 font-bold' },
                      { t: 'Your Output', c: 'bg-green-500/20 text-green-300' },
                    ].map((item, i) =>
                      item.c.includes('font-bold') && !item.c.includes('bg-')
                        ? <span key={i} className={`text-xs ${item.c}`}>{item.t}</span>
                        : <span key={i} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.c}`}>{item.t}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Before / After — full detail ─────────────────────── */}
      <section className="py-14 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-3">
              The Problem We Solve
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              What Changes When You Use Sambid
            </h2>
          </FadeIn>

          <FadeIn>
            <div className="grid md:grid-cols-[1fr_56px_1fr] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <div className="bg-red-50 p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Without Sambid — Today</span>
                </div>
                <ul className="space-y-3">
                  {BEFORE.map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center bg-white border-y md:border-y-0 md:border-x border-gray-200 py-6 md:py-0">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <div className="bg-green-50 p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-xs font-bold text-green-600 uppercase tracking-wider">With Sambid — Tomorrow</span>
                </div>
                <ul className="space-y-3">
                  {AFTER.map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-8">
            Federal Market — At a Glance
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center">
            {HERO_STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <FadeIn key={i} delay={i * 80}>
                  <div className="flex justify-center mb-2">
                    <Icon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{s.val}</div>
                  <div className="text-xs sm:text-sm text-gray-500 leading-relaxed">{s.lbl}</div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI Engine ─────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-3">
              The Intelligence Layer
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              One AI Engine Powers All 17 Workflows
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              Every feature draws from the same intelligence layer. The output is never generic — it knows your registrations, certifications, capabilities, and past contracts before it writes a single word.
            </p>
          </FadeIn>

          <FadeIn>
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 sm:p-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">How the AI Engine Works</p>
              <div className="flex flex-wrap items-center gap-2">
                {AI_ENGINE.map((item, i) =>
                  item.sep
                    ? <span key={i} className="text-gray-400 text-sm font-bold shrink-0">{item.sep}</span>
                    : <FlowChip key={i} kind={item.kind}>{item.label}</FlowChip>
                )}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 17 Pain Points ────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-3">
              17 Problems. 17 Solutions.
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              What Is Costing You Contracts
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              Every pain point a federal contractor faces — and exactly how Sambid eliminates it, with the full automated workflow shown.
            </p>
          </FadeIn>

          <div className="space-y-4">
            {PAIN_POINTS.map((pp, idx) => (
              <FadeIn key={pp.num} delay={Math.min(idx * 30, 150)}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">

                  {/* Card header — number + title */}
                  <div className="flex items-start gap-4 px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {pp.num}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug pt-1">
                      {pp.title}
                    </h3>
                  </div>

                  {/* Pain badge */}
                  <div className="mx-5 sm:mx-6 mb-4 flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-red-700 font-medium leading-relaxed">
                      {pp.pain}
                    </p>
                  </div>

                  {/* Solution text */}
                  <p className="px-5 sm:px-6 mb-4 text-sm text-gray-600 leading-relaxed">
                    {pp.solve}
                  </p>

                  {/* Automated workflow flow */}
                  <div className="mx-5 sm:mx-6 mb-5 sm:mb-6 bg-indigo-50 rounded-xl px-4 py-3.5">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2.5">
                      Automated Workflow
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {pp.flow.map((item, i) =>
                        item.sep
                          ? <span key={i} className="text-gray-400 text-xs font-bold shrink-0">{item.sep}</span>
                          : <FlowChip key={i} kind={item.kind}>{item.label}</FlowChip>
                      )}
                    </div>
                  </div>

                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────── */}
      <section className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 py-16 sm:py-20">
        <div className="absolute inset-0 bg-black opacity-10" />
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            The Bottom Line for Expert Contractors
          </h2>
          <p className="text-base sm:text-lg text-indigo-100 mb-8 max-w-3xl mx-auto leading-relaxed">
            Every contract you lost in the last 12 months had a reason. A solicitation your team never saw. A deadline missed by hours. A proposal that read like a template. An incumbent you didn&apos;t know existed. None of those are failures of capability — they are failures of intelligence. Your competitors aren&apos;t smarter. They just had better information, faster. Sambid is that information.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              to={ctaHref}
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-100 transition-all hover:scale-105"
            >
              {ctaLabel}
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
            No credit card required &middot; Cancel anytime &middot; Setup in 5 minutes
          </p>
        </div>
      </section>

    </div>
  );
}
