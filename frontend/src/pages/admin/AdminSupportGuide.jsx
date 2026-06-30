import { useState, useEffect } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Target, Star, TrendingUp, Users, CheckCircle,
  ChevronDown, ChevronUp, Building2, Lightbulb, Globe, MessageSquare,
  Mail, BookOpen, Linkedin, Lock, Unlock, AlertCircle, Clock, Rocket,
  Heart, BarChart3, RefreshCw, ArrowRight, Shield, Wallet, Loader2,
} from 'lucide-react';
import { adminPanelAPI, supportAPI } from '../../services/adminApi';

// ── helpers ─────────────────────────────────────────────────────────────────────
const fmt = n => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = r => `${+(Number(r || 0) * 100).toFixed(2)}%`;

// Fallback prices — only used until the live plan prices load (or if the fetch fails).
const FALLBACK = {
  starter:    { displayName: 'Starter',    priceMonthly: 29,  priceYearly: 279  },
  pro:        { displayName: 'Pro',        priceMonthly: 79,  priceYearly: 758  },
  enterprise: { displayName: 'Enterprise', priceMonthly: 499, priceYearly: 4790 },
};

// ── FAQ accordion item ─────────────────────────────────────────────────────────
function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition">
        <span className="font-semibold text-gray-900 text-sm pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

