import mongoose from 'mongoose';

// Packages for Starter / Trial plans
export const STARTER_PACKAGES = {
  spark_25:  { id: 'spark_25',  credits: 25,  price: 4.99,  label: 'Spark Pack',  popular: false },
  boost_75:  { id: 'boost_75',  credits: 75,  price: 11.99, label: 'Boost Pack',  popular: true  },
  power_200: { id: 'power_200', credits: 200, price: 24.99, label: 'Power Pack',  popular: false },
};

// Packages for Pro / Enterprise plans
export const PRO_PACKAGES = {
  pro_200:  { id: 'pro_200',  credits: 200,  price: 29, label: 'Standard Pack', popular: false },
  pro_400:  { id: 'pro_400',  credits: 400,  price: 49, label: 'Growth Pack',   popular: true  },
  pro_1000: { id: 'pro_1000', credits: 1000, price: 99, label: 'Power Pack',    popular: false },
};

export const CREDIT_PACKAGES = { ...STARTER_PACKAGES, ...PRO_PACKAGES };

const creditPurchaseSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  feature:         { type: String, default: 'general' },
  packageId:       { type: String, required: true },
  credits:         { type: Number, required: true },
  price:           { type: Number, required: true },
  status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  paypalOrderId:   { type: String, default: null },
  paypalCaptureId: { type: String, default: null },
  adminNote:       { type: String, default: '' },
  approvedAt:      { type: Date,   default: null },
  rejectedAt:      { type: Date,   default: null },
}, { timestamps: true });

export default mongoose.model('CreditPurchase', creditPurchaseSchema);
