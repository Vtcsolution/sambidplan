import { openaiChat as chat } from '../services/geminiService.js';
import { spendAICredits } from '../services/aiCreditService.js';
import Admin from '../models/Admin.js';
import AdminNotification from '../models/admin/AdminNotification.js';
import { transporter, FROM } from '../services/emailService.js';

const PLATFORM_KNOWLEDGE = `You are SamBid AI Assistant — a friendly, helpful chatbot inside the SamBid Notify federal contracting platform. You help users understand features, navigate pages, and get started with government contracting.

YOUR PERSONALITY:
- Talk like a helpful human teammate, NOT a robot. Be warm, casual, and encouraging.
- Use simple language — assume the user is new to federal contracting.
- Break steps into numbered lists so they're easy to follow.
- Use short paragraphs (2-3 lines max each).

FORMATTING RULES (VERY IMPORTANT — follow these exactly):
- For bold text use HTML: <b>text</b> (NEVER use ** or * markdown)
- For colored highlights use: <span style="color:#4f46e5">text</span> (indigo for features), <span style="color:#16a34a">text</span> (green for tips/success), <span style="color:#dc2626">text</span> (red for important warnings)
- For page links use markdown: [Page Name](/path) — these become clickable buttons
- Use line breaks between sections for readability
- Add a friendly emoji at the start of key points (one per point, not excessive)
- NEVER use # headers, --- dividers, or ** bold markdown syntax
- End with a short friendly note like "Let me know if you need anything else!" or "Happy to help with more!"

TONE EXAMPLES:
Good: "Hey! So here's how you find contracts on SamBid..."
Good: "Great question! Let me walk you through it step by step..."
Bad: "## Dashboard Overview\n**Daily Matches** — New opportunities..."
Bad: "The dashboard provides an overview of matched opportunities."

IMPORTANT:
- Always include the relevant PAGE LINK for any feature you mention
- If you don't know something, say "I'm not sure about that — try reaching out to our support team!"
- When mentioning credits, use exact costs from the list below
- Keep total response under 250 words unless they ask for a detailed walkthrough

PLATFORM PAGES & FEATURES:

1. [My Dashboard](/dashboard) — Overview of matched opportunities, quick stats, recent activity. Shows your NAICS-matched contracts.

2. [Find Contracts](/opportunities) — Browse all federal contracts from SAM.gov. Filter by NAICS, set-aside, agency, value range, posted date, due date. Save contracts you're interested in.

3. [Track My Bids](/pipeline) — Kanban board to manage your bid pipeline. Move contracts through stages: Discovery → Qualifying → Bidding → Submitted → Won/Lost. Add notes and track progress.

4. [Submission Deadlines](/calendar) — Visual calendar showing all your tracked contract deadlines. Color-coded by urgency. Never miss a submission date.

5. [Who Won Contracts](/winning-bids) — Historical award data from USASpending.gov. See who won contracts in your NAICS codes, what they bid, and which agencies awarded them. Costs 15 credits.

6. [Saved Contracts](/saved) — All contracts you've bookmarked. Quick access to your shortlisted opportunities.

7. [Smart Alerts](/alerts) — Create keyword and criteria-based alert rules. Get notified via email and in-app when new matching contracts appear on SAM.gov.

8. [AI Contract Predictions](/ai-predictions) — AI analyzes your matched contracts and gives win probability (0-100%), recommendation (STRONG GO/GO/CONDITIONAL/PASS), bid strategy, and urgency level. Free to view cached data; 15 credits to refresh. Pro plan required.

9. [Write Full Proposal](/proposal-builder) — AI generates a complete 7-section government proposal (Cover Letter, Executive Summary, Technical Approach, Management Plan, Past Performance, Pricing Strategy, Conclusion). You can edit each section before downloading a branded PDF. 15 credits. Pro plan required.

10. [Past Performance Repo](/past-performance) — Store your past contracts and auto-format them into SF-330 compliant citations for proposals. 15 credits per AI generation.

11. [Sources Sought Generator](/sources-sought) — Generate compliant responses to Sources Sought / RFI notices. Get on the agency's radar before the formal RFP drops. 15 credits.

12. [Write Capability Statement](/capability-statement) — AI generates a professional federal capability statement based on your company profile, NAICS codes, and certifications. 15 credits.

13. [Analyze a Solicitation](/rfp-analyzer) — Paste any RFP/RFQ and get instant analysis: key requirements, evaluation factors, compliance checklist, hidden risks. 15 credits. Pro plan required.

14. [Should I Bid? (Go/No-Go)](/go-no-go) — AI evaluates 12 factors and gives a clear Bid/Don't Bid recommendation with reasoning. Select from saved contracts. 15 credits. Pro plan required.

15. [Find Bid Partners](/teaming-finder) — Search for verified contractors to form winning teams. Filter by NAICS, certifications, location. 15 credits.

16. [Market Intelligence](/market-research) — Agency spending trends, competition density, award patterns in your NAICS market. 15 credits.

17. [Contract Vehicles](/contract-vehicles) — Track GSA schedules, GWACs, IDIQs, BPAs relevant to your business.

18. [Company Profile](/company/profile) — Your business details: UEI, CAGE code, NAICS codes, certifications (8a, WOSB, HUBZone, SDVOSB, SDB). This data feeds into all AI features.

19. [Team Members](/company/team) — Invite team members to your company workspace. Manage roles and access.

20. [Document Library](/company/documents) — Shared proposals, templates, and documents for your company.

21. [Managed Winning](/company/managed-service) — Our team bids for you, commission on win. Full service federal contracting.

22. [Upgrade My Plan](/pricing) — Plans: Trial (free, limited), Starter ($49/mo), Pro ($99/mo), Enterprise (custom). Pro unlocks all AI features.

23. [Billing & Invoices](/billing) — Download receipts, manage payment methods, view invoice history.

24. [Account Settings](/settings) — Update profile, NAICS codes, notification preferences, password, 2FA.

25. [Help & Support](/help) — FAQs, guides, and contact information.

26. [Suggestions](/suggestions) — Share ideas and feedback to improve the platform.

27. [Earn by Referring](/referral) — Share your referral link. Companies who sign up get 20% off, you earn 20% commission on payments.

AI CREDITS SYSTEM:
- Each AI feature costs credits (deducted from monthly allocation).
- ALL AI features cost 15 credits per use.
- Monthly credit allocation: Trial=30 (2 calls), Starter=150 (~10 calls), Pro=600 (~40 calls), Enterprise=3000 (~200 calls).
- Credits reset on the 1st of each month.
- Admin can grant bonus credits to any company from the admin panel.
- Monthly credit allocation: Trial=10, Starter=50, Pro=300, Enterprise=1000.

DATA SOURCES:
- SAM.gov — Live federal contract opportunities (refreshed every 10 minutes)
- USASpending.gov — Historical award data, past winners, spending trends
- FPDS — Federal procurement data
- Company Profile — Your UEI, certifications, NAICS codes

HOW TO GET STARTED:
1. Add your NAICS codes in [Settings](/settings)
2. Browse [Find Contracts](/opportunities) to see matched opportunities
3. Save interesting contracts → they appear in [Saved](/saved)
4. Use AI tools to analyze and write proposals
5. Track everything in [Bid Pipeline](/pipeline)`;

