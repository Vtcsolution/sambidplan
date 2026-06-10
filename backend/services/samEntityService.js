// backend/services/samEntityService.js
// Fetches active federal contractor registrations from SAM.gov Entity Management API v3
// and upserts them into the SamCompany collection.

import axios from 'axios';
import SamCompany from '../models/SamCompany.js';
import { samFetch, limiterState, hasQuota, quotaState } from './samRateLimiter.js';
import { upsertCompany } from './companyMergeService.js';

const ENTITY_API_URL = 'https://api.sam.gov/entity-information/v3/entities';

// In-memory sync status — survives per process lifetime
export const entitySyncStats = {
  lastSyncAt:        null,
  totalCompanies:    0,
  newToday:          0,
  lastSyncDuration:  0,
  isSyncing:         false,
  lastError:         null,
  currentPage:       0,
  totalPages:        0,
  savedSoFar:        0,
  status:            'idle', // 'idle' | 'running' | 'rate_limited' | 'completed' | 'error'
  rateLimitedUntil:  null,
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Map one raw SAM entity object → our SamCompany shape
const transformEntity = (entity) => {
  const reg      = entity.entityRegistration || {};
  const core     = entity.coreData           || {};
  const addr     = core.physicalAddress      || {};
  const mail     = core.mailingAddress       || {};
  const genInfo  = core.generalInformation   || {};
  const pocs     = entity.pointsOfContact    || {};
  const asserted = entity.assertedData       || {};

  // Primary contact: prefer governmentBusinessPOC, fall back to electronicBusinessPOC
  const govPOC = pocs.governmentBusinessPOC   || {};
  const ebPOC  = pocs.electronicBusinessPOC    || {};
  const poc    = govPOC.emailAddress ? govPOC : ebPOC;

  // Collect unique emails + phones from ALL POC types SAM.gov provides
  const allPocTypes = [
    pocs.governmentBusinessPOC,
    pocs.electronicBusinessPOC,
    pocs.alternateGovernmentBusinessPOC,
    pocs.alternateElectronicBusinessPOC,
    pocs.pastPerformancePOC,
    pocs.alternatePastPerformancePOC,
  ].filter(Boolean);
  const allEmails = [...new Set(
    allPocTypes.map(p => (p.emailAddress || '').trim().toLowerCase()).filter(Boolean)
  )];
  const allPhones = [...new Set(
    allPocTypes.map(p => (p.telephoneNumber || '').trim()).filter(Boolean)
  )];

  const btList    = core.businessTypes?.businessTypeList    || [];
  const sbaBtList = core.businessTypes?.sbaBusinessTypeList || [];

  const naicsRaw  = asserted.naicsCode || [];
  const naicsCodes = naicsRaw.map(n => ({
    code:        String(n.naicsCode || ''),
    description: n.naicsDescription || '',
    isPrimary:   n.isPrimary === 'Y' || n.isPrimary === true,
  }));
  const primaryNaics = naicsCodes.find(n => n.isPrimary)?.code || naicsCodes[0]?.code || '';

  return {
    ueiSAM:                   reg.ueiSAM                     || '',
    cageCode:                  reg.cageCode                    || '',
    legalBusinessName:         reg.legalBusinessName           || core.entityInformation?.entityName || '',
    dbaName:                   reg.dbaName                     || '',
    registrationStatus:        reg.registrationStatus          || 'Active',
    purposeOfRegistration:     reg.purposeOfRegistrationDesc   || '',
    registrationDate:          reg.registrationDate          ? new Date(reg.registrationDate)          : null,
    lastUpdateDate:            reg.lastUpdateDate             ? new Date(reg.lastUpdateDate)             : null,
    registrationExpirationDate: reg.registrationExpirationDate ? new Date(reg.registrationExpirationDate) : null,
    physicalAddress: {
      addressLine1:        addr.addressLine1        || '',
      addressLine2:        addr.addressLine2        || '',
      city:                addr.city                || '',
      stateOrProvinceCode: addr.stateOrProvinceCode || '',
      zipCode:             addr.zipCode             || '',
      countryCode:         addr.countryCode         || 'USA',
    },
    mailingAddress: {
      addressLine1:        mail.addressLine1        || '',
      addressLine2:        mail.addressLine2        || '',
      city:                mail.city                || '',
      stateOrProvinceCode: mail.stateOrProvinceCode || '',
      zipCode:             mail.zipCode             || '',
      countryCode:         mail.countryCode         || 'USA',
    },
    naicsCodes,
    primaryNaics,
    entityType:           genInfo.entityTypeDesc      || '',
    entityStructure:      genInfo.entityStructureDesc || '',
    businessTypes:        btList.map(bt    => bt.businessTypeDesc    || bt.businessTypeCode    || '').filter(Boolean),
    sbaBusinessTypes:     sbaBtList.map(bt => bt.sbaBusinessTypeDesc || bt.sbaBusinessTypeCode || '').filter(Boolean),
    contactEmail:         poc.emailAddress?.trim().toLowerCase() || '',
    allEmails,
    contactPhone:         poc.telephoneNumber?.trim() || '',
    allPhones,
    contactName:          [poc.firstName, poc.middleInitial, poc.lastName].filter(Boolean).join(' '),
    website:              core.entityInformation?.entityURL || '',
    stateOfIncorporation: genInfo.stateOfIncorporationCode  || '',
    countryOfIncorporation: genInfo.countryOfIncorporationCode || '',
    lastFetched:          new Date(),
  };
};

// Fetch a single page — routes through shared rate-limiter queue
const fetchEntityPage = async (apiKey, page = 0, pageSize = 100) => {
  const url = `${ENTITY_API_URL}?api_key=${apiKey}&registrationStatus=A&purposeOfRegistrationCode=Z1&page=${page}&size=${pageSize}`;
  const res = await samFetch(() =>
    axios.get(url, { timeout: 60000, headers: { Accept: 'application/json' } })
  );
  return res.data;
};

// ── Main sync: paginate through all active federal contractors and upsert to DB
// maxPages: hard cap on pages to fetch in one run (each page = 100 companies).
// Pass null / 0 to fetch everything (can take a very long time for 700k+ records).
export const syncSamEntities = async (maxPages = 100) => {
  if (entitySyncStats.isSyncing) {
    return { success: false, message: 'Sync already in progress' };
  }

  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) {
    return { success: false, message: 'SAM_API_KEY not configured' };
  }

  // Quota check — need at least 5 requests to be worthwhile
  if (!hasQuota(5)) {
    const q = quotaState();
    const msg = `SAM.gov daily quota exhausted (${q.used}/${q.limit} used). Entity sync will resume tomorrow.`;
    console.warn('⚠️ ' + msg);
    entitySyncStats.status    = 'quota_exhausted';
    entitySyncStats.lastError = msg;
    return { success: false, message: msg, code: 'QUOTA_EXHAUSTED' };
  }

  entitySyncStats.isSyncing        = true;
  entitySyncStats.lastError        = null;
  entitySyncStats.currentPage      = 0;
  entitySyncStats.totalPages       = 0;
  entitySyncStats.savedSoFar       = 0;
  entitySyncStats.status           = 'running';
  entitySyncStats.rateLimitedUntil = null;

  const startTime  = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let totalSaved     = 0;
  let totalProcessed = 0;
  let page           = 0;
  const pageSize     = 100;

  console.log('\n' + '='.repeat(70));
  console.log('🏢 SAM ENTITY SYNC — Active Federal Contractors');
  console.log('   Time:', new Date().toISOString());
  if (maxPages) console.log(`   Cap: ${maxPages} pages (~${maxPages * pageSize} companies)`);
  console.log('='.repeat(70));

  try {
    while (true) {
      entitySyncStats.currentPage = page;
      console.log(`📡 Fetching entity page ${page}…`);

      let pageData;
      try {
        pageData = await fetchEntityPage(apiKey, page, pageSize);
      } catch (err) {
        const isQuota = err.code === 'QUOTA_EXHAUSTED' || err.code === 'RATE_LIMITED';
        const msg = isQuota
          ? `API quota/rate-limit reached on page ${page} — stopping. ${quotaState().used}/${quotaState().limit} daily requests used.`
          : `Page ${page} fetch failed: ${err.message}`;
        console.warn('⚠️ ' + msg);
        entitySyncStats.lastError = msg;
        entitySyncStats.status    = isQuota ? 'quota_exhausted' : 'error';
        break; // save what we have; never crash the whole sync
      }

      if (!pageData) break;

      if (pageData.error || pageData.message) {
        const msg = pageData.error || pageData.message;
        console.error('❌ SAM API error response:', msg);
        entitySyncStats.lastError = msg;
        entitySyncStats.status    = 'error';
        break;
      }

      if (page === 0) {
        const total = pageData.totalRecords || 0;
        const estimatedPages = Math.ceil(total / pageSize);
        const capped = maxPages ? Math.min(maxPages, estimatedPages) : estimatedPages;
        entitySyncStats.totalPages = capped;
        console.log(`📊 SAM.gov reports ${total.toLocaleString()} total active entities (~${estimatedPages} pages, fetching up to ${capped})`);
      }

      const entities = pageData.entityData || [];
      if (!entities.length) {
        console.log(`ℹ️  Page ${page} empty — stopping`);
        break;
      }

      // Upsert this page — uses smart dedup (UEI → CAGE → name+state → name-only)
      let pageSaved = 0;
      for (const entity of entities) {
        try {
          const data = transformEntity(entity);
          if (!data.ueiSAM) continue;
          await upsertCompany(data, 'sam');
          pageSaved++;
        } catch (err) {
          if (err.code !== 11000) console.error('Upsert error:', err.message);
        }
      }

      totalProcessed          += entities.length;
      totalSaved              += pageSaved;
      entitySyncStats.savedSoFar = totalSaved;
      console.log(`✅ Page ${page}: ${pageSaved}/${entities.length} saved  (running total: ${totalSaved})`);

      page++;
      entitySyncStats.currentPage = page;

      // Mirror limiter rate-limit state into sync stats for frontend display
      entitySyncStats.rateLimitedUntil = limiterState.rateLimitedUntil;
      entitySyncStats.status = limiterState.isRateLimited ? 'rate_limited' : 'running';

      if (maxPages && page >= maxPages) {
        console.log(`⏹️  Reached maxPages cap (${maxPages}) — stopping`);
        break;
      }

      if (entities.length < pageSize) {
        console.log('ℹ️  Last page reached (partial page) — stopping');
        break;
      }
      // No manual sleep needed — samFetch enforces 800ms between requests
    }

    const duration    = Math.round((Date.now() - startTime) / 1000);
    const newToday    = await SamCompany.countDocuments({ firstSeenAt: { $gte: todayStart } });
    const totalInDB   = await SamCompany.countDocuments();

    entitySyncStats.lastSyncAt        = new Date();
    entitySyncStats.totalCompanies    = totalInDB;
    entitySyncStats.newToday          = newToday;
    entitySyncStats.lastSyncDuration  = duration;
    entitySyncStats.currentPage       = page;
    entitySyncStats.status            = 'completed';
    entitySyncStats.rateLimitedUntil  = null;

    console.log(`\n🎉 Sync complete — ${totalSaved} saved (${newToday} new today) in ${duration}s`);
    console.log('='.repeat(70) + '\n');

    return { success: true, totalSaved, newToday, totalCompanies: totalInDB, duration };
  } catch (err) {
    entitySyncStats.lastError        = err.message;
    entitySyncStats.status           = 'error';
    entitySyncStats.rateLimitedUntil = null;
    console.error('❌ Entity sync error:', err.message);
    return { success: false, message: err.message };
  } finally {
    entitySyncStats.isSyncing = false;
  }
};

