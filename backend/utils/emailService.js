import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Test email connection
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email server connection verified');
      return true;
    } catch (error) {
      console.error('Email server connection failed:', error);
      return false;
    }
  }

  // Send partnership form submission to sales
  async sendPartnershipSubmission(formData) {
    try {
      // Format budget display
      const budgetMap = {
        '5k-20k': '$5,000 - $20,000',
        '20k-50k': '$20,000 - $50,000',
        '50k-100k': '$50,000 - $100,000',
        '100k-500k': '$100,000 - $500,000',
        '500k+': '$500,000+'
      };

      const formattedBudget = budgetMap[formData.budget] || formData.budget;

      // HTML email template
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2E7D7B, #4CAF93); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; border-left: 4px solid #2E7D7B; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .label { font-weight: bold; color: #2E7D7B; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
            .priority { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 New Partnership Application</h1>
              <p>Greatodeal Partnership Program</p>
            </div>
            
            <div class="content">
              <div class="priority">
                <strong>🕒 Priority:</strong> Please respond within 24 hours
              </div>
              
              <div class="info-box">
                <h2>📋 Contact Information</h2>
                <p><span class="label">Name:</span> ${formData.name}</p>
                <p><span class="label">Email:</span> ${formData.email}</p>
                <p><span class="label">Company:</span> ${formData.company}</p>
                ${formData.phone ? `<p><span class="label">Phone:</span> ${formData.phone}</p>` : ''}
                ${formData.website ? `<p><span class="label">Website:</span> ${formData.website}</p>` : ''}
              </div>
              
              <div class="info-box">
                <h2>💰 Project Details</h2>
                <p><span class="label">Budget Range:</span> ${formattedBudget}</p>
                <p><span class="label">Service Type:</span> ${formData.serviceType || 'Not specified'}</p>
                <p><span class="label">Partnership Tier:</span> ${formData.partnershipTier || 'Not specified'}</p>
                ${formData.industry ? `<p><span class="label">Industry:</span> ${formData.industry}</p>` : ''}
                ${formData.employees ? `<p><span class="label">Company Size:</span> ${formData.employees} employees</p>` : ''}
                ${formData.timeline ? `<p><span class="label">Timeline:</span> ${formData.timeline}</p>` : ''}
                <p><span class="label">NDA Agreed:</span> ${formData.ndaAgreed ? '✅ Yes' : '❌ No'}</p>
              </div>
              
              <div class="info-box">
                <h2>📝 Project Description</h2>
                <p>${formData.description.replace(/\n/g, '<br>')}</p>
              </div>
              
              ${formData.referralSource ? `
                <div class="info-box">
                  <h2>🔗 Referral Source</h2>
                  <p>${formData.referralSource}</p>
                </div>
              ` : ''}
              
              <div class="info-box">
                <h2>🚀 Quick Actions</h2>
                <p>📧 <a href="mailto:${formData.email}">Reply to ${formData.name}</a></p>
                <p>📞 <a href="tel:${formData.phone || ''}">Call ${formData.name}</a></p>
                <p>📅 <a href="https://calendly.com/greatodeal/partnership-consultation?email=${encodeURIComponent(formData.email)}&name=${encodeURIComponent(formData.name)}">Schedule Consultation</a></p>
              </div>
            </div>
            
            <div class="footer">
              <p>This application was submitted on ${new Date().toLocaleString()}</p>
              <p>Greatodeal Partnership Program | AI & Automation Solutions</p>
              <p><small>This email was automatically generated from the partnership application form.</small></p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Plain text version
      const textContent = `
NEW PARTNERSHIP APPLICATION
===========================

Contact Information:
-------------------
Name: ${formData.name}
Email: ${formData.email}
Company: ${formData.company}
${formData.phone ? `Phone: ${formData.phone}` : ''}
${formData.website ? `Website: ${formData.website}` : ''}

Project Details:
---------------
Budget Range: ${formattedBudget}
Service Type: ${formData.serviceType || 'Not specified'}
Partnership Tier: ${formData.partnershipTier || 'Not specified'}
${formData.industry ? `Industry: ${formData.industry}` : ''}
${formData.employees ? `Company Size: ${formData.employees} employees` : ''}
${formData.timeline ? `Timeline: ${formData.timeline}` : ''}
NDA Agreed: ${formData.ndaAgreed ? 'Yes' : 'No'}

Project Description:
-------------------
${formData.description}

${formData.referralSource ? `Referral Source: ${formData.referralSource}` : ''}

Submission Date: ${new Date().toLocaleString()}
      `;

      const mailOptions = {
        from: `"Greatodeal Partnership" <${process.env.EMAIL_USER}>`,
        to: 'sales@greatodeal.com',
        cc: process.env.EMAIL_CC ? process.env.EMAIL_CC.split(',') : [],
        bcc: process.env.EMAIL_BCC ? process.env.EMAIL_BCC.split(',') : [],
        subject: `🎯 New Partnership Application: ${formData.company} - ${formData.name}`,
        text: textContent,
        html: htmlContent,
        replyTo: formData.email,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Partnership email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
      
    } catch (error) {
      console.error('Error sending partnership email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Send confirmation email to client
  async sendConfirmationToClient(formData) {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2E7D7B, #4CAF93); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .thank-you { text-align: center; margin: 30px 0; }
            .next-steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF93; }
            .contact-info { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ Thank You for Your Partnership Application!</h1>
              <p>Greatodeal Partnership Program</p>
            </div>
            
            <div class="content">
              <div class="thank-you">
                <h2>Dear ${formData.name},</h2>
                <p>Thank you for submitting your partnership application to Greatodeal. We're excited to learn more about your project and explore how we can work together to bring your vision to life.</p>
              </div>
              
              <div class="next-steps">
                <h3>📅 What Happens Next?</h3>
                <ol>
                  <li><strong>24-Hour Response:</strong> Our partnership team will review your application and contact you within 24 hours.</li>
                  <li><strong>Discovery Call:</strong> We'll schedule a 30-minute discovery call to discuss your project in detail.</li>
                  <li><strong>Custom Proposal:</strong> Based on our discussion, we'll prepare a tailored 50% partnership proposal.</li>
                  <li><strong>Kickoff:</strong> Once approved, we'll start the project with our shared investment model.</li>
                </ol>
              </div>
              
              <div class="contact-info">
                <h3>📞 Need Immediate Assistance?</h3>
                <p><strong>Email:</strong> partnership@greatodeal.com</p>
                <p><strong>Phone:</strong> +1 (234) 567-890</p>
                <p><strong>Schedule Directly:</strong> <a href="https://calendly.com/greatodeal/partnership-consultation">Book a Consultation</a></p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://greatodeal.com/partnership-faq" style="background: #2E7D7B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  📚 View Partnership FAQ
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated confirmation email. Please do not reply to this message.</p>
              <p>Greatodeal Partnership Program | Transforming Businesses with AI & Automation</p>
              <p><small>Application ID: ${Date.now()}-${Math.random().toString(36).substr(2, 9)}</small></p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"Greatodeal Partnership Team" <${process.env.EMAIL_USER}>`,
        to: formData.email,
        subject: '🎯 Greatodeal Partnership Application Received',
        html: htmlContent,
        headers: {
          'X-Auto-Response-Suppress': 'All'
        }
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Confirmation email sent to ${formData.email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
      
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      // Don't throw error for confirmation email - we don't want to fail the whole submission
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();