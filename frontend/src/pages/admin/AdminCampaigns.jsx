import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Send, Loader2, CheckCircle, Users, AlertCircle, Sparkles,
  ChevronDown, Search, X, Eye, EyeOff, User, RefreshCw, Target,
  Clock, BadgeCheck, Zap, TrendingUp, History, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { adminAIAPI, adminPanelAPI } from '../../services/adminApi';

// ── Segment definitions ───────────────────────────────────────────────────────
const SEGMENTS = [
  { value: 'all',        label: 'All Users',             desc: 'Everyone on the platform',       color: 'indigo', icon: Users },
  { value: 'trial',      label: 'Trial Users',           desc: 'Active free trial users',         color: 'amber',  icon: Clock },
  { value: 'free',       label: 'Free Plan',             desc: 'Free plan (not trial)',           color: 'gray',   icon: User },
  { value: 'starter',    label: 'Starter Plan',          desc: 'Paying starter subscribers',      color: 'blue',   icon: BadgeCheck },
  { value: 'pro',        label: 'Pro Plan',              desc: 'Pro subscribers',                 color: 'violet', icon: Zap },
  { value: 'enterprise', label: 'Enterprise Plan',       desc: 'Enterprise subscribers',          color: 'emerald',icon: Target },
  { value: 'paid',       label: 'All Paid',              desc: 'Starter + Pro + Enterprise',      color: 'green',  icon: BadgeCheck },
  { value: 'at_risk',    label: 'At-Risk Users',         desc: 'Paid, inactive 14+ days',         color: 'red',    icon: TrendingUp },
  { value: 'no_naics',   label: 'No NAICS (Incomplete)', desc: 'Users who never set NAICS codes', color: 'orange', icon: AlertCircle },
];

const colorMap = {
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200',    dot: 'bg-gray-400'    },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500'  },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   dot: 'bg-green-500'   },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500'  },
};

const PLATFORM_URL = 'https://sambid.co';

// ── Segment template menus — each segment gets relevant, plan-appropriate options ──
// Upgrade path: free/trial → pro → enterprise (no higher)
const SEGMENT_TEMPLATES = {
  trial:      [{ label: 'Trial Expiry',         type: 'expiry'    },
               { label: 'Feature Tour',          type: 'feature'   },
               { label: 'Last Chance Upgrade',   type: 'lastchance'}],
  free:       [{ label: 'Upgrade to Pro',        type: 'upgrade'   },
               { label: 'Upgrade to Starter',    type: 'upgrade_starter'},
               { label: 'Feature Showcase',      type: 'feature'   }],
  starter:    [{ label: 'Upgrade to Pro',        type: 'upgrade'   },
               { label: 'Feature Highlights',    type: 'feature'   },
               { label: 'Thank You',             type: 'thankyou'  }],
  pro:        [{ label: 'Upgrade to Enterprise', type: 'upgrade'   },
               { label: 'New Features',          type: 'feature'   },
               { label: 'Thank You',             type: 'thankyou'  }],
  enterprise: [{ label: 'New Features',          type: 'feature'   },
               { label: 'Renewal Reminder',      type: 'renewal'   },
               { label: 'Account Review',        type: 'review'    },
               { label: 'Thank You',             type: 'thankyou'  }],
  paid:       [{ label: 'Feature Update',        type: 'feature'   },
               { label: 'Renewal Reminder',      type: 'renewal'   },
               { label: 'Re-engage',             type: 're_engage' }],
  at_risk:    [{ label: 'Win-Back',              type: 'winback'   },
               { label: 'Special Offer',         type: 'offer'     },
               { label: 'Quick Check-in',        type: 'checkin'   }],
  no_naics:   [{ label: 'Complete Profile',      type: 'default'   },
               { label: 'Getting Started Guide', type: 'guide'     }],
  all:        [{ label: 'Platform Update',       type: 'platform'  },
               { label: 'Monthly Newsletter',    type: 'newsletter'}],
};

