// backend/services/prospectEmailService.js
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

let _transporter = null;
const getTransporter = () => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.EMAIL_PORT || '465'),
      secure: parseInt(process.env.EMAIL_PORT || '465') === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return _transporter;
};

const PLATFORM_URL  = process.env.FRONTEND_URL  || 'https://sambid.co';
// For tracking pixels/clicks: must be a publicly reachable URL.
// In production = same as PLATFORM_URL (backend served at same domain).
// For local testing = set TRACK_BASE_URL to your ngrok URL, e.g. https://abc.ngrok.io
const TRACK_BASE_URL = process.env.TRACK_BASE_URL || PLATFORM_URL;
const PLATFORM_NAME = 'Sambid';
const PLATFORM_TAGLINE = 'Federal Contract Intelligence';
const FROM_NAME = `${PLATFORM_NAME} Team`;

// ── Shared HTML helpers ───────────────────────────────────────────────────────

const header = () => `
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-family:Arial,sans-serif;font-weight:800;letter-spacing:-0.5px;">${PLATFORM_NAME}</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px;font-family:Arial,sans-serif;">${PLATFORM_TAGLINE}</p>
  </div>`;

const footer = () => `
  <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;">
      <a href="${PLATFORM_URL}" style="color:#4f46e5;text-decoration:none;font-weight:600;">${PLATFORM_NAME}</a>
      &nbsp;·&nbsp; Federal Contract Intelligence
    </p>
    <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#9ca3af;">
      You're receiving this because your company appears in the federal contracting database.
      <a href="${PLATFORM_URL}/unsubscribe" style="color:#9ca3af;">Unsubscribe</a>
    </p>
  </div>`;

const cta = (text, url = PLATFORM_URL) => `
  <div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.2px;">
      ${text}
    </a>
  </div>`;

const wrap = (innerHtml) => `
<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    ${header()}
    <div style="padding:32px 32px 24px;font-family:Arial,sans-serif;color:#1f2937;">
      ${innerHtml}
    </div>
    ${footer()}
  </div>
</body></html>`;

const p  = (text) => `<p style="margin:0 0 16px;line-height:1.7;font-size:15px;color:#374151;">${text}</p>`;
const h2 = (text) => `<h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827;">${text}</h2>`;
const ul = (items) => `<ul style="margin:0 0 16px;padding-left:20px;">${items.map(i => `<li style="margin-bottom:8px;line-height:1.6;font-size:15px;color:#374151;">${i}</li>`).join('')}</ul>`;
const highlight = (text) => `<span style="background:#ede9fe;color:#5b21b6;padding:2px 8px;border-radius:4px;font-weight:600;">${text}</span>`;
const divider  = () => `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">`;

// ── 10 Email Templates ────────────────────────────────────────────────────────

