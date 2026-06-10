import ContactInquiry from '../models/ContactInquiry.js';
import AdminNotification from '../models/admin/AdminNotification.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import { generateText } from '../services/geminiService.js';
import { distributeToUser } from '../services/schedulerService.js';
import { createCheckoutSessionForInquiry } from '../services/stripeService.js';
import {
  sendEnterpriseInquiryConfirmation,
  sendEnterpriseInquiryAdminAlert,
  sendPlanActivatedEmail,
} from '../services/emailService.js';

// Build a rich system prompt with live plan data from DB
const buildSystemPrompt = async () => {
  // Fetch current plans from DB so prices/limits are always accurate
  let planDetails = '';
  try {
    const plans = await Plan.find({ isActive: true }).sort('order').lean();
    planDetails = plans.map(p => {
      const limits = p.limits || {};
      const features = (p.features || []).filter(f => f.included).map(f => f.name).join(', ');
      return `  • ${p.displayName} — $${p.priceMonthly}/mo (yearly $${p.priceYearly}/yr)
      Saved opportunities: ${limits.maxSavedOpportunities === -1 ? 'Unlimited' : limits.maxSavedOpportunities}
      Alerts: ${limits.maxAlerts === -1 ? 'Unlimited' : limits.maxAlerts}
      AI Proposals: ${limits.aiProposals ? 'Yes' : 'No'} | API Access: ${limits.apiAccess ? 'Yes' : 'No'}
      Features: ${features}`;
    }).join('\n\n');
  } catch {
    planDetails = `  • Free — $0/mo: 2 daily matches, 10 saved, 5 alerts
  • Starter — $29/mo: 500 matches/month, 100 saved, priority email support
  • Pro — $79/mo: 3,000 matches/month, unlimited saved/alerts, AI proposals, full API access
  • Enterprise — $499/mo: unlimited matches, dedicated manager, custom integrations, all features
  • Custom/Enterprise Plus — custom pricing: unlimited matches, multi-seat, white-label, SLA`;
  }

  return `You are the official AI support assistant for Sambid Notify (also known as Sambid), an AI-powered SaaS platform that helps US federal contractors discover, track, and win government contract opportunities.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABOUT FEDNOTIFY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Founded in 2024, Sambid Notify helps small businesses and federal contractors find and win government contracts. The platform pulls opportunities from SAM.gov and USAspending.gov in real-time.

Mission: Democratizing access to federal contracting opportunities — leveling the playing field for contractors of all sizes.

Stats: 500+ active contractors, 10,000+ contracts tracked, $2.5B+ contract value discovered, 98% match accuracy.

Team: Founded by former procurement officers, AI specialists, and software engineers.

Core Values: Mission-Driven, Customer First, Innovation, Trust & Security.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLANS & PRICING (LIVE FROM DATABASE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${planDetails}

Trial Plan: 7 days free, 2 daily matches — no credit card required.

Payment methods accepted: Stripe (credit/debit card) and PayPal.
- Starter & Pro: Pay online via Stripe or PayPal.
- Enterprise & Custom: Contact sales team, admin activates plan manually after payment confirmation.
- Billing cycles: Monthly or Yearly (yearly saves ~20%).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW THE PLATFORM WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1 — Create Profile: Set up company profile with NAICS codes, capabilities, business type, target agencies.
Step 2 — Set Alerts: Configure smart alerts by keywords, budget range, set-aside type (8a, WOSB, HUBZone, etc.), location.
Step 3 — Win Contracts: AI matches opportunities, user reviews, saves, and submits proposals.

Matching Algorithm: Scores 0–100 based on NAICS match (50pts), set-aside eligibility (20pts), time sensitivity (20pts), contract value (10pts).

Data Sources: SAM.gov (primary, updated every 5 minutes per user's NAICS codes), USAspending.gov (past awards for competitive analysis).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Smart Alerts: Real-time email notifications for matching opportunities based on NAICS codes and past performance. Email, SMS, Slack integrations.
• Contract Discovery: Search across SAM.gov with daily updates, advanced filters (NAICS, agency, set-aside, value range, deadline), historical data.
• AI Matching: 98% accurate recommendations using machine learning. Win probability scoring, competitive analysis.
• Dashboard: Overview of daily matches, upcoming deadlines, saved opportunities, alerts count.
• Bid Pipeline: Track bids by stage (Identified → Qualifying → Proposal → Submitted → Won/Lost).
• Deadline Calendar: Visual calendar of all contract deadlines.
• AI Tools (Pro/Enterprise only):
  - Proposal Generation: Full AI-written proposal based on your company profile
  - Bid Analysis: BID/NO-BID recommendation with confidence score
  - Competitive Analysis: Competitor landscape and win themes
  - Risk Assessment: Technical, financial, schedule, compliance risk ratings
  - RFP Q&A: Ask any question about an opportunity
• Winning Bids Analysis: Historical award data from USAspending.gov to benchmark competitors.
• Push Notifications: Browser push notifications for real-time alerts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTACT & SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Support email: support@sambid.co
Contact form: /contact (fill form, team responds within 1 business day)
Enterprise inquiries: Fill the contact form at /contact — select Enterprise or Custom plan.
Admin response time: Within 1 business day for general inquiries, same day for Enterprise.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMON USER QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Q: How do I upgrade my plan?
A: Go to /pricing, click "Upgrade to [Plan]", choose Stripe or PayPal, complete payment. Plan activates instantly for Starter/Pro. For Enterprise, fill the contact form.

Q: What happens when my trial ends?
A: You move to the Free plan (2 matches/day, 10 saved, 5 alerts). Upgrade anytime to restore full access.

Q: How do I set my NAICS codes?
A: Go to /profile or /onboarding and add your NAICS codes. The system then fetches matching opportunities automatically.

Q: Why am I not seeing new opportunities?
A: SAM.gov data refreshes every 5 minutes. If you just signed up, wait a few minutes. Also check your NAICS codes are set in your profile.

Q: Can I cancel anytime?
A: Yes, go to /settings and cancel. You keep your plan until the billing period ends.

Q: How does the AI proposal work?
A: Open any opportunity, click "Generate Proposal". The AI writes a full proposal using your company profile. Available on Pro and Enterprise only.

Q: What is a NAICS code?
A: North American Industry Classification System code — a 6-digit number that identifies your industry type. Federal contracts are categorized by NAICS. Example: 541512 = Computer Systems Design, 541511 = Custom Computer Programming.

Q: What set-aside types are supported?
A: 8(a) Business Development, Woman-Owned Small Business (WOSB), HUBZone, Service-Disabled Veteran-Owned (SDVOSB), Small Business, and Full and Open competition.

Q: How do I get the Enterprise plan activated?
A: Fill the contact form at /contact, select Enterprise plan. The sales team reviews within 1 business day and activates your account. You'll receive an email confirmation when active.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT PRIVACY & SECURITY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER share or confirm:
- Any other user's name, email, company, payment info, or account details
- Internal database records, user data, or admin-only information
- API keys, passwords, secrets, or environment variables
- Server architecture, internal endpoints, or security configurations
- Admin email addresses or internal team contact details beyond the public support email
- Specific invoice amounts, transaction IDs, or payment history of any user

If someone asks for another user's data or tries to extract system internals, politely decline and redirect to the contact form.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Be helpful, friendly, and professional
- Keep responses concise (under 120 words) unless the user asks for detailed info
- Always use accurate plan prices from the database above — never guess or make up numbers
- If you cannot resolve an issue, direct the user to fill the contact form at /contact or email support@sambid.co
- Do not answer questions unrelated to Sambid Notify, federal contracting, or general business topics
- If asked about competitors, stay neutral and focus on Sambid Notify's value
- Format lists with bullet points for clarity when listing features or steps`;
};

