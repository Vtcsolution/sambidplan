import mongoose from 'mongoose';

const NaicsEntrySchema = new mongoose.Schema({
  code:        { type: String },
  description: { type: String },
  isPrimary:   { type: Boolean, default: false },
}, { _id: false });

const AddressSchema = new mongoose.Schema({
  addressLine1:        { type: String },
  addressLine2:        { type: String },
  city:                { type: String },
  stateOrProvinceCode: { type: String, index: true },
  zipCode:             { type: String },
  countryCode:         { type: String, default: 'USA' },
}, { _id: false });

const SamCompanySchema = new mongoose.Schema({
  ueiSAM:                   { type: String, unique: true, required: true, index: true },
  cageCode:                 { type: String, index: true },
  legalBusinessName:        { type: String, index: true },
  dbaName:                  { type: String },
  registrationStatus:       { type: String, default: 'Active' },
  purposeOfRegistration:    { type: String },
  registrationDate:         { type: Date },
  lastUpdateDate:           { type: Date },
  registrationExpirationDate: { type: Date },

  physicalAddress:          { type: AddressSchema },
  mailingAddress:           { type: AddressSchema },

  naicsCodes:               { type: [NaicsEntrySchema], default: [] },
  primaryNaics:             { type: String, index: true },

  entityType:               { type: String },
  entityStructure:          { type: String },
  businessTypes:            { type: [String], default: [] },
  sbaBusinessTypes:         { type: [String], default: [] },

  contactEmail:             { type: String },
  allEmails:                { type: [String], default: [] },
  contactPhone:             { type: String },
  allPhones:                { type: [String], default: [] },
  contactName:              { type: String },
  website:                  { type: String },
  stateOfIncorporation:     { type: String },
  countryOfIncorporation:   { type: String },

  lastFetched:              { type: Date, default: Date.now, index: true },
  firstSeenAt:              { type: Date, default: Date.now, index: true },

  // ── Multi-source tracking ───────────────────────────────────────────────
  sources: [{
    name:          { type: String },  // 'sam' | 'usaspending' | 'fpds' | 'sba'
    lastFetchedAt: { type: Date },
    _id: false,
  }],
  priority:          { type: String, enum: ['high', 'medium', 'low'], default: 'low', index: true },
  totalContractsWon: { type: Number, default: 0 },
  totalAwardAmount:  { type: Number, default: 0 },
}, { timestamps: true });

SamCompanySchema.index(
  { legalBusinessName: 'text', dbaName: 'text', 'physicalAddress.city': 'text' },
  { name: 'company_text_search' }
);

const SamCompany = mongoose.model('SamCompany', SamCompanySchema);
export default SamCompany;
