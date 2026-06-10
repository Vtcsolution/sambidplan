// backend/services/emailService.js
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';

// Lazy transporter — reads env vars at first use so admin updates take effect.
let _transporter = null;
const transporter = {
  sendMail: async (options) => {
    if (!_transporter) {
      const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465');
      _transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST   || process.env.EMAIL_HOST || 'smtp.hostinger.com',
        port,
        secure: (process.env.SMTP_SECURE || 'true') === 'true' || port === 465,
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
        },
      });
    }
    return _transporter.sendMail(options);
  },
};

// Called by settingsService after admin updates SMTP credentials
export const resetEmailTransporter = () => { _transporter = null; };

// Sender addresses — all authenticated via SMTP_USER credentials.
// noreply: automated system emails  |  support: tickets/suggestions/enterprise
// billing: payments/invoices/plan activation
const _smtpUser = () => process.env.SMTP_USER || process.env.EMAIL_USER;
const FROM = {
  noreply: () => `"Sambid" <${process.env.EMAIL_NOREPLY || _smtpUser()}>`,
  support: () => `"Sambid Support" <${process.env.EMAIL_SUPPORT || _smtpUser()}>`,
  billing: () => `"Sambid Billing" <${process.env.EMAIL_BILLING || _smtpUser()}>`,
  custom:  (name) => `"${name}" <${process.env.EMAIL_NOREPLY || _smtpUser()}>`,
};

/**
 * Send 6-digit OTP for password reset
 */
