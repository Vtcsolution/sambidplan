// backend/models/AdminSetting.js
import mongoose from 'mongoose';

const adminSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  group: {
    type: String,
    enum: ['general', 'email', 'payment', 'api', 'limits', 'notifications'],
    default: 'general'
  },
  description: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const AdminSetting = mongoose.model('AdminSetting', adminSettingSchema);
export default AdminSetting;