export const EMAIL_TEMPLATES = {

  // 1. Warm Introduction
  intro: {
    id: 'intro',
    name: 'Platform Introduction',
    category: 'Awareness',
    subject: 'Discover federal contracts matched to {{companyName}}',
    preview: 'Stop missing out on contracts that are perfect for your business.',
    buildHtml: (v) => wrap(`
      ${h2(`Hi${v.contact ? ` ${v.contact}` : ''}, federal contracts are waiting for ${v.company}.`)}
      ${p(`We noticed that <strong>${v.company}</strong> has an active track record in federal contracting. We built ${PLATFORM_NAME} specifically for companies like yours — to make sure you never miss a relevant opportunity.`)}
      ${p(`${PLATFORM_NAME} is an AI-powered federal contract intelligence platform that monitors SAM.gov, USASpending.gov, and FPDS in real-time — then alerts you the moment a matching opportunity is posted.`)}
      ${p(`Here's what sets us apart:`)}
      ${ul([
        `<strong>AI-powered matching</strong> — your NAICS codes, past award history, and certifications drive every alert`,
        `<strong>Real-time SAM.gov notifications</strong> — know about solicitations before your competitors`,
        `<strong>Competitor tracking</strong> — see who's winning in your NAICS space and for how much`,
        `<strong>All tiers covered</strong> — from micro-purchases to IDIQ task orders`,
      ])}
      ${cta(`Explore ${PLATFORM_NAME} Free →`, `${PLATFORM_URL}?utm_source=outreach&utm_campaign=intro`)}
      ${p(`No credit card required for your free trial. Setup takes under 5 minutes.`)}
      ${p(`Best regards,<br><strong>The ${PLATFORM_NAME} Team</strong>`)}
    `),
  },

  // 2. Feature Showcase
  features: {
    id: 'features',
    name: 'Feature Showcase',
    category: 'Education',
    subject: '5 features that help {{companyName}} win more federal contracts',
    preview: 'AI matching, live SAM.gov alerts, competitor intel, and more.',
    buildHtml: (v) => wrap(`
      ${h2(`What ${PLATFORM_NAME} does for contractors like ${v.company}`)}
      ${p(`Hi${v.contact ? ` ${v.contact}` : ''}, federal contracting is competitive — and staying on top of opportunities manually is a full-time job. ${PLATFORM_NAME} automates the intelligence so your team can focus on winning.`)}
      ${divider()}
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${[
          ['🎯 AI Opportunity Matching', `Trained on your NAICS codes, certifications (8a, WOSB, SDVOSB, HUBZone), and award history to surface only the most relevant opportunities.`],
          ['⚡ Instant SAM.gov Alerts', `Email + in-app notifications the moment a solicitation, pre-solicitation, or sources-sought notice matches your profile.`],
          ['📊 Competitor Intelligence', `See which companies are winning contracts in your space, what prices they're bidding, and which agencies are spending the most.`],
          ['🤝 Teaming Partner Finder', `Find qualified teaming partners with complementary certifications for set-aside opportunities you can't pursue alone.`],
          ['📁 Proposal Workspace', `Organize active opportunities, set bid/no-bid deadlines, attach documents, and track your pipeline — all in one place.`],
        ].map(([feat, desc]) => `
          <tr>
            <td style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;vertical-align:top;width:100%;">
              <strong style="display:block;font-size:14px;color:#111827;margin-bottom:4px;">${feat}</strong>
              <span style="font-size:14px;color:#6b7280;line-height:1.5;">${desc}</span>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
        `).join('')}
      </table>
      ${cta(`See All Features → Start Free`, `${PLATFORM_URL}/features?utm_source=outreach&utm_campaign=features`)}
      ${p(`<strong>The ${PLATFORM_NAME} Team</strong>`)}
    `),
  },

  // 3. Competitor Comparison
  competitor: {
    id: 'competitor',
    name: 'Competitor Comparison',
    category: 'Consideration',
    subject: 'Why contractors are switching from GovWin to {{companyName}}\'s new platform',
    preview: 'Sambid vs GovWin IQ, Deltek, and USASpending — an honest comparison.',
    buildHtml: (v) => wrap(`
      ${h2(`Still paying $1,500/month for GovWin? There's a better option for ${v.company}.`)}
      ${p(`Hi${v.contact ? ` ${v.contact}` : ''}, tools like GovWin IQ and Deltek were built for large prime contractors with dedicated business development teams. ${PLATFORM_NAME} was built for every contractor — including growing companies like ${v.company}.`)}
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <thead>
          <tr style="background:#4f46e5;color:#fff;">
            <th style="padding:10px 14px;text-align:left;border-radius:8px 0 0 0;">Feature</th>
            <th style="padding:10px 14px;text-align:center;">GovWin / Deltek</th>
            <th style="padding:10px 14px;text-align:center;border-radius:0 8px 0 0;">${PLATFORM_NAME} ✓</th>
          </tr>
        </thead>
        <tbody>
          ${[
            ['Real-time SAM.gov alerts', '❌ Daily digest only', '✅ Instant notifications'],
            ['AI NAICS-based matching', '⚠️ Keyword only', '✅ AI + award history'],
            ['Pricing', '❌ $800–$2,500/mo', '✅ From $29/mo'],
            ['Teaming partner finder', '❌ Not included', '✅ Built in'],
            ['Small business set-aside focus', '⚠️ Limited', '✅ Full support'],
            ['Setup time', '⚠️ 2–4 weeks', '✅ Under 5 minutes'],
          ].map(([feat, col1, col2], i) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
              <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827;">${feat}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;">${col1}</td>
              <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:center;color:#059669;font-weight:600;">${col2}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${cta(`Switch to ${PLATFORM_NAME} — First Month Free`, `${PLATFORM_URL}/pricing?utm_source=outreach&utm_campaign=competitor`)}
      ${p(`<strong>The ${PLATFORM_NAME} Team</strong>`)}
    `),
  },

  // 4. ROI & Success Stories
  roi: {
    id: 'roi',
    name: 'ROI & Success Stories',
    category: 'Social Proof',
    subject: 'How contractors like {{companyName}} win 40% more contracts',
    preview: 'Real results from federal contractors using Sambid.',
    buildHtml: (v) => wrap(`
      ${h2(`The ROI numbers behind ${PLATFORM_NAME} for ${v.company}`)}
      ${p(`Hi${v.contact ? ` ${v.contact}` : ''}, we know you evaluate every tool by the return it delivers. Here's what contractors on ${PLATFORM_NAME} are reporting:`)}
      <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
        ${[
          ['40%', 'more relevant opportunities identified per month'],
          ['3×', 'faster solicitation discovery vs manual SAM.gov searches'],
          ['$180K', 'average additional annual contract revenue reported by Pro users'],
        ].map(([stat, desc]) => `
          <div style="flex:1;min-width:150px;background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #c4b5fd;border-radius:10px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#4f46e5;">${stat}</div>
            <div style="font-size:12px;color:#5b21b6;line-height:1.4;margin-top:4px;">${desc}</div>
          </div>
        `).join('')}
      </div>
      ${divider()}
      ${p(`<em>"Before ${PLATFORM_NAME}, our BD team spent 8 hours a week just monitoring SAM.gov. Now we get a 7am digest with every matching opportunity — we've added two new agency relationships in 6 months."</em><br><strong>— 8(a) Construction Firm, Texas</strong>`)}
      ${divider()}
      ${p(`<em>"The competitor intelligence feature alone paid for the subscription in the first quarter. We finally understood why we were losing and adjusted our pricing strategy."</em><br><strong>— IT Services Contractor, Virginia</strong>`)}
      ${cta(`Calculate Your ROI → Start Free Trial`, `${PLATFORM_URL}/roi?utm_source=outreach&utm_campaign=roi`)}
      ${p(`<strong>The ${PLATFORM_NAME} Team</strong>`)}
    `),
  },

  // 5. Free Trial Offer
  freetrial: {
    id: 'freetrial',
    name: 'Free Trial Offer',
    category: 'Conversion',
    subject: '{{companyName}}: 7 days of federal contract intelligence, on us',
    preview: 'No credit card. No commitment. Full Pro access for 7 days.',
    buildHtml: (v) => wrap(`
      ${h2(`${v.company} — your free 7-day Pro trial is reserved.`)}
      ${p(`Hi${v.contact ? ` ${v.contact}` : ''}, we'd like to offer <strong>${v.company}</strong> a full ${highlight('7-day Pro trial')} of ${PLATFORM_NAME} — no credit card required.`)}
      ${p(`During your trial you'll have complete access to:`)}
      ${ul([
        `Unlimited AI-matched opportunity alerts for your NAICS codes`,
        `Real-time SAM.gov, USASpending.gov, and FPDS monitoring`,
        `Full competitor intelligence dashboard`,
        `Teaming partner finder`,
        `Proposal pipeline workspace`,
        `Dedicated onboarding support`,
      ])}
      ${divider()}
      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#854d0e;">
          ⏰ <strong>This offer is available for the next 7 days.</strong> After that, trial access reverts to the free tier (5 alerts/month).
        </p>
      </div>
      ${cta(`Claim My Free 14-Day Pro Trial`, `${PLATFORM_URL}/trial?utm_source=outreach&utm_campaign=freetrial`)}
      ${p(`Questions? Reply to this email and our team will get back to you within a few hours.`)}
      ${p(`<strong>The ${PLATFORM_NAME} Team</strong>`)}
    `),
  },

  // 6. Custom Pricing Quote
  pricing: {
    id: 'pricing',
    name: 'Pricing & Plans',
    category: 'Conversion',
    subject: 'Custom pricing for {{companyName}} — starting at $29/month',
    preview: 'Transparent, contractor-friendly plans with no long-term contracts.',
    buildHtml: (v) => wrap(`
      ${h2(`${PLATFORM_NAME} pricing built for contractors like ${v.company}`)}
      ${p(`Hi${v.contact ? ` ${v.contact}` : ''}, we keep our pricing simple and transparent — no per-seat fees, no hidden costs, no 12-month lock-ins.`)}
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${[
          ['Starter', '$29/mo', ['25 AI-matched alerts/month', 'SAM.gov monitoring', 'Basic competitor view', 'Email support'], false],
          ['Pro', '$79/mo', ['Unlimited alerts', 'Real-time SAM.gov + FPDS + USASpending', 'Full competitor intelligence', 'Teaming partner finder', 'Proposal pipeline', 'Priority support'], true],
          ['Enterprise', '$499/mo · $4,788/yr', ['Everything in Pro', 'Multi-user team access', 'API data export', 'Custom NAICS watchlists', 'Dedicated account manager', 'White-glove onboarding'], false],
        ].map(([plan, price, feats, recommended]) => `
          <tr>
            <td style="padding:0;padding-bottom:12px;">
              <div style="border:${recommended ? '2px solid #4f46e5' : '1px solid #e5e7eb'};border-radius:10px;padding:18px;background:${recommended ? '#faf5ff' : '#fff'};">
                ${recommended ? `<div style="display:inline-block;background:#4f46e5;color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:100px;margin-bottom:8px;">MOST POPULAR</div>` : ''}
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <strong style="font-size:16px;color:#111827;">${plan}</strong>
                  <span style="font-size:18px;font-weight:900;color:#4f46e5;">${price}</span>
                </div>
                <ul style="margin:0;padding-left:18px;">${feats.map(f => `<li style="font-size:13px;color:#4b5563;margin-bottom:4px;">${f}</li>`).join('')}</ul>
              </div>
            </td>
          </tr>
        `).join('')}
      </table>
      ${cta(`Start Free — Upgrade Anytime`, `${PLATFORM_URL}/pricing?utm_source=outreach&utm_campaign=pricing`)}
      ${p(`All plans come with a <strong>7-day free trial</strong>. Cancel anytime.`)}
      ${p(`<strong>The ${PLATFORM_NAME} Team</strong>`)}
    `),
  },

  // 7. Government Contracting Tips
  tips: {
    id: 'tips',
    name: 'Government Contracting Tips',
    category: 'Value-Add',
    subject: '5 federal contracting tips every contractor needs in 2025',
    preview: 'Practical tips to win more federal contracts — from our research team.',
    buildHtml: (v) => wrap(`
      ${h2(`5 tips to win more federal contracts in 2025`)}
      ${p(`Hi${v.contact ? ` ${v.contact}` : ''}, we've analyzed tens of thousands of federal contract awards. Here's what separates the contractors who consistently win from those who don't:`)}
      ${[
        ['Monitor pre-solicitations, not just solicitations', `Most companies start reading when the solicitation drops — but the real opportunity is in pre-solicitations and sources-sought notices. Responding to those puts you on the agency's radar before the formal RFP is even written.`],
        ['Use past performance strategically', `Agencies score past performance heavily. Build a database of your award history with NAICS codes, agency names, and dollar amounts — and reference it explicitly in every proposal.`],
        ['Target your top 3 agencies, not every agency', `It's better to have three agency relationships where you understand the people, priorities, and procurement cycles than to spray-and-pray across 20 agencies.`],
        ['Leverage set-asides before you outgrow them', `If your business qualifies for 8(a), WOSB, HUBZone, or SDVOSB set-asides, prioritize those pipelines now. Many contractors wait too long and age out of the programs.`],
        ['Debrief every loss', `Agencies are required to debrief you on why you didn't win. Most contractors skip this — don't. The feedback is gold and directly improves your next proposal.`],
      ].map(([title, body], i) => `
        <div style="margin-bottom:20px;padding:16px;background:#f9fafb;border-left:4px solid #4f46e5;border-radius:0 8px 8px 0;">
          <strong style="display:block;font-size:14px;color:#111827;margin-bottom:6px;">${i + 1}. ${title}</strong>
          <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6;">${body}</p>
        </div>
      `).join('')}
      ${p(`${PLATFORM_NAME} automates points 1 and 2 for ${v.company} — real-time alerts on pre-solicitations and an auto-generated past-performance summary from your USASpending history.`)}
      ${cta(`See How It Works — Free Trial`, `${PLATFORM_URL}?utm_source=outreach&utm_campaign=tips`)}
      ${p(`<strong>The ${PLATFORM_NAME} Team</strong>`)}
    `),
  },

  // 8. Teaming & Partnership
  teaming: {
    id: 'teaming',
    name: 'Teaming & Partnership',
    category: 'Feature Highlight',
    subject: '{{companyName}}: Find the right teaming partners for set-aside contracts',
    preview: 'Sambid connects contractors for teaming on federal set-aside opportunities.',
    buildHtml: (v) => wrap(`
      ${h2(`${v.company} could be winning larger contracts through teaming`)}
      ${p(`Hi${v.contact ? ` ${v.contact}` : ''}, some of the most valuable federal opportunities require capabilities or certifications your company might not have alone — that's where teaming partnerships come in.`)}
      ${p(`${PLATFORM_NAME}'s Teaming Partner Finder connects you with pre-vetted contractors who have:`)}
      ${ul([
        `Complementary NAICS codes and past performance`,
        `8(a), WOSB, HUBZone, or SDVOSB certifications you may need`,
        `Geographic coverage for multi-region contracts`,
        `Cleared personnel for restricted opportunities`,
      ])}
      ${divider()}
      ${p(`Here's how it works for ${v.company}:`)}
      <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:20px;margin-bottom:24px;">
        <ol style="margin:0;padding-left:18px;font-size:14px;color:#4b5563;line-height:2;">
          <li>Enter your company profile and target opportunities</li>
          <li>${PLATFORM_NAME} surfaces compatible partners filtered by NAICS, certifications, and past performance</li>
          <li>Review their award history and capabilities before reaching out</li>
          <li>Connect directly through the platform</li>
        </ol>
      </div>
      ${cta(`Find Teaming Partners for ${v.company}`, `${PLATFORM_URL}/teaming?utm_source=outreach&utm_campaign=teaming`)}
      ${p(`<strong>The ${PLATFORM_NAME} Team</strong>`)}
    `),
  },

  // 9. Follow-up (no response)
  followup: {
    id: 'followup',
    name: 'Gentle Follow-Up',
    category: 'Re-Engagement',
    subject: 'Re: federal contract opportunities for {{companyName}}',
    preview: 'Just wanted to make sure my earlier note didn\'t get lost.',
    buildHtml: (v) => wrap(`
      ${h2(`Following up — contracts are moving fast in ${v.state || 'your area'}`)}
      ${p(`Hi${v.contact ? ` ${v.contact}` : ''}, I wanted to make sure my earlier email didn't get lost in the noise.`)}
      ${p(`I reached out because <strong>${v.company}</strong> has an active federal contracting profile — and several matching solicitations have posted in the last 30 days that you may not have seen.`)}
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#92400e;font-family:Arial,sans-serif;">
          📋 <strong>Recent matching opportunities:</strong> ${PLATFORM_NAME} found active solicitations in your NAICS category that close in the next 14–30 days.
        </p>
      </div>
      ${p(`If this isn't the right time or the right person, please let me know who handles business development at ${v.company} and I'll reach out directly.`)}
      ${p(`If you're open to it, a 15-minute demo would let me show you exactly which opportunities we're tracking for your profile — no pitch, just data.`)}
      ${cta(`Book a 15-Minute Demo`, `${PLATFORM_URL}/demo?utm_source=outreach&utm_campaign=followup`)}
      ${p(`<strong>The ${PLATFORM_NAME} Team</strong>`)}
    `),
  },

  // 10. Limited Time Discount
  discount: {
    id: 'discount',
    name: 'Special Discount Offer',
    category: 'Promotion',
    subject: 'Exclusive: 40% off Sambid Pro for {{companyName}} — this week only',
    preview: '40% off your first 3 months. Offer expires Friday.',
    buildHtml: (v) => wrap(`
      ${h2(`Limited offer: 40% off ${PLATFORM_NAME} Pro for ${v.company}`)}
      ${p(`Hi${v.contact ? ` ${v.contact}` : ''}, we're extending an exclusive discount to select companies in the federal contracting space this week — and ${v.company} qualified.`)}
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="color:rgba(255,255,255,.8);font-size:13px;font-family:Arial,sans-serif;margin-bottom:4px;">Use code at checkout</div>
        <div style="color:#fff;font-size:32px;font-weight:900;font-family:monospace;letter-spacing:6px;background:rgba(255,255,255,.15);display:inline-block;padding:10px 24px;border-radius:8px;">FEDWIN40</div>
        <div style="color:rgba(255,255,255,.8);font-size:13px;font-family:Arial,sans-serif;margin-top:8px;">40% off your first 3 months on any paid plan</div>
      </div>
      ${p(`Here's what you get on the ${highlight('Pro plan')} ($79 → $47/month for 3 months):`)}
      ${ul([
        `Unlimited AI-matched federal contract alerts`,
        `Real-time monitoring across SAM.gov, FPDS, and USASpending.gov`,
        `Competitor intelligence — see who's winning and at what price`,
        `Teaming partner finder and proposal workspace`,
        `Priority onboarding support`,
      ])}
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px;margin-bottom:24px;text-align:center;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#991b1b;font-weight:600;">
          ⏳ Offer expires this Friday at midnight. Code: <span style="font-family:monospace;background:#fee2e2;padding:2px 8px;border-radius:4px;">FEDWIN40</span>
        </p>
      </div>
      ${cta(`Claim 40% Off — Apply Code FEDWIN40`, `${PLATFORM_URL}/pricing?code=FEDWIN40&utm_source=outreach&utm_campaign=discount`)}
      ${p(`<strong>The ${PLATFORM_NAME} Team</strong>`)}
    `),
  },
};

// ── Template list for API ─────────────────────────────────────────────────────

export const getTemplateList = () =>
  Object.values(EMAIL_TEMPLATES).map(({ id, name, category, subject, preview }) =>
    ({ id, name, category, subject, preview })
  );

// ── Render a template with company variables ──────────────────────────────────

export const renderTemplate = (templateId, prospect) => {
  const tpl = EMAIL_TEMPLATES[templateId];
  if (!tpl) throw new Error(`Unknown template: ${templateId}`);

  const vars = {
    company: prospect.companyName || 'your company',
    contact: prospect.contactPersonName || '',
    state:   prospect.state || '',
    naics:   prospect.naicsCode || '',
  };

  const replaceVars = (str) =>
    str
      .replace(/\{\{companyName\}\}/g, vars.company)
      .replace(/\{\{contactName\}\}/g, vars.contact)
      .replace(/\{\{state\}\}/g,       vars.state)
      .replace(/\{\{naicsCode\}\}/g,   vars.naics);

  return {
    subject: replaceVars(tpl.subject),
    html:    tpl.buildHtml(vars),
    templateName: tpl.name,
  };
};

// ── Send email to a single prospect ──────────────────────────────────────────

export const sendProspectEmail = async (prospect, templateId) => {
  const email = prospect.primaryEmail || (prospect.allEmails && prospect.allEmails[0]);
  if (!email) return { sent: false, reason: 'no_email' };

  const { subject, html, templateName } = renderTemplate(templateId, prospect);

  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to:   email,
    subject,
    html,
  });

  return { sent: true, email, subject, templateName };
};

// ── Bulk send (static templates) ─────────────────────────────────────────────

export const sendBulkProspectEmails = async (prospects, templateId, sentBy = 'admin') => {
  const results = { sent: 0, failed: 0, noEmail: 0, errors: [] };

  for (const prospect of prospects) {
    try {
      const result = await sendProspectEmail(prospect, templateId);
      if (result.sent) {
        results.sent++;
        await prospect.constructor.findByIdAndUpdate(prospect._id, {
          $push: {
            emailHistory: {
              templateId,
              templateName: result.templateName,
              subject:      result.subject,
              sentAt:       new Date(),
              sentBy,
            },
          },
          $set: { contacted: true, contactedDate: new Date(), contactedBy: sentBy },
        });
      } else {
        results.noEmail++;
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ id: prospect._id, name: prospect.companyName, error: err.message });
    }
  }

  return results;
};

// ── AI Email Generation ───────────────────────────────────────────────────────

const TYPE_CONTEXT = {
  intro:      'Write a warm introductory email presenting Sambid as the ideal tool for this federal contractor. Explain clearly what Sambid does and why it matters for their business.',
  features:   "Highlight Sambid's 5 key features: AI-powered NAICS opportunity matching, real-time SAM.gov alerts, competitor intelligence dashboard, teaming partner finder, and proposal workspace.",
  competitor: 'Compare Sambid to GovWin IQ and Deltek. Emphasize Sambid costs $29–79/mo vs competitors at $800–2,500/mo, setup is 5 minutes vs 2–4 weeks, and AI matching is more accurate.',
  campaign:   'Explain how Sambid helps federal contractors run a better business development campaign — identify more opportunities, track competitors, and win more contracts with less manual work.',
  cost:       "Focus entirely on cost savings. Sambid starts at $29/mo vs competitors at $800–2,500/mo. Show the math on annual savings and what they could reinvest in BD or operations.",
  time:       'Focus entirely on time savings. Contractors spend 8+ hours per week monitoring SAM.gov manually. Sambid automates this completely with instant matching alerts.',
  trial:      'Offer a free 7-day Pro trial of Sambid — no credit card required, full access to all features, easy cancellation. Create urgency with a 7-day window.',
  pricing:    'Present Sambid pricing: Starter $29/mo ($278/yr), Pro $79/mo ($758/yr), Enterprise $499/mo ($4,788/yr — save 20%). All include 7-day free trial.',
  success:    'Share success metrics: contractors on Sambid identify 40% more relevant opportunities per month, save 8 hours/week, and report an average of $180K in additional annual contract revenue.',
  followup:   "Write a gentle follow-up to someone who didn't respond to a previous Sambid email. Be brief (3 short paragraphs), remind them of the opportunity, and offer a 15-minute no-pitch demo.",
};

export const EMAIL_TYPE_LIST = [
  { id: 'intro',      label: 'Platform Intro',    emoji: '👋', color: 'blue'   },
  { id: 'features',   label: 'Key Features',       emoji: '⚡', color: 'cyan'   },
  { id: 'competitor', label: 'vs Competitors',      emoji: '🏆', color: 'amber'  },
  { id: 'campaign',   label: 'Win Campaign',        emoji: '🎯', color: 'violet' },
  { id: 'cost',       label: 'Cost Saving',         emoji: '💰', color: 'green'  },
  { id: 'time',       label: 'Time Saving',         emoji: '⏱️', color: 'teal'   },
  { id: 'trial',      label: 'Free Trial',          emoji: '🎁', color: 'rose'   },
  { id: 'pricing',    label: 'Pricing & Plans',     emoji: '📋', color: 'orange' },
  { id: 'success',    label: 'Success Stories',     emoji: '✅', color: 'emerald'},
  { id: 'followup',   label: 'Follow Up',           emoji: '🔁', color: 'indigo' },
];

const fmtAmount = (n) => {
  const v = Number(n) || 0;
  return v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : v ? `$${v}` : 'unknown amount';
};

// ── Static fallback templates (used when no AI key is available) ──────────────

const STATIC_TEMPLATES = {
  intro: (v) => ({
    subject: `Discover federal contracts matched to ${v.company}`,
    bodyText: `Hi${v.contact ? ` ${v.contact}` : ''},\n\nI wanted to reach out because ${v.company} has an active federal contracting track record${v.state ? ` in ${v.state}` : ''}. We built Sambid specifically for companies like yours — to make sure you never miss a relevant contract opportunity.\n\nSambid is an AI-powered federal contract intelligence platform. It monitors SAM.gov, USASpending.gov, and FPDS in real-time and alerts you the moment a matching solicitation is posted based on your NAICS codes and past award history.\n\nKey capabilities: real-time SAM.gov alerts, AI-powered opportunity matching, competitor intelligence dashboard, and a teaming partner finder for set-aside contracts.\n\nNo credit card required. Setup takes under 5 minutes. Explore Sambid free at ${PLATFORM_URL}\n\nBest regards,\nThe Sambid Team`,
  }),
  features: (v) => ({
    subject: `5 features that help ${v.company} win more federal contracts`,
    bodyText: `Hi${v.contact ? ` ${v.contact}` : ''},\n\nFederal contracting is competitive — and manually monitoring SAM.gov takes hours every week. Sambid automates that work so your team can focus on winning.\n\nHere's what Sambid does for contractors like ${v.company}:\n\n1. AI Opportunity Matching — finds solicitations matched to your exact NAICS codes and past performance, not just keywords.\n2. Real-time SAM.gov Alerts — instant email and in-app notifications the moment a matching opportunity posts.\n3. Competitor Intelligence — see which companies are winning in your space and at what price.\n4. Teaming Partner Finder — connect with contractors who have complementary certifications for set-aside opportunities.\n5. Proposal Workspace — track your active bid pipeline with deadlines and documents in one place.\n\nStart a free 7-day trial at ${PLATFORM_URL} — no credit card required.\n\nBest regards,\nThe Sambid Team`,
  }),
  competitor: (v) => ({
    subject: `${v.company}: a smarter alternative to GovWin IQ`,
    bodyText: `Hi${v.contact ? ` ${v.contact}` : ''},\n\nTools like GovWin IQ and Deltek were designed for large prime contractors with dedicated BD teams and $1,500/month budgets. Sambid was built for every federal contractor — including growing companies like ${v.company}.\n\nHere's a quick comparison:\n\nSambid vs GovWin IQ:\n- Price: $29/mo vs $800–2,500/mo\n- Setup: 5 minutes vs 2–4 weeks\n- SAM.gov alerts: real-time vs daily digest\n- AI matching: NAICS + award history vs keyword search only\n- Small business set-aside focus: full support vs limited\n\nFor contractors at ${v.company}'s stage, every dollar in BD budget matters. Sambid gives you enterprise-grade intelligence at a fraction of the cost.\n\nSee the full comparison and start free at ${PLATFORM_URL}\n\nBest regards,\nThe Sambid Team`,
  }),
  campaign: (v) => ({
    subject: `How ${v.company} can run a better federal BD campaign`,
    bodyText: `Hi${v.contact ? ` ${v.contact}` : ''},\n\nWinning more federal contracts isn't just about proposals — it's about having the right intelligence before the RFP drops.\n\nSambid gives ${v.company} the tools to run a sharper business development campaign:\n\nFind opportunities earlier: Sambid monitors pre-solicitations and sources-sought notices so you're on the agency's radar before the formal RFP is even written.\n\nTrack your competition: See exactly which companies are winning contracts in your NAICS space, what prices they're bidding, and which agencies are spending the most.\n\nBuild your pipeline: Organize active opportunities with bid/no-bid deadlines, attach documents, and track your win rate — all in one workspace.\n\nCompanies on Sambid identify 40% more relevant opportunities per month compared to manual SAM.gov monitoring.\n\nStart your free trial at ${PLATFORM_URL}\n\nBest regards,\nThe Sambid Team`,
  }),
  cost: (v) => ({
    subject: `${v.company}: save $15,000+ per year on BD intelligence`,
    bodyText: `Hi${v.contact ? ` ${v.contact}` : ''},\n\nIf ${v.company} is currently using GovWin IQ or a similar tool, you're likely paying $1,500–2,500 per month — that's $18,000–$30,000 per year just for contract discovery.\n\nSambid delivers the same intelligence — real-time SAM.gov alerts, AI opportunity matching, competitor intelligence — starting at $29/month. That's a potential saving of $17,000+ per year that you can reinvest in proposal writing, staffing, or certifications.\n\nAnd if you're currently monitoring SAM.gov manually, consider this: at just 1 hour per day, that's 250+ hours per year of BD time that Sambid automates completely.\n\nThe math is straightforward. The setup takes 5 minutes.\n\nStart free at ${PLATFORM_URL} — no credit card required.\n\nBest regards,\nThe Sambid Team`,
  }),
  time: (v) => ({
    subject: `${v.company}: get back 8 hours a week on federal contracting`,
    bodyText: `Hi${v.contact ? ` ${v.contact}` : ''},\n\nFor most federal contractors, monitoring SAM.gov manually takes 6–10 hours per week. That's time your team could spend on proposals, client relationships, or certifications.\n\nSambid automates the entire monitoring process for ${v.company}. Instead of manually searching SAM.gov every day, you get an instant alert the moment a matching solicitation posts — based on your specific NAICS codes and past performance history.\n\nOne of our users put it well: "Before Sambid, our BD team spent 8 hours a week just monitoring SAM.gov. Now we get a morning digest with every matching opportunity — and we've added two new agency relationships in 6 months."\n\nSetup takes under 5 minutes. Start your free 7-day trial at ${PLATFORM_URL}\n\nBest regards,\nThe Sambid Team`,
  }),
  trial: (v) => ({
    subject: `${v.company}: your free 7-day Sambid Pro trial`,
    bodyText: `Hi${v.contact ? ` ${v.contact}` : ''},\n\nI'd like to offer ${v.company} a free 7-day Pro trial of Sambid — no credit card required, no commitment, and full access to every feature.\n\nDuring your trial you'll have:\n- Unlimited AI-matched contract alerts for your NAICS codes\n- Real-time monitoring across SAM.gov, USASpending.gov, and FPDS\n- Full competitor intelligence dashboard\n- Teaming partner finder\n- Proposal pipeline workspace\n- Dedicated onboarding support\n\nThis offer is available for the next 7 days. After that, trial access reverts to the free tier (5 alerts/month).\n\nClaim your free trial at ${PLATFORM_URL} — setup takes under 5 minutes.\n\nAny questions? Reply to this email and we'll respond within a few hours.\n\nBest regards,\nThe Sambid Team`,
  }),
  pricing: (v) => ({
    subject: `Sambid pricing for ${v.company} — starting at $29/month`,
    bodyText: `Hi${v.contact ? ` ${v.contact}` : ''},\n\nI wanted to share Sambid's pricing — because we hear from contractors that the biggest surprise is how affordable it is compared to alternatives.\n\nStarter — $29/month\n25 AI-matched alerts/month, SAM.gov monitoring, basic competitor view, email support.\n\nPro — $79/month (most popular)\nUnlimited alerts, real-time SAM.gov + FPDS + USASpending monitoring, full competitor intelligence, teaming partner finder, proposal pipeline, priority support.\n\nEnterprise — $499/month\nEverything in Pro plus multi-user team access, API data export, custom NAICS watchlists, and a dedicated account manager.\n\nAll plans include a 7-day free trial. No credit card required to start. Cancel anytime — no annual contracts.\n\nFor comparison, GovWin IQ starts at $800/month and Deltek at $1,500+.\n\nSee all plans and start free at ${PLATFORM_URL}\n\nBest regards,\nThe Sambid Team`,
  }),
  success: (v) => ({
    subject: `How contractors like ${v.company} win 40% more contracts with Sambid`,
    bodyText: `Hi${v.contact ? ` ${v.contact}` : ''},\n\nI wanted to share some numbers from contractors who've been using Sambid — because results matter more than features.\n\nContractors on Sambid report:\n- 40% more relevant opportunities identified per month\n- 3x faster solicitation discovery vs manual SAM.gov monitoring\n- 8+ hours per week saved on BD research\n- $180,000 average additional annual contract revenue (Pro users)\n\nHere's what two of our users said:\n\n"The competitor intelligence feature alone paid for the subscription in the first quarter. We finally understood why we were losing bids and adjusted our pricing strategy." — IT Services Contractor, Virginia\n\n"We added two new agency relationships in 6 months after switching to Sambid. The pre-solicitation alerts let us get in front of the right people before the RFP drops." — 8(a) Construction Firm, Texas\n\nSee if Sambid can deliver similar results for ${v.company}. Start your free trial at ${PLATFORM_URL}\n\nBest regards,\nThe Sambid Team`,
  }),
  followup: (v) => ({
    subject: `Re: federal contract opportunities for ${v.company}`,
    bodyText: `Hi${v.contact ? ` ${v.contact}` : ''},\n\nI wanted to follow up on my earlier note — I realize inboxes get busy and things slip through.\n\nI reached out because ${v.company} has an active federal contracting profile${v.state ? ` in ${v.state}` : ''}, and I thought Sambid could genuinely help you find more opportunities. Several matching solicitations have posted in the last 30 days in your NAICS category.\n\nIf now isn't the right time, or if there's a better person to connect with at ${v.company} for this, just let me know.\n\nIf you're open to it, I'd love to show you a 15-minute demo — no pitch, just a look at what's currently tracking for your profile. Book directly at ${PLATFORM_URL}/demo\n\nBest regards,\nThe Sambid Team`,
  }),
};

// ── Build AI prompt ───────────────────────────────────────────────────────────

const buildPrompt = (templateType, prospectData) => {
  const typeCtx = TYPE_CONTEXT[templateType] || TYPE_CONTEXT.intro;
  const company    = prospectData.companyName || 'your company';
  const state      = prospectData.state   || '';
  const city       = prospectData.city    || '';
  const naics      = prospectData.naicsCode || '';
  const naicsDesc  = prospectData.naicsDescription || '';
  const contracts  = prospectData.totalContractsWon || 0;
  const amount     = fmtAmount(prospectData.totalAwardAmount);
  const contact    = prospectData.contactPersonName || '';
  const location   = [city, state].filter(Boolean).join(', ');

  return `You are a professional B2B copywriter writing a marketing email for Sambid (Federal Contract Intelligence Platform, ${PLATFORM_URL}).

RECIPIENT COMPANY:
- Name: ${company}
- Location: ${location || 'USA'}
- NAICS: ${naics}${naicsDesc ? ` — ${naicsDesc}` : ''}
- Federal contract history: ${contracts} contracts won, total ${amount}
${contact ? `- Contact: ${contact}` : ''}

PLATFORM (Sambid):
- AI-powered federal contract discovery platform
- Monitors SAM.gov, USASpending.gov, FPDS in real-time
- Features: AI NAICS matching, instant alerts, competitor intelligence, teaming finder, proposal workspace
- Plans: Starter $29/mo · Pro $79/mo · Enterprise $499/mo
- Website: ${PLATFORM_URL}

EMAIL TYPE: ${templateType.toUpperCase()}
INSTRUCTIONS: ${typeCtx}

RULES:
- Under 250 words total
- Personalize using the company name and their contracting background
- Be specific, direct, and human — not corporate-speak
- End with ONE clear call to action pointing to ${PLATFORM_URL}
- Plain text paragraphs only (no markdown, no HTML, no bullet points with * or -)
- Separate paragraphs with a blank line

Return ONLY this JSON (no markdown wrapper, no extra text):
{"subject":"...","body":"..."}

The body value must be a single string with \\n\\n between paragraphs.`;
};

export const generateEmailWithAI = async (templateType, prospectData = {}) => {
  const v = {
    company: prospectData.companyName || 'your company',
    contact: prospectData.contactPersonName || '',
    state:   prospectData.state || '',
  };

  const prompt = buildPrompt(templateType, prospectData);

  // ── 1. Try Gemini ──────────────────────────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim()
        .replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(raw);
      if (parsed.subject && parsed.body) {
        return { subject: parsed.subject, bodyText: parsed.body, source: 'gemini' };
      }
    } catch { /* fall through */ }
  }

  // ── 2. Try OpenAI ─────────────────────────────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
      const raw = (resp.choices[0]?.message?.content || '').trim()
        .replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(raw);
      if (parsed.subject && parsed.body) {
        return { subject: parsed.subject, bodyText: parsed.body, source: 'gpt' };
      }
    } catch { /* fall through */ }
  }

  // ── 3. Static fallback — always works, no API key needed ──────────────────
  const tplFn = STATIC_TEMPLATES[templateType] || STATIC_TEMPLATES.intro;
  const tpl   = tplFn(v);
  return { subject: tpl.subject, bodyText: tpl.bodyText, source: 'template' };
};

