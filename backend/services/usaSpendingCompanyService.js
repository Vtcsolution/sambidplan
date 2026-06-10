// backend/services/usaSpendingCompanyService.js
// Fetches contractor companies from USASpending.gov award data.
// No API key required. Paginates through contract awards and extracts unique recipients.

import axios from 'axios';
import { upsertCompany } from './companyMergeService.js';

const BASE  = 'https://api.usaspending.gov';
const AWARD_SEARCH = `${BASE}/api/v2/search/spending_by_award/`;

export const usaSpendingSyncStats = {
  isSyncing:   false,
  lastSyncAt:  null,
  savedCount:  0,
  newCount:    0,
  lastError:   null,
  currentPage: 0,
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Fetch one page of awards, extract recipient company data
const fetchAwardPage = async (page, limit = 100) => {
  const body = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'], // contracts only (not grants)
      time_period: [{
        start_date: new Date(Date.now() - 365 * 2 * 86400000).toISOString().slice(0, 10), // last 2 years
        end_date:   new Date().toISOString().slice(0, 10),
      }],
    },
    fields: [
      'Recipient Name',
      'recipient_uei',
      'Award Amount',
      'naics_code',
      'Place of Performance State Code',
      'Place of Performance City Name',
      'cage_code',
    ],
    limit,
    page,
    sort:  'Award Amount',
    order: 'desc',
  };

  const res = await axios.post(AWARD_SEARCH, body, {
    timeout: 45000,
    headers: { 'Content-Type': 'application/json' },
  });
  return res.data;
};

export const syncUsaSpendingCompanies = async (maxPages = 50) => {
  if (usaSpendingSyncStats.isSyncing) return { success: false, message: 'Already syncing' };

  usaSpendingSyncStats.isSyncing   = true;
  usaSpendingSyncStats.lastError   = null;
  usaSpendingSyncStats.savedCount  = 0;
  usaSpendingSyncStats.newCount    = 0;
  usaSpendingSyncStats.currentPage = 0;

  console.log('\n📊 USASpending Company Sync starting…');

  // Accumulate recipients across pages, deduplicate by UEI then aggregate
  // key = uei || cage || name
  const recipientMap = new Map();

  try {
    for (let page = 1; page <= maxPages; page++) {
      usaSpendingSyncStats.currentPage = page;
      let data;
      try {
        data = await fetchAwardPage(page);
      } catch (err) {
        console.error(`USASpending page ${page} error:`, err.message);
        break;
      }

      const results = data.results || [];
      if (!results.length) break;

      for (const award of results) {
        const uei   = (award.recipient_uei || '').trim();
        const cage  = (award.cage_code      || '').trim();
        const rname = (award['Recipient Name'] || '').trim();
        const key   = uei || cage || rname.toLowerCase();
        if (!key) continue;

        const amount = Number(award['Award Amount'] || 0);
        const state  = (award['Place of Performance State Code'] || '').trim().toUpperCase();
        const city   = (award['Place of Performance City Name']  || '').trim();
        const naics  = (award.naics_code || '').trim();

        if (recipientMap.has(key)) {
          const r = recipientMap.get(key);
          r.totalContractsWon += 1;
          r.totalAwardAmount  += amount;
        } else {
          recipientMap.set(key, {
            ueiSAM:            uei,
            cageCode:          cage,
            legalBusinessName: rname,
            physicalAddress: { city, stateOrProvinceCode: state, countryCode: 'USA' },
            primaryNaics:      naics,
            naicsCodes:        naics ? [{ code: naics, isPrimary: true }] : [],
            totalContractsWon: 1,
            totalAwardAmount:  amount,
          });
        }
      }

      console.log(`  ✅ Page ${page}: ${results.length} awards (${recipientMap.size} unique recipients so far)`);
      if (results.length < 100) break; // last page
      await sleep(300);
    }

    // Upsert all collected recipients
    let saved = 0, newCount = 0;
    for (const companyData of recipientMap.values()) {
      try {
        const { isNew } = await upsertCompany(companyData, 'usaspending');
        saved++;
        if (isNew) newCount++;
      } catch (err) {
        if (err.code !== 11000) console.error('USASpending upsert error:', err.message);
      }
    }

    usaSpendingSyncStats.savedCount = saved;
    usaSpendingSyncStats.newCount   = newCount;
    usaSpendingSyncStats.lastSyncAt = new Date();
    console.log(`✅ USASpending sync done: ${saved} saved (${newCount} new)\n`);
    return { success: true, saved, newCount };

  } catch (err) {
    usaSpendingSyncStats.lastError = err.message;
    console.error('❌ USASpending sync error:', err.message);
    return { success: false, message: err.message };
  } finally {
    usaSpendingSyncStats.isSyncing = false;
  }
};