export const sendPasswordResetOtpEmail = async (user, otp) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;color:white;">
        <h1 style="margin:0;">Sambid</h1>
        <p style="margin:5px 0 0;opacity:.9;">Federal Contract Intelligence</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">Password Reset Code</h2>
        <p style="color:#4b5563;line-height:1.6;">Hi ${user.name || 'there'},</p>
        <p style="color:#4b5563;line-height:1.6;">Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
        <div style="text-align:center;margin:28px 0;">
          <div style="display:inline-block;background:#f0f4ff;border:2px solid #6366f1;border-radius:12px;padding:16px 40px;">
            <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#4338ca;font-family:monospace;">${otp}</span>
          </div>
        </div>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Sambid · Federal Contract Intelligence
        </p>
      </div>
    </div>`;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: `Your Sambid password reset code: ${otp}`,
    html,
  });
  console.log(`📧 Password reset OTP sent to ${user.email}`);
};

/**
 * Send password reset email (legacy link-based — kept for compatibility)
 */
export const sendPasswordResetEmail = async (user, resetUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align:center; padding:20px; background:linear-gradient(135deg,#6366f1,#8b5cf6); border-radius:12px; color:white;">
        <h1 style="margin:0;">Sambid Notify</h1>
        <p style="margin:5px 0 0; opacity:.9;">Federal Contract Intelligence</p>
      </div>
      <div style="padding:30px; background:white; border-radius:12px; margin-top:20px; box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937; margin-top:0;">Reset Your Password</h2>
        <p style="color:#4b5563;">Hi ${user.name || 'there'},</p>
        <p style="color:#4b5563;">We received a request to reset the password for your Sambid Notify account. Click the button below to set a new password:</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="${resetUrl}" style="background:#6366f1; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px; display:inline-block;">
            Reset Password →
          </a>
        </div>
        <p style="color:#6b7280; font-size:14px;">This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email.</p>
        <div style="background:#f9fafb; border-radius:8px; padding:12px; margin-top:20px;">
          <p style="margin:0; font-size:12px; color:#9ca3af;">Or copy this URL into your browser:</p>
          <p style="margin:5px 0 0; font-size:12px; word-break:break-all; color:#6366f1;">${resetUrl}</p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: 'Reset your Sambid Notify password',
    html
  });

  console.log(`📧 Password reset email sent to ${user.email}`);
};

/**
 * Send email verification link
 */
export const sendEmailVerificationEmail = async (user, verifyUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align:center; padding:20px; background:linear-gradient(135deg,#6366f1,#8b5cf6); border-radius:12px; color:white;">
        <h1 style="margin:0;">Sambid Notify</h1>
        <p style="margin:5px 0 0; opacity:.9;">Federal Contract Intelligence</p>
      </div>
      <div style="padding:30px; background:white; border-radius:12px; margin-top:20px; box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937; margin-top:0;">Verify Your Email</h2>
        <p style="color:#4b5563;">Hi ${user.name || 'there'},</p>
        <p style="color:#4b5563;">Thanks for signing up! Please confirm your email address to get the most out of Sambid Notify.</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="${verifyUrl}" style="background:#6366f1; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px; display:inline-block;">
            Verify Email →
          </a>
        </div>
        <p style="color:#6b7280; font-size:14px;">This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
        <div style="background:#f9fafb; border-radius:8px; padding:12px; margin-top:20px;">
          <p style="margin:0; font-size:12px; color:#9ca3af;">Or copy this URL into your browser:</p>
          <p style="margin:5px 0 0; font-size:12px; word-break:break-all; color:#6366f1;">${verifyUrl}</p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: 'Verify your Sambid Notify email',
    html
  });

  console.log(`📧 Verification email sent to ${user.email}`);
};

/**
 * Send trial reminder emails
 */
export const sendTrialReminder = async (user, daysLeft) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; color: white;">
        <h1 style="margin: 0;">Sambid</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">Federal Contract Intelligence</p>
      </div>
      
      <div style="padding: 30px; background: white; border-radius: 12px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0;">Your Free Trial is Ending Soon!</h2>
        
        <p style="color: #4b5563; line-height: 1.6;">
          <strong>${daysLeft} days left</strong> in your free trial.
        </p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px; color: #1f2937;">What you'll lose after trial:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li>Access to daily contract matches</li>
            <li>NAICS code filtering</li>
            <li>Winning bids analysis</li>
            <li>Email alerts</li>
          </ul>
        </div>
        
        <div style="background: #e0e7ff; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0 0 10px; color: #4338ca;">Upgrade to Pro - $79/month</h3>
          <p style="margin: 0 0 15px; color: #3730a3;">Get unlimited daily matches + AI proposal generation</p>
          <a href="${process.env.FRONTEND_URL}/pricing" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Upgrade Now →
          </a>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
          You're receiving this because you signed up for a free trial at Sambid.<br>
          <a href="${process.env.FRONTEND_URL}/unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: `${daysLeft} days left in your free trial - Upgrade to continue`,
    html: emailHtml
  });
  
  console.log(`📧 Trial reminder sent to ${user.email} (${daysLeft} days left)`);
};

/**
 * Daily upgrade nudge — different content each day of the 3-day trial.
 * daysLeft=3 → Day 1 (welcome), daysLeft=2 → Day 2 (progress), daysLeft=1 → Day 3 (urgent)
 */
export const sendTrialDailyUpgradeEmail = async (user, daysLeft) => {
  const name = user.name || 'there';
  const pricingUrl = `${process.env.FRONTEND_URL}/pricing`;

  const planTable = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151;">
      <tr>
        <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;"><strong>Starter</strong> — $29/mo</td>
        <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">500 matches/month · 14-day window</td>
      </tr>
      <tr>
        <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;"><strong>Pro</strong> — $49/mo</td>
        <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">3,000 matches/month · AI proposals · 60-day window</td>
      </tr>
      <tr>
        <td style="padding:7px 0;"><strong>Enterprise</strong> — $99/mo</td>
        <td style="padding:7px 0;">Unlimited matches · Real-time alerts · Full API access</td>
      </tr>
    </table>`;

  const ctaButton = (label) =>
    `<div style="text-align:center;margin:28px 0 16px;">
       <a href="${pricingUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 32px;border-radius:9px;text-decoration:none;font-weight:700;font-size:15px;">
         ${label}
       </a>
     </div>`;

  const footer = `<p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:28px;">
      You're receiving this because you're on a free trial at Sambid.<br>
      <a href="${process.env.FRONTEND_URL}/settings" style="color:#9ca3af;">Manage email preferences</a>
    </p>`;

  let subject, headerBg, headline, body;

  if (daysLeft >= 3) {
    // Day 1 — Welcome & orientation
    subject = `Welcome to Sambid! Your 3-day trial has started 🎯`;
    headerBg = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
    headline = `Your trial just started, ${name}!`;
    body = `
      <p style="color:#374151;line-height:1.7;margin:0 0 16px;">
        You have <strong>15 contract matches</strong> to explore over the next 3 days — each one matched to your NAICS codes from the live SAM.gov database. This is federal procurement intelligence built specifically for your business.
      </p>
      <div style="background:#f0f4ff;border-left:4px solid #6366f1;padding:14px 16px;border-radius:6px;margin-bottom:20px;">
        <p style="margin:0;color:#3730a3;font-weight:600;">What to do today:</p>
        <ul style="margin:8px 0 0;padding-left:18px;color:#374151;font-size:13px;line-height:1.8;">
          <li>Open your <a href="${process.env.FRONTEND_URL}/opportunities" style="color:#6366f1;">Opportunities feed</a> and review your matches</li>
          <li>Save the ones that look promising</li>
          <li>Set up an Alert so you never miss a new contract</li>
        </ul>
      </div>
      <p style="color:#374151;line-height:1.7;">When your trial ends, a paid plan keeps the contracts coming. Here's what's available:</p>
      ${planTable}
      ${ctaButton('See Plans & Pricing →')}`;
  } else if (daysLeft === 2) {
    // Day 2 — Progress nudge
    subject = `Day 2 of your Sambid trial — have you found any contracts? 📋`;
    headerBg = 'linear-gradient(135deg, #f59e0b, #d97706)';
    headline = `You're halfway through your trial`;
    body = `
      <p style="color:#374151;line-height:1.7;margin:0 0 16px;">
        How's it going, ${name}? You've got <strong>2 days left</strong> and up to 15 contract matches to review. Federal contracts are awarded to businesses like yours every single day — the question is whether you're in the running.
      </p>
      <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:6px;margin-bottom:20px;">
        <p style="margin:0;color:#92400e;font-weight:600;">Did you know?</p>
        <p style="margin:6px 0 0;color:#78350f;font-size:13px;line-height:1.7;">
          Small businesses win over <strong>$160 billion</strong> in federal contracts each year. Companies using procurement intelligence tools are 3× more likely to identify and win relevant contracts.
        </p>
      </div>
      <p style="color:#374151;line-height:1.7;">Don't lose access when your trial ends. Upgrade today and keep the pipeline full:</p>
      ${planTable}
      ${ctaButton('Upgrade Before Your Trial Ends →')}`;
  } else {
    // Day 3 — Urgent last day
    subject = `⚠️ Last day of your Sambid trial — upgrade now to keep your contracts`;
    headerBg = 'linear-gradient(135deg, #ef4444, #dc2626)';
    headline = `Final day of your trial, ${name}`;
    body = `
      <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px 16px;border-radius:6px;margin-bottom:20px;">
        <p style="margin:0;color:#b91c1c;font-weight:700;font-size:15px;">Your trial expires today.</p>
        <p style="margin:6px 0 0;color:#991b1b;font-size:13px;">After today, your access to contract matches will stop until you upgrade.</p>
      </div>
      <p style="color:#374151;line-height:1.7;margin:0 0 16px;">
        You've seen what Sambid can do. Every day you don't have a paid plan is a day your competitors might be winning the contracts you qualify for. Federal procurement doesn't pause — and neither should you.
      </p>
      <p style="color:#374151;line-height:1.7;">Pick a plan and keep the momentum going:</p>
      ${planTable}
      ${ctaButton('Upgrade Now — Don\'t Lose Access →')}`;
  }

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:24px 20px;background:${headerBg};border-radius:12px;color:white;">
        <p style="margin:0 0 4px;font-size:12px;opacity:0.85;letter-spacing:1px;text-transform:uppercase;">Sambid · Federal Contract Intelligence</p>
        <h1 style="margin:0;font-size:24px;">${headline}</h1>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        ${body}
        ${footer}
      </div>
    </div>`;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject,
    html: emailHtml,
  });

  console.log(`📧 Trial day email (day ${4 - daysLeft}/3) sent to ${user.email}`);
};

/**
 * Send trial expired notification
 */
export const sendTrialExpiredNotification = async (user) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 12px; color: white;">
        <h1 style="margin: 0;">Your Trial Has Ended</h1>
      </div>
      
      <div style="padding: 30px; background: white; border-radius: 12px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
        <p style="color: #4b5563; font-size: 18px;">Your free trial has expired.</p>
        
        <div style="background: #e0e7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px; color: #4338ca;">Choose a plan to continue:</h3>
          <p style="margin: 5px 0;"><strong>Pro - $79/month</strong> - Unlimited matches + AI proposals</p>
          <p style="margin: 5px 0;"><strong>Enterprise - $499/month (or $4,788/year, save 20%)</strong> - Real-time alerts + dedicated support</p>
          <a href="${process.env.FRONTEND_URL}/pricing" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px;">
            View Plans →
          </a>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: 'Your free trial has ended - Choose a plan to continue',
    html: emailHtml
  });
  
  console.log(`📧 Trial expired notification sent to ${user.email}`);
};

/**
 * Send daily opportunity digest for Pro users
 */
export const sendDailyDigest = async (user, opportunities) => {
  if (opportunities.length === 0) return;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; color: white;">
        <h1 style="margin: 0;">Sambid</h1>
        <p style="margin: 5px 0 0;">Your Daily Contract Matches</p>
      </div>
      
      <div style="padding: 30px; background: white; border-radius: 12px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0;">Good morning, ${user.name || 'Contractor'}! 👋</h2>
        <p style="color: #4b5563;">Here are ${opportunities.length} new opportunities matching your NAICS codes:</p>
        
        <div style="margin: 20px 0;">
          ${opportunities.map(opp => `
            <div style="border-bottom: 1px solid #e5e7eb; padding: 15px 0;">
              <h3 style="margin: 0 0 5px; color: #1f2937;">${opp.title}</h3>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Agency: ${opp.agency}</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Deadline: ${new Date(opp.dueDate).toLocaleDateString()}</p>
              <p style="margin: 5px 0 0;"><strong>${opp.estimatedValue ? '$' + opp.estimatedValue.toLocaleString() : 'Value not listed'}</strong></p>
              <a href="${process.env.FRONTEND_URL}/opportunity/${opp._id}" style="display: inline-block; margin-top: 10px; color: #10b981; text-decoration: none;">View Details →</a>
            </div>
          `).join('')}
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL}/opportunities" style="color: #10b981; text-decoration: none; font-weight: bold;">
            View all opportunities on Sambid →
          </a>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
          You're receiving daily alerts as a Pro member.<br>
          <a href="${process.env.FRONTEND_URL}/settings" style="color: #9ca3af;">Change alert frequency</a>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: `🎯 ${opportunities.length} new contract matches for you today`,
    html: emailHtml
  });
  
  console.log(`📧 Daily digest sent to ${user.email} (${opportunities.length} matches)`);
};

/**
 * Send real-time alert for Enterprise users
 */
export const sendRealTimeAlert = async (user, opportunity) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; color: white;">
        <h2 style="margin: 0;">🚨 New Opportunity Alert</h2>
      </div>
      
      <div style="padding: 30px; background: white; border-radius: 12px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0;">${opportunity.title}</h2>
        
        <table style="width: 100%; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0;"><strong>Agency:</strong></td>
            <td>${opportunity.agency}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>NAICS Code:</strong></td>
            <td>${opportunity.naicsCode}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Deadline:</strong></td>
            <td>${new Date(opportunity.dueDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Estimated Value:</strong></td>
            <td>${opportunity.estimatedValue ? '$' + opportunity.estimatedValue.toLocaleString() : 'Not listed'}</td>
          </tr>
        </table>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            ⚡ This opportunity matches your NAICS code and was just posted.
          </p>
        </div>
        
        <a href="${process.env.FRONTEND_URL}/opportunity/${opportunity._id}" style="display: block; text-align: center; background: #f59e0b; color: white; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View & Apply Now →
        </a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: `🚨 REAL-TIME: ${opportunity.title}`,
    html: emailHtml
  });
  
  console.log(`📧 Real-time alert sent to ${user.email} for: ${opportunity.title}`);
};

/**
 * Send enterprise inquiry confirmation to user
 */
export const sendEnterpriseInquiryConfirmation = async ({ name, email, company, planInterest }) => {
  const planLabel = planInterest === 'enterprise' ? 'Enterprise ($499/mo · $4,788/yr)' : planInterest || 'Enterprise';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align:center; padding:20px; background:linear-gradient(135deg,#6366f1,#8b5cf6); border-radius:12px; color:white;">
        <h1 style="margin:0;">Sambid Notify</h1>
        <p style="margin:5px 0 0; opacity:.9;">Federal Contract Intelligence</p>
      </div>
      <div style="padding:30px; background:white; border-radius:12px; margin-top:20px; box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937; margin-top:0;">Thank You for Your Interest, ${name}!</h2>
        <p style="color:#4b5563; line-height:1.6;">
          We've received your inquiry for the <strong>${planLabel}</strong> plan${company ? ' for <strong>' + company + '</strong>' : ''}.
          Our team will review your request and contact you within <strong>1 business day</strong>.
        </p>
        <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:16px; margin:20px 0;">
          <p style="margin:0; color:#166534; font-weight:600;">What happens next?</p>
          <ul style="margin:10px 0 0; padding-left:20px; color:#15803d; line-height:1.8;">
            <li>Our sales team reviews your requirements</li>
            <li>We schedule a quick onboarding call</li>
            <li>Your Enterprise account gets activated</li>
            <li>Dedicated account manager assigned to you</li>
          </ul>
        </div>
        <div style="background:#ede9fe; border-radius:8px; padding:16px; margin:20px 0; text-align:center;">
          <p style="margin:0 0 8px; color:#4c1d95; font-weight:600;">Enterprise Plan — $499/month (or $4,788/year)</p>
          <p style="margin:0; color:#6d28d9; font-size:14px;">10,000 daily matches · Dedicated manager · Custom integrations · Full API access</p>
        </div>
        <p style="color:#6b7280; font-size:14px;">
          Questions? Reply to this email or reach us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#6366f1;">${process.env.EMAIL_USER}</a>
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.support(),
    to: email,
    subject: `Your Enterprise Plan Request Received — We'll be in touch!`,
    html,
  });

  console.log(`📧 Enterprise inquiry confirmation sent to ${email}`);
};

