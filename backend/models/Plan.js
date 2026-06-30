import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
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
  aiCreditsPerMonth: {
    type: Number,
    default: 0
  },
  opportunitiesPerMonth: {
    type: Number,
    default: 0
  },
  dailyLimit: {
    type: Number,
    default: 0
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

// Pre-defined plans — features & descriptions sync to DB on every server start.
// Prices are only set on first insert (admin may customise them via the panel).
const defaultPlans = [
  {
    name: 'free',
    displayName: 'Free Trial',
    description: '7-day free trial — no credit card required',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { name: '7-day free trial (no credit card)',   included: true  },
      { name: 'Up to 3 new opportunities per day',   included: true  },
      { name: 'SAM.gov contract search',             included: true  },
      { name: 'Email notifications',                 included: true  },
      { name: 'Save up to 10 opportunities',         included: true  },
      { name: 'Basic NAICS match scoring',           included: true  },
      { name: 'AI proposal tools',                   included: false },
      { name: 'Priority support',                    included: false },
      { name: 'API access',                          included: false },
    ],
    aiCreditsPerMonth: 30,
    opportunitiesPerMonth: 50,
    dailyLimit: 3,
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
    priceMonthly: 49,
    priceYearly: 470,   // ~20% off ($49×12=$588 → $470)
    features: [
      { name: '10 new matched opportunities daily',  included: true  },
      { name: 'SAM.gov + FPDS contract search',      included: true  },
      { name: 'Email & SMS notifications',           included: true  },
      { name: 'Save up to 100 opportunities',        included: true  },
      { name: 'Advanced NAICS AI matching',          included: true  },
      { name: 'AI proposal generation',              included: false },
      { name: 'Priority email support',              included: true  },
      { name: 'API access',                          included: false },
    ],
    aiCreditsPerMonth: 150,
    opportunitiesPerMonth: 500,
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
    priceMonthly: 99,
    priceYearly: 950,   // ~20% off ($99×12=$1,188 → $950)
    features: [
      { name: '25 new matched opportunities daily',  included: true  },
      { name: 'SAM.gov + FPDS + USASpending search', included: true  },
      { name: 'All notification channels',           included: true  },
      { name: 'Unlimited saved opportunities',       included: true  },
      { name: 'Premium AI matching & scoring',       included: true  },
      { name: 'AI proposal generation',              included: true  },
      { name: '24/7 Priority support',               included: true  },
      { name: 'Full API access',                     included: true  },
    ],
    aiCreditsPerMonth: 600,
    opportunitiesPerMonth: 3000,
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
    description: 'For large organizations & teams',
    priceMonthly: 499,
    priceYearly: 4788,  // ~20% off ($499×12=$5,988 → $4,788 ≈ $399/mo)
    features: [
      { name: 'Unlimited daily opportunities',       included: true  },
      { name: 'SAM.gov + FPDS + USASpending search', included: true  },
      { name: 'All notification channels',           included: true  },
      { name: 'Unlimited saved opportunities',       included: true  },
      { name: 'Premium AI matching & scoring',       included: true  },
      { name: 'AI proposal generation',              included: true  },
      { name: '24/7 Priority support',               included: true  },
      { name: 'Full API access',                     included: true  },
      { name: 'Dedicated account manager',           included: true  },
      { name: 'Custom integrations',                 included: true  },
    ],
    aiCreditsPerMonth: 3000,
    opportunitiesPerMonth: 0,
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
    for (const def of defaultPlans) {
      const exists = await Plan.findOne({ name: def.name });
      if (!exists) {
        await Plan.create(def);
        console.log(`✅ Created missing plan: ${def.name}`);
      } else {
        // Sync features, description, displayName, order — but NEVER touch prices or aiCreditsPerMonth
        // (admin may have customised these via the panel)
        const updates = {
          displayName: def.displayName,
          description: def.description,
          features:    def.features,
          order:       def.order,
        };
        if (!exists.aiCreditsPerMonth && def.aiCreditsPerMonth) {
          updates.aiCreditsPerMonth = def.aiCreditsPerMonth;
        }
        if (!exists.opportunitiesPerMonth && def.opportunitiesPerMonth) {
          updates.opportunitiesPerMonth = def.opportunitiesPerMonth;
        }
        if (!exists.dailyLimit && def.dailyLimit) {
          updates.dailyLimit = def.dailyLimit;
        }
        await Plan.updateOne({ name: def.name }, { $set: updates });
      }
    }
    console.log('✅ Plans synced (features updated, prices preserved)');
  }
};

const Plan = mongoose.model('Plan', planSchema);
export default Plan;