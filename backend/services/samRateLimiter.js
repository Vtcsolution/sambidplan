// backend/services/samRateLimiter.js
//
// Single serialized queue for ALL SAM.gov HTTP calls.
// Both samApiService (opportunities) and samEntityService (companies) share this.
//
// Guarantees:
//   • Only one SAM.gov request in-flight at a time
//   • ≥800ms gap between requests (~75/min, under the 100/min cap)
//   • 429 pauses the entire queue — no other service jumps in during the wait
//   • Daily quota tracking — both services count against the same 1,000/day limit

const MIN_INTERVAL_MS = 800;
export const DAILY_LIMIT = 950; // conservative — actual SAM.gov free tier is 1,000/day

// ── Rate-limit state (exposed so controllers can show it in the admin UI) ────
export const limiterState = {
  isRateLimited:     false,
  rateLimitedUntil:  null,
  queueDepth:        0,
};

// ── Daily quota tracker ──────────────────────────────────────────────────────
const _quota = {
  count:    0,
  dayLabel: new Date().toDateString(), // e.g. "Sun Jun 07 2026"
};

const _resetIfNewDay = () => {
  const today = new Date().toDateString();
  if (_quota.dayLabel !== today) {
    _quota.count    = 0;
    _quota.dayLabel = today;
  }
};

export const quotaState = () => {
  _resetIfNewDay();
  return {
    used:      _quota.count,
    remaining: Math.max(0, DAILY_LIMIT - _quota.count),
    limit:     DAILY_LIMIT,
    exhausted: _quota.count >= DAILY_LIMIT,
  };
};

export const hasQuota = (needed = 1) => {
  _resetIfNewDay();
  return _quota.count + needed <= DAILY_LIMIT;
};

// ── Sequential queue ──────────────────────────────────────────────────────────
let _lastAt = 0;
let _queue  = Promise.resolve();

/**
 * samFetch(fn)
 * Wraps one SAM.gov HTTP call. Serializes via queue, enforces gap, retries on 429.
 * Throws if daily quota is exhausted OR after 3 failed 429 retries.
 */
export const samFetch = (fn) => {
  limiterState.queueDepth++;

  const ticket = _queue.then(async () => {
    limiterState.queueDepth = Math.max(0, limiterState.queueDepth - 1);

    // Quota guard
    _resetIfNewDay();
    if (_quota.count >= DAILY_LIMIT) {
      throw Object.assign(new Error('SAM.gov daily quota exhausted — try again tomorrow'), { code: 'QUOTA_EXHAUSTED' });
    }

    // Enforce minimum gap
    const gap = MIN_INTERVAL_MS - (Date.now() - _lastAt);
    if (gap > 0) await new Promise(r => setTimeout(r, gap));

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        _lastAt = Date.now();
        _quota.count++;
        return await fn();
      } catch (err) {
        if (err.response?.status === 429) {
          // SAM.gov code 900804 = daily quota exhausted — don't retry, mark internally
          const isQuotaExhausted = err.response?.data?.code === '900804' ||
            (err.response?.data?.description || '').toLowerCase().includes('quota');
          if (isQuotaExhausted) {
            _quota.count = DAILY_LIMIT; // sync our internal tracker with reality
            const nextReset = err.response?.data?.nextAccessTime || 'midnight UTC';
            console.warn(`🚫 SAM.gov daily quota exhausted. Resets: ${nextReset}`);
            throw Object.assign(
              new Error(`SAM.gov daily quota exhausted — resets at ${nextReset}`),
              { code: 'QUOTA_EXHAUSTED' }
            );
          }

          if (attempt < 3) {
            const retryAfter = parseInt(err.response?.headers?.['retry-after'] || '0', 10);
            const waitMs     = retryAfter > 0 ? retryAfter * 1000 : 20000 * attempt;

            limiterState.isRateLimited    = true;
            limiterState.rateLimitedUntil = new Date(Date.now() + waitMs);

            console.warn(`⚠️  SAM.gov 429 (attempt ${attempt}/3) — pausing ${waitMs / 1000}s…`);
            await new Promise(r => setTimeout(r, waitMs));

            limiterState.isRateLimited    = false;
            limiterState.rateLimitedUntil = null;
            _lastAt = Date.now();
          } else {
            throw Object.assign(new Error('SAM.gov rate limit: retries exhausted'), { code: 'RATE_LIMITED' });
          }
        } else {
          throw err;
        }
      }
    }
  });

  _queue = ticket.catch(() => {}); // errors must not stall the queue for next callers
  return ticket;
};
