import mongoose from 'mongoose';

const pageMediaSchema = new mongoose.Schema({
  page:         { type: String, required: true, enum: ['home', 'features'] },
  slot:         { type: String, required: true },
  type:         { type: String, required: true, enum: ['video', 'image'] },
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  url:          { type: String, required: true },
  size:         { type: Number, default: 0 },
}, { timestamps: true });

// One record per page+slot+type combination
pageMediaSchema.index({ page: 1, slot: 1, type: 1 }, { unique: true });

export default mongoose.model('PageMedia', pageMediaSchema);
