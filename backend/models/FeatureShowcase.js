import mongoose from 'mongoose';

const featureShowcaseSchema = new mongoose.Schema({
  slug:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  title:    { type: String, required: true, trim: true },
  subtitle: { type: String, default: '', trim: true },
  videoUrl:     { type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  steps: [{
    title:       { type: String },
    description: { type: String },
    videoUrl:    { type: String, default: '' },
    imageUrl:    { type: String, default: '' },
  }],
  benefits: [{ type: String }],
  ctaText:  { type: String, default: 'Try It Free' },
  ctaLink:  { type: String, default: '/signup' },
  isActive: { type: Boolean, default: true },
  order:    { type: Number, default: 0 },
  icon:     { type: String, default: 'FileText' },
  color:    { type: String, default: 'indigo' },
}, { timestamps: true });

featureShowcaseSchema.index({ isActive: 1, order: 1 });

export default mongoose.model('FeatureShowcase', featureShowcaseSchema);
