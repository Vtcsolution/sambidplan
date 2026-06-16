// backend/services/prospectFetchService.js
//
// Fetches ALL federal awardees from USASpending.gov (small, medium & large).
// No AI, no OpenAI, no Gemini, no enrichment — pure API fetch.

import axios from 'axios';
import Prospect from '../models/Prospect.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Config ────────────────────────────────────────────────────────────────────
const USA_SEARCH   = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const PAGE_SIZE    = 100;
const MAX_PAGES    = 200;   // stop at 20,000 records per run
const REQUEST_GAP  = 500;   // ms between requests — be polite to the API

// ── Sync state (read by controller / frontend polling) ─────────────────────────
export const prospectSyncState = {
  isRunning:        false,
  phase:            'idle',
  phase1Done:       false,
  phase1Saved:      0,   // unique NEW companies added this run
  phase1Processed:  0,   // total contract records processed
  phase2Total:      0,
  phase2Progress:   0,
  phase2Saved:      0,
  phase2Deleted:    0,
  percentComplete:  0,
  startedAt:        null,
  lastError:        null,
};

// ── Priority helper ───────────────────────────────────────────────────────────
const priority = (amount) =>
  amount >= 500_000 ? 'high' : amount >= 50_000 ? 'medium' : 'low';

// ── Upsert one prospect ───────────────────────────────────────────────────────
// Returns true if a NEW company was inserted, false if an existing one was updated.
// Uses $inc / $addToSet so each additional contract WIN aggregates into the totals
// rather than overwriting them with a single contract's data.
const upsert = async (doc) => {
  const filter = doc.uei ? { uei: doc.uei } : { companyName: doc.companyName };

  const result = await Prospect.updateOne(
    filter,
    {
      // Only set on first insert — don't overwrite name/UEI on subsequent contracts
      $setOnInsert: {
        companyName:         doc.companyName,
        uei:                 doc.uei,
        dataSource:          ['usaspending'],
        enrichmentAttempted: false,
      },
      // Always keep the latest NAICS, location, and date info
      $set: {
        naicsCode:        doc.naicsCode,
        naicsDescription: doc.naicsDescription,
        state:            doc.state,
        city:             doc.city,
        priority:         doc.priority,
        lastContractDate: doc.lastContractDate,
      },
      // Accumulate contract counts and total award amounts across all contracts won
      $inc: {
        totalContractsWon: 1,
        totalAwardAmount:  doc.totalAwardAmount || 0,
      },
      // Collect all unique agencies and contract types this company has worked with
      $addToSet: {
        agenciesWorkedWith: { $each: doc.agenciesWorkedWith || [] },
        contractTypes:      { $each: doc.contractTypes || [] },
      },
    },
    { upsert: true }
  );

  return result.upsertedCount > 0; // true = brand new company
};

