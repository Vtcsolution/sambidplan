import mongoose from 'mongoose';

const campaignLogSchema = new mongoose.Schema({
  segment:    { type: String, required: true },
  subject:    { type: String, required: true },
  bodyPreview:{ type: String, default: '' },       // first 200 chars of body
  fromName:   { type: String, default: 'Sambid Notify' },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  targetEmail:  { type: String, default: null },   // when single-user send
  totalUsers:      { type: Number, default: 0 },
  sent:            { type: Number, default: 0 },
  failed:          { type: Number, default: 0 },
  recipients:      [{ name: String, email: String, delivered: Boolean }],
  failedEmails:    [{ type: String }],
  status:     { type: String, enum: ['success', 'partial', 'failed'], default: 'success' },
}, { timestamps: true });

export default mongoose.model('CampaignLog', campaignLogSchema);