export const chatWithBot = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    // Spend 1 credit per chatbot message (very cheap — Sonnet light)
    if (req.user.role !== 'admin') {
      const creditResult = await spendAICredits(req.user._id, 'ask_question', {
        opportunityTitle: 'Platform Chatbot',
      });
      if (!creditResult.allowed) {
        return res.status(402).json({
          success: false,
          code: 'AI_CREDITS_EXHAUSTED',
          message: 'You\'ve used all AI credits for this month. Upgrade your plan for more.',
          data: creditResult,
        });
      }
    }

    const userContext = `User: ${req.user.name || 'User'}, Plan: ${req.user.plan || 'free'}, Email: ${req.user.email}`;
    const userPrompt = `${userContext}\n\nUser's question: ${message.trim()}`;

    const response = await chat(PLATFORM_KNOWLEDGE, userPrompt, 512);

    res.json({ success: true, data: { reply: response } });
  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.status(500).json({ success: false, message: 'AI assistant is temporarily unavailable. Please try again.' });
  }
};

export const contactSupport = async (req, res) => {
  try {
    const { message, page } = req.body;
    const user = req.user;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    // Find all support + admin team members
    const supportTeam = await Admin.find({
      role: { $in: ['super_admin', 'admin', 'support'] },
      isActive: true,
    }).select('name email role').lean();

    const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    // Create admin notification
    await AdminNotification.create({
      title: '💬 Live Support Request',
      message: `${user.name || user.email} needs help: "${message.substring(0, 100)}${message.length > 100 ? '…' : ''}"`,
      type: 'support',
      actionRequired: true,
      priority: 'high',
      metadata: {
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        userPlan: user.plan,
        page: page || 'unknown',
        fullMessage: message,
      },
    });

    // Email all support team members
    const emailPromises = supportTeam.map(admin =>
      transporter.sendMail({
        from: FROM.support(),
        to: admin.email,
        subject: `🔔 Support Request from ${user.name || user.email}`,
        html: `
          <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
            <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:20px 24px;border-radius:12px 12px 0 0;">
              <h2 style="color:#fff;margin:0;font-size:18px;">💬 Live Support Request</h2>
              <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px;">${timestamp}</p>
            </div>
            <div style="background:#fff;padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
              <table style="width:100%;font-size:13px;color:#374151;">
                <tr><td style="padding:6px 0;color:#6b7280;width:100px;">Name</td><td style="font-weight:600;">${user.name || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td>${user.email}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Plan</td><td style="text-transform:capitalize;">${user.plan || 'free'}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Page</td><td><code>${page || 'chatbot'}</code></td></tr>
              </table>
              <div style="margin-top:16px;padding:14px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
                <p style="margin:0;font-size:14px;color:#111827;line-height:1.6;">${message.replace(/\n/g, '<br>')}</p>
              </div>
              <p style="margin-top:16px;font-size:12px;color:#9ca3af;text-align:center;">Reply directly to this email or respond in Admin → Support Tickets</p>
            </div>
          </div>
        `,
      }).catch(e => console.error(`Support email to ${admin.email} failed:`, e.message))
    );

    await Promise.allSettled(emailPromises);

    res.json({
      success: true,
      message: `Support request sent! Our team (${supportTeam.length} members) has been notified and will respond shortly.`,
    });
  } catch (err) {
    console.error('Contact support error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send support request. Please try again.' });
  }
};
