// backend/models/Invoice.js
import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    unique: true
  },
  payoneerInvoiceId: {
    type: String
  },
  plan: {
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'expired', 'cancelled', 'refunded'],
    default: 'pending'
  },
  invoiceUrl: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['payoneer', 'bank_transfer', 'manual', 'credit_card', 'stripe', 'paypal', 'referral_balance'],
    default: 'payoneer'
  },
  supportDiscount: { type: Number, default: 0 },
  supportMember:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  couponDiscount:  { type: Number, default: 0 },
  couponReferrer:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  paidAt: {
    type: Date
  },
  // PayPal-specific — unique order ID to prevent double-capture
  paypalOrderId: {
    type: String,
    default: null,
  },
  paypalCaptureId: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000)
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Unique index on PayPal order ID — PARTIAL so it only applies to real
// (string) order IDs. Pending invoices store paypalOrderId: null, and a plain
// sparse unique index still rejects duplicate *explicit* nulls (sparse only
// skips MISSING fields, not null values) — which caused E11000 on the 2nd
// unpaid invoice. A partial filter on { $type: 'string' } excludes null/missing
// entirely while still preventing double-capture of the same real order ID.
invoiceSchema.index(
  { paypalOrderId: 1 },
  { unique: true, partialFilterExpression: { paypalOrderId: { $type: 'string' } } }
);

// Generate invoice number before saving
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Self-healing index migration — runs on server startup (called from server.js
// after the DB connects). On databases that still have the OLD non-partial
// paypalOrderId index (which rejects a 2nd invoice with paypalOrderId: null and
// throws E11000), this drops it and recreates it as a partial unique index.
// Idempotent: a no-op once the partial index is in place. Wrapped so a failure
// here never blocks startup.
export async function ensureInvoiceIndexes() {
  try {
    const col = mongoose.connection.db.collection('invoices');
    const want = { paypalOrderId: { $type: 'string' } };
    const indexes = await col.indexes();
    const existing = indexes.find(i => i.name === 'paypalOrderId_1');
    const isPartial =
      existing?.partialFilterExpression &&
      JSON.stringify(existing.partialFilterExpression) === JSON.stringify(want);

    if (existing && !isPartial) {
      console.log('🔧 Migrating invoices.paypalOrderId index → partial unique…');
      await col.dropIndex('paypalOrderId_1');
    }
    if (!existing || !isPartial) {
      await col.createIndex(
        { paypalOrderId: 1 },
        { unique: true, partialFilterExpression: want, name: 'paypalOrderId_1' }
      );
      console.log('✅ invoices.paypalOrderId partial unique index ensured.');
    }
  } catch (err) {
    console.error('⚠️  ensureInvoiceIndexes failed (non-fatal):', err.message);
  }
}

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;