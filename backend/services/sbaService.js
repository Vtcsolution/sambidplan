// backend/services/sbaService.js
// Fetches small businesses from SBA Dynamic Small Business Search (DSBS).
// Endpoint returns XML; parsed with fast-xml-parser.

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { upsertCompany } from './companyMergeService.js';

// SBA DSBS XML search endpoint
const DSBS_URL = 'https://web.sba.gov/pro-net/search/dsp_dsbs.cfm';

export const sbaSyncStats = {
  isSyncing:   false,
  lastSyncAt:  null,
  savedCount:  0,
  newCount:    0,
  lastError:   null,
  currentPage: 0,
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const parser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['company', 'COMPANY', 'record'].includes(name),
});

const safeText = v => {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object') return (v['#text'] || v['_'] || '').toString().trim();
  return String(v).trim();
};

// Extract company data from one DSBS XML record
const extractSbaCompany = (record) => {
  // DSBS XML field names vary; try common variants
  const name = safeText(
    record?.COMPANY_NAME || record?.company_name ||
    record?.FIRM_NAME    || record?.NAME || ''
  );
  const cage = safeText(record?.CAGE || record?.cage_code || record?.CAGE_CODE || '');
  const uei  = safeText(record?.UEI  || record?.uei       || record?.SAM_UEI   || '');

  if (!name && !cage && !uei) return null;

  const state = safeText(
    record?.STATE || record?.state_code || record?.STATE_CODE ||
    record?.PHYS_ADDR_STATE || ''
  ).toUpperCase();

  const naics = safeText(
    record?.PRIMARY_NAICS || record?.NAICS_CODE ||
    record?.naics_code    || ''
  );

  const phone = safeText(record?.PHONE || record?.PHONE_NUM || record?.phone || '');
  const email = safeText(record?.EMAIL || record?.email_address || record?.EMAIL_ADDRESS || '');

  const bizTypes = [];
  const sbaTypes = [];
  if (record?.SMALL_BUSINESS === 'Y' || record?.small_business === 'Y') sbaTypes.push('Small Business');
  if (record?.VETERAN_OWNED  === 'Y') sbaTypes.push('Veteran-Owned Small Business');
  if (record?.WOMEN_OWNED    === 'Y') sbaTypes.push('Women-Owned Small Business');
  if (record?.EIGHT_A        === 'Y') sbaTypes.push('8(a) Program');
  if (record?.HUBZONE        === 'Y') sbaTypes.push('HUBZone');
  if (record?.SDVOSB         === 'Y') sbaTypes.push('Service-Disabled Veteran-Owned Small Business');

  return {
    ueiSAM:            uei,
    cageCode:          cage,
    legalBusinessName: name,
    contactPhone:      phone,
    allPhones:         phone ? [phone] : [],
    contactEmail:      email ? email.toLowerCase() : '',
    allEmails:         email ? [email.toLowerCase()] : [],
    physicalAddress: {
      city:                safeText(record?.CITY  || record?.PHYS_ADDR_CITY  || ''),
      stateOrProvinceCode: state,
      zipCode:             safeText(record?.ZIP   || record?.PHYS_ADDR_ZIP   || ''),
      countryCode:         'USA',
    },
    primaryNaics: naics,
    naicsCodes:   naics ? [{ code: naics, isPrimary: true }] : [],
    businessTypes:    bizTypes,
    sbaBusinessTypes: sbaTypes,
    registrationStatus: 'Active',
  };
};

// Attempt to fetch one page from DSBS; returns parsed records array
const fetchSbaPage = async (start = 0, size = 100) => {
  const res = await axios.get(DSBS_URL, {
    params: {
      format:   'xml',
      size_code: '',
      q:        '',
      start,
      size,
    },
    timeout: 60000,
    headers: { 'Accept': 'text/xml,application/xml' },
  });
  const parsed = parser.parse(res.data);

  // Try various root element names DSBS might use
  const root    = parsed?.FIRMS || parsed?.firms || parsed?.RESULTS || parsed?.results || parsed;
  const records = root?.company || root?.COMPANY || root?.record || root?.FIRM || [];
  return Array.isArray(records) ? records : records ? [records] : [];
};

export const syncSbaCompanies = async (maxPages = 30) => {
  if (sbaSyncStats.isSyncing) return { success: false, message: 'Already syncing' };

  sbaSyncStats.isSyncing   = true;
  sbaSyncStats.lastError   = null;
  sbaSyncStats.savedCount  = 0;
  sbaSyncStats.newCount    = 0;
  sbaSyncStats.currentPage = 0;

  console.log('\n🏢 SBA DSBS Company Sync starting…');

  let saved = 0, newCount = 0;
  const PAGE_SIZE = 100;

  try {
    for (let page = 0; page < maxPages; page++) {
      sbaSyncStats.currentPage = page + 1;
      const start = page * PAGE_SIZE;

      let records;
      try {
        records = await fetchSbaPage(start, PAGE_SIZE);
      } catch (err) {
        if (page === 0) {
          // If SBA endpoint is unreachable or changed format, log and stop gracefully
          console.warn(`⚠️  SBA DSBS not reachable (${err.message}) — skipping source`);
          sbaSyncStats.lastError = `SBA DSBS unavailable: ${err.message}`;
          break;
        }
        console.error(`SBA page ${page} error:`, err.message);
        break;
      }

      if (!records.length) {
        console.log(`  ℹ️  SBA page ${page}: no records — stopping`);
        break;
      }

      for (const record of records) {
        const companyData = extractSbaCompany(record);
        if (!companyData) continue;

        try {
          const { isNew } = await upsertCompany(companyData, 'sba');
          saved++;
          if (isNew) newCount++;
        } catch (err) {
          if (err.code !== 11000) console.error('SBA upsert error:', err.message);
        }
      }

      console.log(`  ✅ SBA page ${page + 1}: ${records.length} records (saved: ${saved})`);
      if (records.length < PAGE_SIZE) break;
      await sleep(500);
    }

    sbaSyncStats.savedCount = saved;
    sbaSyncStats.newCount   = newCount;
    sbaSyncStats.lastSyncAt = new Date();
    console.log(`✅ SBA sync done: ${saved} saved (${newCount} new)\n`);
    return { success: true, saved, newCount };

  } catch (err) {
    sbaSyncStats.lastError = err.message;
    console.error('❌ SBA sync error:', err.message);
    return { success: false, message: err.message };
  } finally {
    sbaSyncStats.isSyncing = false;
  }
};
