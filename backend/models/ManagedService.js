import mongoose from 'mongoose';

const tierSchema = new mongoose.Schema({
  label:    { type: String, default: '' },
  minValue: { type: Number, required: true },
  maxValue: { type: Number, default: null }, // null = unlimited
  rate:     { type: Number, required: true }, // percentage e.g. 5 = 5%
}, { _id: false });

const managedServiceSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
  owner:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },

  status: { type: String, enum: ['pending', 'active', 'paused', 'cancelled'], default: 'pending' },

  // Commission config — admin sets this per company or uses global defaults
  monthlyFee:        { type: Number, default: 299 },
  defaultRate:       { type: Number, default: 5 },    // flat % if no tiers
  commissionCap:     { type: Number, default: 50000 }, // max $ per contract
  useTiers:          { type: Boolean, default: false },
  tiers:             [tierSchema],

  // Agreement
  agreementSignedAt: { type: Date },
  notes:             { type: String, default: '' },

  // Stats (denormalised for quick reads)
  totalBids:    { type: Number, default: 0 },
  totalWon:     { type: Number, default: 0 },
  totalEarned:  { type: Number, default: 0 }, // total commission collected
}, { timestamps: true });

managedServiceSchema.index({ owner: 1 });
managedServiceSchema.index({ status: 1 });

export default mongoose.model('ManagedService', managedServiceSchema);
