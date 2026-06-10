import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  originalName: String,
  mimeType:     String,
  size:         Number,
  data:         String, // base64
}, { _id: false });

const messageSchema = new mongoose.Schema({
  senderType:  { type: String, enum: ['user', 'admin'], required: true },
  senderName:  { type: String, default: 'Support' },
  senderRole:  { type: String, default: '' },          // admin role when senderType === 'admin'
  senderId:    { type: mongoose.Schema.Types.ObjectId },
  content:     { type: String, required: true },
  attachments: [attachmentSchema],
  createdAt:   { type: Date, default: Date.now },
}, { _id: true });

// Each admin who has ever replied to this ticket
const handlerSchema = new mongoose.Schema({
  adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  adminName:  String,
  adminRole:  String,
  adminEmail: String,
  firstReplyAt: { type: Date, default: Date.now },
  lastReplyAt:  { type: Date, default: Date.now },
  replyCount:   { type: Number, default: 1 },
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:     String,
  userEmail:    String,

  subject:     { type: String, required: true, trim: true, maxlength: 200 },
  category:    { type: String, enum: ['billing', 'technical', 'account', 'general', 'feature_request'], default: 'general' },
  priority:    { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  description: { type: String, required: true, maxlength: 5000 },

  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'],
    default: 'open',
  },

  // Who is currently handling this ticket (last admin to reply)
  assignedTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  assignedToName: { type: String, default: '' },
  assignedToRole: { type: String, default: '' },

  // Full history of every admin who handled this ticket
  handlers: [handlerSchema],

  attachments: [attachmentSchema],
  messages:    [messageSchema],

  resolvedAt: Date,
  closedAt:   Date,
}, { timestamps: true });

ticketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `TKT-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model('Ticket', ticketSchema);