/**
 * Send enterprise inquiry alert to admin with AI analysis
 */
export const sendEnterpriseInquiryAdminAlert = async (inquiry, aiAnalysis) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  const { name, email, company, phone, employees, planInterest, message } = inquiry;
  const planLabel = planInterest === 'enterprise' ? 'Enterprise ($499/mo · $4,788/yr)' : planInterest || 'Enterprise';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px;">
      <div style="text-align:center; padding:20px; background:linear-gradient(135deg,#dc2626,#b91c1c); border-radius:12px; color:white;">
        <h1 style="margin:0;">🚨 New Plan Request</h1>
        <p style="margin:5px 0 0; opacity:.9;">Action Required — ${planLabel}</p>
      </div>

      <div style="padding:30px; background:white; border-radius:12px; margin-top:20px; box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937; margin-top:0;">User Details</h2>
        <table style="width:100%; border-collapse:collapse;">
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0; font-weight:600; color:#374151; width:35%;">Name</td>
            <td style="padding:10px 0; color:#4b5563;">${name}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0; font-weight:600; color:#374151;">Email</td>
            <td style="padding:10px 0; color:#4b5563;"><a href="mailto:${email}" style="color:#6366f1;">${email}</a></td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0; font-weight:600; color:#374151;">Company</td>
            <td style="padding:10px 0; color:#4b5563;">${company || 'N/A'}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0; font-weight:600; color:#374151;">Phone</td>
            <td style="padding:10px 0; color:#4b5563;">${phone || 'N/A'}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0; font-weight:600; color:#374151;">Employees</td>
            <td style="padding:10px 0; color:#4b5563;">${employees || 'N/A'}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0; font-weight:600; color:#374151;">Plan Requested</td>
            <td style="padding:10px 0;"><span style="background:#ede9fe; color:#7c3aed; padding:3px 10px; border-radius:20px; font-weight:600;">${planLabel}</span></td>
          </tr>
          ${message ? `<tr>
            <td style="padding:10px 0; font-weight:600; color:#374151; vertical-align:top;">Message</td>
            <td style="padding:10px 0; color:#4b5563;">${message}</td>
          </tr>` : ''}
        </table>

        <div style="background:#fefce8; border:1px solid #fde047; border-radius:10px; padding:20px; margin:24px 0;">
          <p style="margin:0 0 10px; font-weight:700; color:#854d0e; font-size:16px;">🤖 AI Analysis</p>
          <div style="color:#713f12; line-height:1.7; white-space:pre-line;">${aiAnalysis}</div>
        </div>

        <div style="background:#f0fdf4; border-radius:10px; padding:20px; margin:20px 0; text-align:center;">
          <p style="margin:0 0 16px; font-weight:700; color:#166534; font-size:16px;">What action do you want to take?</p>
          <a href="${frontendUrl}/admin/contact-inquiries" style="display:inline-block; background:#16a34a; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:700; margin:0 8px;">
            ✅ Approve / Manage
          </a>
          <a href="mailto:${email}" style="display:inline-block; background:#6366f1; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:700; margin:0 8px;">
            📧 Reply to User
          </a>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.support(),
    to: adminEmail,
    subject: `🚨 New ${planLabel} Request from ${name} (${company || email})`,
    html,
  });

  console.log(`📧 Enterprise inquiry admin alert sent to ${adminEmail}`);
};

/**
 * Notify user that admin has activated their plan
 */
