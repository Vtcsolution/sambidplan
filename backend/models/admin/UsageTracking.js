// backend/models/UsageTracking.js
import mongoose from 'mongoose';

const usageTrackingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  apiRequests: {
    type: Number,
    default: 0
  },
  opportunitiesFetched: {
    type: Number,
    default: 0
  },
  aiGenerations: {
    type: Number,
    default: 0
  },
  remainingRequests: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
usageTrackingSchema.index({ user: 1, date: 1 });

const UsageTracking = mongoose.model('UsageTracking', usageTrackingSchema);
export default UsageTracking;