// Dynamic-quota wrapper — uses whatever SAM.gov quota remains today minus a
// reserve for the day's opportunity fetches (hourly master + nightly bulk).
export const syncSamEntitiesDynamic = async (reserveForOpportunities = 200) => {
  const q = quotaState();
  const maxPages = Math.max(10, q.remaining - reserveForOpportunities);
  console.log(`   Dynamic quota: ${q.remaining} remaining, reserving ${reserveForOpportunities} for opportunities → up to ${maxPages} entity pages (~${maxPages * 100} companies)`);
  return syncSamEntities(maxPages);
};

// Fetch & upsert one company by UEI (used by the "Add Company" button in admin)
export const fetchAndSaveCompany = async (ueiSAM) => {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) return { success: false, message: 'SAM_API_KEY not configured' };

  try {
    const res = await axios.get(ENTITY_API_URL, {
      params:  { api_key: apiKey, ueiSAM, size: 1 },
      timeout: 30000,
      headers: { Accept: 'application/json' },
    });

    const entities = res.data?.entityData || [];
    if (!entities.length) return { success: false, message: 'Company not found in SAM.gov' };

    const data = transformEntity(entities[0]);
    if (!data.ueiSAM) return { success: false, message: 'Invalid entity data returned' };

    const company = await SamCompany.findOneAndUpdate(
      { ueiSAM: data.ueiSAM },
      { $set: data, $setOnInsert: { firstSeenAt: new Date() } },
      { upsert: true, new: true }
    );

    return { success: true, data: company };
  } catch (err) {
    console.error('fetchAndSaveCompany error:', err.message);
    return { success: false, message: err.response?.data?.message || err.message };
  }
};
