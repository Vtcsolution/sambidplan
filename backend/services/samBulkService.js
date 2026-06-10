// backend/services/samBulkService.js
//
// Nightly bulk download from SAM.gov — runs at midnight every day.
//
// Strategy:
//   • Fetches ALL contract opportunities posted in the last 24 hours with NO
//     NAICS filter, so zero opportunities are missed regardless of what NAICS
//     codes the current user base has configured.
//   • Uses offset-based pagination to walk through every page of results until
//     the last page (a page smaller than the limit).
//   • Upserts each record into the master Opportunity collection by sourceId
//     (SAM.gov noticeId / solicitationNumber).  Because sourceId is a unique
//     MongoDB index, a record fetched by the real-time API will simply be
//     UPDATED — never duplicated — when the bulk run encounters it.
//   • The fetchSource field is set to 'api' on insert when the API fetched
//     it first, and 'bulk' when the bulk run is first.  It never overwrites
//     an existing fetchSource so the origin is preserved.
//
// No total-record cap is applied — the loop keeps paginating until SAM.gov
// returns an empty or partial page, meaning ALL records for that date range
// are downloaded regardless of how many there are.
//
// Page size is always 1000 (SAM.gov's per-request maximum) so each API call
// retrieves the most records possible, minimising quota consumption.

import axios from 'axios';
import Opportunity from '../models/Opportunity.js';

const SAM_API_URL = 'https://api.sam.gov/opportunities/v2/search';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeStr = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') return (val.code || val.name || val.description || '').toString().trim();
  return String(val);
};

const fmtDate = (d) => {
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${m}/${day}/${d.getFullYear()}`;
};

const transformOpp = (opp) => {
  const sourceId = safeStr(opp.solicitationNumber) || safeStr(opp.noticeId);
  if (!sourceId || sourceId.toLowerCase().includes('undefined')) return null;

  return {
    source:     'sam',
    sourceId,
    title:      safeStr(opp.title) || 'Untitled Opportunity',
    description:(safeStr(opp.description) || 'No description').substring(0, 5000),
    agency:     safeStr(opp.departmentOrAgency) || safeStr(opp.department) || 'Federal Agency',
    estimatedValue: opp.estimatedTotalValue || null,
    postedDate: opp.postedDate ? new Date(opp.postedDate) : new Date(),
    dueDate:    opp.responseDeadLine ? new Date(opp.responseDeadLine) : null,
    naicsCode:  safeStr(opp.naicsCode) || '000000',
    pscCode:    safeStr(opp.pscCode) || '',
    setAside:   safeStr(opp.typeOfSetAside) || safeStr(opp.setAside) || '',
    placeOfPerformance: {
      city:    safeStr(opp.placeOfPerformance?.city),
      state:   safeStr(opp.placeOfPerformance?.state),
      zipCode: safeStr(opp.placeOfPerformance?.zipCode),
    },
    contactInfo: {
      name:  safeStr(opp.pointOfContact?.name || opp.pointOfContact?.fullname),
      email: safeStr(opp.pointOfContact?.email),
      phone: safeStr(opp.pointOfContact?.phone),
    },
    url:         `https://sam.gov/opp/${sourceId}/view`,
    lastFetched: new Date(),
  };
};

// ─── Bulk page fetcher ────────────────────────────────────────────────────────
const fetchPage = async (apiKey, postedFrom, postedTo, limit, offset) => {
  const url =
    `${SAM_API_URL}?api_key=${apiKey}` +
    `&postedFrom=${postedFrom}&postedTo=${postedTo}` +
    `&limit=${limit}&offset=${offset}&active=Yes`;

  const resp = await axios.get(url, {
    timeout: 60000,
    headers: { Accept: 'application/json' },
  });

  const data = resp.data;
  if (!data || data.error || data.message) {
    throw new Error(data?.error || data?.message || 'Unknown SAM.gov error');
  }

  return data.opportunitiesData || data.opportunities || [];
};

// Retry wrapper — on 429 reads Retry-After header and waits, up to maxRetries times.
const fetchPageWithRetry = async (apiKey, postedFrom, postedTo, limit, offset, maxRetries = 4) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchPage(apiKey, postedFrom, postedTo, limit, offset);
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        // Honour SAM.gov's Retry-After header if present, else back off exponentially
        const retryAfterSec = parseInt(err.response?.headers?.['retry-after'] || '0', 10);
        const backoffSec    = retryAfterSec > 0 ? retryAfterSec : Math.min(60 * attempt, 300);
        console.warn(
          `  ⚠️  Rate-limited (429) on attempt ${attempt}/${maxRetries} — ` +
          `waiting ${backoffSec}s before retry…`
        );
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, backoffSec * 1000));
          continue;
        }
        // All retries exhausted — re-throw so the caller can log and stop gracefully
      }
      throw err;
    }
  }
};