// ── Core template builder — segment + type aware ──────────────────────────────
// Rule: NEVER suggest a downgrade or same-tier "upgrade". Enterprise = top tier.
function buildSmartTemplate(segment, user, type = 'default') {
  const firstName = (user?.name || '').split(' ')[0] || 'there';
  const biz       = user?.businessName ? ` at ${user.businessName}` : '';
  const plan      = user?.plan || segment;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  // ── TRIAL ──────────────────────────────────────────────────────────────────
  if (segment === 'trial') {
    const days    = user?.trialDaysLeft ?? 3;
    const urgency = days <= 1 ? 'today' : `in ${days} day${days !== 1 ? 's' : ''}`;

    if (type === 'feature') return {
      subject: `${firstName}, here's everything your Sambid Notify trial gives you`,
      body: `Hi ${firstName},

You're on a free trial of Sambid Notify and we want to make sure you're getting the most out of it.

Here's what's available to you right now:
• **Full contract search** — browse thousands of open federal solicitations
• **AI Proposal Builder** — generate complete 7-section government proposals
• **Capability Statement writer** — AI-crafted company profiles in minutes
• **RFP Analyzer** — upload any RFP and get a full compliance checklist
• **Deadline calendar** — never miss a submission date
• **Go/No-Go scoring** — AI win-probability analysis on every opportunity

Your trial ends ${urgency}. Upgrade to Pro to keep all of this permanently.

→ Upgrade to Pro — $79/month: ${PLATFORM_URL}/pricing

Best regards,
The Sambid Notify Team`,
    };

    if (type === 'lastchance') return {
      subject: `Last chance — your Sambid Notify trial ends ${urgency}`,
      body: `Hi ${firstName},

This is your final reminder — your free trial ends ${urgency}.

After that, your account reverts to the Free plan with only 2 daily contract matches and no AI tools.

**Don't lose access.** Upgrade now to keep:
• 1,000+ daily contract matches
• Full AI proposal and capability statement generation
• Real-time deadline alerts
• Unlimited saved opportunities

We're offering **20% off your first month** — but only until your trial expires.

→ Upgrade now with code TRIAL20: ${PLATFORM_URL}/pricing

Best regards,
The Sambid Notify Team`,
    };

    // default → trial expiry
    return {
      subject: `${firstName}, your Sambid Notify trial ends ${urgency} — keep your access`,
      body: `Hi ${firstName},

Your free trial of Sambid Notify expires ${urgency}.

Without upgrading, you'll lose access to:
• Daily federal contract matches tailored to your NAICS codes
• AI-powered proposal and capability statement generation
• Real-time RFP deadline alerts and bid tracking
• Go/No-Go bid decision scoring

Upgrade to Pro for just **$79/month** and never miss another federal contract opportunity.

→ Keep your access — upgrade now: ${PLATFORM_URL}/pricing

Use code **TRIAL20** for 20% off your first month.

Reply to this email if you have any questions — we're happy to help.

Best regards,
The Sambid Notify Team`,
    };
  }

  // ── FREE ───────────────────────────────────────────────────────────────────
  if (segment === 'free') {
    if (type === 'upgrade_starter') return {
      subject: `${firstName}, try Sambid Notify Starter for just $29/month`,
      body: `Hi ${firstName},

You're currently on the Sambid Notify Free plan. If you're not ready for Pro, **Starter** is a great step up — and it's only **$29/month**.

What you get on Starter:
• **50 daily contract matches** (vs 2 on Free)
• 10 saved opportunities
• Basic deadline alerts
• Email support

It's the easiest way to start winning more federal contracts without a big commitment.

→ Upgrade to Starter for $29/month: ${PLATFORM_URL}/pricing

Best regards,
The Sambid Notify Team`,
    };

    if (type === 'feature') return {
      subject: `${firstName}, you're missing these federal contracting tools`,
      body: `Hi ${firstName},

You're on the Sambid Notify Free plan — which gives you 2 contract matches a day. But Pro members get access to a full AI-powered contracting toolkit:

• **AI Proposal Builder** — complete government proposals written in seconds
• **Capability Statement Generator** — professional company profiles for any solicitation
• **RFP Compliance Checker** — never miss a requirement
• **1,000 daily contract matches** vs 2 on Free
• **Go/No-Go bid scoring** — know before you bid

The platform does the heavy lifting so you can focus on winning contracts.

→ See all Pro features: ${PLATFORM_URL}/pricing

Best regards,
The Sambid Notify Team`,
    };

    // default → upgrade to Pro
    return {
      subject: `${firstName}, you're leaving federal contracts on the table`,
      body: `Hi ${firstName},

You've been on the Sambid Notify Free plan — but with only 2 matches a day, you're missing hundreds of contracts that fit your profile.

Pro subscribers get:
• **1,000 daily contract matches** (vs 2 on Free)
• Full AI proposal and capability statement generation
• RFP analyzer and compliance checker
• Priority email support
• Unlimited saved opportunities

**Upgrade to Pro for just $79/month** and start winning more federal contracts today.

→ Upgrade to Pro: ${PLATFORM_URL}/pricing

Best regards,
The Sambid Notify Team`,
    };
  }

  // ── STARTER ────────────────────────────────────────────────────────────────
  if (segment === 'starter') {
    if (type === 'feature') return {
      subject: `${firstName}, what's new on Sambid Notify this month`,
      body: `Hi ${firstName}${biz},

Thank you for being a Sambid Notify Starter subscriber. Here's what's new on the platform this month:

• Improved contract search filters — find solicitations faster
• Updated NAICS code matching algorithm — more accurate monthly matches
• New deadline notification format — clearer summaries
• Enhanced saved opportunities view — better organisation

Log in to see the updates on your dashboard:

→ Access your Starter dashboard: ${PLATFORM_URL}/dashboard

**Want even more?** As a Starter subscriber, you can upgrade to Pro for just $79/month and unlock full AI proposal generation, RFP analysis, and 3,000 matches/month.

→ Upgrade to Pro: ${PLATFORM_URL}/pricing

Best regards,
The Sambid Notify Team`,
    };

    if (type === 'thankyou') return {
      subject: `Thank you for supporting Sambid Notify, ${firstName}`,
      body: `Hi ${firstName}${biz},

I wanted to take a moment to personally thank you for being a Sambid Notify Starter subscriber.

Your support helps us keep building the tools that small businesses need to compete in the federal contracting market.

A reminder of what your Starter subscription includes:
• 50 daily federal contract matches
• Basic deadline alerts and notifications
• Saved opportunities tracker
• Email support

If you ever have questions, feedback, or need help finding the right contracts — just reply to this email.

→ Access your dashboard: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
    };

    // default → upgrade to Pro
    return {
      subject: `${firstName}, unlock AI-powered proposals with Pro`,
      body: `Hi ${firstName}${biz},

Thank you for being a Sambid Notify Starter subscriber. We wanted to let you know about what you'd unlock by upgrading to **Pro**:

• **Full AI Proposal Builder** — complete 7-section government proposals in seconds
• **AI RFP Analyzer** — upload any solicitation and get a compliance checklist
• **Go/No-Go bid scoring** — AI win-probability analysis before you bid
• **1,000 daily contract matches** (vs 50 on Starter)
• **Teaming finder** — discover subcontracting partners
• **Monthly market intelligence** reports for your NAICS codes

Upgrade to Pro for just **$79/month** and use code **LOYAL15** for 15% off.

→ Upgrade to Pro today: ${PLATFORM_URL}/pricing

Best regards,
The Sambid Notify Team`,
    };
  }

  // ── PRO ────────────────────────────────────────────────────────────────────
  if (segment === 'pro') {
    if (type === 'feature') return {
      subject: `${firstName}, new features just dropped for Pro subscribers`,
      body: `Hi ${firstName}${biz},

Thank you for being a Sambid Notify Pro subscriber. We've shipped major updates this month — and as a Pro member, you get them all immediately.

What's new:
• **Enhanced AI Proposal Builder** — 12-section proposals with executive summary
• **Smarter deadline alerts** — 14-day, 7-day, and 3-day reminders
• **Improved contract matching** — updated NAICS scoring algorithm
• **New market research digest** — weekly intelligence report for your market
• **Faster Go/No-Go analysis** — results in under 10 seconds

→ Explore the new features: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
    };

    if (type === 'thankyou') return {
      subject: `Thank you for being a Pro subscriber, ${firstName}`,
      body: `Hi ${firstName}${biz},

I wanted to personally thank you for being a Sambid Notify Pro subscriber.

You're part of the group of federal contractors using AI to win more contracts — and your support helps us keep building.

Your Pro plan includes:
• 1,000 daily contract matches
• Full AI proposal and capability statement generation
• RFP analyzer and compliance checker
• Go/No-Go bid scoring
• Priority support

If there's anything we can do better or features you'd like to see, reply to this email — we read every response.

→ Access your Pro dashboard: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
    };

    // default → upgrade to Enterprise (the ONLY valid upgrade from Pro)
    return {
      subject: `${firstName}, take your contracting to the next level with Enterprise`,
      body: `Hi ${firstName}${biz},

You're on Sambid Notify Pro — and you're already ahead of most federal contractors. But if your team is growing or you're bidding on larger contracts, **Enterprise** is designed for you.

What Enterprise adds on top of your current Pro plan:
• **Unlimited team members** — share access with your full BD team
• **Dedicated account manager** — a real person who knows your market
• **Custom NAICS tracking** — up to 50 NAICS codes monitored simultaneously
• **Weekly market intelligence reports** — tailored for your specific market
• **Custom SAM.gov alerts** — filtered by agency, value, or set-aside type
• **Priority phone support** — skip the queue

Enterprise is available from **$499/month** (or **$4,788/year** — save 20%).

→ Talk to us about Enterprise: ${PLATFORM_URL}/pricing

Reply to this email to schedule a 15-minute call — no obligation.

Best regards,
The Sambid Notify Team`,
    };
  }

  // ── ENTERPRISE — no upgrade option, they are at the top tier ──────────────
  if (segment === 'enterprise') {
    if (type === 'renewal') return {
      subject: `${firstName}, your Sambid Notify Enterprise renewal is coming up`,
      body: `Hi ${firstName}${biz},

Your Sambid Notify Enterprise subscription is coming up for renewal. We wanted to reach out early to make sure everything is in order.

Your Enterprise plan includes:
• Unlimited team member access
• Dedicated account manager
• Custom NAICS monitoring (up to 50 codes)
• Weekly market intelligence reports
• Priority phone and email support
• Custom SAM.gov alerts

To renew or discuss your plan options, reply to this email or contact us directly — we'll take care of everything.

→ Access your Enterprise dashboard: ${PLATFORM_URL}/dashboard

Thank you for your continued trust in Sambid Notify.

Best regards,
The Sambid Notify Team`,
    };

    if (type === 'review') return {
      subject: `${firstName}, time for your quarterly account review`,
      body: `Hi ${firstName}${biz},

As a Sambid Notify Enterprise subscriber, you're entitled to a quarterly account review with our team.

In this 30-minute call we'll cover:
• Contract win rate and match quality for your NAICS codes
• New features and how to get more value from the platform
• Upcoming solicitations in your market to watch
• Any custom reports or alerts you'd like configured

To schedule your review, simply reply to this email with your availability.

→ Access your dashboard in the meantime: ${PLATFORM_URL}/dashboard

We're committed to helping your team win more federal contracts.

Best regards,
The Sambid Notify Team`,
    };

    if (type === 'thankyou') return {
      subject: `${firstName}, thank you for being an Enterprise subscriber`,
      body: `Hi ${firstName}${biz},

I wanted to personally reach out and thank you for being a Sambid Notify Enterprise subscriber.

Enterprise customers like you are the reason we keep building. Your feedback directly shapes the platform roadmap — and your team's success in federal contracting is our success too.

A reminder of your full Enterprise benefits:
• Unlimited team access and user seats
• Dedicated account manager (reply to this email to reach them)
• Custom NAICS monitoring and SAM.gov alerts
• Weekly market intelligence reports
• Priority phone and email support

Is there anything we can improve for you or your team? Reply any time.

→ Access your Enterprise dashboard: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
    };

    // default → feature update (no upgrade CTA — they are on the highest tier)
    return {
      subject: `${firstName}, your Sambid Notify Enterprise platform update`,
      body: `Hi ${firstName}${biz},

Thank you for your continued trust in Sambid Notify Enterprise. We're committed to helping your team win more federal contracts.

Platform updates this month:
• **AI Proposal Builder** — now generates 12-section proposals with executive summary
• **Team collaboration** — share and comment on saved opportunities with your team
• **Market intelligence** — weekly digest now includes contract award trends
• **Custom alerts** — improved filtering by agency, set-aside, and contract value
• **Expanded NAICS tracking** — up to 50 codes monitored simultaneously

Your dedicated account manager is available for questions or a strategy session — just reply to this email.

→ Access your Enterprise dashboard: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
    };
  }

  // ── AT-RISK (paid, inactive 14+ days) ─────────────────────────────────────
  if (segment === 'at_risk') {
    const days = user?.daysSinceActive ?? 14;

    if (type === 'offer') return {
      subject: `${firstName}, a special offer to keep your ${planLabel} subscription`,
      body: `Hi ${firstName}${biz},

We noticed you haven't logged in recently. We don't want to lose you — so we'd like to make you an offer.

**Stay on your ${planLabel} plan and get 1 month free** — just reply to this email and we'll apply it to your account immediately.

While you've been away, here's what you've been missing:
• New federal contracts matched to your NAICS codes
• Updated solicitation deadline calendar
• Recent contract award data in your market

We believe Sambid Notify can help your business win more federal contracts — give us another chance to prove it.

→ Log back in: ${PLATFORM_URL}/dashboard

Reply to this email to claim your free month.

Best regards,
The Sambid Notify Team`,
    };

    if (type === 'checkin') return {
      subject: `${firstName}, quick check-in from Sambid Notify`,
      body: `Hi ${firstName}${biz},

I'm reaching out because we haven't seen you on Sambid Notify in a while and want to make sure everything is okay with your account.

Is there anything we can help you with?
• A walkthrough of features you haven't tried yet?
• Help finding contracts in your NAICS codes?
• Guidance on using the AI proposal tools?
• Feedback on what's not working for you?

Just reply to this email — I read every response and will get back to you within 24 hours.

→ Log back in: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
    };

    // default → win-back
    return {
      subject: `${firstName}, new federal contracts are waiting for you`,
      body: `Hi ${firstName}${biz},

We noticed you haven't logged in for ${days} days. While you've been away, we've been matching new opportunities to your ${planLabel} account.

Here's what's waiting for you right now:
• New federal contracts matched to your NAICS codes
• Updated submission deadline calendar
• AI-generated win probability scores on saved opportunities
• Recent contract awards in your market

Your account is fully active — log in to see what you've missed.

→ See your matched contracts: ${PLATFORM_URL}/dashboard

If something isn't working for you, just reply to this email. We want to help.

Best regards,
The Sambid Notify Team`,
    };
  }

  // ── ALL PAID ───────────────────────────────────────────────────────────────
  if (segment === 'paid') {
    if (type === 'renewal') return {
      subject: `${firstName}, your Sambid Notify subscription renewal notice`,
      body: `Hi ${firstName}${biz},

Your Sambid Notify subscription is coming up for renewal. We wanted to give you a heads-up in advance.

Your current plan benefits:
• Daily federal contract matches for your NAICS codes
• AI-powered contracting tools
• Deadline alerts and saved opportunities
• Platform support

To continue uninterrupted access, no action is needed — your subscription renews automatically.

If you'd like to upgrade your plan, change your payment method, or have any questions, reply to this email or visit your billing page.

→ Manage your subscription: ${PLATFORM_URL}/billing

Best regards,
The Sambid Notify Team`,
    };

    if (type === 're_engage') return {
      subject: `${firstName}, here's what's new on Sambid Notify`,
      body: `Hi ${firstName}${biz},

A quick update on what's new on Sambid Notify for paying subscribers this month:

• Faster AI proposal generation — now under 30 seconds for a full 7-section proposal
• Improved contract match relevance — updated NAICS algorithm
• New market awards dashboard — see who's winning in your space
• Enhanced deadline calendar — colour-coded by urgency

Log in to explore the updates:

→ Access your dashboard: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
    };

    // default → feature update
    return {
      subject: `${firstName}, new platform features for subscribers`,
      body: `Hi ${firstName}${biz},

Thank you for being a paying Sambid Notify subscriber. Here are the latest platform improvements available to you now:

• **AI Proposal Builder** — now generates 12-section proposals with auto-filled details
• **Smarter deadline alerts** — 14-day and 7-day advance notices
• **New market intelligence** — monthly contract award trends for your NAICS codes
• **Improved search filters** — filter by agency, value range, and set-aside type

→ Log in to explore: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
    };
  }

  // ── NO NAICS ───────────────────────────────────────────────────────────────
  if (segment === 'no_naics') {
    if (type === 'guide') return {
      subject: `${firstName}, a quick guide to getting started with Sambid Notify`,
      body: `Hi ${firstName},

We want to help you get the most out of Sambid Notify. Here's how to get set up in 3 steps:

**Step 1 — Add your NAICS codes (2 minutes)**
Go to Settings → Profile and add the NAICS codes that match your business. This is how we find the right contracts for you.

**Step 2 — Review your first matches**
Once your codes are set, check your dashboard for matched solicitations. New matches are added every day.

**Step 3 — Save and track opportunities**
Bookmark contracts you're interested in and set deadline reminders so you never miss a submission date.

→ Complete your setup now: ${PLATFORM_URL}/settings

If you're not sure which NAICS codes apply to your business, reply to this email and we'll help you identify the right ones.

Best regards,
The Sambid Notify Team`,
    };

    // default → complete profile
    return {
      subject: `${firstName}, one step left to start receiving contract matches`,
      body: `Hi ${firstName},

Your Sambid Notify account is ready — but we're missing one important piece of information: your **NAICS codes**.

Without them, we can't match you with relevant federal contracts. It takes less than 2 minutes to add them.

Once set up, you'll receive:
• Daily contract matches in your market
• Deadline alerts for open solicitations
• AI win probability scores on relevant opportunities

→ Add your NAICS codes now: ${PLATFORM_URL}/settings

Need help finding the right NAICS codes? Reply to this email and we'll find them for you.

Best regards,
The Sambid Notify Team`,
    };
  }

  // ── ALL USERS ──────────────────────────────────────────────────────────────
  if (segment === 'all') {
    if (type === 'newsletter') return {
      subject: `Sambid Notify monthly update — what's new in federal contracting`,
      body: `Hi ${firstName},

Here's your monthly update from Sambid Notify.

**Platform updates:**
• AI Proposal Builder now generates 12-section proposals in under 30 seconds
• New market intelligence dashboard — contract award trends by NAICS code
• Improved deadline calendar with colour-coded urgency indicators
• Enhanced team collaboration features for paid subscribers

**Federal contracting news:**
• SAM.gov reported over 12,000 new solicitations this month
• Set-aside contracts for small businesses increased 8% year-over-year
• DoD and HHS remain the top agencies by contract volume

**Tip of the month:**
Companies that submit proposals within the first week of a solicitation opening have a significantly higher win rate than last-minute submissions. Set up deadline alerts to stay ahead.

→ See your matched contracts: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
    };

    // default → platform update
    return {
      subject: `Important update from Sambid Notify`,
      body: `Hi ${firstName},

We have an important update about the Sambid Notify platform.

We've been working hard to improve your federal contracting experience. The latest updates include improved contract matching, faster AI tools, and a better deadline calendar.

Log in to see what's new:

→ Access your dashboard: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
    };
  }

  // Fallback
  return {
    subject: `Important update from Sambid Notify`,
    body: `Hi ${firstName},

We have an update for your Sambid Notify account.

→ Access your dashboard: ${PLATFORM_URL}/dashboard

Best regards,
The Sambid Notify Team`,
  };
}