// ── Earning calculator ─────────────────────────────────────────────────────────
function Calculator({ planList, first, recurring, target }) {
  const [counts, setCounts] = useState({ starter: 5, proM: 5, proY: 2, entM: 1, entY: 0 });

  const oneTime     = planList.reduce((s, p) => s + (counts[p.key] || 0) * p.price * first, 0);
  const targetCount = planList.filter(p => p.counts).reduce((s, p) => s + (counts[p.key] || 0), 0);
  const recurringMonthly = planList.filter(p => p.recurringEligible && p.cycle === 'monthly')
    .reduce((s, p) => s + (counts[p.key] || 0) * p.price * recurring, 0);
  const recurringYearly = planList.filter(p => p.recurringEligible && p.cycle === 'yearly')
    .reduce((s, p) => s + (counts[p.key] || 0) * p.price * recurring, 0);
  const totalRecurring = recurringMonthly * 12 + recurringYearly;
  const unlocked = targetCount >= target;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Earnings Calculator</h3>
      <p className="text-sm text-gray-500 mb-5">Enter how many companies you plan to refer per plan to see your projected income.</p>

      <div className="space-y-3 mb-6">
        {planList.map(p => (
          <div key={p.key} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-800 w-40">{p.label}</span>
                <span className="text-xs text-gray-400">{fmt(p.price)}/purchase</span>
                {p.counts && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">counts to target</span>
                )}
              </div>
            </div>
            <input
              type="number" min={0} max={1000} value={counts[p.key]}
              onChange={e => setCounts(c => ({ ...c, [p.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
              className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <span className="text-sm font-bold text-green-600 w-24 text-right">
              {fmt((counts[p.key] || 0) * p.price * first)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total One-Time Earnings ({pct(first)})</span>
          <span className="text-lg font-black text-green-600">{fmt(oneTime)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Pro/Enterprise count</span>
            {unlocked
              ? <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium"><Unlock className="w-3 h-3" />Unlocked!</span>
              : <span className="text-xs text-gray-500 font-medium">{target - targetCount} more to unlock</span>}
          </div>
          <span className={`text-lg font-black ${unlocked ? 'text-indigo-600' : 'text-gray-400'}`}>{targetCount} / {target}</span>
        </div>

        {unlocked ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Monthly Recurring ({pct(recurring)}) — after unlock</span>
              <span className="text-lg font-black text-indigo-600">{fmt(recurringMonthly)}/mo</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Annual Recurring (monthly × 12 + yearly)</span>
              <span className="text-lg font-black text-indigo-600">{fmt(totalRecurring)}/yr</span>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 mt-2">
              <p className="text-xs text-indigo-600 font-semibold mb-1">TOTAL YEAR-1 PROJECTED</p>
              <p className="text-3xl font-black text-indigo-700">{fmt(oneTime + totalRecurring)}</p>
              <p className="text-xs text-gray-500 mt-1">One-time + full year of recurring commissions</p>
            </div>
          </>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Recurring locked</p>
              <p className="text-xs text-gray-500">Add {target - targetCount} more Pro/Enterprise referrals above to see recurring projections unlock.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Phase step card ────────────────────────────────────────────────────────────
function PhaseCard({ number, title, timeframe, color, icon: Icon, steps, result }) {
  const colors = {
    blue:   { bg: 'bg-blue-600',   light: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   num: 'bg-blue-600' },
    green:  { bg: 'bg-green-600',  light: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  num: 'bg-green-600' },
    indigo: { bg: 'bg-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', num: 'bg-indigo-600' },
    purple: { bg: 'bg-purple-600', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', num: 'bg-purple-600' },
  };
  const c = colors[color];
  return (
    <div className={`rounded-2xl border-2 ${c.border} ${c.light} p-6`}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-10 h-10 ${c.num} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold ${c.text} uppercase tracking-wide`}>Phase {number}</span>
            <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">{timeframe}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mt-0.5">{title}</h3>
        </div>
      </div>
      <ul className="space-y-2 mb-4">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle className={`w-4 h-4 ${c.text} shrink-0 mt-0.5`} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
      {result && (
        <div className={`${c.bg} rounded-xl px-4 py-3`}>
          <p className="text-white text-sm font-semibold">{result}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page (rendered inside AdminLayout outlet) ───────────────────────────────
export default function AdminSupportGuide() {
  const navigate = useNavigate();
  const [plans,   setPlans]   = useState({});               // keyed by plan.name
  const [rates,   setRates]   = useState({ first: 0.15, recurring: 0.075, target: 100, minWithdrawal: 100 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [planRes, statsRes] = await Promise.allSettled([
        adminPanelAPI.getPlans(),
        supportAPI.getStats(),
      ]);
      if (planRes.status === 'fulfilled') {
        const arr = planRes.value.data?.data || [];
        const map = {};
        arr.forEach(p => { map[p.name] = p; });
        setPlans(map);
      }
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data?.data || {};
        setRates(r => ({
          first:         d.firstPurchaseRate ?? r.first,
          recurring:     d.recurringRate     ?? r.recurring,
          target:        d.targetGoal        ?? r.target,
          minWithdrawal: d.minWithdrawal     ?? r.minWithdrawal,
        }));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ── Derived, live-priced values ────────────────────────────────────────────
  const getPlan = name => plans[name] || FALLBACK[name] || { displayName: name, priceMonthly: 0, priceYearly: 0 };
  const dn = name => getPlan(name).displayName || name;
  const pM = name => getPlan(name).priceMonthly;
  const pY = name => getPlan(name).priceYearly;

  const { first, recurring, target, minWithdrawal } = rates;
  const starterM = pM('starter');
  const proM = pM('pro'), proY = pY('pro');
  const entM = pM('enterprise'), entY = pY('enterprise');

  // One-time commission table (every plan, first purchase)
  const oneTimeRows = [
    [`${dn('starter')} Monthly`,    starterM],
    [`${dn('pro')} Monthly`,        proM],
    [`${dn('pro')} Yearly`,         proY],
    [`${dn('enterprise')} Monthly`, entM],
    [`${dn('enterprise')} Yearly`,  entY],
  ];

  // Recurring commission table (Pro & Enterprise renewals only)
  const recurringRows = [
    [`${dn('pro')} Monthly renewal`,        proM, '/mo'],
    [`${dn('pro')} Yearly renewal`,         proY, '/yr'],
    [`${dn('enterprise')} Monthly renewal`, entM, '/mo'],
    [`${dn('enterprise')} Yearly renewal`,  entY, '/yr'],
  ];

  // Calculator plan rows
  const planList = [
    { key: 'starter', label: `${dn('starter')} Monthly`,    price: starterM, counts: false, cycle: 'monthly', recurringEligible: false },
    { key: 'proM',    label: `${dn('pro')} Monthly`,         price: proM,     counts: true,  cycle: 'monthly', recurringEligible: true  },
    { key: 'proY',    label: `${dn('pro')} Yearly`,          price: proY,     counts: true,  cycle: 'yearly',  recurringEligible: true  },
    { key: 'entM',    label: `${dn('enterprise')} Monthly`,  price: entM,     counts: true,  cycle: 'monthly', recurringEligible: true  },
    { key: 'entY',    label: `${dn('enterprise')} Yearly`,   price: entY,     counts: true,  cycle: 'yearly',  recurringEligible: true  },
  ];

  // Milestones (driven by live Pro Monthly price + rates)
  const oneTimePerPro     = proM * first;
  const recurringPerProMo = proM * recurring;
  const firstWRefs        = oneTimePerPro > 0 ? Math.max(1, Math.ceil(minWithdrawal / oneTimePerPro)) : 1;
  const half              = Math.round(target / 2);
  const milestones = [
    { label: 'First Withdrawal',  refs: firstWRefs, active: false, note: `Unlock withdrawal at ${fmt(minWithdrawal)} balance` },
    { label: 'Growing Fast',      refs: 20,         active: false, note: `20 one-time commissions at ${fmt(oneTimePerPro)} each` },
    { label: 'Halfway to Target', refs: half,       active: false, note: `${half} Pro/Enterprise counted toward ${target} goal` },
    { label: 'Target Unlocked!',  refs: target,     active: true,  note: '🎉 Recurring commissions now active' },
    { label: 'Scale Up',          refs: target * 2, active: true,  note: `${fmt(target * 2 * recurringPerProMo * 12)}+ per year from recurring alone` },
    { label: 'Full Passive Mode', refs: target * 5, active: true,  note: `${fmt(target * 5 * recurringPerProMo * 12)}+/year — true lifetime income` },
  ];

  const faqs = [
    {
      q: `What counts toward the ${target} Pro/Enterprise target?`,
      a: `Only companies that make their FIRST purchase on the Pro or Enterprise plan (monthly or yearly) count toward your ${target} target. Starter plan purchases do NOT count. Once a company buys Pro or Enterprise for the first time, they count — even if they later downgrade.`,
    },
    {
      q: `When exactly do I earn the ${pct(first)} one-time commission?`,
      a: `You earn ${pct(first)} the moment a referred company completes their very first payment — on any plan (Starter, Pro, or Enterprise, monthly or yearly). This is a one-time reward per company. You do not earn ${pct(first)} again if the same company renews.`,
    },
    {
      q: `Once I unlock recurring commissions, what triggers the ${pct(recurring)}?`,
      a: `After you hit ${target} Pro/Enterprise referrals, every time any of your referred companies pays their Pro or Enterprise renewal — monthly or yearly — you earn ${pct(recurring)} of that payment automatically. Starter renewals do not earn recurring commissions.`,
    },
    {
      q: 'How do I know if someone used my referral link?',
      a: 'Your Referral Earnings page shows every company that signed up via your link. You can see their name, the plan they purchased, your commission earned, and their signup date.',
    },
    {
      q: 'When can I withdraw my earnings?',
      a: `You can request a withdrawal once your balance reaches the ${fmt(minWithdrawal)} minimum. Submit a request from your Referral Earnings page with your PayPal email, bank/IBAN details, or mailing address. Admin processes withdrawals within 3–5 business days.`,
    },
    {
      q: 'What happens if a referred company cancels and then re-subscribes later?',
      a: `If a company cancels and comes back, their renewal payment still earns you ${pct(recurring)} recurring — provided your recurring commission is already unlocked. You only earn the ${pct(first)} one-time on their original first-ever purchase.`,
    },
    {
      q: 'What discount does the referred company get?',
      a: 'Any company that signs up through your referral link automatically gets 20% off their plan — applied at checkout. This discount makes it easier for you to convince companies to use your link since they benefit directly.',
    },
    {
      q: 'Do I earn commissions on yearly plan purchases?',
      a: `Yes. The ${pct(first)} one-time commission applies to yearly plans too (which are higher amounts, so your commission is larger). For example, a ${dn('pro')} Yearly at ${fmt(proY)} earns you ${fmt(proY * first)} in one-time commission. Yearly plan renewals also earn ${pct(recurring)} if your recurring is unlocked.`,
    },
    {
      q: 'What is the best type of company to refer?',
      a: 'The ideal referral is a small business that actively bids on US federal government contracts — typically with $100K to $10M in annual contract revenue. These companies need contract opportunity alerts and bid analysis tools most urgently and are the most likely to pay for Pro or Enterprise plans.',
    },
  ];

  return (
    <div className="space-y-10">

      {/* ── Page title ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earning Guide<AdminHowItWorks page="supportGuide" /></h1>
          <p className="text-sm text-gray-500">Your complete playbook for building lifetime income from referrals.</p>
        </div>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-16" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-indigo-200 uppercase tracking-wide">Complete Earning Guide</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">
            Your Path to<br />Lifetime Earnings
          </h2>
          <p className="text-indigo-100 text-base max-w-xl mb-6">
            Follow this step-by-step guide to earn commissions today, build toward the {target}-company target, and unlock a monthly income stream that pays you every time a company renews — forever.
          </p>
          <div className="flex flex-wrap gap-4">
            {[
              { icon: Star,   label: `${pct(first)} One-Time`,     sub: 'on first purchase, any plan' },
              { icon: Trophy, label: `${pct(recurring)} Recurring`, sub: `monthly, after ${target} target` },
              { icon: Target, label: `${target} Companies`,         sub: 'Pro or Enterprise to unlock' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 bg-white/15 rounded-2xl px-4 py-3 backdrop-blur">
                <Icon className="w-5 h-5 text-indigo-200 shrink-0" />
                <div>
                  <p className="font-bold text-white text-sm">{label}</p>
                  <p className="text-xs text-indigo-200">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How commissions work ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1">How Commissions Work</h2>
        <p className="text-sm text-gray-500 mb-5">Two reward types — one immediate, one long-term.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Type 1 — one-time (green = money earned now) */}
          <div className="bg-white rounded-2xl border border-green-200 p-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Star className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{pct(first)} One-Time Commission</h3>
            <p className="text-sm text-gray-500 mb-4">Earned the instant a referred company makes their very first payment — regardless of plan.</p>
            <div className="space-y-2">
              {oneTimeRows.map(([plan, price]) => (
                <div key={plan} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{plan} ({fmt(price)})</span>
                  <span className="font-bold text-green-600">{fmt(price * first)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-green-50 rounded-xl px-3 py-2 text-xs text-green-700">
              <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
              Paid automatically on every plan, every first purchase.
            </div>
          </div>

          {/* Type 2 — recurring (indigo = premium / brand) */}
          <div className="bg-white rounded-2xl border border-indigo-200 p-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <Trophy className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{pct(recurring)} Recurring Commission</h3>
            <p className="text-sm text-gray-500 mb-2">Earned every month/year when referred companies renew their Pro or Enterprise plan — <strong>after you hit {target} Pro/Enterprise referrals.</strong></p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4">
              <p className="text-xs text-gray-600 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Locked until you refer {target} Pro/Enterprise companies
              </p>
            </div>
            <div className="space-y-2">
              {recurringRows.map(([plan, price, suffix]) => (
                <div key={plan} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{plan} ({fmt(price)})</span>
                  <span className="font-bold text-indigo-600">{fmt(price * recurring)}{suffix}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-indigo-50 rounded-xl px-3 py-2 text-xs text-indigo-700">
              <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
              Starter renewals do not earn recurring. Pro &amp; Enterprise only.
            </div>
          </div>
        </div>
      </section>

      {/* ── 4-Phase Roadmap ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Your 4-Phase Roadmap</h2>
        <p className="text-sm text-gray-500 mb-5">Follow these phases in order to maximize your lifetime earning potential.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PhaseCard
            number={1} color="blue" icon={Rocket} timeframe="Day 1"
            title="Get Set Up"
            steps={[
              'Copy your unique referral link from the Referral Earnings page.',
              'Understand your 20% discount advantage — companies save money by using your link.',
              'Identify your first 10 target contacts: small federal contractors you already know.',
              'Prepare a short outreach message (see templates below).',
            ]}
            result="Goal: Share your link with 10 potential companies in your first week."
          />
          <PhaseCard
            number={2} color="green" icon={TrendingUp} timeframe="Week 1–4"
            title={`Start Earning ${pct(first)}`}
            steps={[
              'Share your referral link broadly — LinkedIn, email, direct message.',
              'Focus on ANY plan first to build your balance and cash flow.',
              `Every signup earns you ${pct(first)} on their first purchase automatically.`,
              `Example: 20 companies buy ${dn('starter')} (${fmt(starterM)}) → you earn ${fmt(20 * starterM * first)} immediately.`,
              `Example: 5 companies buy ${dn('pro')} (${fmt(proM)}) → you earn ${fmt(5 * proM * first)} immediately.`,
            ]}
            result={`Goal: Earn your first ${fmt(minWithdrawal)}+ and make your first withdrawal.`}
          />
          <PhaseCard
            number={3} color="indigo" icon={Target} timeframe="Month 1–6"
            title={`Hit the ${target} Target`}
            steps={[
              `Shift focus to Pro and Enterprise plan referrals — these count toward the ${target} target.`,
              `Starter referrals still earn ${pct(first)} but do NOT count toward the target.`,
              `Promote the ${dn('pro')} plan (${fmt(proM)}/mo) as the sweet spot — affordable for small contractors.`,
              'Emphasize the value: contract alerts, bid analysis, teaming finder — all in Pro.',
              `${target} ${dn('pro')} signups earns you: ${target} × ${fmt(proM)} × ${pct(first)} = ${fmt(target * proM * first)} in one-time commissions.`,
            ]}
            result={`Milestone: ${target} Pro/Enterprise → Recurring commissions UNLOCK forever.`}
          />
          <PhaseCard
            number={4} color="purple" icon={Trophy} timeframe="Month 6+ (Forever)"
            title="Collect Lifetime Passive Income"
            steps={[
              `Once unlocked, you earn ${pct(recurring)} every time any of your referred Pro/Enterprise companies renew.`,
              'You do nothing — renewals happen automatically each month or year.',
              `${target} ${dn('pro')} Monthly companies renewing = ${target} × ${fmt(proM)} × ${pct(recurring)} = ${fmt(target * proM * recurring)} every month.`,
              'Add more referrals to grow your passive base — there\'s no cap.',
              'Keep referring to earn more one-time AND grow your recurring pool.',
            ]}
            result="This is true passive income — it keeps paying as long as companies stay subscribed."
          />
        </div>
      </section>

      {/* ── Earnings calculator ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Project Your Earnings</h2>
        <p className="text-sm text-gray-500 mb-5">Use this calculator to see what you could earn based on your referral targets.</p>
        <Calculator planList={planList} first={first} recurring={recurring} target={target} />
      </section>

      {/* ── Target audience ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Who to Refer</h2>
        <p className="text-sm text-gray-500 mb-5">Your ideal audience is US-based small businesses that bid on federal government contracts.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Building2,
              title: 'Small Federal Contractors',
              desc: 'Companies with $100K–$10M in annual government contract revenue. They need opportunity alerts the most but often don\'t know tools like Sambid exist.',
              tags: ['8(a) certified', 'HUBZone', 'SDVOSB', 'WOSB'],
            },
            {
              icon: Rocket,
              title: 'GovCon Startups',
              desc: 'Businesses just entering the federal contracting space — typically 1–5 years old with a few early wins. They\'re actively growing and need every edge.',
              tags: ['SAM.gov registered', 'UEI holders', 'New NAICS codes'],
            },
            {
              icon: Users,
              title: 'Established Small Biz',
              desc: 'Companies with consistent contract history looking to scale. They have budget, understand the value of tools, and are most likely to buy Pro or Enterprise.',
              tags: ['Multiple agencies', '$500K+ contracts', 'Proposal teams'],
            },
          ].map(({ icon: Icon, title, desc, tags }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-2">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{desc}</p>
              <div className="flex flex-wrap gap-1">
                {tags.map(t => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Where to find them ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Where to Find Your Audience</h2>
        <p className="text-sm text-gray-500 mb-5">Best channels and platforms to connect with federal contractors.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: Linkedin, color: 'bg-blue-100 text-blue-600',
              title: 'LinkedIn',
              how: [
                'Search "federal contractor", "government contractor", "GovCon"',
                'Join groups: Government Contracting Professionals, Small Business GovCon',
                'Post value-first content about contract tips, then share your link in DMs',
                'Connect with procurement officers and small biz owners',
              ],
            },
            {
              icon: Mail, color: 'bg-green-100 text-green-600',
              title: 'Direct Email Outreach',
              how: [
                'Use the Federal Prospects section in the panel — already has small contractors',
                'Personalize each email — mention their company name and a recent contract',
                'Keep it short: 3 sentences max + your referral link',
                'Subject line: "Free tool for [CompanyName] to win more federal contracts"',
              ],
            },
            {
              icon: Globe, color: 'bg-purple-100 text-purple-600',
              title: 'Online Communities',
              how: [
                'GovCon Wire, GovLoop, and GovConNetwork forums',
                'Reddit: r/govcontracting',
                'Facebook groups: "Government Contracting for Small Business"',
                'Be helpful first, share your link only when relevant',
              ],
            },
            {
              icon: MessageSquare, color: 'bg-indigo-100 text-indigo-600',
              title: 'Events & Networking',
              how: [
                'Local SBDC (Small Business Development Center) workshops',
                'GSA, SBA, or SCORE-hosted contracting events',
                'Chamber of Commerce business mixers',
                'Agency small business matchmaking events',
              ],
            },
          ].map(({ icon: Icon, color, title, how }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900">{title}</h3>
              </div>
              <ul className="space-y-1.5">
                {how.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Outreach message templates ────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Outreach Message Templates</h2>
        <p className="text-sm text-gray-500 mb-5">Copy, personalize, and send. Short messages work best.</p>
        <div className="space-y-4">
          {[
            {
              label: 'LinkedIn DM',
              badge: 'bg-blue-100 text-blue-700',
              msg: `Hi [Name], I noticed [Company] has been winning contracts in [agency/sector] — impressive work! I came across a platform called Sambid Notify that sends real-time alerts for federal contract opportunities matching your NAICS codes + a 20% discount for new signups. Thought it might be useful for your team: [YOUR REFERRAL LINK]. Happy to answer any questions!`,
            },
            {
              label: 'Email Subject + Body',
              badge: 'bg-green-100 text-green-700',
              msg: `Subject: Federal contract alerts for [CompanyName] (+ 20% off)\n\nHi [Name],\n\nI work with a platform that helps small federal contractors like [Company] find and track bid opportunities before the competition. It covers USASpending, SAM.gov, and FPDS — all in one dashboard.\n\nRight now there's a 20% discount for new signups through my link: [YOUR REFERRAL LINK]\n\nWould love to hear what you think. No obligation at all.\n\nBest,\n[Your Name]`,
            },
            {
              label: 'Short Text / Forum Post',
              badge: 'bg-purple-100 text-purple-700',
              msg: `Anyone here using Sambid Notify for contract tracking? It aggregates SAM.gov + USASpending alerts in one place. There's 20% off new signups right now: [YOUR REFERRAL LINK] — figured it'd be useful for small contractors.`,
            },
          ].map(({ label, badge, msg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
              </div>
              <pre className="text-xs text-gray-700 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap font-sans leading-relaxed border border-gray-100">
                {msg}
              </pre>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-700">
            <strong>Replace [YOUR REFERRAL LINK]</strong> with your actual referral link from the Referral Earnings page. Personalize [Name] and [Company] for much higher response rates.
          </p>
        </div>
      </section>

      {/* ── Pro tips ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Pro Tips to Maximize Earnings</h2>
        <p className="text-sm text-gray-500 mb-5">Small changes that make a big difference in conversion rates.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: Lightbulb, color: 'text-green-600 bg-green-100',
              tip: 'Lead with their discount, not your commission',
              detail: 'Companies respond better when you open with "you get 20% off" rather than features. The discount is your strongest selling point.',
            },
            {
              icon: Target, color: 'text-indigo-600 bg-indigo-100',
              tip: `Target ${dn('pro')} plan first for fastest target progress`,
              detail: `${dn('pro')} Monthly at ${fmt(proM)} is affordable enough to convert easily, and every signup counts toward your ${target} Pro/Enterprise target.`,
            },
            {
              icon: Clock, color: 'text-blue-600 bg-blue-100',
              tip: 'Follow up exactly once, 3–5 days later',
              detail: 'A single follow-up can double your conversion rate. Most people don\'t respond the first time — not because they\'re not interested.',
            },
            {
              icon: BarChart3, color: 'text-green-600 bg-green-100',
              tip: 'Use the Federal Prospects database in the panel',
              detail: 'The admin panel already has a list of small federal contractors with emails. You have a built-in prospect list — use it.',
            },
            {
              icon: Shield, color: 'text-purple-600 bg-purple-100',
              tip: 'Mention specific certifications they hold',
              detail: 'If they\'re 8(a), HUBZone, or SDVOSB, mention it. Show you know their business — it builds trust and improves open rates dramatically.',
            },
            {
              icon: Heart, color: 'text-indigo-600 bg-indigo-100',
              tip: 'Build relationships, not just transactions',
              detail: 'The companies most likely to refer others back to you are the ones you built real conversations with. Long-term relationships compound your income.',
            },
          ].map(({ icon: Icon, color, tip, detail }) => (
            <div key={tip} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
              <div className={`w-8 h-8 ${color.split(' ')[1]} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color.split(' ')[0]}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{tip}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Earning milestones ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Earning Milestones</h2>
        <p className="text-sm text-gray-500 mb-5">What to expect at each stage of your journey.</p>
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden text-sm min-w-[540px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Milestone', 'Referrals', 'One-Time Earned', 'Monthly Recurring', 'Notes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {milestones.map((m, i) => (
                <tr key={i} className={`hover:bg-gray-50 transition ${m.highlight ? 'bg-indigo-50' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{m.label}</td>
                  <td className="px-4 py-3 text-gray-600">{m.refs} {dn('pro')}</td>
                  <td className="px-4 py-3 font-bold text-green-600">{fmt(m.refs * oneTimePerPro)}</td>
                  <td className="px-4 py-3 font-bold text-indigo-600">{m.active ? `${fmt(m.refs * recurringPerProMo)}/mo` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">* Calculations based on {dn('pro')} Monthly at {fmt(proM)}. Enterprise and yearly plans earn significantly more.</p>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Frequently Asked Questions</h2>
        <p className="text-sm text-gray-500 mb-5">Everything you need to know about earning commissions.</p>
        <div className="space-y-2">
          {faqs.map((f, i) => <FAQ key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-7 text-white text-center">
        <Trophy className="w-8 h-8 text-indigo-200 mx-auto mb-3" />
        <h3 className="text-xl font-black mb-2">Ready to Start Earning?</h3>
        <p className="text-indigo-100 text-sm mb-5 max-w-md mx-auto">
          Head to your Referral Earnings page, copy your referral link, and share it with your first 10 contacts today. Your first commission could arrive within the week.
        </p>
        <button onClick={() => navigate('/admin/my-earnings')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-50 transition shadow-lg">
          <Wallet className="w-4 h-4" />
          Go to Referral Earnings &amp; Copy My Link
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