export const sendPlanActivatedEmail = async ({ name, email, planName, planExpires, frontendUrl }) => {
  const url = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  const planLabel = planName.charAt(0).toUpperCase() + planName.slice(1);
  const expiresStr = planExpires ? new Date(planExpires).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '30 days';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#16a34a,#15803d);border-radius:12px;color:white;">
        <h1 style="margin:0;">🎉 Plan Activated!</h1>
        <p style="margin:5px 0 0;opacity:.9;">Sambid Notify — Federal Contract Intelligence</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">Your ${planLabel} Plan is Live, ${name}!</h2>
        <p style="color:#4b5563;line-height:1.6;">
          Great news — your <strong>${planLabel} plan</strong> has been activated by our team. You now have full access to all ${planLabel} features.
        </p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 10px;font-weight:700;color:#166534;">What's unlocked:</p>
          <ul style="margin:0;padding-left:20px;color:#15803d;line-height:2;">
            ${planName === 'enterprise' ? `
              <li>10,000+ daily contract matches</li>
              <li>Dedicated account manager</li>
              <li>AI proposal generation</li>
              <li>Custom integrations & Full API access</li>
              <li>24/7 priority support</li>
              <li>Unlimited saved opportunities</li>
            ` : `
              <li>All ${planLabel} plan features are now active</li>
              <li>Increased daily match limits</li>
              <li>Priority support</li>
            `}
          </ul>
        </div>
        <p style="color:#6b7280;font-size:14px;">Active until: <strong>${expiresStr}</strong></p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${url}/dashboard" style="display:inline-block;background:#16a34a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
            Go to Dashboard →
          </a>
        </div>
        <p style="color:#9ca3af;font-size:13px;">Questions? Reply to this email or visit <a href="${url}/contact" style="color:#6366f1;">our support page</a>.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.billing(),
    to: email,
    subject: `🎉 Your ${planLabel} Plan is Now Active — Welcome aboard!`,
    html,
  });

  console.log(`📧 Plan activation email sent to ${email}`);
};

/**
 * Alert admin about a successful payment (Stripe / PayPal)
 */
export const sendAdminPaymentAlert = async ({ userEmail, userName, planName, amount, billingCycle, paymentMethod, invoiceNumber }) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const planLabel = planName.charAt(0).toUpperCase() + planName.slice(1);
  const methodLabel = paymentMethod === 'paypal' ? 'PayPal' : 'Stripe';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#0ea5e9,#0284c7);border-radius:12px;color:white;">
        <h1 style="margin:0;">💰 New Payment Received</h1>
        <p style="margin:5px 0 0;opacity:.9;">Sambid Notify — Payment Alert</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">Payment Details</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;font-weight:600;color:#374151;width:40%;">Customer</td>
            <td style="padding:10px 0;color:#4b5563;">${userName || userEmail}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;font-weight:600;color:#374151;">Email</td>
            <td style="padding:10px 0;color:#4b5563;"><a href="mailto:${userEmail}" style="color:#6366f1;">${userEmail}</a></td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;font-weight:600;color:#374151;">Plan</td>
            <td style="padding:10px 0;"><span style="background:#e0e7ff;color:#4338ca;padding:3px 10px;border-radius:20px;font-weight:600;">${planLabel} (${billingCycle})</span></td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;font-weight:600;color:#374151;">Amount</td>
            <td style="padding:10px 0;font-size:20px;font-weight:700;color:#16a34a;">$${amount}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;font-weight:600;color:#374151;">Method</td>
            <td style="padding:10px 0;color:#4b5563;">${methodLabel}</td>
          </tr>
          ${invoiceNumber ? `<tr>
            <td style="padding:10px 0;font-weight:600;color:#374151;">Invoice</td>
            <td style="padding:10px 0;color:#4b5563;">${invoiceNumber}</td>
          </tr>` : ''}
        </table>
        <div style="background:#f0fdf4;border-radius:10px;padding:16px;margin:24px 0;text-align:center;">
          <p style="margin:0 0 4px;color:#166534;font-weight:600;">Plan activated automatically ✓</p>
          <p style="margin:0;color:#15803d;font-size:14px;">No action required — the user's plan is already live.</p>
        </div>
        <div style="text-align:center;">
          <a href="${frontendUrl}/admin/invoices" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            View Invoices →
          </a>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.billing(),
    to: adminEmail,
    subject: `💰 New Payment: ${planLabel} plan — $${amount} via ${methodLabel}`,
    html,
  });

  console.log(`📧 Admin payment alert sent to ${adminEmail} (${userEmail} → ${planLabel})`);
};

/**
 * Payment confirmed — send receipt to the user
 */
