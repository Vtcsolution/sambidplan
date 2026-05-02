// backend/services/emailService.js
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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
          <h3 style="margin: 0 0 10px; color: #4338ca;">Upgrade to Pro - $29/month</h3>
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
    from: `"Sambid" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `${daysLeft} days left in your free trial - Upgrade to continue`,
    html: emailHtml
  });
  
  console.log(`📧 Trial reminder sent to ${user.email} (${daysLeft} days left)`);
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
          <p style="margin: 5px 0;"><strong>Pro - $29/month</strong> - Unlimited matches + AI proposals</p>
          <p style="margin: 5px 0;"><strong>Enterprise - $99/month</strong> - Real-time alerts + team access</p>
          <a href="${process.env.FRONTEND_URL}/pricing" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px;">
            View Plans →
          </a>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Sambid" <${process.env.EMAIL_USER}>`,
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
    from: `"Sambid" <${process.env.EMAIL_USER}>`,
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
    from: `"Sambid" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `🚨 REAL-TIME: ${opportunity.title}`,
    html: emailHtml
  });
  
  console.log(`📧 Real-time alert sent to ${user.email} for: ${opportunity.title}`);
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
    from: `"Sambid" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `📊 Your weekly contract digest: ${opportunities.length} new matches`,
    html: emailHtml
  });
  
  console.log(`📧 Weekly digest sent to ${user.email}`);
};