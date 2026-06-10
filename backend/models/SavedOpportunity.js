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
    enum: ['saved', 'researching', 'proposal_draft', 'submitted', 'won', 'lost'],
    default: 'saved'
  },
  pipelineNotes: {
    type: String,
    default: ''
  },
  movedAt: {
    type: Date,
    default: Date.now
  },
  savedAt: {
    type: Date,
    default: Date.now
  },
  deadlineReminderSent: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Ensure one user can save same opportunity only once
savedOpportunitySchema.index({ user: 1, opportunity: 1 }, { unique: true });

const SavedOpportunity = mongoose.model('SavedOpportunity', savedOpportunitySchema);
export default SavedOpportunity;