// ─── Upsert a single document ─────────────────────────────────────────────────
// Uses $setOnInsert so fetchSource is only written when the record is brand-new.
// If the API already inserted it with fetchSource:'api', that value is preserved.
const upsertOpp = async (doc) => {
  const { sourceId, ...rest } = doc;
  await Opportunity.findOneAndUpdate(
    { sourceId },
    {
      $set:        rest,                      // update all fields on every run
      $setOnInsert: { fetchSource: 'bulk' },  // only set on first-ever insert
    },
    { upsert: true }
  );
};

// ─── Main bulk download ───────────────────────────────────────────────────────
export const runNightlyBulkDownload = async () => {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) {
    console.error('❌ SAM_API_KEY missing — bulk download skipped');
    return { fetched: 0, saved: 0, skipped: 0, pages: 0 };
  }

  // Fetch everything posted in the last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();

  const postedFrom = fmtDate(yesterday);
  const postedTo   = fmtDate(today);

  // Always request 1000 per page — SAM.gov's maximum per call.
  // No total cap: the loop runs until all records are downloaded.
  const pageSize = 1000;

  console.log('\n' + '═'.repeat(70));
  console.log('🌙 NIGHTLY BULK DOWNLOAD  (SAM.gov → Global Opportunity Store)');
  console.log(`   Range : ${postedFrom} → ${postedTo}`);
  console.log(`   Page  : ${pageSize} records/request (SAM.gov max — no total cap)`);
  console.log('═'.repeat(70));

  let offset    = 0;
  let pages     = 0;
  let fetched   = 0;
  let saved     = 0;
  let skipped   = 0;
  let hasMore   = true;

  while (hasMore) {
    try {
      const opps = await fetchPageWithRetry(apiKey, postedFrom, postedTo, pageSize, offset);
      pages++;

      console.log(`  📄 Page ${pages} (offset=${offset}): ${opps.length} records`);

      for (const raw of opps) {
        const doc = transformOpp(raw);
        if (!doc) { skipped++; continue; }

        try {
          await upsertOpp(doc);
          saved++;
        } catch (err) {
          if (err.code === 11000) {
            skipped++; // duplicate key — already in DB, harmless
          } else {
            console.error(`  ⚠️  Save error (${doc.sourceId}): ${err.message}`);
            skipped++;
          }
        }
      }

      fetched += opps.length;

      // If we got a full page, there might be more
      if (opps.length >= pageSize) {
        offset += pageSize;
        // 8-second pause between pages to stay well within SAM.gov rate limits
        await new Promise(r => setTimeout(r, 8000));
      } else {
        hasMore = false; // Last page — we're done
      }

    } catch (err) {
      console.error(`  ❌ Page ${pages + 1} error: ${err.message}`);
      if (err.response?.status === 429) {
        console.error('  💤  Quota exhausted after retries — bulk download will resume at next scheduled run');
      }
      hasMore = false; // Stop on error to preserve remaining quota
    }
  }

  const totalInStore = await Opportunity.countDocuments();

  console.log('\n📊 Bulk Download Summary:');
  console.log(`   Pages fetched : ${pages}`);
  console.log(`   Records seen  : ${fetched}`);
  console.log(`   Upserted      : ${saved}`);
  console.log(`   Skipped       : ${skipped}`);
  console.log(`   Total in DB   : ${totalInStore}`);
  console.log('═'.repeat(70) + '\n');

  return { fetched, saved, skipped, pages, totalInStore };
};

// ─── Stats export (used by admin dashboard) ───────────────────────────────────
export const bulkStats = {
  lastRunAt:    null,
  lastRunCount: 0,
  lastRunPages: 0,
  isRunning:    false,
};

// Wrapper that updates stats and prevents concurrent runs
export const triggerBulkDownload = async () => {
  if (bulkStats.isRunning) {
    console.log('⏳ Bulk download already in progress — skipping');
    return null;
  }

  bulkStats.isRunning = true;
  try {
    const result = await runNightlyBulkDownload();
    bulkStats.lastRunAt    = new Date();
    bulkStats.lastRunCount = result.saved;
    bulkStats.lastRunPages = result.pages;
    return result;
  } finally {
    bulkStats.isRunning = false;
  }
};
