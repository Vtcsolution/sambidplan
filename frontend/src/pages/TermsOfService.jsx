import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'June 1, 2025';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using Sambid ("the Platform"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing the Platform. These Terms apply to all users, including browsers, vendors, customers, merchants, and contributors of content.`,
  },
  {
    title: '2. Description of Services',
    body: `Sambid provides an AI-powered federal contract intelligence platform that enables registered users to discover, track, and analyze U.S. government contract opportunities sourced from SAM.gov and related federal procurement databases. Features include AI-powered contract matching, proposal generation assistance, bid pipeline management, real-time alerts, and analytical tools for competitive analysis. Sambid reserves the right to modify, suspend, or discontinue any aspect of the Service at any time with reasonable notice.`,
  },
  {
    title: '3. Account Registration & Security',
    body: `To access the Platform you must register for an account by providing accurate, complete, and current information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must immediately notify Sambid of any unauthorized use of your account or any other security breach. Sambid will not be liable for any loss or damage arising from your failure to protect your account information. Each account is for a single authorized user; account sharing is prohibited on Starter and Pro plans.`,
  },
  {
    title: '4. Subscription Plans & Billing',
    body: `Sambid offers Free, Starter, Pro, and Enterprise subscription tiers. Paid plans are billed in advance on a monthly or annual cycle. All subscription fees are non-refundable except where required by law. You may cancel your subscription at any time; cancellation takes effect immediately and your account reverts to the Free tier. Sambid reserves the right to modify pricing at any time with at least 30 days' notice. Continued use of the Platform after a price change constitutes acceptance of the new pricing. Payments are processed securely by Stripe, PayPal, and Payoneer. Sambid does not store card numbers or payment credentials.`,
  },
  {
    title: '5. Free Trial',
    body: `New accounts may be eligible for a limited free trial of paid features. At the end of the trial period, your account will automatically revert to the Free plan unless you select a paid subscription. No credit card is required to start a trial. Trial terms and duration are subject to change.`,
  },
  {
    title: '6. Acceptable Use Policy',
    body: `You agree not to: (a) use the Platform for any unlawful purpose; (b) attempt to gain unauthorized access to any portion of the Platform or its related systems; (c) scrape, crawl, or otherwise extract data from the Platform in an automated manner beyond permitted API usage; (d) transmit any viruses, malware, or destructive code; (e) harass, threaten, or harm other users; (f) use the Platform to distribute unsolicited commercial communications (spam); or (g) misrepresent your identity or affiliation. Violation of this policy may result in immediate account termination without refund.`,
  },
  {
    title: '7. Data & Government Information',
    body: `Contract opportunity data displayed on the Platform is sourced from publicly available government databases including SAM.gov and USASpending.gov. While Sambid uses reasonable efforts to ensure data accuracy and timeliness, we make no guarantees that information is complete, accurate, or up-to-date. Users are responsible for independently verifying any information before making business decisions. Sambid is not affiliated with the U.S. federal government.`,
  },
  {
    title: '8. Intellectual Property',
    body: `The Platform, including its source code, interface, AI models, matching algorithms, design, text, and graphics, is the exclusive property of Sambid and is protected by applicable intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to access and use the Platform for your business purposes. You may not reproduce, distribute, modify, create derivative works of, or reverse-engineer any part of the Platform without express written consent from Sambid.`,
  },
  {
    title: '9. User-Generated Content',
    body: `Any content you submit to the Platform (capability statements, proposal drafts, company information, etc.) remains your property. By submitting content, you grant Sambid a non-exclusive, royalty-free license to use that content solely to provide and improve the Service. Sambid does not claim ownership of your content and will not sell it to third parties.`,
  },
  {
    title: '10. Disclaimer of Warranties',
    body: `THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. SAMBID DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. AI-GENERATED CONTENT IS PROVIDED FOR INFORMATIONAL PURPOSES ONLY AND DOES NOT CONSTITUTE LEGAL, FINANCIAL, OR PROFESSIONAL ADVICE.`,
  },
  {
    title: '11. Limitation of Liability',
    body: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SAMBID AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE PLATFORM, EVEN IF SAMBID HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. IN NO EVENT SHALL SAMBID'S TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO SAMBID IN THE 12 MONTHS PRECEDING THE CLAIM.`,
  },
  {
    title: '12. Indemnification',
    body: `You agree to defend, indemnify, and hold harmless Sambid and its affiliates from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your use of the Platform, your violation of these Terms, or your violation of any rights of another party.`,
  },
  {
    title: '13. Termination',
    body: `Sambid reserves the right to suspend or terminate your account at any time for violation of these Terms, for non-payment, or for any other reason at Sambid's sole discretion, with or without notice. Upon termination, your right to use the Platform ceases immediately. Provisions that by their nature should survive termination (including IP rights, disclaimer, indemnification, and limitation of liability) shall survive.`,
  },
  {
    title: '14. Governing Law & Dispute Resolution',
    body: `These Terms shall be governed by and construed in accordance with the laws of the State of Virginia, United States, without regard to its conflict of law provisions. Any dispute arising from these Terms shall first be attempted to be resolved through good-faith negotiation. If unresolved, disputes shall be submitted to binding arbitration in Arlington, Virginia under the rules of the American Arbitration Association. You waive any right to a jury trial or class action proceedings.`,
  },
  {
    title: '15. Changes to Terms',
    body: `Sambid reserves the right to update these Terms at any time. We will notify registered users of material changes via email or in-app notification at least 14 days before the changes take effect. Your continued use of the Platform after the effective date constitutes acceptance of the revised Terms.`,
  },
  {
    title: '16. Contact Information',
    body: `If you have questions about these Terms, please contact us at: legal@sambid.co or write to Sambid Notify, Arlington, VA 22203, USA.`,
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          <p className="text-gray-500 text-sm">Effective date: {LAST_UPDATED} · Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Please read these Terms of Service carefully before using the Sambid platform. These terms constitute a legally binding agreement between you and Sambid Notify regarding your use of our services.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((s) => (
            <div key={s.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">{s.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
          <p className="text-sm text-indigo-700">
            By using Sambid, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
            <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
            <span>·</span>
            <Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact Us</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
