import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const companyDocumentSchema = new mongoose.Schema({
  company:      { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:         { type: String, required: true, trim: true },
  description:  { type: String, trim: true, default: '' },
  category: {
    type: String,
    enum: ['proposal','past_performance','capability','template','compliance','sow','other'],
    default: 'other',
  },
  tags:          [{ type: String }],
  filename:      { type: String, required: true },
  originalName:  { type: String, required: true },
  url:           { type: String, required: true },
  size:          { type: Number, default: 0 },
  mimeType:      { type: String, default: '' },
  uploadedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comments:      [commentSchema],
  downloadCount: { type: Number, default: 0 },
}, { timestamps: true });

companyDocumentSchema.index({ company: 1, category: 1 });
companyDocumentSchema.index({ company: 1, createdAt: -1 });

export default mongoose.model('CompanyDocument', companyDocumentSchema);
