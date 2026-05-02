// backend/models/AlertNotification.js
import mongoose from 'mongoose';

const alertNotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  alert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
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
  matchReasons: [{
    type: String
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  emailSent: {
  type: Boolean,
  default: false
},
emailSentAt: {
  type: Date,
  default: null
},
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

alertNotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
alertNotificationSchema.index({ alert: 1 });
alertNotificationSchema.index({ opportunity: 1 });

const AlertNotification = mongoose.model('AlertNotification', alertNotificationSchema);
export default AlertNotification;