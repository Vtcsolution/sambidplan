// models/SavedOpportunity.js
import mongoose from 'mongoose';

const savedOpportunitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity',
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['saved', 'applied', 'won', 'lost'],
    default: 'saved'
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one user can save same opportunity only once
savedOpportunitySchema.index({ user: 1, opportunity: 1 }, { unique: true });

const SavedOpportunity = mongoose.model('SavedOpportunity', savedOpportunitySchema);
export default SavedOpportunity;