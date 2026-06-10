import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['free', 'starter', 'pro', 'enterprise']
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priceMonthly: {
    type: Number,
    required: true
  },
  priceYearly: {
    type: Number,
    required: true
  },
  features: [{
    name: String,
    included: Boolean
  }],
  limits: {
    maxSavedOpportunities: { type: Number, default: 10 },
    maxAlerts: { type: Number, default: 5 },
    aiProposals: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-defined plans
const defaultPlans = [
  {
    name: 'free',
    displayName: 'Free',
    description: 'Perfect for getting started',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { name: '5 Alerts per month', included: true },
      { name: 'Basic contract search', included: true },
      { name: 'Email notifications', included: true },
      { name: 'Save up to 10 opportunities', included: true },
      { name: 'Basic match scoring', included: true },
      { name: 'AI proposal generation', included: false },
      { name: 'Priority support', included: false },
      { name: 'API access', included: false }
    ],
    limits: {
      maxSavedOpportunities: 10,
      maxAlerts: 5,
      aiProposals: false,
      prioritySupport: false,
      apiAccess: false
    },
    order: 1
  },
  {
    name: 'starter',
    displayName: 'Starter',
    description: 'For growing contractors',
    priceMonthly: 29,
    priceYearly: 278,   // 20% off ($29×12=$348 → $278)
    features: [
      { name: '50 Alerts per month', included: true },
      { name: 'Advanced contract search', included: true },
      { name: 'Email + SMS notifications', included: true },
      { name: 'Save up to 100 opportunities', included: true },
      { name: 'Advanced AI matching', included: true },
      { name: 'AI proposal generation', included: false },
      { name: 'Priority email support', included: true },
      { name: 'API access', included: false }
    ],
    limits: {
      maxSavedOpportunities: 100,
      maxAlerts: 50,
      aiProposals: false,
      prioritySupport: true,
      apiAccess: false
    },
    order: 2
  },
  {
    name: 'pro',
    displayName: 'Pro',
    description: 'For established federal contractors',
    priceMonthly: 79,
    priceYearly: 758,   // 20% off ($79×12=$948 → $758)
    features: [
      { name: 'Unlimited alerts', included: true },
      { name: 'Real-time tracking', included: true },
      { name: 'All notification channels', included: true },
      { name: 'Unlimited saved opportunities', included: true },
      { name: 'Premium AI matching', included: true },
      { name: 'AI proposal generation', included: true },
      { name: '24/7 Priority support', included: true },
      { name: 'Full API access', included: true }
    ],
    limits: {
      maxSavedOpportunities: -1,
      maxAlerts: -1,
      aiProposals: true,
      prioritySupport: true,
      apiAccess: true
    },
    order: 3
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'For large organizations',
    priceMonthly: 499,
    priceYearly: 4788,  // 20% off ($499×12=$5,988 → $4,788 ≈ $399/mo)
    features: [
      { name: 'Unlimited alerts', included: true },
      { name: 'Real-time tracking', included: true },
      { name: 'All notification channels', included: true },
      { name: 'Unlimited saved opportunities', included: true },
      { name: 'Premium AI matching', included: true },
      { name: 'AI proposal generation', included: true },
      { name: '24/7 Priority support', included: true },
      { name: 'Full API access', included: true },
      { name: 'Dedicated account manager', included: true },
      { name: 'Custom integration', included: true }
    ],
    limits: {
      maxSavedOpportunities: -1,
      maxAlerts: -1,
      aiProposals: true,
      prioritySupport: true,
      apiAccess: true
    },
    order: 4
  }
];

let _initialized = false;

// Single source of truth for plan init + price/feature sync.
// Runs at most once per server process (flag prevents repeated DB writes).
export const initializePlans = async () => {
  if (_initialized) return;
  _initialized = true;

  const Plan = mongoose.model('Plan');
  const count = await Plan.countDocuments();
  if (count === 0) {
    await Plan.insertMany(defaultPlans);
    console.log('✅ Default plans created');
  } else {
    // Insert any missing plans; preserve prices already set by admin (only set on insert)
    for (const def of defaultPlans) {
      const exists = await Plan.findOne({ name: def.name });
      if (!exists) {
        await Plan.create(def);
        console.log(`✅ Created missing plan: ${def.name}`);
      }
    }
    console.log('✅ Plans checked (existing prices preserved, missing plans inserted)');
  }
};

const Plan = mongoose.model('Plan', planSchema);
export default Plan;