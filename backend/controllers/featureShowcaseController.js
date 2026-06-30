import FeatureShowcase from '../models/FeatureShowcase.js';

// ── Public: Get all active features ──────────────────────────────────────────
export const getAllFeatures = async (req, res) => {
  try {
    const features = await FeatureShowcase.find({ isActive: true }).sort({ order: 1 }).lean();
    res.json({ success: true, data: features });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Public: Get single feature by slug ───────────────────────────────────────
export const getFeatureBySlug = async (req, res) => {
  try {
    const feature = await FeatureShowcase.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!feature) return res.status(404).json({ success: false, message: 'Feature not found.' });
    res.json({ success: true, data: feature });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: List all features (including inactive) ────────────────────────────
export const adminListFeatures = async (req, res) => {
  try {
    const features = await FeatureShowcase.find().sort({ order: 1 }).lean();
    res.json({ success: true, data: features });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: Create feature ────────────────────────────────────────────────────
export const createFeature = async (req, res) => {
  try {
    const feature = await FeatureShowcase.create(req.body);
    res.status(201).json({ success: true, data: feature });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: Update feature ────────────────────────────────────────────────────
export const updateFeature = async (req, res) => {
  try {
    const feature = await FeatureShowcase.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!feature) return res.status(404).json({ success: false, message: 'Feature not found.' });
    res.json({ success: true, data: feature });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: Delete feature ────────────────────────────────────────────────────
export const deleteFeature = async (req, res) => {
  try {
    await FeatureShowcase.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Feature deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: Seed default features ─────────────────────────────────────────────
export const seedDefaults = async (req, res) => {
  try {
    const existing = await FeatureShowcase.countDocuments();
    if (existing > 0) return res.json({ success: false, message: `${existing} features already exist. Delete them first or edit individually.` });

    const defaults = [
      { slug: 'contract-opportunities', title: 'Contract Opportunities', subtitle: 'Find federal contracts matched to your NAICS codes — auto-scored by AI', icon: 'FileText', color: 'indigo', order: 1,
        steps: [{ title: 'Auto-matched to your NAICS', description: 'System fetches from SAM.gov every hour and matches to your registered codes' }, { title: 'AI Match Score (0-100%)', description: 'Each opportunity scored on NAICS fit, set-aside eligibility, value range, and agency alignment' }, { title: 'Smart Filters', description: 'Filter by due date presets, NAICS, notice type, agency, set-aside, value range' }, { title: 'One-click detail', description: 'Click any opportunity for full SAM.gov data, AI analysis, and direct document access' }],
        benefits: ['Automatic matching saves 40+ hours/month vs manual SAM.gov search', 'AI scoring tells you which contracts are worth pursuing', 'Smart date presets — "Next 7 days" in one click', 'Never miss a matching opportunity again'] },
      { slug: 'deadline-calendar', title: 'Deadline Calendar', subtitle: 'Never miss a submission deadline — color-coded by urgency', icon: 'CalendarDays', color: 'rose', order: 2,
        steps: [{ title: 'All deadlines in one view', description: 'Monthly calendar showing every contract response deadline from your feed' }, { title: 'Color-coded urgency', description: 'Red (≤3 days), Orange (≤7), Yellow (≤14), Green (>14)' }, { title: 'Calendar sync', description: 'Download .ICS to sync with Google Calendar, Outlook, or Apple Calendar' }],
        benefits: ['Visual overview of all upcoming deadlines', 'Urgency colors prevent last-minute scrambles', 'One-click sync with any calendar app', 'Includes both matched and saved opportunities'] },
      { slug: 'past-award-analysis', title: 'Past Award Analysis', subtitle: 'Research who won similar contracts — real data from USASpending.gov', icon: 'TrendingUp', color: 'emerald', order: 3,
        steps: [{ title: 'Search by NAICS code', description: 'Enter any NAICS to see 3-5 years of real awarded contracts' }, { title: 'See actual winners', description: 'Company names, award amounts, agencies — all from USASpending.gov' }, { title: 'Benchmark pricing', description: 'Know the market rate before you bid' }],
        benefits: ['Know your competitors by name before bidding', 'Price competitively using real historical data', 'Identify which agencies spend the most in your industry', 'Same data that feeds our AI Bid Analysis tool'] },
      { slug: 'saved-opportunities', title: 'Saved Opportunities', subtitle: 'Bookmark and track contracts through your bidding workflow', icon: 'Bookmark', color: 'teal', order: 4,
        steps: [{ title: 'Save from any page', description: 'Click "Save to My List" on any opportunity' }, { title: 'Track status', description: 'Move through stages: Saved → Researching → Drafting → Submitted → Won/Lost' }, { title: 'Use in AI tools', description: 'Saved opportunities appear in Go/No-Go, Proposal Builder, and other AI tools' }],
        benefits: ['Never lose track of an opportunity', 'Status tracking shows where each bid stands', 'Feeds directly into AI analysis tools', 'Export as PDF or CSV for your team'] },
      { slug: 'matched-opportunities', title: 'Smart Alerts', subtitle: 'Get notified when new contracts match your profile — real-time, daily, or weekly', icon: 'Zap', color: 'yellow', order: 5,
        steps: [{ title: 'NAICS-based matching', description: 'Hourly matching against SAM.gov based on your registered codes' }, { title: 'AI match scoring', description: 'Each match scored 0-100% for relevance to your company' }, { title: 'Choose your frequency', description: 'Real-time (Enterprise), daily digest (Pro), or weekly summary (Free)' }],
        benefits: ['Automatic — no manual searching needed', 'AI scores save time evaluating each opportunity', 'Push notifications for instant alerts', 'Customizable frequency per your workflow'] },
      { slug: 'ai-summarize', title: 'AI Summarize', subtitle: 'Full contract intelligence in seconds — powered by Claude AI with real SAM.gov data', icon: 'Sparkles', color: 'violet', order: 6,
        steps: [{ title: 'Click "AI Summarize" on any opportunity', description: 'AI reads the complete SOW/description (up to 15,000 characters)' }, { title: 'Get structured analysis', description: 'Executive summary, scope of work, submission requirements, evaluation criteria, contact info, red flags' }, { title: 'Fit assessment', description: 'AI checks your NAICS codes, certifications, and past wins against the opportunity' }],
        benefits: ['Reads the full SOW text — not just title and description', 'Extracts submission deadlines and requirements you might miss', 'Honest fit assessment based on YOUR real company data', 'Powered by Claude Opus 4.8 — not generic ChatGPT'] },
      { slug: 'bid-analysis', title: 'AI Bid Analysis', subtitle: 'Should you bid? Get a data-driven BID/NO-BID recommendation with real competitor intelligence', icon: 'Target', color: 'blue', order: 7,
        steps: [{ title: 'AI fetches real competitors', description: 'Pulls 25 recent awards from USASpending.gov for the same NAICS code' }, { title: 'Scoring matrix', description: '8 factors rated 1-10: NAICS match, set-aside, past performance, competition, pricing, timeline, capacity, agency' }, { title: 'Win probability + bid range', description: 'Specific win percentage and recommended price range based on historical awards' }],
        benefits: ['Names REAL competitor companies from USASpending data', 'Suggests specific bid pricing based on historical awards', 'Compares YOUR past wins against the competition', 'Saves $5,000+ vs hiring a BD consultant per bid decision'] },
      { slug: 'proposal-builder', title: 'AI Proposal Builder', subtitle: 'Generate a complete 7-section government proposal using your real data', icon: 'FileEdit', color: 'indigo', order: 8,
        steps: [{ title: 'Select opportunity', description: 'Choose from saved list or enter details — all contract data loads automatically' }, { title: 'AI generates 7 sections', description: 'Cover Letter, Executive Summary, Technical Approach, Management Plan, Past Performance, Pricing Strategy, Conclusion' }, { title: 'Export branded PDF', description: 'Choose from 6 color themes and download professional PDF' }],
        benefits: ['References your REAL past wins from USASpending', 'Pricing section cites actual historical award amounts', 'Professional formatting ready for submission', 'Saves $5,000-$20,000 vs hiring a proposal writer'] },
      { slug: 'go-no-go', title: 'Go/No-Go Decision', subtitle: '10-factor scoring matrix — select an opportunity and get a data-driven bid decision', icon: 'ThumbsUp', color: 'green', order: 9,
        steps: [{ title: 'Select from saved or feed', description: 'Choose any opportunity — all data loads automatically including SOW text' }, { title: 'AI analyzes 4 data sources', description: 'SAM.gov (full contract), USASpending (competitors), your company profile, your past wins' }, { title: '10-factor scoring → GO/NO-GO', description: 'Each factor scored 1-10 with evidence → Total X/100 → Clear recommendation with action plan' }],
        benefits: ['Decision backed by real competitive data', 'If GO: 5-step action plan with deadlines', 'If NO-GO: teaming alternatives and future opportunities', 'Saves weeks of manual research per bid decision'] },
      { slug: 'competitive-analysis', title: 'AI Competitive Analysis', subtitle: 'Know who your competitors are — real companies, real contract values, real win history', icon: 'Users', color: 'pink', order: 10,
        steps: [{ title: 'AI pulls real winners', description: 'USASpending data: actual companies that won in your NAICS, their contract counts, total values' }, { title: 'Competitor profiles', description: 'For each competitor: wins, dollar volume, agencies served, threat level' }, { title: 'SWOT analysis', description: 'Your strengths vs their strengths, market gaps, teaming recommendations' }],
        benefits: ['No guessing — real companies with real dollar amounts', 'Know exactly who you compete against before spending on a proposal', 'Pricing intelligence from actual market data', 'Teaming suggestions when you are outmatched'] },
      { slug: 'risk-assessment', title: 'AI Risk Assessment', subtitle: '7-category risk matrix with evidence from real contract and competitor data', icon: 'Shield', color: 'amber', order: 11,
        steps: [{ title: 'Analyzes the full SOW', description: 'AI reads the complete contract description and requirements' }, { title: '7 risk categories', description: 'Technical, Financial, Schedule, Competitive, Compliance, Performance, Protest — each rated LOW/MEDIUM/HIGH' }, { title: 'Evidence-based ratings', description: 'Every rating cites specific data: your past contract sizes, competitor dominance, timeline feasibility' }],
        benefits: ['Risks derived from real data, not generic templates', 'Financial risk compares contract value to your proven range', 'Compliance risk checks your actual certifications', 'GO/NO-GO recommendation based on overall risk profile'] },
      { slug: 'rfp-analyzer', title: 'RFP Analyzer', subtitle: 'Upload an RFP — AI extracts requirements, evaluation criteria, and compliance checklist', icon: 'ScanSearch', color: 'blue', order: 12,
        steps: [{ title: 'Select opportunity, paste, or upload PDF', description: 'Auto-load from saved opportunities, or paste/upload RFP text manually' }, { title: 'AI parses the full document', description: 'Extracts mandatory requirements, evaluation factors, deadlines, and certifications' }, { title: 'Compliance checklist', description: '15-20 specific items your proposal must address + GO/NO-GO recommendation' }],
        benefits: ['Never miss a mandatory requirement', 'Evaluation criteria with weights help you prioritize', 'Compliance checklist ensures your proposal is complete', 'Upload once — use the checklist throughout proposal writing'] },
      { slug: 'capability-statement', title: 'Capability Statement', subtitle: 'AI-generated professional one-pager — hand to any contracting officer', icon: 'Award', color: 'violet', order: 13,
        steps: [{ title: 'Enter company details', description: 'Certifications (8(a), WOSB, HUBZone, etc.), core competencies, past performance highlights' }, { title: 'AI generates one-pager', description: 'Professional format with NAICS codes, differentiators, contact info' }, { title: 'Export and share', description: 'Copy to clipboard or download as PDF — ready for industry days and agency meetings' }],
        benefits: ['Look like a large firm on paper', 'Professional formatting that contracting officers expect', 'Auto-includes your NAICS codes and certifications', 'Ready in seconds vs hours of manual formatting'] },
      { slug: 'sources-sought', title: 'Sources Sought Generator', subtitle: 'Respond to RFIs before the full RFP drops — 60-90 day head start', icon: 'Search', color: 'purple', order: 14,
        steps: [{ title: 'Select or enter opportunity', description: 'Auto-fill from saved Sources Sought notices or enter details manually' }, { title: 'AI generates 8-section response', description: 'Company ID, executive summary, capability narrative, past performance, technical approach, teaming strategy, questions, statement of interest' }, { title: 'Submit early', description: 'Get on the agency radar BEFORE competitors who wait for the RFP' }],
        benefits: ['Get known to the contracting officer 60-90 days before competitors', 'Influence the acquisition strategy in your favor', 'Demonstrate credibility before evaluation begins', '8 professionally formatted sections ready to submit'] },
      { slug: 'bid-pipeline', title: 'Bid Pipeline', subtitle: 'Kanban board — track every bid from discovery through win or loss', icon: 'Kanban', color: 'indigo', order: 15,
        steps: [{ title: 'Save opportunities to start tracking', description: 'Saving a contract creates a card in your pipeline' }, { title: 'Drag through stages', description: 'Saved → Researching → Drafting Proposal → Submitted → Won/Lost' }, { title: 'Track win rate', description: 'See your conversion: how many bids → how many wins' }],
        benefits: ['Visual overview of your entire bid pipeline', 'Win rate tracking shows your improvement over time', 'Notes per opportunity for team collaboration', 'Export pipeline as PDF/CSV for management reports'] },
      { slug: 'past-performance', title: 'Past Performance Repository', subtitle: 'Store your federal contracts — auto-format as SF-330 citations for proposals', icon: 'Award', color: 'amber', order: 16,
        steps: [{ title: 'Add your contracts', description: 'Title, agency, value, dates, NAICS, role (prime/sub), CPARS rating, POC details' }, { title: 'SF-330 auto-format', description: 'One click → your contract formatted as an SF-330 citation ready to paste' }, { title: 'AI uses your wins', description: 'Every AI feature automatically pulls your stored past performance' }],
        benefits: ['Stop re-entering past performance for every proposal', 'SF-330 formatted citations save hours per proposal', 'AI features become more accurate with your real history', 'Searchable by agency, NAICS, role, or contract type'] },
      { slug: 'teaming-finder', title: 'Teaming Partner Finder', subtitle: 'Find complementary businesses to team with on larger contracts', icon: 'Users', color: 'pink', order: 17,
        steps: [{ title: 'Search by NAICS & certifications', description: 'Find businesses with complementary codes and certs (8(a), WOSB, HUBZone, SDVOSB)' }, { title: 'View partner profiles', description: 'Company name, NAICS codes, certifications, and contact info' }, { title: 'Request teaming', description: 'Connect for joint ventures, mentor-protege, or prime/sub arrangements' }],
        benefits: ['Win contracts too large for your company alone', 'Fill capability gaps identified in Competitive Analysis', 'Meet set-aside requirements you don\'t qualify for individually', 'Go/No-Go suggests teaming when your score is low'] },
      { slug: 'managed-service', title: 'Managed Bidding Service', subtitle: 'We find, write, and submit bids for you — pay only when you WIN', icon: 'Trophy', color: 'green', order: 18,
        steps: [{ title: 'Apply for managed service', description: 'Sign up — our team reviews your company profile within 24-48 hours' }, { title: 'We handle everything', description: 'Our team identifies matching contracts, writes proposals, and submits bids' }, { title: 'Pay only on win', description: 'Commission-based: percentage of won contract value. No win = no fee' }, { title: 'Post-win delivery support', description: 'Subcontracting: vendor quotes, milestone tracking, delivery management' }],
        benefits: ['Zero upfront cost — commission only when you win', 'Professional proposal writing by GovCon experts', 'Full lifecycle: discovery → bid → win → delivery', 'Small businesses get enterprise-level BD support'] },
    ];

    const created = await FeatureShowcase.insertMany(defaults);
    res.json({ success: true, message: `Created ${created.length} feature showcase pages.`, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