export const sendPaymentConfirmationEmail = async ({ name, email, planName, amount, billingCycle, paymentMethod, invoiceNumber }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const planLabel   = planName.charAt(0).toUpperCase() + planName.slice(1);
  const methodLabel = paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'payoneer' ? 'Payoneer' : 'Credit Card (Stripe)';
  const cycleLabel  = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#16a34a,#15803d);border-radius:12px;color:white;">
        <h1 style="margin:0;">✅ Payment Confirmed</h1>
        <p style="margin:5px 0 0;opacity:.9;">Sambid Notify — Federal Contract Intelligence</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">Thank you, ${name}!</h2>
        <p style="color:#4b5563;">Your payment was successful and your <strong>${planLabel} plan</strong> is now active.</p>

        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr style="border-bottom:1px solid #bbf7d0;">
              <td style="padding:8px 0;color:#166534;font-weight:600;width:40%;">Plan</td>
              <td style="padding:8px 0;color:#15803d;font-weight:700;">${planLabel} (${cycleLabel})</td>
            </tr>
            <tr style="border-bottom:1px solid #bbf7d0;">
              <td style="padding:8px 0;color:#166534;font-weight:600;">Amount Paid</td>
              <td style="padding:8px 0;color:#15803d;font-size:18px;font-weight:700;">$${amount}</td>
            </tr>
            <tr style="border-bottom:1px solid #bbf7d0;">
              <td style="padding:8px 0;color:#166534;font-weight:600;">Payment Method</td>
              <td style="padding:8px 0;color:#374151;">${methodLabel}</td>
            </tr>
            ${invoiceNumber ? `<tr>
              <td style="padding:8px 0;color:#166534;font-weight:600;">Invoice #</td>
              <td style="padding:8px 0;color:#374151;font-family:monospace;">${invoiceNumber}</td>
            </tr>` : ''}
          </table>
        </div>

        <div style="text-align:center;margin:24px 0;">
          <a href="${frontendUrl}/dashboard" style="display:inline-block;background:#16a34a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin-right:8px;">
            Go to Dashboard →
          </a>
          <a href="${frontendUrl}/opportunities" style="display:inline-block;background:#6366f1;color:white;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Browse Opportunities
          </a>
        </div>
        <p style="color:#9ca3af;font-size:13px;text-align:center;">
          Questions? Visit <a href="${frontendUrl}/help" style="color:#6366f1;">Help & Support</a> or reply to this email.
        </p>
      </div>
    </div>`;

  await transporter.sendMail({
    from: FROM.billing(),
    to: email,
    subject: `✅ Payment confirmed — ${planLabel} plan activated ($${amount})`,
    html,
  });

  console.log(`📧 Payment confirmation email sent to ${email} (${planLabel} $${amount})`);
};

/**
 * Send SAM / certification expiry alert
 */
export const sendCertificationExpiryAlert = async (user, certification, daysLeft) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const color = daysLeft <= 30 ? '#dc2626' : daysLeft <= 60 ? '#d97706' : '#2563eb';
  const urgency = daysLeft <= 30 ? '🚨 URGENT' : daysLeft <= 60 ? '⚠️ WARNING' : '📅 REMINDER';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="padding:20px;background:${color};border-radius:12px;color:white;text-align:center;">
        <h1 style="margin:0;">${urgency}</h1>
        <p style="margin:5px 0 0;font-size:18px;font-weight:bold;">${certification.type} expires in ${daysLeft} days</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">Action Required: Renew ${certification.type}</h2>
        <p style="color:#4b5563;">Your <strong>${certification.type}</strong> certification/registration expires on <strong style="color:${color};">${new Date(certification.expiryDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>.</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#991b1b;font-weight:600;">⚠️ A lapsed ${certification.type} will disqualify you from federal contract bids.</p>
          <p style="margin:8px 0 0;color:#b91c1c;font-size:14px;">Start the renewal process immediately to avoid any gap in eligibility.</p>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 8px;font-weight:600;color:#166534;">Quick Renewal Links:</p>
          <ul style="margin:0;padding-left:20px;color:#15803d;line-height:2;">
            ${certification.type.includes('SAM') ? '<li><a href="https://sam.gov" style="color:#15803d;">SAM.gov — Renew Registration</a></li>' : ''}
            ${certification.type.includes('8(a)') ? '<li><a href="https://certify.sba.gov" style="color:#15803d;">SBA Certify — 8(a) Renewal</a></li>' : ''}
            ${certification.type.includes('WOSB') || certification.type.includes('HUBZone') ? '<li><a href="https://certify.sba.gov" style="color:#15803d;">SBA Certify — Renewal Portal</a></li>' : ''}
          </ul>
        </div>
        <a href="${frontendUrl}/contract-vehicles" style="display:inline-block;background:${color};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Manage My Certifications →
        </a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: `${urgency}: ${certification.type} expires in ${daysLeft} days — Renew Now`,
    html,
  });

  console.log(`📧 Certification expiry alert sent to ${user.email} — ${certification.type} (${daysLeft}d)`);
};

/**
 * Send deadline reminder for a saved opportunity
 */
export const sendDeadlineReminder = async (user, opportunity, daysLeft) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const urgencyColor = daysLeft <= 3 ? '#dc2626' : daysLeft <= 7 ? '#d97706' : '#2563eb';
  const urgencyLabel = daysLeft === 0 ? 'TODAY' : daysLeft === 1 ? '1 DAY LEFT' : `${daysLeft} DAYS LEFT`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:${urgencyColor};border-radius:12px;color:white;">
        <h1 style="margin:0;">⏰ Deadline Reminder</h1>
        <p style="margin:5px 0 0;opacity:.9;font-weight:bold;font-size:18px;">${urgencyLabel}</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">${opportunity.title}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;font-weight:600;color:#374151;width:40%;">Agency</td>
            <td style="padding:10px 0;color:#4b5563;">${opportunity.agency}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;font-weight:600;color:#374151;">Submission Deadline</td>
            <td style="padding:10px 0;color:#4b5563;font-weight:bold;color:${urgencyColor};">
              ${new Date(opportunity.dueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;font-weight:600;color:#374151;">NAICS Code</td>
            <td style="padding:10px 0;color:#4b5563;">${opportunity.naicsCode}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-weight:600;color:#374151;">Est. Value</td>
            <td style="padding:10px 0;color:#4b5563;">${opportunity.estimatedValue ? '$' + opportunity.estimatedValue.toLocaleString() : 'Not listed'}</td>
          </tr>
        </table>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
          <p style="margin:0;color:#991b1b;font-weight:600;">Don't miss this deadline!</p>
          <p style="margin:5px 0 0;color:#b91c1c;font-size:14px;">You saved this opportunity — make sure your proposal is ready.</p>
        </div>
        <div style="text-align:center;margin-top:20px;">
          <a href="${frontendUrl}/opportunity/${opportunity._id}" style="display:inline-block;background:${urgencyColor};color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-right:10px;">
            View Opportunity →
          </a>
          <a href="${frontendUrl}/pipeline" style="display:inline-block;background:#f3f4f6;color:#374151;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
            Open Pipeline
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          You're receiving this because you saved this opportunity in Sambid Notify.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: `⏰ ${urgencyLabel}: ${opportunity.title.substring(0, 60)}`,
    html,
  });

  console.log(`📧 Deadline reminder sent to ${user.email} — ${daysLeft}d left for: ${opportunity.title}`);
};

/**
 * Convert plain-text campaign body to polished HTML
 * Handles bullets, bold (**text**), URLs (→ CTA buttons), paragraphs
 */
function formatCampaignBody(rawBody, primaryColor = '#4f46e5') {
  const lines = rawBody.split('\n');
  let html = '';
  let inList = false;

  const inlineFmt = (t) =>
    t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
     .replace(/https?:\/\/\S+/g, u => `<a href="${u}" style="color:${primaryColor};text-decoration:underline;">${u}</a>`);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<div style="height:8px;"></div>';
      continue;
    }
    const bullet = /^([•\-\*·]|\d+[.)]) (.+)/.exec(line);
    if (bullet) {
      if (!inList) { html += `<ul style="margin:12px 0 12px 0;padding-left:0;list-style:none;">`; inList = true; }
      html += `<li style="padding:3px 0 3px 22px;position:relative;color:#374151;font-size:15px;line-height:1.7;">
                 <span style="position:absolute;left:2px;top:8px;width:7px;height:7px;background:${primaryColor};border-radius:50%;display:inline-block;"></span>
                 ${inlineFmt(bullet[2])}
               </li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      // Detect CTA line: starts with →, 👉, or contains a plain URL after action words
      const urlMatch = line.match(/https?:\/\/\S+/);
      const isCtaLine = /^(→|👉|🔗|Click here|Log in|Visit|Upgrade|Access|Get started)/i.test(line) && urlMatch;
      if (isCtaLine) {
        html += `<div style="text-align:center;margin:22px 0;">
                   <a href="${urlMatch[0]}" style="background:${primaryColor};color:white;padding:13px 36px;border-radius:9px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;letter-spacing:0.2px;">
                     ${line.replace(/https?:\/\/\S+/g,'').replace(/^[→👉🔗]/,'').trim() || 'Open Dashboard →'}
                   </a>
                 </div>`;
      } else {
        html += `<p style="margin:0 0 10px;color:#374151;font-size:15px;line-height:1.75;">${inlineFmt(line)}</p>`;
      }
    }
  }
  if (inList) html += '</ul>';
  return html;
}

/**
 * Send a campaign email to a single user (used by admin campaign system)
 */
