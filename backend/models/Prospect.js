// backend/models/Prospect.js
import mongoose from 'mongoose';

const ProspectSchema = new mongoose.Schema({
  // Identity
  companyName:        { type: String, required: true, index: true },
  uei:                { type: String, index: true, sparse: true },
  cageCode:           { type: String, index: true, sparse: true },

  // Website
  website:            { type: String, index: true, sparse: true },
  rawWebsite:         { type: String },
  allWebsites:        { type: [String], default: [] },
  websiteStatus:      { type: String, enum: ['active','inactive','unknown'], default: 'unknown' },
  websiteSource:      { type: String, enum: ['sam','sba','cage','usaspending','search',''], default: '' },
  websiteHttpStatus:  { type: Number },

  // Email
  primaryEmail:       { type: String, index: true, sparse: true },
  allEmails:          { type: [String], default: [] },
  emailSource:        { type: String, enum: ['sam','website','sba','cage',''], default: '' },
  emailVerified:      { type: Boolean, default: false },
  isGovEmail:         { type: Boolean, default: false },
  isDisposableEmail:  { type: Boolean, default: false },

  // Phone
  primaryPhone:       { type: String, index: true, sparse: true },
  allPhones:          { type: [String], default: [] },
  rawPhone:           { type: String },
  phoneSource:        { type: String, enum: ['sam','website','sba','cage',''], default: '' },

  // Contact person
  contactPersonName:  { type: String },
  contactPersonTitle: { type: String },

  // Business
  naicsCode:          { type: String, index: true },
  naicsDescription:   { type: String },
  state:              { type: String, index: true },
  city:               { type: String },
  zipCode:            { type: String },

  // Contract history
  totalContractsWon:  { type: Number, default: 0 },
  totalAwardAmount:   { type: Number, default: 0, index: true },
  lastContractDate:   { type: Date },
  firstContractDate:  { type: Date },
  agenciesWorkedWith: { type: [String], default: [] },
  contractTypes:      { type: [String], default: [] },

  // Partial-contact flags
  emailOnly:    { type: Boolean, default: false, index: true },
  phoneOnly:    { type: Boolean, default: false, index: true },
  websiteOnly:  { type: Boolean, default: false, index: true },

  // Priority (recomputed on save)
  priority: { type: String, enum: ['high','medium','low'], default: 'low', index: true },

  // CRM
  contacted:      { type: Boolean, default: false, index: true },
  contactedDate:  { type: Date },
  contactedBy:    { type: String },
  responseStatus: {
    type: String,
    enum: ['none','replied','interested','notInterested','converted'],
    default: 'none', index: true,
  },
  notes: { type: String },

  // Small business flag
  isSmallBusiness: { type: Boolean, default: false, index: true },

  // Source tracking
  dataSource: { type: [String], default: [], index: true },

  // Enrichment tracking (Phase 2 uses DB as checkpoint)
  enrichmentAttempted:   { type: Boolean, default: false, index: true },
  enrichmentAttemptedAt: { type: Date },

  // Email outreach history
  emailHistory: [{
    templateId:   { type: String },
    templateName: { type: String },
    subject:      { type: String },
    sentAt:       { type: Date, default: Date.now },
    sentBy:       { type: String },
    // Per-email tracking
    trackingId:   { type: String, index: true },
    openedAt:     { type: Date },
    openCount:    { type: Number, default: 0 },
    clickedAt:    { type: Date },
    clickCount:   { type: Number, default: 0 },
    _id: false,
  }],
}, { timestamps: true });

ProspectSchema.index({ priority: 1, totalAwardAmount: -1 });
ProspectSchema.index({ state: 1, naicsCode: 1 });
ProspectSchema.index({ contacted: 1, responseStatus: 1 });
ProspectSchema.index(
  { companyName: 'text', primaryEmail: 'text', contactPersonName: 'text' },
  { name: 'prospect_text_search' }
);

ProspectSchema.pre('save', function (next) {
  this.priority = this.totalAwardAmount >= 500_000 ? 'high'
    : this.totalAwardAmount >= 50_000 ? 'medium' : 'low';
  next();
});

const Prospect = mongoose.model('Prospect', ProspectSchema);
export default Prospect;
