import mongoose from 'mongoose';

const adminResponseSchema = new mongoose.Schema({
  adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  adminName:  { type: String, default: 'Admin' },
  note:       { type: String, maxlength: 2000 },
  respondedAt:{ type: Date, default: Date.now },
}, { _id: false });

const suggestionSchema = new mongoose.Schema({
  suggestionNumber: { type: String, unique: true },

  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:    String,
  userEmail:   String,
  companyName: { type: String, default: '' },

  category: {
    type: String,
    enum: ['feature_request', 'improvement', 'bug_report', 'general'],
    default: 'general',
  },

  title:       { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 5000 },

  status: {
    type: String,
    enum: ['pending', 'under_review', 'in_progress', 'implemented', 'declined'],
    default: 'pending',
  },

  adminResponse: adminResponseSchema,

  upvotes: { type: Number, default: 0 },
}, { timestamps: true });

suggestionSchema.pre('save', async function (next) {
  if (!this.suggestionNumber) {
    const count = await mongoose.model('Suggestion').countDocuments();
    this.suggestionNumber = `SUG-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('Suggestion', suggestionSchema);
