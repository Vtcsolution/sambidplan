import HowItWorks from './HowItWorks';

const ADMIN_HELP = {
  dashboard: {
    title: 'Admin Dashboard',
    steps: [
      { title: 'Platform overview', description: 'Active users, revenue, opportunities tracked, recent transactions, and activity feed' },
      { title: 'Quick actions', description: 'Jump to pending plan requests, user management, invoices, or opportunity management' },
      { title: 'Download competitive report', description: 'One-click branded PDF report with competitor analysis' },
    ],
    dataUsed: ['All Platform Data'],
    connections: [
      ['Users', 'manage user plans, credits, and roles'],
      ['Invoices', 'view recent payments'],
      ['Opportunities', 'manage SAM.gov data pipeline'],
      ['Platform Health', 'monitor API status and system health'],
    ],
  },
  users: {
    title: 'User Management',
    steps: [
      { title: 'View all users', description: 'Search by name/email, filter by plan type' },
      { title: 'Expand user details', description: 'Usage stats, billing history, NAICS codes, account status' },
      { title: 'Change plan / grant credits', description: 'Inline plan editor + bonus credit grants + full plan unlock' },
    ],
    dataUsed: ['User Database', 'Invoice History', 'Usage Stats'],
    connections: [
      ['Plans', 'plan pricing controls what each tier offers'],
      ['Credit Requests', 'approve/reject credit purchase requests'],
      ['Invoices', 'view payment history for any user'],
      ['Company Workspaces', 'see company workspace membership'],
      ['Managed Service', 'users with managed service have commission tracking'],
    ],
  },
  opportunities: {
    title: 'Opportunities Management',
    steps: [
      { title: 'Browse master store', description: 'All fetched SAM.gov opportunities across all NAICS codes' },
      { title: 'Refresh from SAM.gov', description: 'Trigger manual API fetch → opportunities distribute to user feeds automatically' },
      { title: 'Monitor data quality', description: 'Check counts, last fetch time, and data coverage' },
    ],
    dataUsed: ['SAM.gov API', 'Master Opportunity Store'],
    connections: [
      ['Hybrid Pipeline', 'controls automated fetching schedule and bulk downloads'],
      ['Users', 'opportunities distribute to user feeds based on their plan'],
      ['Company Workspaces', 'enterprise users see all opportunities directly'],
    ],
  },
  tickets: {
    title: 'Support Tickets',
    steps: [
      { title: 'View all tickets', description: 'Search, filter by status (Open, In Progress, Resolved, Closed)' },
      { title: 'Reply to tickets', description: 'Respond in-thread — user gets email notification for each reply' },
      { title: 'Track resolution', description: 'Move tickets through status workflow until resolved' },
    ],
    dataUsed: ['User Tickets', 'Email System'],
    connections: [
      ['Users', 'see which user submitted the ticket'],
      ['Notifications', 'ticket replies trigger user notifications'],
      ['Contact Inquiries', 'general inquiries vs detailed support tickets'],
    ],
  },
  invoices: {
    title: 'Invoice Management',
    steps: [
      { title: 'View all invoices', description: 'Filter by status (paid, pending, expired), search by user or invoice number' },
      { title: 'Verify manual payments', description: 'Mark invoices as paid for manual/bank transfer payments → activates user plan' },
      { title: 'Track revenue', description: 'See total collected, pending, and expired amounts' },
    ],
    dataUsed: ['Payment Records', 'User Plans'],
    connections: [
      ['Users', 'each invoice links to a user account'],
      ['Plans', 'paid invoices activate the corresponding plan'],
      ['Revenue Forecast', 'invoice data feeds revenue projections'],
      ['Payments', 'payment gateway records (Stripe, PayPal, Payoneer)'],
    ],
  },
  plans: {
    title: 'Plan Pricing',
    steps: [
      { title: 'Configure plan tiers', description: 'Set monthly/yearly pricing for Free, Starter, Pro, Enterprise' },
      { title: 'Set features & limits', description: 'Max saved opportunities, alerts, AI access, priority support per plan' },
      { title: 'Changes apply to new purchases', description: 'Existing subscriptions keep their current pricing until renewal' },
    ],
    dataUsed: ['Plan Configuration'],
    connections: [
      ['Users', 'plan limits determine what each user can access'],
      ['Invoices', 'plan pricing determines invoice amounts'],
      ['AI Credits', 'plan tier determines monthly AI credit allocation'],
    ],
  },
  managedService: {
    title: 'Managed Service',
    steps: [
      { title: 'Enroll companies', description: 'Search users, set commission rate (flat or tiered), monthly fee, cap — or let them self-apply (you get notified either way)' },
      { title: 'Add bids — link real opportunities', description: 'Search your platform\'s live SAM.gov data and pick a real listing — fields auto-fill from it. Company\'s UEI, CAGE, NAICS, and certifications are shown so you know exactly what they qualify for before bidding' },
      { title: 'Mark won → project auto-created', description: 'No manual "Create Project" step anymore — winning a bid instantly creates the fulfillment project so milestones can start right away' },
      { title: 'Bill commission per milestone', description: 'No lump sum at win. As the government pays each delivery milestone (tracked in Subcontracting), record the payment there — commission is auto-calculated and invoiced for just that milestone, respecting the cap' },
      { title: 'Upload documents', description: 'Attach proposals, capability statements, or contracts directly to a bid — the company can view and download them' },
    ],
    dataUsed: ['Company Profiles (UEI/CAGE/NAICS/Certs)', 'Live SAM.gov Opportunities', 'Bid Tracking', 'Milestone-Based Commission Invoices'],
    connections: [
      ['Subcontracting', 'won bids auto-create a project with vendor quotes, milestones, and per-milestone commission billing'],
      ['Opportunities', 'bids can link to real SAM.gov listings instead of manual entry'],
      ['Users', 'enrolled companies see bid status, billing progress, and documents on their dashboard'],
      ['Invoices', 'milestone commission invoices link to the billing system'],
    ],
  },
  managedProjects: {
    title: 'Subcontracting Projects',
    steps: [
      { title: 'Auto-created on bid win', description: 'No manual step — contract details copy over from the won bid automatically' },
      { title: 'Get vendor quotes', description: 'Open RFQ → vendors submit quotes → compare and select best rate' },
      { title: 'Track milestones', description: 'Set milestones with due dates and vendor payment amounts → track progress 0-100%' },
      { title: 'Record gov payment per milestone', description: 'Click "Gov Paid?" on a milestone, enter the amount the government paid — this auto-generates the commission invoice to the client for that milestone' },
      { title: 'Pay the vendor', description: 'Separately, pay your subcontractor per milestone once their work is approved — independent from the commission billing to the client' },
      { title: 'Upload documents', description: 'Attach the signed contract, SOW, or delivery confirmation — visible to the client' },
    ],
    dataUsed: ['Won Bids', 'Vendor Quotes', 'Milestone Tracking', 'Per-Milestone Commission Invoices'],
    connections: [
      ['Managed Service', 'projects originate automatically from won bids'],
      ['Users', 'company owners see project progress, milestone billing, and documents on their dashboard'],
      ['Notifications', 'auto-email alerts at 7 and 3 days before deadlines, and whenever a milestone is paid or invoiced'],
    ],
  },
  companyWorkspaces: {
    title: 'Company Workspaces',
    steps: [
      { title: 'View all company workspaces', description: 'See registered companies, UEI status, team members, plan' },
      { title: 'Verify/unverify UEI', description: 'Admin can verify or unverify a company\'s SAM.gov UEI registration' },
      { title: 'Manage workspace settings', description: 'View workspace users, document library, managed service enrollment' },
    ],
    dataUsed: ['Company Database', 'SAM.gov Entity API'],
    connections: [
      ['Users', 'each workspace has an owner and team members'],
      ['Managed Service', 'enrolled companies have active managed service'],
      ['SAM Companies', 'SAM.gov entity data enriches company profiles'],
    ],
  },
  campaigns: {
    title: 'Email Campaigns',
    steps: [
      { title: 'Create campaign', description: 'Write subject + body, select target segment (all users, trial expiring, inactive, etc.)' },
      { title: 'Send to segment', description: 'Broadcast email to selected user group — tracks open/click rates' },
      { title: 'View history', description: 'See past campaigns, delivery stats, and engagement metrics' },
    ],
    dataUsed: ['User Segments', 'Email System'],
    connections: [
      ['User Segments', 'segments define who receives the campaign'],
      ['Content Generator', 'AI generates email subject lines and body copy'],
      ['Notifications', 'campaigns can also create in-app notifications'],
    ],
  },
  notifications: {
    title: 'System Notifications',
    steps: [
      { title: 'Create notifications', description: 'Send targeted or system-wide notifications to users' },
      { title: 'Schedule delivery', description: 'Set delivery time for notifications' },
      { title: 'Track delivery', description: 'See read/unread status across all users' },
    ],
    dataUsed: ['User Accounts', 'Notification Queue'],
    connections: [
      ['Users', 'notifications delivered to specific users or segments'],
      ['Campaigns', 'email campaigns also create notifications'],
      ['Managed Service', 'bid updates trigger notifications to company owners'],
    ],
  },
  platformHealth: {
    title: 'Platform Health',
    steps: [
      { title: 'Check API status', description: 'Monitor SAM.gov and USASpending API availability and response times' },
      { title: 'Track active users', description: 'See real-time user activity, login counts, and session data' },
      { title: 'Monitor system metrics', description: 'Database health, email delivery status, opportunity counts' },
    ],
    dataUsed: ['System Metrics', 'API Status Checks'],
    connections: [
      ['Hybrid Pipeline', 'SAM.gov API health affects opportunity fetching'],
      ['Opportunities', 'opportunity count trends show data pipeline health'],
    ],
  },
  aiInsights: {
    title: 'AI Insights',
    steps: [
      { title: 'Platform analytics', description: 'AI-generated insights on user growth, engagement, and revenue trends' },
      { title: 'Growth opportunities', description: 'AI identifies areas for improvement and potential risks' },
      { title: 'User behavior analysis', description: 'Track AI feature adoption, credit consumption, and popular features' },
    ],
    dataUsed: ['Platform Stats', 'AI Usage Data'],
    connections: [
      ['Revenue Forecast', 'insights feed revenue projections'],
      ['User Segments', 'identify high-value and at-risk user groups'],
      ['Campaigns', 'insights suggest targeted campaign ideas'],
    ],
  },
  revenueForecast: {
    title: 'Revenue Forecast',
    steps: [
      { title: 'View MRR trends', description: 'Monthly Recurring Revenue tracking with growth/decline trends' },
      { title: '30/90-day projections', description: 'AI-generated revenue forecasts based on current trajectory' },
      { title: 'Revenue drivers', description: 'Identify which plans and features drive the most revenue' },
    ],
    dataUsed: ['Invoice History', 'Plan Subscriptions'],
    connections: [
      ['Invoices', 'payment data feeds the revenue model'],
      ['Plans', 'plan pricing determines MRR per user'],
      ['AI Insights', 'insights provide context for revenue trends'],
    ],
  },
  userSegments: {
    title: 'User Segments',
    steps: [
      { title: 'View pre-built segments', description: 'Churn risk, trial expiring, power users, never active, upgrade ready, enterprise' },
      { title: 'See user counts', description: 'Each segment shows how many users match the criteria' },
      { title: 'Target for campaigns', description: 'Use segments to send targeted email campaigns or notifications' },
    ],
    dataUsed: ['User Activity Data', 'Plan Status'],
    connections: [
      ['Campaigns', 'segments are the target audience for email campaigns'],
      ['AI Insights', 'segments feed churn prediction and growth analysis'],
      ['Users', 'click into any segment to see individual users'],
    ],
  },
  contentGenerator: {
    title: 'AI Content Generator',
    steps: [
      { title: 'Select content type', description: 'Email subjects, email bodies, announcements, push notifications, blog intros' },
      { title: 'AI generates copy', description: 'Professional marketing content tailored to your platform and audience' },
      { title: 'Copy and use', description: 'Paste generated content into campaigns, notifications, or website' },
    ],
    dataUsed: ['Platform Context'],
    connections: [
      ['Campaigns', 'generated content goes into email campaigns'],
      ['Notifications', 'generated announcements become system notifications'],
    ],
  },
  hybridFetch: {
    title: 'Hybrid Pipeline',
    steps: [
      { title: 'Monitor fetch schedule', description: 'API fetch every 60 min + nightly bulk download — see status and last run times' },
      { title: 'Trigger manual fetch', description: 'Start an immediate SAM.gov API fetch or bulk download' },
      { title: 'View stats', description: 'Records fetched, distribution counts, error logs, API quota usage' },
    ],
    dataUsed: ['SAM.gov API', 'Bulk Download'],
    connections: [
      ['Opportunities', 'fetched data populates the master opportunity store'],
      ['Platform Health', 'fetch errors show here and in health dashboard'],
      ['Users', 'fetched opportunities auto-distribute to user feeds'],
    ],
  },
  creditRequests: {
    title: 'Credit Requests',
    steps: [
      { title: 'View pending requests', description: 'Users request additional AI credits via the Buy Credits flow' },
      { title: 'Approve or reject', description: 'Approve adds credits to user\'s bonus pool — bonus credits don\'t reset monthly' },
      { title: 'Add admin notes', description: 'Record reason for approval/rejection' },
    ],
    dataUsed: ['Credit Purchase Requests'],
    connections: [
      ['Users', 'credits are added to the specific user\'s bonus pool'],
      ['AI features', 'credits gate access to all AI-powered features'],
    ],
  },
  annualRequests: {
    title: 'Annual Plan Requests',
    steps: [
      { title: 'View annual plan requests', description: 'Users requesting yearly billing (discounted) or custom enterprise plans' },
      { title: 'Review payment proof', description: 'Users submit bank transfer screenshots or payment references' },
      { title: 'Approve and activate', description: 'Approving activates the plan for 365 days' },
    ],
    dataUsed: ['Plan Requests', 'Payment Proof'],
    connections: [
      ['Users', 'approved requests activate the user\'s plan'],
      ['Plans', 'annual pricing from plan configuration'],
      ['Invoices', 'approved requests generate paid invoices'],
    ],
  },
  contactInquiries: {
    title: 'Contact Inquiries',
    steps: [
      { title: 'View submissions', description: 'Contact form submissions from the public website' },
      { title: 'Respond to inquiries', description: 'Reply via email — inquiry status updates to resolved' },
      { title: 'Track enterprise leads', description: 'Enterprise plan inquiries flagged for priority follow-up' },
    ],
    dataUsed: ['Contact Form Submissions'],
    connections: [
      ['Tickets', 'complex inquiries can be converted to support tickets'],
      ['Users', 'some inquiries come from registered users'],
    ],
  },
  companies: {
    title: 'SAM Companies',
    steps: [
      { title: 'Browse SAM.gov entities', description: 'Companies synced from SAM.gov Entity API — UEI, CAGE, certifications, NAICS codes' },
      { title: 'Search by UEI or name', description: 'Find specific companies and view their SAM.gov registration details' },
      { title: 'Add new companies', description: 'Manually fetch a company by UEI from SAM.gov into your database' },
    ],
    dataUsed: ['SAM.gov Entity API'],
    connections: [
      ['Company Workspaces', 'registered companies verify UEI against this data'],
      ['Prospects', 'SAM companies can be added as outreach prospects'],
    ],
  },
  prospects: {
    title: 'Federal Prospects',
    steps: [
      { title: 'Build prospect list', description: 'Add federal agencies and contracting offices as outreach targets' },
      { title: 'Manage contact info', description: 'Track agency contacts, phone, email for business development' },
      { title: 'Export for outreach', description: 'Use prospect list for email campaigns and direct outreach' },
    ],
    dataUsed: ['Prospect Database'],
    connections: [
      ['Prospect Outreach', 'send email campaigns to your prospect list'],
      ['SAM Companies', 'enrich prospects with SAM.gov entity data'],
    ],
  },
  prospectOutreach: {
    title: 'Email Outreach',
    steps: [
      { title: 'Create outreach campaigns', description: 'Write personalized emails for federal prospect contacts' },
      { title: 'Send and track', description: 'Email delivery with open/click tracking' },
      { title: 'A/B test subjects', description: 'Test different subject lines for better engagement' },
    ],
    dataUsed: ['Prospect List', 'Email System'],
    connections: [
      ['Prospects', 'outreach targets come from your prospect list'],
      ['Content Generator', 'AI generates email copy for outreach'],
    ],
  },
  suggestions: {
    title: 'User Suggestions',
    steps: [
      { title: 'Review user ideas', description: 'Feature requests and improvement suggestions from users' },
      { title: 'Update status', description: 'Mark as under review, planned, or implemented' },
      { title: 'Track demand', description: 'See which features users request most often' },
    ],
    dataUsed: ['User Suggestions'],
    connections: [
      ['Users', 'each suggestion links to the submitting user'],
    ],
  },
  mediaManager: {
    title: 'Page Media',
    steps: [
      { title: 'Upload images', description: 'Manage hero images, feature graphics, and logos for website pages' },
      { title: 'Assign to pages', description: 'Each media slot maps to a specific section on a public page' },
      { title: 'Replace or delete', description: 'Upload new image to replace, or delete to revert to default' },
    ],
    dataUsed: ['Uploaded Media Files'],
  },
  supportManagement: {
    title: 'Support Team',
    steps: [
      { title: 'View support members', description: 'See all support team accounts, their referral earnings, and activity' },
      { title: 'Manage access', description: 'Support members have limited admin access based on permissions' },
      { title: 'Track performance', description: 'See ticket resolution counts and referral commissions per member' },
    ],
    dataUsed: ['Support Team Accounts'],
    connections: [
      ['Tickets', 'support members handle ticket responses'],
      ['Admin Management', 'admin accounts with support role'],
    ],
  },
  adminManagement: {
    title: 'Admin Accounts',
    steps: [
      { title: 'Create admin accounts', description: 'Add new admins with role: super_admin, admin, or support' },
      { title: 'Set permissions', description: 'Control which sections each admin can access' },
      { title: 'Manage access', description: 'Edit, disable, or delete admin accounts' },
    ],
    dataUsed: ['Admin Accounts'],
    connections: [
      ['Support Team', 'support role admins appear in support management'],
      ['All admin pages', 'permissions control which pages each admin sees'],
    ],
  },
  settings: {
    title: 'Platform Settings',
    steps: [
      { title: 'Configure API keys', description: 'Update SAM.gov, OpenAI, Anthropic, and payment gateway keys' },
      { title: 'Feature toggles', description: 'Enable/disable platform features globally' },
      { title: 'System configuration', description: 'Email settings, rate limits, and operational parameters' },
    ],
    dataUsed: ['System Configuration'],
  },
  emailSettings: {
    title: 'Email Settings',
    steps: [
      { title: 'Configure SMTP', description: 'Set email server, port, credentials for transactional emails' },
      { title: 'Manage templates', description: 'View and customize email template content' },
      { title: 'Test delivery', description: 'Send test emails to verify configuration' },
    ],
    dataUsed: ['SMTP Configuration'],
    connections: [
      ['Campaigns', 'campaigns use the same SMTP configuration'],
      ['Tickets', 'ticket replies sent via this email setup'],
    ],
  },
  marketingPanel: {
    title: 'Marketing Panel',
    steps: [
      { title: 'Review partner applications', description: 'Approve or reject partner/affiliate applications' },
      { title: 'Manage partnerships', description: 'View approved partners, their referral stats, and earnings' },
    ],
    dataUsed: ['Partner Applications'],
  },
  payments: {
    title: 'Payments',
    steps: [
      { title: 'View payment records', description: 'All Stripe, PayPal, and Payoneer transactions' },
      { title: 'Track payment status', description: 'See successful, pending, failed, and refunded payments' },
      { title: 'Reconcile', description: 'Match payments to invoices and user plan activations' },
    ],
    dataUsed: ['Payment Gateway Records'],
    connections: [
      ['Invoices', 'payments create or update invoice records'],
      ['Users', 'successful payments activate user plans'],
    ],
  },
  supportEarnings: {
    title: 'My Earnings',
    steps: [
      { title: 'View referral earnings', description: 'See commissions earned from referred users who upgraded' },
      { title: 'Track balance', description: 'Pending vs paid out earnings' },
      { title: 'Request withdrawal', description: 'Withdraw earnings via PayPal, bank, or Payoneer' },
    ],
    dataUsed: ['Your Referral Data'],
  },
  supportGuide: {
    title: 'Earning Guide',
    steps: [
      { title: 'Learn the commission structure', description: 'How much you earn per referral at each plan tier' },
      { title: 'Share your link', description: 'Your unique referral link to share with potential users' },
      { title: 'Track conversions', description: 'See who signed up and who upgraded via your referral' },
    ],
    dataUsed: ['Commission Structure'],
  },
};

export default function AdminHowItWorks({ page }) {
  const help = ADMIN_HELP[page];
  if (!help) return null;

  return (
    <HowItWorks
      title={help.title}
      steps={help.steps}
      dataUsed={help.dataUsed || []}
    >
      {help.connections && (
        <>
          <p className="text-sm font-semibold text-gray-700 mt-2">Connected to:</p>
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
            {help.connections.map(([page, desc], i) => (
              <li key={i}><strong>{page}</strong> → {desc}</li>
            ))}
          </ul>
        </>
      )}
    </HowItWorks>
  );
}
