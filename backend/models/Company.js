import mongoose from 'mongoose';

// Pages a workspace user may be granted access to
export const WORKSPACE_PAGE_KEYS = [
  'dashboard','opportunities','saved','bid-pipeline','calendar','alerts',
  'winning-bids','referral',
  'proposal-builder','rfp-analyzer','go-no-go','teaming-finder',
  'contract-vehicles','market-research','past-performance','sources-sought',
  'ai-predictions','capability-statement',
  'company-profile','company-team','company-documents',
  'company-managed-service',
];

const workspaceUserSchema = new mongoose.Schema({
  username:     { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  displayName:  { type: String, trim: true, default: '' },
  allowedPages: [{ type: String, enum: WORKSPACE_PAGE_KEYS }],
  isActive:     { type: Boolean, default: true },
  createdAt:    { type: Date, default: Date.now },
}, { _id: true });

const memberSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:          { type: String, enum: ['owner','admin','capture_manager','proposal_writer','reviewer','member'], default: 'member' },
  inviteStatus:  { type: String, enum: ['pending','accepted','declined'], default: 'accepted' },
  inviteToken:   { type: String, select: false },
  inviteEmail:   { type: String },
  invitedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  joinedAt:      { type: Date, default: Date.now },
}, { _id: true });

const certSchema = new mongoose.Schema({
  type:      { type: String, enum: ['8a','wosb','edwosb','hubzone','sdvosb','vosb','sdb','other'] },
  name:      { type: String },
  expiresAt: { type: Date },
}, { _id: false });

const companySchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  uei:          { type: String, trim: true, uppercase: true, default: '' },
  cage:         { type: String, trim: true, uppercase: true, default: '' },
  ueiVerified:  { type: Boolean, default: false },
  ueiVerifiedAt:{ type: Date },
  ueiData: {
    legalBusinessName:    { type: String },
    physicalAddress:      { type: String },
    entityType:           { type: String },
    registrationStatus:   { type: String },
    expirationDate:       { type: String },
    purposeOfRegistration:{ type: String },
  },
  website:  { type: String, trim: true, default: '' },
  phone:    { type: String, trim: true, default: '' },
  address: {
    street: { type: String, default: '' },
    city:   { type: String, default: '' },
    state:  { type: String, default: '' },
    zip:    { type: String, default: '' },
  },
  naicsCodes:     [{ type: String }],
  certifications: [certSchema],
  capabilities:   { type: String, trim: true, default: '' },
  owner:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:        [memberSchema],
  workspaceUsers: [workspaceUserSchema],
}, { timestamps: true });

companySchema.index({ owner: 1 });
companySchema.index({ 'members.user': 1 });
companySchema.index({ uei: 1 }, { sparse: true });
companySchema.index({ 'members.inviteToken': 1 }, { sparse: true });

export default mongoose.model('Company', companySchema);