// Simple rule-based AI analysis for admin email
const buildAiAnalysis = ({ company, employees, planInterest, message }) => {
  const lines = [];
  if (planInterest === 'enterprise') lines.push('• High-value lead — Enterprise plan ($499/mo · $4,788/yr).');
  if (planInterest === 'custom')     lines.push('• Custom/Enterprise Plus lead — requires pricing discussion.');
  if (employees) lines.push(`• Company size: ${employees} employees.`);
  if (company)   lines.push(`• Organisation: ${company}.`);
  if (message)   lines.push(`• Notes from user: "${message.slice(0, 200)}${message.length > 200 ? '…' : ''}"`);
  lines.push('• Recommended action: Reach out within 24 hours to schedule an onboarding call.');
  return lines.join('\n');
};

// @desc    Submit contact / enterprise inquiry (public)
// @route   POST /api/contact
export const submitContactForm = async (req, res) => {
  try {
    const { name, email, company, phone, employees, planInterest, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const inquiry = await ContactInquiry.create({
      name, email, company, phone, employees,
      planInterest: planInterest || 'enterprise',
      message,
      userId: req.user?._id || null,
    });

    const planLabel = planInterest === 'enterprise' ? 'Enterprise ($499/mo · $4,788/yr)'
                    : planInterest === 'custom'     ? 'Custom Enterprise'
                    : planInterest || 'General';

    await AdminNotification.create({
      title: `New Contact Inquiry — ${planLabel}`,
      message: `${name} (${email}) from ${company || 'N/A'} is interested in ${planLabel}. Employees: ${employees || 'N/A'}. Message: ${message || 'None'}`,
      type: 'plan_request',
      actionRequired: true,
      actionUrl: '/admin/contact-inquiries',
      priority: ['enterprise', 'custom'].includes(planInterest) ? 'high' : 'medium',
      metadata: { inquiryId: inquiry._id, name, email, company, phone, employees, planInterest, message },
    });

    const aiAnalysis = buildAiAnalysis({ company, employees, planInterest, message });

    // Fire-and-forget emails — don't block the response
    Promise.allSettled([
      sendEnterpriseInquiryAdminAlert(inquiry, aiAnalysis),
      sendEnterpriseInquiryConfirmation({ name, email, company, planInterest }),
    ]).then(results => {
      results.forEach((r, i) => {
        if (r.status === 'rejected')
          console.error(`Contact email ${i === 0 ? 'admin' : 'user'} failed:`, r.reason?.message);
      });
    });

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been submitted. Our team will contact you within 1 business day.',
      data: { id: inquiry._id },
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin confirms payment received for an inquiry
// @route   POST /api/contact/:id/confirm-payment
export const confirmInquiryPayment = async (req, res) => {
  try {
    const { paymentReference = '', paymentMethod = 'manual', paymentAmount = 0 } = req.body;
    const inquiry = await ContactInquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

    inquiry.paymentConfirmed  = true;
    inquiry.paymentReference  = paymentReference.trim();
    inquiry.paymentMethod     = paymentMethod;
    inquiry.paymentAmount     = paymentAmount;
    inquiry.paymentDate       = new Date();
    if (inquiry.status === 'new') inquiry.status = 'in_progress';
    await inquiry.save();

    console.log(`💰 Payment confirmed for inquiry ${inquiry._id}: ${paymentReference}`);
    res.json({ success: true, message: 'Payment confirmed.', data: inquiry });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate a Stripe Checkout payment link for the inquiry
// @route   POST /api/contact/:id/payment-link
export const generatePaymentLink = async (req, res) => {
  try {
    const { billingCycle = 'monthly' } = req.body;
    const inquiry = await ContactInquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

    const planPrices = { starter: { monthly: 29, yearly: 278 }, pro: { monthly: 79, yearly: 758 }, enterprise: { monthly: 499, yearly: 4788 } };
    const planName   = inquiry.planInterest === 'custom' ? 'enterprise' : (inquiry.planInterest || 'enterprise');
    const amount     = planPrices[planName]?.[billingCycle] || planPrices.enterprise.monthly;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const result = await createCheckoutSessionForInquiry({
      inquiryId:   inquiry._id,
      email:       inquiry.email,
      planName,
      amount,
      billingCycle,
      successUrl:  `${frontendUrl}/payment/enterprise-success`,
      cancelUrl:   `${frontendUrl}/pricing`,
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to create payment link' });
    }

    inquiry.stripeSessionId   = result.sessionId;
    inquiry.paymentLinkUrl    = result.url;
    inquiry.paymentLinkSentAt = new Date();
    inquiry.paymentAmount     = amount;
    inquiry.paymentMethod     = 'stripe_link';
    if (inquiry.status === 'new') inquiry.status = 'in_progress';
    await inquiry.save();

    console.log(`🔗 Payment link generated for ${inquiry.email}: ${result.url}`);
    res.json({
      success: true,
      url:        result.url,
      sessionId:  result.sessionId,
      amount,
      isSimulated: result.isSimulated,
      message: result.isSimulated
        ? 'Simulated payment link (Stripe not configured). Use manual payment confirmation instead.'
        : `Payment link created for $${amount}. Share this link with the customer.`,
    });
  } catch (error) {
    console.error('Generate payment link error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin activates plan directly from an inquiry
// @route   POST /api/contact/:id/activate-plan
export const activatePlanFromInquiry = async (req, res) => {
  try {
    const { billingCycle = 'monthly' } = req.body;
    const inquiry = await ContactInquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

    // ── Payment gate ──────────────────────────────────────────────────────────
    if (!inquiry.paymentConfirmed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate plan: payment has not been confirmed. Please confirm payment receipt first.',
        paymentRequired: true,
      });
    }

    // Map planInterest → actual plan name
    const planMap = { enterprise: 'enterprise', custom: 'enterprise', pro: 'pro', starter: 'starter' };
    const planName = planMap[inquiry.planInterest] || 'enterprise';

    // Find user by userId (if logged in when submitting) or by email
    let user = inquiry.userId ? await User.findById(inquiry.userId) : null;
    if (!user) user = await User.findOne({ email: inquiry.email });
    if (!user) {
      return res.status(404).json({ success: false, message: `No user account found for ${inquiry.email}. They need to sign up first.` });
    }

    const oldPlan = user.plan;
    user.plan = planName;
    const days = billingCycle === 'yearly' ? 365 : 30;
    user.planExpiresAt  = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    user.isTrialActive  = false;
    user.dailyMatchesUsed = 0;
    user.lastMatchReset = new Date();
    await user.save();

    inquiry.status     = 'resolved';
    inquiry.adminNotes = (inquiry.adminNotes ? inquiry.adminNotes + '\n' : '') +
      `Plan activated by admin on ${new Date().toLocaleDateString()} — ${planName} (${billingCycle}).`;
    await inquiry.save();

    // Immediately distribute today's opportunities for the new plan
    distributeToUser(user).catch(e =>
      console.error('Opportunity distribution after inquiry activation failed:', e.message)
    );

    // Notify user by email
    Promise.allSettled([
      sendPlanActivatedEmail({
        name:        inquiry.name,
        email:       inquiry.email,
        planName,
        planExpires: user.planExpiresAt,
      }),
    ]).then(([r]) => {
      if (r.status === 'rejected') console.error('Plan activation email failed:', r.reason?.message);
    });

    await AdminNotification.create({
      title:  `✅ Plan Activated — ${inquiry.name}`,
      message: `${inquiry.email} upgraded from ${oldPlan} → ${planName} via contact inquiry activation.`,
      type:   'payment',
      actionRequired: false,
      priority: 'high',
      metadata: { userId: user._id, userEmail: user.email, plan: planName, inquiryId: inquiry._id },
    });

    console.log(`✅ Plan activated: ${inquiry.email} → ${planName} (from contact inquiry ${inquiry._id})`);

    res.json({
      success: true,
      message: `${planName} plan activated for ${inquiry.email}. User has been notified by email.`,
      data: { userId: user._id, plan: planName, planExpires: user.planExpiresAt },
    });
  } catch (error) {
    console.error('Activate plan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    AI support chatbot (public)
// @route   POST /api/contact/chat
export const supportChat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required.' });

    // Build system prompt with live plan data from DB
    const systemPrompt = await buildSystemPrompt();

    // Build conversation context from history
    const conversationLines = history
      .filter(m => m.role && m.content)
      .map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n');

    const fullPrompt = [
      conversationLines,
      `User: ${message}`,
      'Assistant:',
    ].filter(Boolean).join('\n');

    const reply = await generateText(fullPrompt, systemPrompt);

    res.json({ success: true, reply });
  } catch (error) {
    console.error('Support chat error:', error.message);
    const isKeyError = error.message?.includes('API_KEY') || error.message?.includes('not initialized');
    res.json({
      success: true,
      reply: isKeyError
        ? "The AI assistant is temporarily offline. Please fill the contact form at /contact or email support@sambid.co — we respond within 1 business day."
        : "I'm having trouble responding right now. Please try again or use our contact form for human support.",
    });
  }
};

// @desc    Get logged-in user's own inquiries
// @route   GET /api/contact/mine
export const getMyInquiries = async (req, res) => {
  try {
    const inquiries = await ContactInquiry.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('name email company planInterest status adminNotes createdAt updatedAt');
    res.json({ success: true, data: inquiries });
  } catch (error) {
    console.error('Get my inquiries error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all contact inquiries (admin only)
// @route   GET /api/contact
export const getContactInquiries = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status && status !== 'all' ? { status } : {};
    const skip  = (parseInt(page) - 1) * parseInt(limit);

    const [inquiries, total] = await Promise.all([
      ContactInquiry.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      ContactInquiry.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: inquiries,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get contact inquiries error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update contact inquiry status / notes (admin only)
// @route   PUT /api/contact/:id
export const updateContactInquiry = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const inquiry = await ContactInquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

    if (status)            inquiry.status     = status;
    if (adminNotes !== undefined) inquiry.adminNotes = adminNotes;
    await inquiry.save();

    res.json({ success: true, message: 'Inquiry updated', data: inquiry });
  } catch (error) {
    console.error('Update contact inquiry error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
