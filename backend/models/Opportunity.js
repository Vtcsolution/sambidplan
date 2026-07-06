// models/Opportunity.js
import mongoose from 'mongoose';

const opportunitySchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['sam', 'usaspending', 'sled', 'manual'],
    required: true
  },
  sourceId: {
    type: String,
    required: true,
    unique: true
  },
  fetchSource: {
    type: String,
    enum: ['api', 'bulk', 'keyword'],
    default: 'api',
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  agency: {
    type: String,
    required: true
  },
  estimatedValue: {
    type: Number,
    default: null
  },
  postedDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    default: null
  },
  naicsCode: {
    type: String,
    required: true
  },
  pscCode: {
    type: String
  },
  setAside: {
    type: String
  },
  placeOfPerformance: {
    streetAddress: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    congressionalDistrict: String,
    county: String
  },
  contactInfo: {
    name: String,
    email: String,
    phone: String
  },
  url: {
    type: String,
    required: true
  },
  extractedKeywords: [String],
  aiSummary: {
    type: String
  },
  resourceLinks: [{
    url:  { type: String },
    name: { type: String },
    size: { type: String },
    type: { type: String },
  }],
  lastFetched: {
    type: Date,
    default: Date.now
  },

  // ── Extended fields from SAM.gov ──────────────────────────────
  noticeId:   { type: String, default: '' }, // SAM.gov UUID — used for direct links and resource fetching
  noticeType: { type: String, default: '' },
  archiveDate: { type: Date, default: null },
  archiveType: { type: String, default: '' },
  modifiedDate: { type: Date, default: null },
  department: { type: String, default: '' },
  subTier: { type: String, default: '' },
  office: { type: String, default: '' },
  officeAddress: {
    streetAddress: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  naicsDescription: { type: String, default: '' },
  pscDescription: { type: String, default: '' },
  additionalInfoLink: { type: String, default: '' },
  organizationType: { type: String, default: '' },
  relatedNotice: { type: String, default: '' },
  majorCommand: { type: String, default: '' },
  subCommand1:  { type: String, default: '' },
  subCommand2:  { type: String, default: '' },
  subCommand3:  { type: String, default: '' },

  // NAICS codes suggested by keyword-search matching (catches wrong-NAICS opportunities)
  suggestedNaics: [{ type: String }],

  // Award details
  award: {
    date: { type: Date, default: null },
    number: { type: String, default: '' },
    amount: { type: Number, default: null },
    awardee: {
      name: { type: String, default: '' },
      uei: { type: String, default: '' },
      cageCode: { type: String, default: '' },
      duns: { type: String, default: '' },
      location: {
        streetAddress: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        congressionalDistrict: String
      }
    }
  },

  // Performance period
  performancePeriod: {
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null }
  },

  // Multiple points of contact
  pointOfContacts: [{
    type: { type: String },
    fullName: String,
    title: String,
    email: String,
    phone: String,
    fax: String
  }],

  // Cached PDF text — populated when any AI feature successfully reads the attachments.
  // Reused by all subsequent AI calls so SAM.gov is not hit again.
  docCache: {
    text:       { type: String, default: '' },
    fetchedAt:  { type: Date,   default: null },
    docsRead:   { type: Number, default: 0 },
    totalDocs:  { type: Number, default: 0 },
  }
});

// Indexes for fast searching
opportunitySchema.index({ naicsCode: 1, dueDate: 1 });
opportunitySchema.index({ suggestedNaics: 1 });
opportunitySchema.index({ title: 'text', description: 'text' });
opportunitySchema.index({ agency: 1 });
opportunitySchema.index({ estimatedValue: 1 });
opportunitySchema.index({ source: 1, postedDate: -1 });

const Opportunity = mongoose.model('Opportunity', opportunitySchema);
export default Opportunity;