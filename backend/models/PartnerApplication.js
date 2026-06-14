import mongoose from 'mongoose';

const partnerApplicationSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, trim: true, lowercase: true },
  phone:       { type: String, trim: true, default: '' },
  country:     { type: String, trim: true, default: '' },
  experience:  { type: String, trim: true, default: '' }, // years / background
  channels:    [{ type: String }],                         // how they plan to refer
  motivation:  { type: String, required: true, trim: true },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:   { type: String, default: '' },
  processedAt: { type: Date },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  // Populated after approval
  createdAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true });

export default mongoose.model('PartnerApplication', partnerApplicationSchema);