export const sendBroadcastEmailToSegment = async (user, subject, rawBody, fromName = 'Sambid Notify') => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const year = new Date().getFullYear();
  const formattedBody = formatCampaignBody(rawBody);
  const firstName = (user.name || '').split(' ')[0] || 'there';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:28px 16px 40px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);border-radius:16px 16px 0 0;padding:32px 40px 28px;text-align:center;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,.2);width:44px;height:44px;border-radius:11px;line-height:44px;font-size:22px;font-weight:900;color:white;margin-bottom:10px;">S</div>
          <div style="color:white;font-size:22px;font-weight:800;letter-spacing:-0.5px;">${fromName}</div>
          <div style="color:rgba(255,255,255,.7);font-size:12px;margin-top:3px;letter-spacing:0.5px;">FEDERAL CONTRACT INTELLIGENCE</div>
        </td>
      </tr></table>
    </div>

    <!-- Body card -->
    <div style="background:white;padding:38px 40px 32px;border-radius:0 0 16px 16px;box-shadow:0 6px 30px rgba(79,70,229,.1);">

      <!-- Greeting -->
      <p style="margin:0 0 18px;font-size:16px;font-weight:600;color:#1f2937;">Hi ${firstName},</p>

      <!-- Body -->
      <div>${formattedBody}</div>

      <!-- Divider -->
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0 22px;">

      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0 0 6px;">
              © ${year} ${fromName} · Federal Contract Intelligence Platform
            </p>
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              <a href="${frontendUrl}/settings" style="color:#6366f1;text-decoration:none;">Manage email preferences</a>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <a href="${frontendUrl}/dashboard" style="color:#6366f1;text-decoration:none;">Go to Dashboard</a>
            </p>
            <p style="color:#c4c4c4;font-size:11px;margin:10px 0 0;">
              You received this because you have an account on Sambid Notify.<br>
              To unsubscribe, update your <a href="${frontendUrl}/settings" style="color:#9ca3af;">notification settings</a>.
            </p>
          </td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>`;

  await transporter.sendMail({
    from:    FROM.custom(fromName),
    to:      user.email,
    subject,
    html,
  });
};

/**
 * Send weekly AI market research report to Enterprise users
 */
export const sendWeeklyMarketResearchEmail = async (user, reportText) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:12px;color:white;">
        <h1 style="margin:0;">📊 Weekly Market Intelligence</h1>
        <p style="margin:5px 0 0;opacity:.9;">Sambid Notify Enterprise — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">Your Federal Market Briefing</h2>
        <p style="color:#4b5563;">Tailored for your NAICS codes: <strong>${user.naicsCodes?.join(', ') || 'N/A'}</strong></p>
        <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;white-space:pre-wrap;font-size:13px;color:#374151;line-height:1.7;">
${reportText}
        </div>
        <div style="text-align:center;margin-top:24px;">
          <a href="${frontendUrl}/market-research" style="display:inline-block;background:#7c3aed;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
            View Full Report →
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;">Enterprise plan benefit — delivered every Monday.</p>
      </div>
    </div>
  `;
  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: `📊 Your Weekly Federal Market Intelligence — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    html,
  });
  console.log(`📧 Weekly market research sent to ${user.email}`);
};

/**
 * Generic admin notification for user action steps
 * action: 'registered' | 'email_verified' | 'plan_upgraded' | 'plan_upgraded_balance' | 'withdrawal_requested' | 'contact_inquiry'
 */
export const sendAdminUserActionAlert = async ({ action, userName, userEmail, details = {} }) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const ACTION_META = {
    registered:             { emoji: '👋', title: 'New User Registered',           color: '#6366f1', adminLink: `${frontendUrl}/admin/dashboard` },
    email_verified:         { emoji: '✅', title: 'User Verified Email',            color: '#10b981', adminLink: `${frontendUrl}/admin/dashboard` },
    plan_upgraded:          { emoji: '💰', title: 'User Upgraded Plan (PayPal)',    color: '#0ea5e9', adminLink: `${frontendUrl}/admin/invoices` },
    plan_upgraded_balance:  { emoji: '🏦', title: 'User Activated Plan via Referral Balance', color: '#16a34a', adminLink: `${frontendUrl}/admin/invoices` },
    withdrawal_requested:   { emoji: '💸', title: 'Withdrawal Requested',           color: '#d97706', adminLink: `${frontendUrl}/admin/referrals` },
    contact_inquiry:        { emoji: '📋', title: 'New Contact / Plan Inquiry',    color: '#7c3aed', adminLink: `${frontendUrl}/admin/contact-inquiries` },
  };

  const meta = ACTION_META[action] || { emoji: '🔔', title: 'User Action', color: '#6366f1', adminLink: `${frontendUrl}/admin/dashboard` };

  const rows = Object.entries(details).map(([k, v]) =>
    `<tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 0;font-weight:600;color:#374151;width:40%;">${k}</td>
      <td style="padding:8px 0;color:#4b5563;">${v}</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:18px;background:${meta.color};border-radius:12px;color:white;">
        <h1 style="margin:0;font-size:22px;">${meta.emoji} ${meta.title}</h1>
        <p style="margin:6px 0 0;opacity:.85;font-size:14px;">Sambid Notify — Admin Alert</p>
      </div>
      <div style="padding:28px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 0;font-weight:600;color:#374151;width:40%;">User Name</td>
            <td style="padding:8px 0;color:#4b5563;">${userName || '—'}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 0;font-weight:600;color:#374151;">User Email</td>
            <td style="padding:8px 0;"><a href="mailto:${userEmail}" style="color:#6366f1;">${userEmail}</a></td>
          </tr>
          ${rows}
        </table>
        <div style="text-align:center;margin-top:24px;">
          <a href="${meta.adminLink}" style="display:inline-block;background:${meta.color};color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
            View in Admin Panel →
          </a>
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: FROM.support(),
      to: adminEmail,
      subject: `${meta.emoji} ${meta.title} — ${userName || userEmail}`,
      html,
    });
    console.log(`📧 Admin user-action alert sent (${action}) for ${userEmail}`);
  } catch (err) {
    console.error(`Admin alert email failed (${action}):`, err.message);
  }
};

/**
 * Send weekly digest for Free users
 */
export const sendWeeklyDigest = async (user, opportunities) => {
  if (opportunities.length === 0) return;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px; background: #6366f1; border-radius: 12px; color: white;">
        <h1 style="margin: 0;">Sambid</h1>
        <p style="margin: 5px 0 0;">Your Weekly Contract Digest</p>
      </div>
      
      <div style="padding: 30px; background: white; border-radius: 12px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0;">Weekly Summary</h2>
        <p style="color: #4b5563;">${opportunities.length} new opportunities matched your NAICS codes this week.</p>
        
        <div style="margin: 20px 0;">
          ${opportunities.slice(0, 5).map(opp => `
            <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
              <strong>${opp.title}</strong><br>
              <span style="font-size: 12px; color: #6b7280;">${opp.agency} | Due: ${new Date(opp.dueDate).toLocaleDateString()}</span>
            </div>
          `).join('')}
        </div>
        
        <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 10px; color: #3730a3;">🎯 Upgrade to Pro for daily alerts and unlimited matches!</p>
          <a href="${process.env.FRONTEND_URL}/pricing" style="color: #4338ca; font-weight: bold;">Upgrade Now →</a>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: `📊 Your weekly contract digest: ${opportunities.length} new matches`,
    html: emailHtml
  });
  
  console.log(`📧 Weekly digest sent to ${user.email}`);
};

/**
 * Ticket created — notify user and admin
 */
