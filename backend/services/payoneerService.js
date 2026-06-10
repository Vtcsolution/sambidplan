// backend/services/payoneerService.js
//
// Payoneer API integration — SANDBOX by default, LIVE when ready.
// ─────────────────────────────────────────────────────────────────
//  Sandbox  →  PAYONEER_ENV=sandbox  (safe for testing, no real money)
//  Live     →  PAYONEER_ENV=live     (replace ALL .env values first)
//
//  API Docs  : https://developer.payoneer.com/docs/
//  Dev Portal: https://developer.payoneer.com  ← get sandbox keys here
// ─────────────────────────────────────────────────────────────────
//
//  CAPABILITY A — CHECKOUT
//    Creates a hosted Payoneer payment page for subscription billing.
//    Flow: create session → redirect user → Payoneer redirects back → webhook confirms.
//
//  CAPABILITY B — MASS PAYOUT
//    Sends referral commission to user's Payoneer account.
//    Requires the user to have a Payoneer account linked to your program.
//
//  ALL credentials are read from .env — never hardcoded.

import axios from 'axios';
import crypto from 'crypto';

// ─── Read credentials from .env ──────────────────────────────────────────────
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TO GO LIVE: Replace these values in .env with your production keys      ║
// ║  and change PAYONEER_ENV=live and PAYONEER_API_BASE to production URL     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const BASE_URL       = process.env.PAYONEER_API_BASE      || 'https://api.sandbox.payoneer.com';
const CLIENT_ID      = process.env.PAYONEER_CLIENT_ID;
const CLIENT_SECRET  = process.env.PAYONEER_CLIENT_SECRET;
const PROGRAM_ID     = process.env.PAYONEER_PROGRAM_ID;
const WEBHOOK_SECRET = process.env.PAYONEER_WEBHOOK_SECRET || '';
const RETURN_URL     = process.env.PAYONEER_RETURN_URL     || 'http://localhost:5173/payment/payoneer/return';
const CANCEL_URL     = process.env.PAYONEER_CANCEL_URL     || 'http://localhost:5173/pricing';
const WEBHOOK_URL    = process.env.PAYONEER_WEBHOOK_URL    || 'http://localhost:8000/api/payment/payoneer/webhook';

export const IS_SANDBOX = (process.env.PAYONEER_ENV || 'sandbox') !== 'live';

// ─── Plan pricing (USD) ───────────────────────────────────────────────────────
export const PAYONEER_PLAN_PRICES = {
  starter:    { monthly: 29,  yearly: 290  },
  pro:        { monthly: 79,  yearly: 790  },
  business:   { monthly: 149, yearly: 1490 },
  enterprise: { monthly: 299, yearly: 2990 },
};

// ─── Referral commission amounts (USD, from .env) ────────────────────────────
export const PAYONEER_COMMISSIONS = {
  starter:    parseFloat(process.env.PAYONEER_COMMISSION_STARTER    || '10'),
  pro:        parseFloat(process.env.PAYONEER_COMMISSION_PRO        || '20'),
  business:   parseFloat(process.env.PAYONEER_COMMISSION_BUSINESS   || '35'),
  enterprise: parseFloat(process.env.PAYONEER_COMMISSION_ENTERPRISE || '60'),
};

// ─── OAuth2 Access Token (cached, auto-refreshed) ────────────────────────────
let _tokenCache = { token: null, expiresAt: 0 };

export const getAccessToken = async () => {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt - 60_000) {
    return _tokenCache.token; // return cached token
  }

  if (!CLIENT_ID || CLIENT_ID.includes('REPLACE_ME')) {
    throw new Error(
      'Payoneer credentials not configured. ' +
      'Get sandbox keys at https://developer.payoneer.com and set them in .env'
    );
  }

  // OAuth2 Client Credentials Grant
  // SANDBOX  endpoint: https://api.sandbox.payoneer.com/v4/oauth2/token
  // LIVE     endpoint: https://api.payoneer.com/v4/oauth2/token   ← TO GO LIVE
  const res = await axios.post(
    `${BASE_URL}/v4/oauth2/token`,
    new URLSearchParams({ grant_type: 'client_credentials', scope: 'read write' }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Basic Auth: base64(clientId:clientSecret)
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      timeout: 15_000,
    }
  );

  const { access_token, expires_in } = res.data;
  _tokenCache = { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
  console.log(`✅ Payoneer ${IS_SANDBOX ? 'SANDBOX' : 'LIVE'} token obtained`);
  return access_token;
};

// ─── Authenticated HTTP helper ────────────────────────────────────────────────
const api = async (method, path, data = null) => {
  const token = await getAccessToken();
  const res = await axios({
    method,
    url: `${BASE_URL}${path}`,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data:    data || undefined,
    timeout: 20_000,
  });
  return res.data;
};

