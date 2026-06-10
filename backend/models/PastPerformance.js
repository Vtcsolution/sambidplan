import mongoose from 'mongoose';

const pastPerformanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // ── Core identification ────────────────────────────────────────────────────
  projectTitle:     { type: String, required: true, trim: true },
  contractNumber:   { type: String, trim: true },
  taskOrderNumber:  { type: String, trim: true },
  contractType: {
    type: String,
    enum: ['FFP', 'T&M', 'Cost-Plus', 'IDIQ', 'BPA', 'CPFF', 'CPAF', 'Other'],
    default: 'FFP',
  },

  // ── Customer ───────────────────────────────────────────────────────────────
  agencyName:   { type: String, required: true, trim: true },
  subAgency:    { type: String, trim: true },
  officeName:   { type: String, trim: true },

  // ── Role ──────────────────────────────────────────────────────────────────
  role: {
    type: String,
    enum: ['Prime', 'Subcontractor', 'Teaming Partner'],
    default: 'Prime',
  },
  primeContractorName: { type: String, trim: true }, // only when role = Subcontractor

  // ── Financials ─────────────────────────────────────────────────────────────
  originalValue: { type: Number, default: 0 },
  finalValue:    { type: Number, default: 0 },

  // ── Period of performance ──────────────────────────────────────────────────
  startDate: { type: Date },
  endDate:   { type: Date },

  // ── Classification ─────────────────────────────────────────────────────────
  naicsCode:          { type: String },
  setAside:           { type: String },
  placeOfPerformance: { type: String },

  // ── Scope ──────────────────────────────────────────────────────────────────
  scopeSummary:     { type: String, required: true }, // 2–4 sentence executive summary
  keyDeliverables:  [{ type: String }],
  technologiesUsed: [{ type: String }],

  // ── Performance rating ─────────────────────────────────────────────────────
  cparsRating: {
    type: String,
    enum: ['Exceptional', 'Very Good', 'Satisfactory', 'Marginal', 'Unsatisfactory', 'Not Rated'],
    default: 'Not Rated',
  },

  // ── Point of contact ───────────────────────────────────────────────────────
  pocName:  { type: String, trim: true },
  pocTitle: { type: String, trim: true },
  pocEmail: { type: String, trim: true, lowercase: true },
  pocPhone: { type: String, trim: true },

  // ── Key personnel ──────────────────────────────────────────────────────────
  keyPersonnel: [{
    name:      { type: String },
    title:     { type: String },
    clearance: { type: String },
    _id: false,
  }],

  // ── Usage tracking ─────────────────────────────────────────────────────────
  usedInProposals: { type: Number, default: 0 },
  lastUsedAt:      { type: Date },

  // ── Tags ───────────────────────────────────────────────────────────────────
  tags: [{ type: String }],

}, { timestamps: true });

pastPerformanceSchema.index({ user: 1, createdAt: -1 });
pastPerformanceSchema.index({ user: 1, agencyName: 1 });
pastPerformanceSchema.index({ user: 1, naicsCode: 1 });

const PastPerformance = mongoose.model('PastPerformance', pastPerformanceSchema);
export default PastPerformance;