export const sendTicketCreatedEmail = async (user, ticket, adminEmails = []) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const userHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;color:white;">
        <h1 style="margin:0;">Sambid Notify</h1>
        <p style="margin:5px 0 0;opacity:.9;">Support Ticket Created</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">Your ticket has been received ✅</h2>
        <p style="color:#4b5563;">Hi ${user.name || 'there'},</p>
        <p style="color:#4b5563;">We've received your support request and our team will respond shortly.</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Ticket Number</p>
          <p style="margin:0;font-size:18px;font-weight:bold;color:#6366f1;">${ticket.ticketNumber}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#6b7280;">Subject:</td><td style="padding:6px 0;color:#1f2937;font-weight:500;">${ticket.subject}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Category:</td><td style="padding:6px 0;color:#1f2937;text-transform:capitalize;">${ticket.category.replace('_',' ')}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Priority:</td><td style="padding:6px 0;color:#1f2937;text-transform:capitalize;">${ticket.priority}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;margin-top:20px;">Log in to track and reply to your ticket.</p>
        <div style="text-align:center;margin-top:20px;">
          <a href="${frontendUrl}/help" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Ticket →</a>
        </div>
      </div>
    </div>`;

  const adminHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#7c3aed,#6366f1);border-radius:12px;color:white;">
        <h1 style="margin:0;">🎫 New Support Ticket</h1>
        <p style="margin:5px 0 0;opacity:.9;">${ticket.ticketNumber} — Action Required</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;width:35%;">Ticket #</td><td style="padding:8px 0;color:#6366f1;font-weight:700;">${ticket.ticketNumber}</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">From</td><td style="padding:8px 0;color:#1f2937;">${user.name} &lt;${user.email}&gt;</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Subject</td><td style="padding:8px 0;color:#1f2937;font-weight:500;">${ticket.subject}</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Category</td><td style="padding:8px 0;color:#1f2937;text-transform:capitalize;">${ticket.category.replace('_',' ')}</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Priority</td><td style="padding:8px 0;text-transform:capitalize;">${ticket.priority}</td></tr>
        </table>
        <div style="background:#f3f4f6;border-left:4px solid #6366f1;padding:16px;border-radius:0 8px 8px 0;margin:20px 0;">
          <p style="margin:0 0 6px;font-size:12px;color:#6b7280;font-weight:600;">Message:</p>
          <p style="margin:0;color:#1f2937;">${ticket.description}</p>
        </div>
        <div style="text-align:center;">
          <a href="${frontendUrl}/admin/tickets" style="display:inline-block;background:#6366f1;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Open in Admin Panel →</a>
        </div>
      </div>
    </div>`;

  // User confirmation
  await transporter.sendMail({
    from: FROM.support(),
    to: user.email,
    subject: `[${ticket.ticketNumber}] Ticket received: ${ticket.subject}`,
    html: userHtml,
  });

  // All admins — send individually so each gets it in their inbox
  const targets = adminEmails.length ? adminEmails : [process.env.ADMIN_EMAIL || process.env.EMAIL_USER].filter(Boolean);
  for (const email of targets) {
    transporter.sendMail({
      from: FROM.noreply(),
      to: email,
      subject: `🎫 [NEW TICKET] ${ticket.ticketNumber} — ${ticket.subject}`,
      html: adminHtml,
    }).catch(() => {});
  }
  console.log(`📧 Ticket created email sent to user + ${targets.length} admin(s)`);
};

/**
 * Admin replied to ticket — notify user
 */
/**
 * User replied to ticket — notify admin
 */
export const sendAdminTicketUserReplyAlert = async (user, ticket, replyContent, adminEmails = []) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const targets = adminEmails.length ? adminEmails : [process.env.ADMIN_EMAIL || process.env.EMAIL_USER].filter(Boolean);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;color:white;">
        <h1 style="margin:0;">📩 User Replied to Ticket</h1>
        <p style="margin:5px 0 0;opacity:.9;">Action may be required</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
          <tr><td style="padding:6px 0;color:#6b7280;width:35%;">Ticket #</td><td style="padding:6px 0;color:#6366f1;font-weight:700;">${ticket.ticketNumber}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Subject</td><td style="padding:6px 0;color:#1f2937;font-weight:500;">${ticket.subject}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">User</td><td style="padding:6px 0;color:#1f2937;">${user.name} (${user.email})</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Status</td><td style="padding:6px 0;text-transform:capitalize;">${ticket.status.replace('_',' ')}</td></tr>
        </table>
        <div style="background:#fefce8;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px;margin:20px 0;">
          <p style="margin:0 0 6px;font-size:12px;color:#92400e;font-weight:600;">User's message:</p>
          <p style="margin:0;color:#1f2937;">${replyContent}</p>
        </div>
        <div style="text-align:center;">
          <a href="${frontendUrl}/admin/tickets" style="display:inline-block;background:#6366f1;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">
            Reply in Admin Panel →
          </a>
        </div>
      </div>
    </div>`;
  for (const email of targets) {
    transporter.sendMail({
      from: FROM.support(),
      to: email,
      subject: `💬 [${ticket.ticketNumber}] User replied: ${ticket.subject}`,
      html,
    }).catch(() => {});
  }
  console.log(`📧 Admin ticket user-reply alert sent to ${targets.length} admin(s) for ${ticket.ticketNumber}`);
};

export const sendTicketReplyEmail = async (user, ticket, replyContent) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;color:white;">
        <h1 style="margin:0;">Sambid Notify</h1>
        <p style="margin:5px 0 0;opacity:.9;">Support Reply</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">New reply on ticket ${ticket.ticketNumber}</h2>
        <p style="color:#4b5563;">Hi ${user.name || 'there'},</p>
        <p style="color:#4b5563;">Our support team has replied to your ticket: <strong>${ticket.subject}</strong></p>
        <div style="background:#f3f4f6;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#1f2937;">${replyContent}</p>
        </div>
        <p style="color:#6b7280;font-size:13px;">Log in to view the full conversation and reply back.</p>
        <div style="text-align:center;margin-top:20px;">
          <a href="${frontendUrl}/help" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Ticket &amp; Reply →</a>
        </div>
      </div>
    </div>`;
  await transporter.sendMail({
    from: FROM.support(),
    to: user.email,
    subject: `[${ticket.ticketNumber}] Reply: ${ticket.subject}`,
    html,
  });
  console.log(`📧 Ticket reply email sent to ${user.email}`);
};

/**
 * Ticket status changed (resolved / closed) — notify user
 */
