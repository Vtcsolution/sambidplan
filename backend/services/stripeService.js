// backend/services/stripeService.js
import Stripe from 'stripe';

// Initialize Stripe only if API key exists
let stripe = null;

try {
  if (process.env.STRIPE_SECRET_KEY && 
      process.env.STRIPE_SECRET_KEY !== 'your_stripe_secret_key_here' &&
      process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe service initialized with LIVE key');
  } else if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.includes('sk_test_')) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe service initialized (TEST MODE)');
  } else {
    console.log('⚠️ Stripe API key not found or invalid. Running in SIMULATION MODE.');
  }
} catch (error) {
  console.log('⚠️ Stripe initialization failed:', error.message);
  console.log('⚠️ Running in SIMULATION MODE');
}

// Create a payment intent
export const createStripePaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  // SIMULATION MODE (no API key)
  if (!stripe) {
    console.log(`📝 [SIMULATION] Stripe payment intent for $${amount}`);
    return {
      success: true,
      clientSecret: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      paymentIntentId: `sim_pi_${Date.now()}`,
      amount: amount,
      status: 'requires_payment_method',
      isSimulated: true
    };
  }
  
  // REAL Stripe API call
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        ...metadata,
        environment: process.env.NODE_ENV || 'development'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    console.log(`✅ Real Stripe payment intent created: ${paymentIntent.id} for $${amount}`);
    
    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      status: paymentIntent.status,
      isSimulated: false
    };
  } catch (error) {
    console.error('❌ Stripe payment intent error:', error.message);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// Confirm payment intent
export const confirmStripePayment = async (paymentIntentId) => {
  // SIMULATION MODE
  if (!stripe || paymentIntentId.startsWith('sim_')) {
    console.log(`📝 [SIMULATION] Stripe payment confirmation for: ${paymentIntentId}`);
    return {
      success: true,
      status: 'succeeded',
      paymentIntentId: paymentIntentId,
      amount: 0,
      metadata: {},
      isSimulated: true
    };
  }
  
  // REAL Stripe API call
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    console.log(`✅ Real Stripe payment status: ${paymentIntent.status}`);
    
    return {
      success: paymentIntent.status === 'succeeded',
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      metadata: paymentIntent.metadata,
      isSimulated: false
    };
  } catch (error) {
    console.error('❌ Stripe confirm error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Refund payment
export const refundStripePayment = async (paymentIntentId, amount = null) => {
  // SIMULATION MODE
  if (!stripe || paymentIntentId.startsWith('sim_')) {
    console.log(`📝 [SIMULATION] Stripe refund for: ${paymentIntentId}`);
    return {
      success: true,
      refundId: `sim_ref_${Date.now()}`,
      amount: amount || 0,
      status: 'succeeded',
      isSimulated: true
    };
  }
  
  // REAL Stripe API call
  try {
    const refundParams = { payment_intent: paymentIntentId };
    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }
    
    const refund = await stripe.refunds.create(refundParams);
    
    console.log(`✅ Real Stripe refund created: ${refund.id}`);
    
    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      isSimulated: false
    };
  } catch (error) {
    console.error('❌ Stripe refund error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};