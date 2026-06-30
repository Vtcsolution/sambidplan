import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import SEOHead from '../components/SEOHead';

const LAST_UPDATED = 'June 1, 2025';

const sections = [
  {
    title: '1. Introduction',
    body: `Sambid Notify ("Sambid", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use the Sambid platform and related services. By using Sambid, you consent to the data practices described in this policy. If you are located in the European Economic Area (EEA) or the United Kingdom, this policy also serves as your GDPR notice.`,
  },
  {
    title: '2. Information We Collect',
    subsections: [
      {
        label: 'Information You Provide Directly',
        text: 'Account information (name, business name, email address, password), profile data (NAICS codes, certifications, SAM.gov registration number), payment information (processed and stored securely by Stripe, PayPal, or Payoneer — we never store raw card numbers), communications you send us (support tickets, contact form submissions), and content you generate on the platform (capability statements, proposal drafts, pipeline data).',
      },
      {
        label: 'Information Collected Automatically',
        text: 'Log data (IP address, browser type, operating system, referring URLs, pages visited, time spent), device information, cookies and similar tracking technologies, and usage analytics (feature interactions, search queries, click patterns). We use this data to improve the platform and your experience.',
      },
      {
        label: 'Information from Third Parties',
        text: 'Public federal procurement data from SAM.gov, USASpending.gov, and related government databases. This data is publicly available and is not your personal information.',
      },
    ],
  },
  {
    title: '3. How We Use Your Information',
    body: `We use the information we collect to: (a) provide, operate, and maintain the Sambid platform; (b) personalize your experience and deliver AI-powered contract matches based on your NAICS codes and preferences; (c) process payments and manage your subscription; (d) send transactional emails (account confirmations, payment receipts, opportunity alerts you have subscribed to); (e) provide customer support; (f) analyze usage patterns to improve features and fix bugs; (g) detect and prevent fraud, abuse, and security incidents; (h) comply with legal obligations; and (i) with your consent, send marketing communications about new features or promotions. You may opt out of marketing emails at any time via the unsubscribe link.`,
  },
  {
    title: '4. Legal Basis for Processing (GDPR)',
    body: `For users in the EEA/UK, we process personal data under the following legal bases: Contract Performance — processing necessary to provide the services you have signed up for; Legitimate Interests — analytics, security, and platform improvement; Legal Obligation — compliance with applicable law; and Consent — for optional communications and non-essential cookies. You may withdraw consent at any time without affecting the lawfulness of prior processing.`,
  },
  {
    title: '5. Information Sharing & Disclosure',
    body: `We do not sell your personal information to third parties. We may share your information with: (a) Service providers who assist us in operating the platform (cloud hosting, email delivery, payment processing, analytics) under strict data processing agreements; (b) Law enforcement or government bodies where required by law or to protect rights and safety; (c) Acquirers in the event of a merger, acquisition, or sale of assets — you will be notified and given the opportunity to opt out; and (d) Other users only as required by features you have explicitly enabled (e.g., teaming partner finder shows your public business profile if you opt in).`,
  },
  {
    title: '6. Cookies & Tracking Technologies',
    body: `We use the following types of cookies: Essential Cookies — required for the platform to function (authentication tokens, session management); Analytics Cookies — help us understand how users interact with the platform (e.g., page visit counts, feature usage); Preference Cookies — remember your settings (dark mode, language). You can control non-essential cookies via the cookie consent banner when you first visit the site. Disabling essential cookies will prevent you from logging in. Third-party services (PayPal, Stripe) may set their own cookies when processing payments; these are governed by their respective privacy policies.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your personal data for as long as your account is active or as necessary to provide services. If you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required by law (e.g., financial records are retained for 7 years for tax compliance). Log data is retained for 90 days. AI-generated content in your account is retained until you delete it or close your account.`,
  },
  {
    title: '8. Data Security',
    body: `We implement industry-standard security measures to protect your personal information, including: TLS/SSL encryption for all data in transit; AES-256 encryption for sensitive data at rest; access controls limiting employee access to personal data on a need-to-know basis; regular security audits and penetration testing; and secure payment processing via PCI-DSS compliant payment processors (Stripe, PayPal). No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    title: '9. Your Privacy Rights',
    subsections: [
      {
        label: 'All Users',
        text: 'You may access, update, or delete your account information at any time via Account Settings. You may opt out of marketing emails via the unsubscribe link in any email.',
      },
      {
        label: 'EEA / UK Users (GDPR)',
        text: 'You have the right to: access your personal data; correct inaccurate data; request erasure ("right to be forgotten"); restrict or object to processing; data portability; and lodge a complaint with your local supervisory authority.',
      },
      {
        label: 'California Users (CCPA)',
        text: 'California residents may request disclosure of the categories and specific pieces of personal information we have collected, the right to delete personal information, and the right to opt out of the sale of personal information (we do not sell personal information).',
      },
    ],
  },
  {
    title: '10. International Data Transfers',
    body: `Sambid is based in the United States. If you access the platform from outside the US, your information will be transferred to and processed in the US. For EEA/UK users, we ensure adequate safeguards for cross-border data transfers as required by GDPR, including Standard Contractual Clauses (SCCs) with service providers.`,
  },
  {
    title: "11. Children's Privacy",
    body: `Sambid is a business-to-business platform intended for use by professionals and companies. We do not knowingly collect personal information from anyone under the age of 18. If we become aware that a minor has provided us with personal information, we will promptly delete it. Parents or guardians with concerns should contact us immediately.`,
  },
  {
    title: '12. Third-Party Links',
    body: `The Platform may contain links to third-party websites, including SAM.gov, USASpending.gov, and payment processors. These sites have their own privacy policies and we have no control over, and assume no responsibility for, the content or practices of those sites. We encourage you to review the privacy policies of any third-party sites you visit.`,
  },
  {
    title: '13. Changes to This Privacy Policy',
    body: `We may update this Privacy Policy from time to time. We will notify registered users of material changes via email or in-app notification at least 14 days before changes take effect. The "Last Updated" date at the top of this policy reflects the most recent revision. Your continued use of Sambid after changes take effect constitutes acceptance of the revised policy.`,
  },
  {
    title: '14. Contact Us',
    body: `For privacy-related questions, to exercise your rights, or to report a privacy concern, please contact our Privacy Team at: privacy@sambid.co or write to Sambid Notify — Privacy, Arlington, VA 22203, USA. We will respond to all requests within 30 days.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="Privacy Policy — Sambid"
        description="Sambid's Privacy Policy explains how we collect, use, and protect your data when you use our federal contract notification platform."
        keywords="Sambid privacy policy, federal contracting software data protection, SAM.gov platform privacy, GDPR compliance government contracting tool"
        canonical="https://sambid.co/privacy"
      />
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <p className="text-gray-500 text-sm">Effective date: {LAST_UPDATED} · Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Your privacy matters to us. This policy explains what data we collect, why we collect it, how we use it, and your rights regarding your personal information.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((s) => (
            <div key={s.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">{s.title}</h2>
              {s.body && <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>}
              {s.subsections && (
                <div className="space-y-4 mt-2">
                  {s.subsections.map((sub) => (
                    <div key={sub.label} className="pl-4 border-l-2 border-indigo-100">
                      <p className="text-sm font-medium text-gray-800 mb-1">{sub.label}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{sub.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 p-5 bg-green-50 border border-green-100 rounded-2xl text-center">
          <p className="text-sm text-green-800 font-medium mb-1">We respect your privacy.</p>
          <p className="text-sm text-green-700">
            Sambid does not sell your personal information and never will.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
            <Link to="/terms" className="hover:text-green-700 transition-colors">Terms of Service</Link>
            <span>·</span>
            <Link to="/contact" className="hover:text-green-700 transition-colors">Contact Privacy Team</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
