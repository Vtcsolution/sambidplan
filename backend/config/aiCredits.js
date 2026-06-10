// backend/config/aiCredits.js
// Central config for AI credit system.
// Credits are deducted per AI feature call; reset monthly per billing cycle.

// ── Monthly credit allocation per plan ────────────────────────────────────────
// 10% of each plan's monthly opportunity fetch limit
// starter: 500 opps → 50 | pro: 3000 opps → 300 | enterprise: unlimited → 1000 cap
export const PLAN_AI_CREDITS = {
  trial:       10,   // small demo allocation
  free:         0,   // no AI access
  starter:     50,   // 10% of 500
  pro:        300,   // 10% of 3000
  enterprise: 1000,  // 10% of ~10,000 effective cap
  expired:      0,
};

// ── Credits consumed per feature call ────────────────────────────────────────
export const FEATURE_COSTS = {
  // Light (1–2 credits)
  summarize:            1,
  ask_question:         1,
  bid_analysis:         2,
  risk_assessment:      2,
  go_no_go:             2,
  past_performance:     2,
  analyze_attachment:   2,

  // Medium (3 credits)
  capability_statement: 3,
  rfp_analyzer:         3,
  sources_sought:       3,
  competitive_analysis: 3,
  incumbent:            3,

  // Heavy (5 credits)
  full_proposal:        5,
  ai_predictions:       5,

  // Very heavy (10 credits)
  market_research:      10,
};

// Human-readable label for each feature (used in error messages)
export const FEATURE_LABELS = {
  summarize:            'AI Summarize',
  ask_question:         'Ask a Question',
  bid_analysis:         'Bid Analysis',
  risk_assessment:      'Risk Assessment',
  go_no_go:             'Go/No-Go Analysis',
  past_performance:     'Past Performance',
  analyze_attachment:   'Attachment Analysis',
  capability_statement: 'Capability Statement',
  rfp_analyzer:         'RFP Analyzer',
  sources_sought:       'Sources Sought Generator',
  competitive_analysis: 'Competitive Analysis',
  incumbent:            'Incumbent Intelligence',
  full_proposal:        'Full Proposal Generator',
  ai_predictions:       'AI Contract Predictions',
  market_research:      'Market Research Report',
};
