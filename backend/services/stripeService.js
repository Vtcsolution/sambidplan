// backend/services/stripeService.js
import Stripe from 'stripe';

// Lazy Stripe client — re-created whenever key changes
let stripe = null;

const getStripe = () => {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (key && key.startsWith('sk_')) {
    try {
      stripe = new Stripe(key);
      console.log(`✅ Stripe initialized (${key.startsWith('sk_test_') ? 'TEST' : 'LIVE'})`);
    } catch (e) {
      console.log('⚠️ Stripe init failed:', e.message);
    }
  }
  return stripe;
};

// Called after admin updates Stripe key
export const resetStripeClient = () => { stripe = null; };

// Create a payment intent
export const createStripePaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  // SIMULATION MODE (no API key)
  if (!getStripe()) {
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
    const paymentIntent = await getStripe().paymentIntents.create({
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
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    
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

// Create a Stripe Checkout session for an enterprise inquiry payment link
export const createCheckoutSessionForInquiry = async ({ inquiryId, email, planName, amount, billingCycle, successUrl, cancelUrl }) => {
  if (!getStripe()) {
    // Simulation mode — return fake link
    const fakeSessionId = `sim_cs_${Date.now()}`;
    return {
      success: true,
      sessionId: fakeSessionId,
      url: `${successUrl}?session_id=${fakeSessionId}&simulated=1`,
      isSimulated: true,
    };
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: `Sambid Notify — ${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan`,
            description: `${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} subscription`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        inquiryId: inquiryId.toString(),
        planName,
        billingCycle,
        source: 'inquiry_payment_link',
      },
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
    });

    return { success: true, sessionId: session.id, url: session.url, isSimulated: false };
  } catch (error) {
    console.error('❌ Stripe checkout session error:', error.message);
    return { success: false, error: error.message };
  }
};

// Create a Stripe Checkout session to pay a managed-service CommissionInvoice
// (commission or monthly_fee) — separate from plan-upgrade checkout since the
// product here is a one-off invoice, not a subscription plan.
export const createCheckoutSessionForCommissionInvoice = async ({ invoiceId, email, description, amount, successUrl, cancelUrl }) => {
  if (!getStripe()) {
    const fakeSessionId = `sim_cs_${Date.now()}`;
    return {
      success: true,
      sessionId: fakeSessionId,
      url: `${successUrl}?session_id=${fakeSessionId}&simulated=1`,
      isSimulated: true,
    };
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: 'Sambid Notify — Managed Service Invoice',
            description,
          },
        },
        quantity: 1,
      }],
      metadata: {
        commissionInvoiceId: invoiceId.toString(),
        source: 'managed_service_invoice',
      },
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
    });

    return { success: true, sessionId: session.id, url: session.url, isSimulated: false };
  } catch (error) {
    console.error('❌ Stripe commission-invoice checkout error:', error.message);
    return { success: false, error: error.message };
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
    
    const refund = await getStripe().refunds.create(refundParams);
    
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