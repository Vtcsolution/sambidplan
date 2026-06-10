// backend/models/UserOpportunity.js
// Per-user opportunity store. Populated daily from the master Opportunity collection
// based on the user's NAICS codes and plan limits.
import mongoose from 'mongoose';

const userOpportunitySchema = new mongoose.Schema({
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
  matchScore: {
    type: Number,
    default: 0
  },
  matchReasons: [String],
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  isViewed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// One opportunity per user — no duplicates
userOpportunitySchema.index({ user: 1, opportunity: 1 }, { unique: true });
userOpportunitySchema.index({ user: 1, fetchedAt: -1 });
userOpportunitySchema.index({ user: 1, matchScore: -1 });

const UserOpportunity = mongoose.model('UserOpportunity', userOpportunitySchema);
export default UserOpportunity;