// ── Build HTML from plain text body ──────────────────────────────────────────

export const buildCustomEmailHtml = (bodyText, trackingId = null) => {
  const paragraphs = bodyText
    .split(/\n\n+/)
    .map(para => para.trim())
    .filter(Boolean)
    .map(para => `<p style="margin:0 0 16px;line-height:1.7;font-size:15px;color:#374151;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');

  const destUrl  = `${PLATFORM_URL}?utm_source=outreach&utm_medium=email`;
  const ctaHref  = trackingId
    ? `${TRACK_BASE_URL}/api/track/click/${trackingId}?url=${encodeURIComponent(destUrl)}`
    : destUrl;
  const plainUrl = trackingId
    ? `${TRACK_BASE_URL}/api/track/click/${trackingId}?url=${encodeURIComponent(PLATFORM_URL)}`
    : PLATFORM_URL;

  const ctaBlock = `
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${ctaHref}"
         style="display:inline-block;background:#4f46e5;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;box-shadow:0 2px 8px rgba(79,70,229,0.25);">
        Explore ${PLATFORM_NAME} &nbsp;&#8594;
      </a>
    </div>
    <p style="text-align:center;margin:12px 0 0;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">
      <a href="${plainUrl}" style="color:#6366f1;text-decoration:none;">${PLATFORM_URL}</a>
    </p>
  `;

  const pixel = trackingId
    ? `<img src="${TRACK_BASE_URL}/api/track/open/${trackingId}" width="1" height="1" style="display:none;border:0;" alt="">`
    : '';

  return wrap(paragraphs + ctaBlock + pixel);
};

// ── Bulk send with custom AI/edited content ───────────────────────────────────

export const sendBulkCustomEmails = async (prospects, { subject, bodyText, templateType }, sentBy = 'admin') => {
  const results = { sent: 0, failed: 0, noEmail: 0, errors: [] };

  for (const prospect of prospects) {
    const email = prospect.primaryEmail || (prospect.allEmails?.[0]);
    if (!email) { results.noEmail++; continue; }

    try {
      const company = prospect.companyName || 'your company';
      const personalSubject = subject.replace(/\{\{companyName\}\}/g, company);
      const personalBody    = bodyText.replace(/\{\{companyName\}\}/g, company);

      // Generate a unique tracking ID for this individual send
      const trackingId = randomBytes(16).toString('hex');
      const html = buildCustomEmailHtml(personalBody, trackingId);

      await getTransporter().sendMail({
        from: `"${FROM_NAME}" <${process.env.EMAIL_USER}>`,
        to:   email,
        subject: personalSubject,
        html,
      });

      results.sent++;
      // Skip history for manually-added custom recipients (no DB doc)
      if (prospect._id) {
        await prospect.constructor.findByIdAndUpdate(prospect._id, {
          $push: {
            emailHistory: {
              templateId:   templateType,
              templateName: EMAIL_TYPE_LIST.find(t => t.id === templateType)?.label || templateType,
              subject:      personalSubject,
              sentAt:       new Date(),
              sentBy,
              trackingId,
              openCount:  0,
              clickCount: 0,
            },
          },
          $set: { contacted: true, contactedDate: new Date(), contactedBy: sentBy },
        });
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ id: prospect._id, name: prospect.companyName, error: err.message });
    }
  }

  return results;
};
