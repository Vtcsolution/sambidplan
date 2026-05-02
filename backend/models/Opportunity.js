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
    required: true
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
    city: String,
    state: String,
    zipCode: String
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
  lastFetched: {
    type: Date,
    default: Date.now
  }
});

// Indexes for fast searching
opportunitySchema.index({ naicsCode: 1, dueDate: 1 });
opportunitySchema.index({ title: 'text', description: 'text' });
opportunitySchema.index({ agency: 1 });
opportunitySchema.index({ estimatedValue: 1 });

const Opportunity = mongoose.model('Opportunity', opportunitySchema);
export default Opportunity;