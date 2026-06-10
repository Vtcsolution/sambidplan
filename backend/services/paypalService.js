// backend/services/paypalService.js
// Real PayPal REST API integration (Sandbox / Live based on PAYPAL_MODE)
import axios from 'axios';

// Read at call time so admin key changes take effect immediately
const getBase = () => process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Cache access token for 9 minutes (expires in 10)
let _token = null;
let _tokenExpiry = 0;

// Called after admin updates PayPal credentials or mode
export const resetPayPalToken = () => { _token = null; _tokenExpiry = 0; };

const getAccessToken = async () => {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === 'undefined' || clientSecret === 'undefined') {
    throw new Error('PayPal credentials not configured. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env');
  }

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const res = await axios.post(
      `${getBase()}/v1/oauth2/token`,
      'grant_type=client_credentials',
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${creds}` } }
    );
    _token       = res.data.access_token;
    _tokenExpiry = Date.now() + 9 * 60 * 1000;
    console.log('✅ PayPal access token obtained');
    return _token;
  } catch (err) {
    const paypalError = err.response?.data;
    console.error('❌ PayPal auth failed:', JSON.stringify(paypalError || err.message));
    // e.g. paypalError = { error: 'invalid_client', error_description: '...' }
    const desc = paypalError?.error_description || paypalError?.error || err.message;
    throw new Error(`PayPal authentication failed: ${desc}`);
  }
};

const headers = async () => ({
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${await getAccessToken()}`
});

// Create a PayPal order — returns orderId that frontend PayPal button uses
export const createPayPalOrder = async (amount, currency = 'USD', metadata = {}) => {
  try {
    const value       = Number(amount).toFixed(2);
    const planLabel   = metadata.planName
      ? `${metadata.planName.charAt(0).toUpperCase()}${metadata.planName.slice(1)} Plan`
      : 'Subscription';
    const cycleLabel  = metadata.billingCycle === 'yearly' ? 'Annual' : 'Monthly';

    const res = await axios.post(
      `${getBase()}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id:   metadata.userId || '',
          description: `Sambid Notify — ${planLabel} (${cycleLabel})`,
          amount: {
            currency_code: currency,
            value,
            breakdown: {
              item_total: { currency_code: currency, value }
            }
          },
          items: [{
            name:        `Sambid Notify ${planLabel}`,
            description: `${cycleLabel} subscription — AI-powered federal contract intelligence`,
            quantity:    '1',
            category:    'DIGITAL_GOODS',
            unit_amount: { currency_code: currency, value }
          }]
        }],
        application_context: {
          brand_name:          'Sambid Notify',
          shipping_preference: 'NO_SHIPPING',
          user_action:         'PAY_NOW',
          return_url:          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
          cancel_url:          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing`
        }
      },
      { headers: await headers() }
    );

    const order      = res.data;
    const approvalUrl = order.links?.find(l => l.rel === 'payer-action' || l.rel === 'approve')?.href;

    console.log(`✅ PayPal order created: ${order.id} ($${amount})`);
    return { success: true, orderId: order.id, approvalUrl, status: order.status, isSimulated: false };
  } catch (err) {
    const paypalErr = err.response?.data;
    console.error('❌ PayPal createOrder error:', JSON.stringify(paypalErr || err.message));
    const msg = paypalErr?.details?.[0]?.description
      || paypalErr?.message
      || paypalErr?.error_description
      || err.message
      || 'Failed to create PayPal order';
    throw new Error(msg);
  }
};

// Capture a PayPal order — call this after user approves in the Smart Button popup
export const capturePayPalPayment = async (orderId) => {
  try {
    const res = await axios.post(
      `${getBase()}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: await headers() }
    );

    const order   = res.data;
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];

    if (order.status !== 'COMPLETED') {
      return { success: false, error: `Order status: ${order.status}` };
    }

    console.log(`✅ PayPal captured: ${capture?.id} — $${capture?.amount?.value}`);
    return {
      success:   true,
      captureId: capture?.id,
      orderId:   order.id,
      status:    order.status,
      amount:    parseFloat(capture?.amount?.value || 0),
      currency:  capture?.amount?.currency_code || 'USD',
      isSimulated: false
    };
  } catch (err) {
    // 422 means already captured (idempotency guard)
    if (err.response?.status === 422) {
      return { success: false, error: 'This payment has already been captured.', alreadyCaptured: true };
    }
    const msg = err.response?.data?.message || err.message;
    console.error('❌ PayPal capture error:', msg);
    return { success: false, error: msg };
  }
};

// Verify an order ID exists and its status on PayPal's side
export const verifyPayPalOrder = async (orderId) => {
  try {
    const res = await axios.get(`${getBase()}/v2/checkout/orders/${orderId}`, { headers: await headers() });
    return { success: true, status: res.data.status, orderId: res.data.id, data: res.data };
  } catch (err) {
    return { success: false, error: err.response?.data?.message || err.message };
  }
};