// ── User picker dropdown ──────────────────────────────────────────────────────
function UserPicker({ users, selected, onSelect, loading }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:border-indigo-300 transition-colors">
        {loading
          ? <span className="flex items-center gap-2 text-gray-400"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading users…</span>
          : selected
            ? <span className="flex items-center gap-2 font-medium text-gray-900 min-w-0">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {selected.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{selected.name}</span>
                <span className="text-gray-400 text-xs shrink-0">{selected.email}</span>
              </span>
            : <span className="text-gray-400">Select a user…</span>
        }
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-72 flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400" />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-center py-6 text-gray-400 text-sm">No users found</p>
              : filtered.map(u => (
                  <button key={u._id} type="button"
                    onClick={() => { onSelect(u); setOpen(false); setSearch(''); }}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-medium text-gray-500 capitalize">{u.plan}</span>
                        {u.trialDaysLeft !== null && (
                          <p className="text-xs text-amber-600">{u.trialDaysLeft}d left</p>
                        )}
                        {u.daysSinceActive > 0 && (
                          <p className="text-xs text-gray-400">{u.daysSinceActive}d inactive</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Email preview renderer ────────────────────────────────────────────────────
function EmailPreview({ subject, body, fromName, userName }) {
  const firstName = (userName || '').split(' ')[0] || 'there';
  const lines = body.split('\n');

  const renderLine = (line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;

    const bullet = /^([•\-\*·]|\d+[.)]) (.+)/.exec(t);
    if (bullet) return (
      <div key={i} className="flex items-start gap-2 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
        <span className="text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: bullet[2].replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
      </div>
    );

    const urlMatch = t.match(/https?:\/\/\S+/);
    const isCtaLine = /^(→|👉|🔗|Click here|Log in|Visit|Upgrade|Access|Get started)/i.test(t) && urlMatch;
    if (isCtaLine) return (
      <div key={i} className="text-center my-4">
        <span className="inline-block bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg">
          {t.replace(/https?:\/\/\S+/g,'').replace(/^[→👉🔗]/,'').trim() || 'Open Dashboard →'}
        </span>
      </div>
    );

    return (
      <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2"
        dangerouslySetInnerHTML={{ __html: t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
    );
  };

  return (
    <div className="bg-gray-100 rounded-xl p-4">
      {/* Subject preview */}
      <div className="bg-white rounded-lg px-4 py-2.5 mb-3 border border-gray-200">
        <p className="text-xs text-gray-400 mb-0.5">Subject</p>
        <p className="text-sm font-semibold text-gray-900">{subject || '(no subject)'}</p>
      </div>

      {/* Email card */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
        {/* Email header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="text-white font-bold text-base">{fromName || 'Sambid Notify'}</span>
          </div>
          <p className="text-white/70 text-xs mt-1">Federal Contract Intelligence</p>
        </div>

        {/* Email body */}
        <div className="px-6 py-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">Hi {firstName},</p>
          <div>{lines.map((l, i) => renderLine(l, i))}</div>
          <hr className="border-gray-100 my-4" />
          <p className="text-xs text-gray-400 text-center">
            © 2025 Sambid Notify · <span className="text-indigo-500">Manage preferences</span> · <span className="text-indigo-500">Dashboard</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminCampaigns() {
  const [segment,       setSegment]       = useState('trial');
  const [sendMode,      setSendMode]      = useState('segment'); // 'segment' | 'user'
  const [segmentUsers,  setSegmentUsers]  = useState([]);
  const [usersLoading,  setUsersLoading]  = useState(false);
  const [selectedUser,  setSelectedUser]  = useState(null);
  const [subject,       setSubject]       = useState('');
  const [body,          setBody]          = useState('');
  const [fromName,      setFromName]      = useState('Sambid Notify');
  const [sending,       setSending]       = useState(false);
  const [result,        setResult]        = useState(null);
  const [error,         setError]         = useState('');
  const [aiLoading,     setAILoading]     = useState(false);
  const [showPreview,   setShowPreview]   = useState(false);
  const [segmentCounts, setSegmentCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [history,       setHistory]       = useState([]);
  const [historyPage,   setHistoryPage]   = useState(1);
  const [historyPages,  setHistoryPages]  = useState(1);
  const [historyTotal,  setHistoryTotal]  = useState(0);
  const [historyLoading,setHistoryLoading]= useState(false);
  const [expandedLog,   setExpandedLog]   = useState(null);

  // Load campaign history
  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const r = await adminAIAPI.getCampaignHistory(page);
      if (r.data.success) {
        setHistory(r.data.data.logs);
        setHistoryPages(r.data.data.pages);
        setHistoryTotal(r.data.data.total);
        setHistoryPage(page);
      }
    } catch {}
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { loadHistory(1); }, [loadHistory]);

  // Load segment counts on mount
  useEffect(() => {
    (async () => {
      try {
        const counts = {};
        await Promise.all(
          SEGMENTS.map(async s => {
            try {
              const r = await adminAIAPI.getSegmentUsers(s.value);
              counts[s.value] = r.data?.data?.count ?? 0;
            } catch { counts[s.value] = 0; }
          })
        );
        setSegmentCounts(counts);
      } finally {
        setCountsLoading(false);
      }
    })();
  }, []);

  // Load users whenever segment changes
  const loadSegmentUsers = useCallback(async (seg) => {
    setUsersLoading(true);
    setSelectedUser(null);
    try {
      const r = await adminAIAPI.getSegmentUsers(seg);
      setSegmentUsers(r.data?.data?.users || []);
    } catch {
      setSegmentUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => { loadSegmentUsers(segment); }, [segment, loadSegmentUsers]);

  // When user is selected → auto-populate template
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    const tpl = buildSmartTemplate(segment, user);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  // When segment changes → reset user selection and auto-populate generic template
  const handleSegmentChange = (seg) => {
    setSegment(seg);
    setSelectedUser(null);
    const tpl = buildSmartTemplate(seg, null);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const applySmartTemplate = () => {
    const tpl = buildSmartTemplate(segment, selectedUser);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const generateWithAI = async () => {
    setAILoading(true);
    setError('');
    try {
      const seg = SEGMENTS.find(s => s.value === segment);
      const userCtx = selectedUser
        ? `Specific user: ${selectedUser.name}, Plan: ${selectedUser.plan}${selectedUser.trialDaysLeft !== null ? `, Trial days left: ${selectedUser.trialDaysLeft}` : ''}${selectedUser.daysSinceActive > 0 ? `, Days inactive: ${selectedUser.daysSinceActive}` : ''}`
        : '';
      const res = await adminAIAPI.generateContent({
        type: 'email_body',
        context: `Professional re-engagement/marketing email for ${seg?.label} users of Sambid Notify (federal contracting intelligence SaaS). ${userCtx}. Platform URL: ${PLATFORM_URL}. Include subject line labeled "Subject:", greeting "Hi [First Name],", 2-3 body paragraphs, bullet list of features/benefits, a CTA line starting with → pointing to ${PLATFORM_URL}/pricing or /dashboard, and sign-off. Plain text with **bold** for emphasis.`,
      });
      const content = res.data.data.content;
      const subjectMatch = content.match(/Subject:\s*(.+)/i);
      if (subjectMatch) {
        setSubject(subjectMatch[1].trim().replace(/^["']|["']$/g, ''));
        setBody(content.replace(/Subject:\s*.+\n?/i, '').trim());
      } else {
        setBody(content);
      }
    } catch {
      setError('AI generation failed. Try again.');
    } finally {
      setAILoading(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { setError('Subject and body are required.'); return; }
    const target = sendMode === 'user' && selectedUser ? selectedUser : null;
    const count = target ? 1 : (segmentCounts[segment] ?? segmentUsers.length);
    const segLabel = SEGMENTS.find(s => s.value === segment)?.label;
    const confirmMsg = target
      ? `Send "${subject}" to ${target.name} (${target.email})?`
      : `Send "${subject}" to all ${count} users in segment: ${segLabel}?\n\nThis will email every matching user.`;
    if (!window.confirm(confirmMsg)) return;

    setSending(true); setError(''); setResult(null);
    try {
      const payload = { segment, subject, body, fromName };
      if (target) payload.targetUserId = target._id;
      const res = await adminAIAPI.sendCampaign(payload);
      if (!res.data.success) {
        setError(res.data.message || 'Campaign failed. Please try again.');
      } else {
        setResult(res.data);
        loadHistory(1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Campaign failed. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const currentSeg = SEGMENTS.find(s => s.value === segment);
  const recipientCount = sendMode === 'user' && selectedUser ? 1 : (segmentCounts[segment] ?? 0);

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="text-gray-500 text-sm mt-1">Send targeted, personalised emails to user segments with AI-powered templates.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
          <Mail className="w-4 h-4 text-indigo-500" />
          Sending from: <span className="font-semibold text-gray-700">platform email</span>
        </div>
      </div>

      {/* Result / Error banners */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="text-green-800 font-semibold">Campaign sent successfully!</p>
            <p className="text-green-700 text-sm">{result.message}</p>
            {result.data?.errorDetails?.length > 0 && (
              <div className="mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <p className="font-semibold mb-1">Failed deliveries:</p>
                {result.data.errorDetails.map((e, i) => (
                  <p key={i}>{e.email} — {e.error}</p>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setResult(null)} className="ml-auto text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left: Segment selector ─────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Target Segment</h3>
            </div>
            <div className="space-y-1">
              {SEGMENTS.map(s => {
                const c = colorMap[s.color];
                const Icon = s.icon;
                const active = segment === s.value;
                return (
                  <button key={s.value} type="button"
                    onClick={() => handleSegmentChange(s.value)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                      active ? `${c.bg} ${c.border} border` : 'hover:bg-gray-50 border border-transparent'
                    }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? c.bg : 'bg-gray-100'}`}>
                      <Icon className={`w-3.5 h-3.5 ${active ? c.text : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${active ? c.text : 'text-gray-700'}`}>{s.label}</p>
                      <p className="text-xs text-gray-400 truncate">{s.desc}</p>
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 ${active ? `${c.bg} ${c.text}` : 'bg-gray-100 text-gray-500'}`}>
                      {countsLoading ? '…' : (segmentCounts[s.value] ?? '—')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* From Name */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">From Name</label>
            <input value={fromName} onChange={e => setFromName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
            <p className="text-xs text-gray-400 mt-1.5">Sender email is auto-configured from platform settings.</p>
          </div>
        </div>

        {/* ── Center: Compose ────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-4">

          {/* Recipient mode */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Send To</p>
            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setSendMode('segment')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${sendMode === 'segment' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                All in segment ({recipientCount})
              </button>
              <button type="button" onClick={() => setSendMode('user')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${sendMode === 'user' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Specific user
              </button>
            </div>

            {sendMode === 'user' && (
              <div className="space-y-2">
                <UserPicker
                  users={segmentUsers}
                  selected={selectedUser}
                  onSelect={handleUserSelect}
                  loading={usersLoading}
                />
                {selectedUser && (
                  <div className="p-3 bg-indigo-50 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-700 text-sm font-bold flex items-center justify-center shrink-0">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-indigo-900 truncate">{selectedUser.name}</p>
                      <p className="text-xs text-indigo-600 truncate">{selectedUser.email} · <span className="capitalize">{selectedUser.plan}</span>
                        {selectedUser.trialDaysLeft !== null && <span className="text-amber-600"> · {selectedUser.trialDaysLeft}d trial left</span>}
                        {selectedUser.daysSinceActive > 0 && <span className="text-gray-500"> · {selectedUser.daysSinceActive}d inactive</span>}
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelectedUser(null)} className="text-indigo-300 hover:text-indigo-500 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {!selectedUser && !usersLoading && segmentUsers.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No users in this segment.</p>
                )}
              </div>
            )}

            {sendMode === 'segment' && (
              <div className={`px-3 py-2 rounded-xl flex items-center gap-2 ${colorMap[currentSeg?.color || 'indigo'].bg}`}>
                <span className={`w-2 h-2 rounded-full ${colorMap[currentSeg?.color || 'indigo'].dot}`} />
                <p className={`text-xs font-medium ${colorMap[currentSeg?.color || 'indigo'].text}`}>
                  Will send to <strong>{recipientCount}</strong> user{recipientCount !== 1 ? 's' : ''} in <strong>{currentSeg?.label}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Quick templates + AI */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Templates</p>
              <button type="button" onClick={applySmartTemplate}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                <RefreshCw className="w-3 h-3" />Auto-fill for {currentSeg?.label}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(SEGMENT_TEMPLATES[segment] || SEGMENT_TEMPLATES['all']).map(t => (
                <button key={t.label} type="button"
                  onClick={() => { const tpl = buildSmartTemplate(segment, selectedUser, t.type); setSubject(tpl.subject); setBody(tpl.body); }}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors text-gray-700">
                  {t.label}
                </button>
              ))}
              <button type="button" onClick={generateWithAI} disabled={aiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-60">
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Generate
              </button>
            </div>
          </div>

          {/* Compose */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Compose</p>
              <button type="button" onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? 'Hide preview' : 'Show preview'}
              </button>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject Line</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Your trial ends in 3 days — upgrade now"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Email Body
                <span className="font-normal text-gray-400 ml-2 text-xs">Use **bold**, bullet points with •/-/*</span>
              </label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={14}
                placeholder="Write your email here…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-mono bg-white" />
            </div>

            {/* Send button */}
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm">
                {sending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                  : <><Send className="w-4 h-4" />Send to {sendMode === 'user' && selectedUser ? selectedUser.name : `${recipientCount} users`}</>}
              </button>
              {(subject || body) && (
                <button type="button" onClick={() => { setSubject(''); setBody(''); setSelectedUser(null); }}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Preview ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Live Preview</h3>
              <span className="ml-auto text-xs text-gray-400">How recipients see it</span>
            </div>
            {subject || body
              ? <EmailPreview
                  subject={subject}
                  body={body}
                  fromName={fromName}
                  userName={selectedUser?.name || 'John Smith'}
                />
              : <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                    <Mail className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">Select a template or compose your email to see the preview here.</p>
                </div>
            }
          </div>
        </div>

      </div>

      {/* ── Campaign History ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Send History</h3>
            {historyTotal > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                {historyTotal} total
              </span>
            )}
          </div>
          <button onClick={() => loadHistory(historyPage)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {historyLoading && history.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
              <Mail className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No campaigns sent yet</p>
            <p className="text-xs text-gray-400 mt-1">Your send history will appear here after the first campaign</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {history.map(log => {
                const isExpanded = expandedLog === log._id;
                const statusColor = log.status === 'success'
                  ? 'bg-green-100 text-green-700'
                  : log.status === 'partial'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700';
                const statusLabel = log.status === 'success' ? 'Delivered'
                  : log.status === 'partial' ? 'Partial' : 'Failed';
                const segDef   = SEGMENTS.find(s => s.value === log.segment);
                const sentDate = new Date(log.createdAt);
                const dateStr  = sentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr  = sentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={log._id} className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        log.status === 'success' ? 'bg-green-500' :
                        log.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{log.subject}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                                {statusLabel}
                              </span>
                              <span className="text-xs text-gray-500">
                                {log.targetEmail ? `→ ${log.targetEmail}` : segDef ? segDef.label : log.segment}
                              </span>
                              <span className="text-xs text-gray-300">·</span>
                              <span className="text-xs font-medium text-gray-600">
                                {log.sent}/{log.totalUsers} delivered
                              </span>
                              {log.failed > 0 && (
                                <span className="text-xs text-red-500">{log.failed} failed</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-medium text-gray-700">{dateStr}</p>
                            <p className="text-xs text-gray-400">{timeStr}</p>
                          </div>
                        </div>

                        <button onClick={() => setExpandedLog(isExpanded ? null : log._id)}
                          className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          {isExpanded ? 'Hide details' : 'Show details'}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-4 gap-3">
                              {[
                                { label: 'Total',     val: log.totalUsers, color: 'text-gray-700'  },
                                { label: 'Delivered', val: log.sent,       color: 'text-green-700' },
                                { label: 'Failed',    val: log.failed,     color: 'text-red-600'   },
                                { label: 'Rate', val: log.totalUsers > 0 ? `${Math.round((log.sent/log.totalUsers)*100)}%` : '—', color: 'text-indigo-700' },
                              ].map(({ label, val, color }) => (
                                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                                  <p className={`text-lg font-bold ${color}`}>{val}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                                </div>
                              ))}
                            </div>

                            {/* Recipients list */}
                            {log.recipients?.length > 0 && (
                              <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                                  <p className="text-xs font-semibold text-gray-600">
                                    Recipients ({log.recipients.length})
                                  </p>
                                </div>
                                <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                                  {log.recipients.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                                          {(r.name || r.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          {r.name && <p className="text-xs font-medium text-gray-800 truncate">{r.name}</p>}
                                          <p className="text-xs text-gray-500 truncate">{r.email}</p>
                                        </div>
                                      </div>
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                                        r.delivered
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-red-100 text-red-600'
                                      }`}>
                                        {r.delivered ? '✓ Sent' : '✗ Failed'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {log.bodyPreview && (
                              <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs font-semibold text-gray-500 mb-1">Body preview</p>
                                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                                  {log.bodyPreview}{log.bodyPreview.length >= 200 ? '…' : ''}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {historyPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Page {historyPage} of {historyPages} · {historyTotal} campaigns
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => loadHistory(historyPage - 1)} disabled={historyPage <= 1}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  {Array.from({ length: Math.min(5, historyPages) }, (_, i) => {
                    const p = historyPage <= 3 ? i + 1 : historyPage - 2 + i;
                    if (p < 1 || p > historyPages) return null;
                    return (
                      <button key={p} onClick={() => loadHistory(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                          p === historyPage ? 'bg-indigo-600 text-white' : 'hover:bg-gray-200 text-gray-600'
                        }`}>{p}</button>
                    );
                  })}
                  <button onClick={() => loadHistory(historyPage + 1)} disabled={historyPage >= historyPages}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
