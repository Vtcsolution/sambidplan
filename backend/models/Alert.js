// backend/models/Alert.js
import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  naicsCodes: [{
    type: String
  }],
  keywords: [{
    type: String
  }],
  agencies: [{
    type: String
  }],
  minValue: {
    type: Number,
    default: 0
  },
  maxValue: {
    type: Number,
    default: null
  },
  matchScore: {
    type: Number,
    default: 50
  },
  frequency: {
    type: String,
    enum: ['realtime', 'daily', 'weekly'],
    default: 'realtime'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastNotifiedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Alert = mongoose.model('Alert', alertSchema);
export default Alert;