// ─── A. CHECKOUT ─────────────────────────────────────────────────────────────
//
// Creates a Payoneer-hosted checkout page for subscription payment.
// Returns { sessionId, checkoutUrl, expiresAt }
// Frontend redirects user to checkoutUrl.
// After payment, Payoneer redirects to PAYONEER_RETURN_URL with params.
//
// Payoneer endpoint (SANDBOX/LIVE):
//   POST /v4/programs/{programId}/checkout-sessions
//   Docs: https://developer.payoneer.com/docs/checkout
export const createCheckoutSession = async ({ user, plan, billingCycle, invoiceId, amount }) => {
  if (!PROGRAM_ID || PROGRAM_ID.includes('REPLACE_ME')) {
    throw new Error('PAYONEER_PROGRAM_ID not set in .env');
  }

  const payload = {
    payer: {
      name:  user.businessName || user.name || 'Contractor',
      email: user.email,
    },
    payment: {
      currency:    'USD',
      amount,
      description: `FedNotify ${plan} Plan — ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'}`,
    },
    client_reference_id: String(invoiceId),  // maps webhook back to our invoice
    redirect_url: RETURN_URL,
    cancel_url:   CANCEL_URL,
    webhook_url:  WEBHOOK_URL,
    ...(IS_SANDBOX && { sandbox: true }),
  };

  const result = await api('POST', `/v4/programs/${PROGRAM_ID}/checkout-sessions`, payload);
  return {
    sessionId:   result.session_id   || result.id,
    checkoutUrl: result.checkout_url || result.redirect_url,
    expiresAt:   result.expires_at,
  };
};

// Get the status of a checkout session (called from return-URL handler)
// Payoneer endpoint: GET /v4/programs/{programId}/checkout-sessions/{id}
export const getCheckoutSession = async (sessionId) =>
  api('GET', `/v4/programs/${PROGRAM_ID}/checkout-sessions/${sessionId}`);

// ─── Webhook signature verification ──────────────────────────────────────────
// Payoneer signs the raw request body with HMAC-SHA256 using your WEBHOOK_SECRET.
// Header sent: X-Payoneer-Signature
export const verifyWebhookSignature = (rawBody, signatureHeader) => {
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET.includes('REPLACE_ME')) {
    console.warn('⚠️  PAYONEER_WEBHOOK_SECRET not set — skipping verification (not safe for production)');
    return true;
  }
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader || ''));
  } catch {
    return false;
  }
};

// ─── B. PAYOUT ───────────────────────────────────────────────────────────────
//
// Sends a referral commission payout to a user's Payoneer account.
// The user must provide their Payoneer account email (payeeEmail).
//
// Payoneer endpoint (SANDBOX/LIVE):
//   POST /v4/programs/{programId}/payments
//   Docs: https://developer.payoneer.com/docs/mass-payout
//
// NOTE: In SANDBOX mode this simulates the payout without real money.
//       In LIVE mode the money is sent to the real Payoneer account.
export const sendPayoutToPayee = async ({ payeeEmail, amount, description, referenceId }) => {
  if (!PROGRAM_ID || PROGRAM_ID.includes('REPLACE_ME')) {
    throw new Error('PAYONEER_PROGRAM_ID not set in .env');
  }

  const payload = {
    client_reference_id: referenceId || `payout-${Date.now()}`,
    payments: [
      {
        payee:       { email: payeeEmail },
        amount:      { value: amount, currency: 'USD' },
        description: description || 'FedNotify referral commission',
      },
    ],
    ...(IS_SANDBOX && { sandbox: true }),
  };

  const result = await api('POST', `/v4/programs/${PROGRAM_ID}/payments`, payload);
  return {
    paymentId: result.payment_id || result.id,
    status:    result.status,
    raw:       result,
  };
};

// Get payout status
// Payoneer endpoint: GET /v4/programs/{programId}/payments/{paymentId}
export const getPayoutStatus = async (paymentId) =>
  api('GET', `/v4/programs/${PROGRAM_ID}/payments/${paymentId}`);

// ─── Sandbox mock fallback ────────────────────────────────────────────────────
// When real sandbox credentials are not yet configured (REPLACE_ME values),
// this returns a mock checkout URL so the UI can be tested end-to-end locally.
// Remove or disable once real sandbox credentials are in place.
export const createSandboxMock = (invoiceId, amount, plan, billingCycle) => {
  const sessionId = `mock_session_${Date.now()}`;
  return {
    sessionId,
    isMock: true,
    checkoutUrl:
      `${RETURN_URL}?session_id=${sessionId}` +
      `&order_id=${sessionId}&status=success` +
      `&invoice_id=${invoiceId}&amount=${amount}` +
      `&plan=${plan}&billing_cycle=${billingCycle}&mock=true`,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
};
