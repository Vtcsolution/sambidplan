// backend/scripts/initPlans.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Plan from '../models/Plan.js';

dotenv.config();

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
      { name: 'Priority support', included: false },
      { name: 'Advanced AI matching', included: false },
      { name: 'AI proposal generation', included: false },
      { name: 'API access', included: false }
    ],
    limits: {
      maxSavedOpportunities: 10,
      maxAlerts: 5,
      aiProposals: false,
      prioritySupport: false,
      apiAccess: false
    },
    isActive: true,
    order: 1
  },
  {
    name: 'starter',
    displayName: 'Starter',
    description: 'For growing contractors',
    priceMonthly: 29,
    priceYearly: 278,
    features: [
      { name: '50 Alerts per month', included: true },
      { name: 'Advanced contract search', included: true },
      { name: 'Email + SMS notifications', included: true },
      { name: 'Save up to 100 opportunities', included: true },
      { name: 'Advanced AI matching', included: true },
      { name: 'Priority email support', included: true },
      { name: 'Competitive analysis', included: true },
      { name: 'AI proposal generation', included: false },
      { name: 'API access', included: false }
    ],
    limits: {
      maxSavedOpportunities: 100,
      maxAlerts: 50,
      aiProposals: false,
      prioritySupport: true,
      apiAccess: false
    },
    isActive: true,
    order: 2
  },
  {
    name: 'pro',
    displayName: 'Pro',
    description: 'For established federal contractors',
    priceMonthly: 79,
    priceYearly: 758,
    features: [
      { name: 'Unlimited alerts', included: true },
      { name: 'Real-time tracking', included: true },
      { name: 'All notification channels', included: true },
      { name: 'Unlimited saved opportunities', included: true },
      { name: 'Premium AI matching', included: true },
      { name: '24/7 Priority support', included: true },
      { name: 'Full competitive analysis', included: true },
      { name: 'AI proposal generation', included: true },
      { name: 'Full API access', included: true },
      { name: 'Dedicated account manager', included: true }
    ],
    limits: {
      maxSavedOpportunities: -1,
      maxAlerts: -1,
      aiProposals: true,
      prioritySupport: true,
      apiAccess: true
    },
    isActive: true,
    order: 3
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'For large organizations',
    priceMonthly: 499,
    priceYearly: 4788,
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
    isActive: true,
    order: 4
  }
];

const initPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing plans
    await Plan.deleteMany({});
    console.log('🗑️ Cleared existing plans');
    
    // Insert default plans
    await Plan.insertMany(defaultPlans);
    console.log('✅ Inserted default plans');
    
    const count = await Plan.countDocuments();
    console.log(`📊 Total plans in database: ${count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing plans:', error);
    process.exit(1);
  }
};

initPlans();