export const sendTicketStatusEmail = async (user, ticket, status) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const isResolved = status === 'resolved';
  const accentColor = isResolved ? '#10b981' : '#6b7280';
  const emoji = isResolved ? '✅' : '🔒';
  const label = isResolved ? 'Resolved' : 'Closed';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,${accentColor},#6366f1);border-radius:12px;color:white;">
        <h1 style="margin:0;">Sambid Notify</h1>
        <p style="margin:5px 0 0;opacity:.9;">Ticket ${label}</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">${emoji} Your ticket has been ${label.toLowerCase()}</h2>
        <p style="color:#4b5563;">Hi ${user.name || 'there'},</p>
        <p style="color:#4b5563;">Your support ticket has been marked as <strong>${label.toLowerCase()}</strong>.</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Ticket</p>
          <p style="margin:0;font-size:16px;font-weight:bold;color:#6366f1;">${ticket.ticketNumber}</p>
          <p style="margin:6px 0 0;font-size:14px;color:#374151;">${ticket.subject}</p>
        </div>
        ${isResolved
          ? '<p style="color:#4b5563;font-size:14px;">If this issue reoccurs or you have further questions, please open a new ticket.</p>'
          : '<p style="color:#4b5563;font-size:14px;">This ticket has been closed. You may open a new ticket if you need further assistance.</p>'
        }
        <div style="text-align:center;margin-top:20px;">
          <a href="${frontendUrl}/help" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Ticket →</a>
        </div>
      </div>
    </div>`;
  await transporter.sendMail({
    from: FROM.support(),
    to: user.email,
    subject: `[${ticket.ticketNumber}] Ticket ${label}: ${ticket.subject}`,
    html,
  });
  console.log(`📧 Ticket status email (${status}) sent to ${user.email}`);
};

/**
 * Suggestion submitted — user confirmation + all admin alerts
 */
export const sendSuggestionEmail = async (user, suggestion, adminEmails = []) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const categoryLabel = {
    feature_request: 'Feature Request',
    improvement: 'Improvement',
    bug_report: 'Bug Report',
    general: 'General Feedback',
  }[suggestion.category] || 'Feedback';

  const userHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;color:white;">
        <h1 style="margin:0;">Sambid</h1>
        <p style="margin:5px 0 0;opacity:.9;">Feedback Received</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">Thank you for your feedback! 💡</h2>
        <p style="color:#4b5563;">Hi ${user.name || 'there'},</p>
        <p style="color:#4b5563;">We've received your suggestion and our team will review it. Your input helps us build a better product.</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">Reference Number</p>
          <p style="margin:0;font-size:18px;font-weight:bold;color:#6366f1;">${suggestion.suggestionNumber}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#6b7280;">Title:</td><td style="padding:6px 0;color:#1f2937;font-weight:500;">${suggestion.title}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Category:</td><td style="padding:6px 0;color:#1f2937;">${categoryLabel}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;margin-top:20px;">You can track the status of your suggestion from your dashboard.</p>
        <div style="text-align:center;margin-top:20px;">
          <a href="${frontendUrl}/suggestions" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View My Suggestions →</a>
        </div>
      </div>
    </div>`;

  const adminHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#7c3aed,#6366f1);border-radius:12px;color:white;">
        <h1 style="margin:0;">💡 New Suggestion</h1>
        <p style="margin:5px 0 0;opacity:.9;">${suggestion.suggestionNumber} — ${categoryLabel}</p>
      </div>
      <div style="padding:30px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;width:35%;">Reference</td><td style="padding:8px 0;color:#6366f1;font-weight:700;">${suggestion.suggestionNumber}</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">From</td><td style="padding:8px 0;color:#1f2937;">${user.name} &lt;${user.email}&gt;</td></tr>
          ${suggestion.companyName ? `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Company</td><td style="padding:8px 0;color:#1f2937;">${suggestion.companyName}</td></tr>` : ''}
          <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Category</td><td style="padding:8px 0;color:#1f2937;">${categoryLabel}</td></tr>
          <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Title</td><td style="padding:8px 0;color:#1f2937;font-weight:500;">${suggestion.title}</td></tr>
        </table>
        <div style="background:#f3f4f6;border-left:4px solid #6366f1;padding:16px;border-radius:0 8px 8px 0;margin:20px 0;">
          <p style="margin:0 0 6px;font-size:12px;color:#6b7280;font-weight:600;">Description:</p>
          <p style="margin:0;color:#1f2937;">${suggestion.description}</p>
        </div>
        <div style="text-align:center;">
          <a href="${frontendUrl}/admin/suggestions" style="display:inline-block;background:#6366f1;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Review in Admin Panel →</a>
        </div>
      </div>
    </div>`;

  await transporter.sendMail({
    from: FROM.noreply(),
    to: user.email,
    subject: `[${suggestion.suggestionNumber}] Feedback received — thank you!`,
    html: userHtml,
  });

  const targets = adminEmails.length ? adminEmails : [process.env.ADMIN_EMAIL || process.env.EMAIL_USER].filter(Boolean);
  for (const email of targets) {
    transporter.sendMail({
      from: FROM.noreply(),
      to: email,
      subject: `💡 [NEW SUGGESTION] ${suggestion.suggestionNumber} — ${suggestion.title}`,
      html: adminHtml,
    }).catch(() => {});
  }
  console.log(`📧 Suggestion email sent to user + ${targets.length} admin(s)`);
};

/**
 * Send payment instructions to a user for a manual annual plan request
 */
export const sendPaymentInstructionsEmail = async ({
  to, userName, planName, billingCycle, amount,
  method, accountInfo, reference, customMessage,
}) => {
  const methodLabel = {
    payoneer:     'Payoneer',
    bank_transfer: 'Bank Transfer / Wire',
    credit_card:  'Credit Card (Manual Invoice)',
  }[method] || method;

  const planLabel = `${planName.charAt(0).toUpperCase()}${planName.slice(1)} ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Plan`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;color:white;">
        <h1 style="margin:0;font-size:24px;">Sambid Notify</h1>
        <p style="margin:6px 0 0;opacity:.85;font-size:14px;">Federal Contract Intelligence</p>
      </div>

      <div style="padding:32px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <h2 style="color:#1f2937;margin-top:0;">Payment Instructions for Your ${planLabel}</h2>
        <p style="color:#4b5563;line-height:1.6;">Hi ${userName || 'there'},</p>
        <p style="color:#4b5563;line-height:1.6;">
          Thank you for choosing Sambid Notify! Below are the payment details to complete your subscription.
          Once we confirm receipt of your payment, your account will be activated within 1 business day.
        </p>

        <!-- Plan summary box -->
        <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:10px;padding:20px;margin:24px 0;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#6b7280;width:40%;">Plan</td><td style="padding:6px 0;color:#1f2937;font-weight:700;">${planLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Amount Due</td><td style="padding:6px 0;color:#4f46e5;font-weight:700;font-size:20px;">$${Number(amount).toLocaleString()}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Payment Method</td><td style="padding:6px 0;color:#1f2937;font-weight:600;">${methodLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Reference #</td><td style="padding:6px 0;color:#4f46e5;font-weight:700;letter-spacing:1px;">${reference}</td></tr>
          </table>
        </div>

        <!-- Payment details -->
        <div style="background:#f9fafb;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;padding:20px;margin:24px 0;">
          <p style="margin:0 0 10px;font-weight:700;color:#1f2937;font-size:15px;">📋 Payment Details — ${methodLabel}</p>
          <pre style="margin:0;white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;color:#374151;line-height:1.8;">${accountInfo}</pre>
        </div>

        ${customMessage ? `
        <!-- Custom message -->
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 6px;font-weight:600;color:#92400e;font-size:13px;">Message from our team:</p>
          <p style="margin:0;color:#78350f;line-height:1.6;">${customMessage}</p>
        </div>` : ''}

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:24px 0;">
          <p style="margin:0;color:#166534;font-size:13px;line-height:1.6;">
            ✅ <strong>Important:</strong> Please include your reference number <strong>${reference}</strong> in the payment notes/description so we can match your payment quickly.
            Your plan will be activated within 1 business day of confirmed payment.
          </p>
        </div>

        <p style="color:#6b7280;font-size:13px;line-height:1.6;">
          Questions? Reply to this email or contact our support team. We're happy to help!
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:28px;border-top:1px solid #f3f4f6;padding-top:16px;">
          Sambid Notify · Federal Contract Intelligence<br>
          This email was sent by our admin team in response to your plan request.
        </p>
      </div>
    </div>`;

  await transporter.sendMail({
    from: FROM.billing(),
    to,
    subject: `Payment Instructions — ${planLabel} ($${Number(amount).toLocaleString()}) [Ref: ${reference}]`,
    html,
  });
  console.log(`📧 Payment instructions sent to ${to} (ref: ${reference})`);
};