// ── Phase 1: Fetch all companies from USASpending ─────────────────────────────
const phase1_USASpending = async () => {
  prospectSyncState.phase = 'phase1_usa';
  let page = 1, newCompanies = 0, totalRecords = 0, totalPages = null;

  // Date window: last 3 years
  const today = new Date().toISOString().slice(0, 10);
  const from  = new Date(Date.now() - 3 * 365 * 86400000).toISOString().slice(0, 10);

  console.log(`\n📊 USASpending fetch started — all company sizes (${from} → ${today})`);

  while (page <= MAX_PAGES) {
    if (!prospectSyncState.isRunning) {
      console.log('  ⏸  Stop signal received — pausing');
      break;
    }

    let res;
    try {
      res = await axios.post(
        USA_SEARCH,
        {
          filters: {
            // A=BPA Call  B=Purchase Order  C=Delivery Order  D=Definitive Contract
            // Covers all direct contract award types — no amount or size filters
            award_type_codes: ['A', 'B', 'C', 'D'],
            time_period: [{ start_date: from, end_date: today }],
          },
          fields: [
            'Recipient Name',
            'Recipient UEI',
            'Award Amount',
            'naics_code',
            'naics_description',
            'Place of Performance State Code',
            'pop_city_name',
            'Awarding Agency',
            'Contract Award Type',
            'Last Modified Date',
          ],
          limit: PAGE_SIZE,
          page,
          sort:  'Last Modified Date',
          order: 'desc',
        },
        { timeout: 45_000 }
      );
    } catch (err) {
      console.error(`  ❌ USASpending page ${page} error: ${err.message}`);
      if (err.response?.status === 400) {
        console.error('  API rejected request:', JSON.stringify(err.response.data));
      }
      break;
    }

    const { results = [], page_metadata } = res.data;

    if (!results.length) {
      console.log(`  Page ${page}: empty — done`);
      break;
    }

    // Set total pages on first response
    if (page === 1 && page_metadata?.total) {
      totalPages = Math.ceil(page_metadata.total / PAGE_SIZE);
      console.log(`  Total contract records: ${page_metadata.total.toLocaleString()} (~${totalPages} pages)`);
      console.log(`  (Many companies appear multiple times — one row per contract won)`);
    }

    for (const r of results) {
      const name   = (r['Recipient Name'] || '').trim();
      const uei    = (r['Recipient UEI']  || '').trim() || undefined;
      const amount = Number(r['Award Amount']) || 0;

      if (!name) continue;

      try {
        const isNew = await upsert({
          companyName:        name,
          uei,
          naicsCode:          r['naics_code']?.toString() || undefined,
          naicsDescription:   r['naics_description'] || undefined,
          state:              r['Place of Performance State Code'] || undefined,
          city:               r['pop_city_name'] || undefined,
          totalAwardAmount:   amount,
          agenciesWorkedWith: r['Awarding Agency'] ? [r['Awarding Agency']] : [],
          contractTypes:      r['Contract Award Type'] ? [r['Contract Award Type']] : [],
          lastContractDate:   r['Last Modified Date'] ? new Date(r['Last Modified Date']) : undefined,
          priority:           priority(amount),
        });
        totalRecords++;
        if (isNew) newCompanies++;
      } catch {
        // skip on error
      }
    }

    prospectSyncState.phase1Saved     = newCompanies;
    prospectSyncState.phase1Processed = totalRecords;
    prospectSyncState.percentComplete = totalPages
      ? Math.min(99, Math.round((page / totalPages) * 100))
      : Math.min(99, page);

    if (page % 10 === 0 || page === 1) {
      console.log(`  Page ${page}${totalPages ? '/' + totalPages : ''} — ${totalRecords.toLocaleString()} records → ${newCompanies.toLocaleString()} new unique companies`);
    }

    if (results.length < PAGE_SIZE) break;   // last partial page
    if (totalPages && page >= totalPages)   break;

    page++;
    await sleep(REQUEST_GAP);
  }

  prospectSyncState.percentComplete = 100;
  console.log(`\n✅ Done: ${page} pages, ${totalRecords.toLocaleString()} contract records → ${newCompanies.toLocaleString()} new unique companies`);
};

// ── Public API ────────────────────────────────────────────────────────────────
export const startProspectSync = async ({ skipEnrich = false, phase2Only = false } = {}) => {
  if (prospectSyncState.isRunning) {
    return { success: false, message: 'Sync already running' };
  }

  Object.assign(prospectSyncState, {
    isRunning:        true,
    phase:            'idle',
    phase1Done:       false,
    phase1Saved:      0,
    phase1Processed:  0,
    phase2Total:      0,
    phase2Progress:   0,
    phase2Saved:      0,
    phase2Deleted:    0,
    percentComplete:  0,
    startedAt:        new Date().toISOString(),
    lastError:        null,
  });

  try {
    await phase1_USASpending();
    prospectSyncState.phase1Done = true;
    prospectSyncState.phase      = 'done';
    const total = await Prospect.countDocuments();
    console.log(`\n🎉 Sync complete — ${total.toLocaleString()} unique companies in database`);
    return { success: true };
  } catch (err) {
    prospectSyncState.lastError = err.message;
    console.error('❌ Prospect sync failed:', err.message);
    return { success: false, message: err.message };
  } finally {
    prospectSyncState.isRunning = false;
  }
};

// Keep these exports so the controller compiles without changes
export const resumeProspectEnrichment = () => startProspectSync();
export const stopProspectSync = () => {
  prospectSyncState.isRunning = false;
  console.log('🛑 Stop signal sent');
};
