// backend/config/aiCredits.js
// Central config for AI credit system.
// Credits are deducted per AI feature call; reset monthly per billing cycle.

// ── Monthly credit allocation per plan ────────────────────────────────────────
// Each AI call = 15 credits, so allocations reflect realistic usage
export const PLAN_AI_CREDITS = {
  trial:       30,    // 2 AI calls to try
  free:         0,    // no AI access
  starter:    150,    // ~10 AI calls/month
  pro:        600,    // ~40 AI calls/month
  enterprise: 3000,   // ~200 AI calls/month
  expired:      0,
};

// ── Credits consumed per feature call ────────────────────────────────────────
// All Claude API features = 15 credits per request (covers API cost)
// GPT-based features (if any) = 10 credits per request
export const FEATURE_COSTS = {
  // Claude Sonnet 4.6 features (15 credits — Claude API)
  summarize:            15,
  ask_question:         15,
  capability_statement: 15,
  sources_sought:       15,
  past_performance:     15,
  analyze_attachment:   15,
  market_research:      15,

  // Claude Opus 4.8 features (15 credits — Claude API)
  bid_analysis:         15,
  risk_assessment:      15,
  competitive_analysis: 15,
  rfp_analyzer:         15,
  incumbent:            15,
  ai_predictions:       15,
  full_proposal:        15,
  go_no_go:             15,
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
