// backend/services/fpdsService.js
// Fetches contractor data from FPDS.gov ATOM feed.
// No API key required. Returns XML, parsed with fast-xml-parser.

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { upsertCompany } from './companyMergeService.js';

const FPDS_ATOM = 'https://www.fpds.gov/ezsearch/FEEDS/ATOM';

export const fpdsSyncStats = {
  isSyncing:   false,
  lastSyncAt:  null,
  savedCount:  0,
  newCount:    0,
  lastError:   null,
  currentPage: 0,
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const parser = new XMLParser({
  ignoreAttributes:     false,
  attributeNamePrefix:  '@_',
  removeNSPrefix:       true,    // strip namespace prefixes like "ns1:"
  isArray: (name) => name === 'entry', // always treat <entry> as array
});

const safeText = v => {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object') return (v['#text'] || v['_'] || '').toString().trim();
  return String(v).trim();
};

// Extract a vendor from one FPDS entry (contract award)
const extractVendor = (entry) => {
  const content = entry?.content;
  if (!content) return null;

  // FPDS content nests under award > vendor or content > award > vendor
  const award  = content?.award     || content?.['ns1:award'] || content;
  const vendor = award?.vendor      || award?.['ns1:vendor']  || {};
  const va     = vendor?.vendorAddress || vendor?.['ns1:vendorAddress'] || {};
  const prodSvc = award?.productOrServiceInformation || award?.['ns1:productOrServiceInformation'] || {};
  const amounts = award?.amounts || award?.['ns1:amounts'] || {};

  const name  = safeText(vendor?.vendorName || vendor?.['ns1:vendorName']);
  const cage  = safeText(vendor?.cageCode   || vendor?.['ns1:cageCode']);
  if (!name && !cage) return null;

  const naics = safeText(prodSvc?.NAICSCode || prodSvc?.naicsCode || prodSvc?.['ns1:NAICSCode']);
  const amount = parseFloat(safeText(amounts?.totalObligatedAmount || amounts?.['ns1:totalObligatedAmount']) || '0');

  return {
    legalBusinessName: name,
    cageCode:  cage,
    physicalAddress: {
      addressLine1:        safeText(va.streetAddress || va['ns1:streetAddress']),
      city:                safeText(va.city          || va['ns1:city']),
      stateOrProvinceCode: safeText(va.state         || va['ns1:state']),
      zipCode:             safeText(va.ZIPCode        || va['ns1:ZIPCode']),
      countryCode:         safeText(va.countryCode    || va['ns1:countryCode']) || 'USA',
    },
    contactPhone: safeText(vendor?.vendorPhoneNum || vendor?.['ns1:vendorPhoneNum']),
    primaryNaics: naics,
    naicsCodes:   naics ? [{ code: naics, isPrimary: true }] : [],
    totalContractsWon: 1,
    totalAwardAmount:  amount,
  };
};

const fetchFpdsPage = async (start, size = 100) => {
  const res = await axios.get(FPDS_ATOM, {
    params: { FEEDNAME: 'PUBLIC', q: '*', start, SIZE: size },
    timeout: 12000,
    headers: { Accept: 'application/atom+xml,application/xml,text/xml' },
  });
  return parser.parse(res.data);
};

export const syncFpdsCompanies = async (maxPages = 30) => {
  if (fpdsSyncStats.isSyncing) return { success: false, message: 'Already syncing' };

  fpdsSyncStats.isSyncing   = true;
  fpdsSyncStats.lastError   = null;
  fpdsSyncStats.savedCount  = 0;
  fpdsSyncStats.newCount    = 0;
  fpdsSyncStats.currentPage = 0;

  console.log('\n📋 FPDS.gov Company Sync starting…');

  let saved = 0, newCount = 0;
  const PAGE_SIZE = 100;

  try {
    for (let page = 0; page < maxPages; page++) {
      fpdsSyncStats.currentPage = page + 1;
      const start = page * PAGE_SIZE;

      let parsed;
      try {
        parsed = await fetchFpdsPage(start, PAGE_SIZE);
      } catch (err) {
        console.error(`FPDS page ${page} error:`, err.message);
        break;
      }

      const feed    = parsed?.feed || parsed;
      const entries = (Array.isArray(feed?.entry) ? feed.entry : feed?.entry ? [feed.entry] : []);

      if (!entries.length) {
        console.log(`  ℹ️  FPDS page ${page}: no entries — stopping`);
        break;
      }

      for (const entry of entries) {
        const vendorData = extractVendor(entry);
        if (!vendorData) continue;

        try {
          const { isNew } = await upsertCompany(vendorData, 'fpds');
          saved++;
          if (isNew) newCount++;
        } catch (err) {
          if (err.code !== 11000) console.error('FPDS upsert error:', err.message);
        }
      }

      console.log(`  ✅ FPDS page ${page + 1}: ${entries.length} entries processed (total saved: ${saved})`);
      if (entries.length < PAGE_SIZE) break; // last page
      await sleep(500);
    }

    fpdsSyncStats.savedCount = saved;
    fpdsSyncStats.newCount   = newCount;
    fpdsSyncStats.lastSyncAt = new Date();
    console.log(`✅ FPDS sync done: ${saved} saved (${newCount} new)\n`);
    return { success: true, saved, newCount };

  } catch (err) {
    fpdsSyncStats.lastError = err.message;
    console.error('❌ FPDS sync error:', err.message);
    return { success: false, message: err.message };
  } finally {
    fpdsSyncStats.isSyncing = false;
  }
};
