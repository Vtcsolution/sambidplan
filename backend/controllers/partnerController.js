import PartnerApplication from '../models/PartnerApplication.js';
import Admin from '../models/Admin.js';
import { transporter, FROM } from '../services/emailService.js';

const smtpUser = () => process.env.SMTP_USER || process.env.EMAIL_USER;

// ── POST /api/partner/apply  (public) ─────────────────────────────────────────
export const applyAsPartner = async (req, res) => {
  try {
    const { name, email, phone, country, experience, channels, motivation } = req.body;

    if (!name?.trim() || !email?.trim() || !motivation?.trim()) {
      return res.status(400).json({ success: false, message: 'Name, email, and motivation are required.' });
    }

    const existing = await PartnerApplication.findOne({ email: email.trim().toLowerCase(), status: 'pending' });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have a pending application. We will contact you soon.' });
    }

    await PartnerApplication.create({ name, email, phone, country, experience, channels, motivation });

    // Respond immediately — emails fire in background
    res.status(201).json({ success: true, message: 'Application submitted! We will review it and get back to you within 2–3 business days.' });

    // Admin notification
    transporter.sendMail({
      from:    FROM.noreply(),
      to:      smtpUser(),
      subject: `New Partner Application — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:20px;border-radius:12px 12px 0 0;color:white;text-align:center">
            <h2 style="margin:0">New Partner Application</h2>
            <p style="margin:4px 0 0;opacity:.85;font-size:14px">Sambid Notify Partner Program</p>
          </div>
          <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px">
            <table cellpadding="8" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;width:100%">
              <tr style="background:white"><td style="font-weight:bold;color:#4f46e5;padding:8px 12px;border-radius:4px">Name</td><td>${name}</td></tr>
              <tr><td style="font-weight:bold;color:#4f46e5;padding:8px 12px">Email</td><td>${email}</td></tr>
              <tr style="background:white"><td style="font-weight:bold;color:#4f46e5;padding:8px 12px;border-radius:4px">Phone</td><td>${phone || '—'}</td></tr>
              <tr><td style="font-weight:bold;color:#4f46e5;padding:8px 12px">Country</td><td>${country || '—'}</td></tr>
              <tr style="background:white"><td style="font-weight:bold;color:#4f46e5;padding:8px 12px;border-radius:4px">Experience</td><td>${experience || '—'}</td></tr>
              <tr><td style="font-weight:bold;color:#4f46e5;padding:8px 12px">Channels</td><td>${(channels || []).join(', ') || '—'}</td></tr>
            </table>
            <div style="margin-top:16px;background:white;border-left:4px solid #4f46e5;padding:12px 16px;border-radius:4px">
              <p style="font-weight:bold;color:#4f46e5;margin:0 0 6px">Motivation</p>
              <p style="margin:0;font-size:14px;color:#374151">${motivation.replace(/\n/g, '<br>')}</p>
            </div>
            <p style="margin-top:16px;font-size:12px;color:#9ca3af">Review in Admin Panel → Marketing Panel</p>
          </div>
        </div>
      `,
    }).catch(err => console.error('Partner admin notify failed:', err.message));

    // Confirmation to applicant
    transporter.sendMail({
      from:    FROM.noreply(),
      to:      email,
      subject: 'Application Received — Sambid Notify Partner Program',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:30px;border-radius:12px 12px 0 0;color:white;text-align:center">
            <h2 style="margin:0">Application Received!</h2>
            <p style="margin:6px 0 0;opacity:.85">Sambid Notify Partner Program</p>
          </div>
          <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px">
            <p style="font-size:16px;color:#111827">Dear <strong>${name}</strong>,</p>
            <p style="color:#374151">Thank you for applying to the Sambid Notify Partner Program. We have received your application and will review it within <strong>2–3 business days</strong>.</p>
            <div style="background:#ede9fe;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;font-weight:bold;color:#4f46e5">If approved, you will receive:</p>
              <ul style="margin:0;padding-left:20px;color:#4b5563;font-size:14px">
                <li>Login credentials to your partner dashboard</li>
                <li>A unique referral link (gives companies <strong>20% off</strong>)</li>
                <li><strong>20% recurring commission</strong> on every payment from referred companies</li>
                <li>Ability to withdraw earnings once balance reaches $100</li>
              </ul>
            </div>
            <p style="color:#6b7280;font-size:13px">If you have any questions, reply to this email.</p>
            <p style="color:#6b7280;font-size:12px;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:12px">— The Sambid Notify Team</p>
          </div>
        </div>
      `,
    }).catch(err => console.error('Partner confirmation email failed:', err.message));

  } catch (err) {
    console.error('Partner apply error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/partner/admin/applications  (admin) ──────────────────────────────
export const listApplications = async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const query = status !== 'all' ? { status } : {};
    const apps = await PartnerApplication.find(query)
      .populate('processedBy', 'name')
      .populate('createdAdminId', 'name email referralCode')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/partner/admin/applications/:id  (super_admin) ────────────────────
export const processApplication = async (req, res) => {
  try {
    const { status, adminNote, password } = req.body;
    const application = await PartnerApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (application.status !== 'pending') return res.status(400).json({ success: false, message: 'Already processed.' });

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
    }

    application.status      = status;
    application.adminNote   = adminNote || '';
    application.processedAt = new Date();
    application.processedBy = req.admin._id;

    if (status === 'approved') {
      if (!password || password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password (min 8 chars) is required to create the support account.' });
      }

      const existing = await Admin.findOne({ email: application.email });
      if (existing) {
        return res.status(409).json({ success: false, message: `An admin account already exists for ${application.email}.` });
      }

      const supportAdmin = await Admin.create({
        name:        application.name,
        email:       application.email,
        password:    password,  // Admin pre-save hook hashes this
        role:        'support',
        isActive:    true,
        permissions: { users: false, payments: false, content: true, settings: false, aiTools: true, campaigns: false },
      });

      application.createdAdminId = supportAdmin._id;
      await application.save();

      // Respond immediately
      const frontendUrl = process.env.FRONTEND_URL || 'https://sambid.co';
      res.json({
        success: true,
        message: `Application approved. Support account created for ${application.email} and credentials emailed.`,
        data: { referralCode: supportAdmin.referralCode },
      });

      // Welcome email fires in background
      transporter.sendMail({
        from:    FROM.noreply(),
        to:      application.email,
        subject: 'Welcome to the Sambid Notify Partner Program!',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:30px;border-radius:12px 12px 0 0;color:white;text-align:center">
              <h2 style="margin:0">You're Approved!</h2>
              <p style="margin:6px 0 0;opacity:.85">Welcome to the Sambid Notify Partner Program</p>
            </div>
            <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px">
              <p style="font-size:16px;color:#111827">Dear <strong>${application.name}</strong>,</p>
              <p style="color:#374151">Your partner application has been <strong style="color:#16a34a">approved</strong>. Here are your login credentials:</p>

              <div style="background:#ede9fe;border-radius:10px;padding:20px;margin:16px 0;font-family:monospace">
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr><td style="padding:6px 0;color:#6b7280">Login URL</td><td style="font-weight:bold"><a href="${frontendUrl}/admin/login" style="color:#4f46e5">${frontendUrl}/admin/login</a></td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="font-weight:bold">${application.email}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Password</td><td style="font-weight:bold">${password}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280">Referral Code</td><td style="font-weight:bold;color:#4f46e5">${supportAdmin.referralCode}</td></tr>
                </table>
              </div>

              <div style="background:white;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb">
                <p style="margin:0 0 8px;font-weight:bold;color:#111827">Your referral link:</p>
                <a href="${frontendUrl}/signup?supportRef=${supportAdmin.referralCode}" style="color:#4f46e5;word-break:break-all;font-size:13px">
                  ${frontendUrl}/signup?supportRef=${supportAdmin.referralCode}
                </a>
              </div>

              <div style="background:#fef9c3;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:0 0 6px;font-weight:bold;color:#92400e">How you earn:</p>
                <ul style="margin:0;padding-left:20px;color:#78350f;font-size:14px">
                  <li>Companies who sign up via your link get <strong>20% off</strong> any plan</li>
                  <li>You earn <strong>20% commission</strong> on every payment they make</li>
                  <li>Commission is <strong>recurring</strong> — every billing cycle</li>
                  <li>Withdraw once your balance reaches <strong>$100</strong></li>
                </ul>
              </div>

              <p style="color:#6b7280;font-size:13px">Please change your password after your first login.</p>
              <p style="color:#6b7280;font-size:12px;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:12px">— The Sambid Notify Team</p>
            </div>
          </div>
        `,
      }).catch(err => console.error('Welcome email failed:', err.message));

      return;
    }

    // Rejected path
    await application.save();

    // Respond immediately
    res.json({ success: true, message: 'Application rejected and applicant notified.' });

    transporter.sendMail({
      from:    FROM.noreply(),
      to:      application.email,
      subject: 'Regarding Your Partner Application — Sambid Notify',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <div style="background:#6b7280;padding:24px;border-radius:12px 12px 0 0;color:white;text-align:center">
            <h2 style="margin:0">Application Update</h2>
          </div>
          <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px">
            <p style="color:#374151">Dear <strong>${application.name}</strong>,</p>
            <p style="color:#374151">Thank you for your interest in the Sambid Notify Partner Program.</p>
            <p style="color:#374151">After reviewing your application, we are unable to move forward at this time.</p>
            ${adminNote ? `<div style="background:#fee2e2;border-radius:8px;padding:12px 16px;margin:12px 0"><p style="margin:0;color:#991b1b"><strong>Reason:</strong> ${adminNote}</p></div>` : ''}
            <p style="color:#6b7280">You are welcome to reapply in the future.</p>
            <p style="color:#6b7280;font-size:12px;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:12px">— The Sambid Notify Team</p>
          </div>
        </div>
      `,
    }).catch(() => {});

  } catch (err) {
    console.error('Process application error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
