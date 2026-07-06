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

import Opportunity from '../models/Opportunity.js';
import { samGetWithRotation, fetchSAMResourceLinks } from './samApiService.js';
import { getNaicsDescription, getPscDescription } from './codeDescriptions.js';

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

const NOTICE_TYPE_MAP = {
  'o': 'Solicitation', 'p': 'Presolicitation', 'k': 'Combined Synopsis/Solicitation',
  'r': 'Sources Sought', 's': 'Special Notice', 'i': 'Intent to Bundle',
  'a': 'Award Notice', 'u': 'Justification and Authorization',
  'g': 'Sale of Surplus Property', 'f': 'Foreign Government Standard',
};

const mapNoticeType = (type) => NOTICE_TYPE_MAP[type] || safeStr(type) || '';

const buildSamUrl = (opp) => {
  if (opp.uiLink) {
    const link = safeStr(opp.uiLink);
    if (link.includes('sam.gov')) return link;
    if (link) return `https://sam.gov${link.startsWith('/') ? '' : '/'}${link}`;
  }
  const nid = safeStr(opp.noticeId);
  if (nid && /^[a-f0-9]{32}$/i.test(nid.replace(/-/g, ''))) return `https://sam.gov/opp/${nid}/view`;
  const sol = safeStr(opp.solicitationNumber);
  if (sol && !sol.includes('SAMPLE')) return `https://sam.gov/search/?index=opp&q=${encodeURIComponent(sol)}&sort=-relevance`;
  return null;
};

const parseAgencyChain = (opp) => {
  const rawFPN = opp.fullParentPathName;
  const full = typeof rawFPN === 'object' && rawFPN !== null
    ? safeStr(rawFPN.name || rawFPN.description)
    : safeStr(rawFPN);
  const officeFromApi = safeStr(opp.office) || safeStr(opp.officeName);
  if (full) {
    const parts = full.split('.').map(p => p.trim()).filter(Boolean);
    const office = officeFromApi || parts[parts.length - 1] || '';
    const h = (office && parts[parts.length - 1] === office) ? parts.slice(0, -1) : parts;
    return {
      agency: full.replace(/\./g, ' > '), department: h[0] || '', subTier: h[1] || '',
      majorCommand: h[2] || '', subCommand1: h[3] || '', subCommand2: h[4] || '', subCommand3: h[5] || '', office,
    };
  }
  const dept = safeStr(opp.departmentOrAgency) || safeStr(opp.departmentName) || safeStr(opp.department) || safeStr(opp.agencyName) || '';
  const sub  = safeStr(opp.subTier) || safeStr(opp.subtierName) || safeStr(opp.subTierName) || '';
  return {
    agency: [dept, sub].filter(Boolean).join(' > ') || 'Federal Agency',
    department: dept, subTier: sub, majorCommand: '', subCommand1: '', subCommand2: '', subCommand3: '',
    office: officeFromApi || '',
  };
};

// Resolve a SAM.gov description field — when the API returns a URL instead of text,
// fetch the actual description text from that URL using the API key.
const resolveDescription = async (apiKey, descOrUrl) => {
  const desc = safeStr(descOrUrl);
  if (!desc) return 'No description available';
  if (desc.startsWith('http') && desc.includes('api.sam.gov')) {
    try {
      const sep = desc.includes('?') ? '&' : '?';
      const baseUrl = desc.replace(/[&?]api_key=[^&]*/i, '');
      const res = await samGetWithRotation(
        key => `${baseUrl}${sep}api_key=${key}`,
        { headers: { Accept: 'text/plain, text/html, application/json, */*' } }
      );
      let text = '';
      if (typeof res.data === 'string') {
        text = res.data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      } else if (res.data?.description) {
        text = safeStr(res.data.description);
      } else if (res.data?.content) {
        text = safeStr(res.data.content);
      } else {
        text = JSON.stringify(res.data);
      }
      return (text || desc).substring(0, 15000);
    } catch (e) {
      if (e.response?.status === 429) throw e; // all keys exhausted — let caller break the loop
      console.error('  resolveDescription failed:', e.message);
      return desc;
    }
  }
  return desc.substring(0, 15000);
};

const transformOpp = (opp) => {
  const noticeId = safeStr(opp.noticeId);
  const sourceId = safeStr(opp.solicitationNumber) || noticeId;
  if (!sourceId || sourceId.toLowerCase().includes('undefined')) return null;

  const agencyInfo  = parseAgencyChain(opp);
  const pop         = opp.placeOfPerformance || {};
  const rawCity     = typeof pop.city    === 'object' ? (pop.city?.name    || '') : safeStr(pop.city);
  const popCity     = /^\d{3,10}$/.test(rawCity.trim()) ? '' : rawCity;
  const popState    = typeof pop.state   === 'object' ? (pop.state?.name   || pop.state?.code   || '') : safeStr(pop.state);
  const popCountry  = typeof pop.country === 'object' ? (pop.country?.name || pop.country?.code || '') : safeStr(pop.country);
  const contacts    = Array.isArray(opp.pointOfContact) ? opp.pointOfContact : (opp.pointOfContact ? [opp.pointOfContact] : []);
  const awardData   = opp.award || {};
  const awardeeData = awardData.awardee || {};
  const awardeeLoc  = awardeeData.location || {};
  const offAddr     = opp.officeAddress || {};

  const resourceLinks = (opp.resourceLinks || opp.links || []).map((r, idx) => {
    const url  = typeof r === 'string' ? r : (r.url || r.uri || r.downloadUrl || r.resourceUrl || '');
    let   name = typeof r === 'string' ? '' : (r.name || r.fileName || r.title || '');
    if (!name && url) {
      try { const u = new URL(url); name = u.searchParams.get('filename') || u.searchParams.get('name') || ''; } catch {}
      if (!name) {
        const GENERIC = new Set(['download', 'files', 'resources', 'v1', 'v2', 'prod']);
        const seg = url.split('/').pop()?.split('?')[0] || '';
        if (seg && !GENERIC.has(seg.toLowerCase()) && seg.includes('.')) name = seg;
      }
    }
    return { url, name: name || `Document ${idx + 1}`, size: safeStr(r.size || r.fileSize || ''), type: safeStr(r.type || r.mimeType || '') };
  }).filter(r => r.url);

  return {
    source:         'sam',
    sourceId,
    title:          safeStr(opp.title) || 'Untitled Opportunity',
    description:    (safeStr(opp.description) || 'No description available').substring(0, 15000),
    agency:         agencyInfo.agency,
    estimatedValue: awardData.amount || opp.estimatedTotalValue || null,
    postedDate:     opp.postedDate     ? new Date(opp.postedDate)     : new Date(),
    dueDate:        opp.responseDeadLine ? new Date(opp.responseDeadLine) : null,
    naicsCode:      safeStr(opp.naicsCode) || '000000',
    pscCode:        safeStr(opp.classificationCode) || safeStr(opp.pscCode) || '',
    setAside:       safeStr(opp.typeOfSetAsideDescription) || safeStr(opp.typeOfSetAside) || safeStr(opp.setAside) || '',
    placeOfPerformance: {
      streetAddress:          safeStr(pop.streetAddress || pop.address1 || pop.street || ''),
      city:                   popCity,
      state:                  popState,
      zipCode:                safeStr(pop.zip || pop.zipCode),
      country:                popCountry,
      congressionalDistrict:  safeStr(pop.congressionalDistrict),
      county:                 safeStr(pop.county),
    },
    contactInfo: {
      name:  safeStr(contacts[0]?.fullName || contacts[0]?.name  || contacts[0]?.fullname || ''),
      email: safeStr(contacts[0]?.email || ''),
      phone: safeStr(contacts[0]?.phone || ''),
    },
    url:          buildSamUrl(opp) || `https://sam.gov/opp/${sourceId}/view`,
    resourceLinks,
    lastFetched:  new Date(),

    // Extended fields
    noticeId,
    noticeType:   mapNoticeType(opp.type),
    archiveDate:  opp.archiveDate  ? new Date(opp.archiveDate)  : null,
    archiveType:  safeStr(opp.archiveType),
    modifiedDate: opp.modifiedDate ? new Date(opp.modifiedDate) : null,
    department:   agencyInfo.department,
    subTier:      agencyInfo.subTier,
    majorCommand: agencyInfo.majorCommand,
    subCommand1:  agencyInfo.subCommand1,
    subCommand2:  agencyInfo.subCommand2,
    subCommand3:  agencyInfo.subCommand3,
    office:       agencyInfo.office,
    officeAddress: {
      streetAddress: safeStr(offAddr.address1 || offAddr.streetAddress || offAddr.street),
      city:          safeStr(offAddr.city),
      state:         safeStr(offAddr.state),
      zipCode:       safeStr(offAddr.zipcode || offAddr.zipCode),
      country:       safeStr(offAddr.countryCode || offAddr.country),
    },
    naicsDescription:   safeStr(opp.naicsDescription) || (typeof opp.naicsCode === 'object' ? safeStr(opp.naicsCode?.description) : '') || getNaicsDescription(opp.naicsCode),
    pscDescription:     safeStr(opp.pscDescription) || safeStr(opp.classificationDescription) || (typeof opp.classificationCode === 'object' ? safeStr(opp.classificationCode?.description) : '') || getPscDescription(opp.classificationCode),
    additionalInfoLink: safeStr(opp.additionalInfoLink),
    organizationType:   safeStr(opp.organizationType),
    relatedNotice:      safeStr(opp.relatedNotice || opp.relatedNoticeId),

    award: {
      date:   awardData.date   ? new Date(awardData.date)   : null,
      number: safeStr(awardData.number),
      amount: Number(awardData.amount) || null,
      awardee: {
        name:     safeStr(awardeeData.name),
        uei:      safeStr(awardeeData.ueiSAM || awardeeData.uei),
        cageCode: safeStr(awardeeData.cageCode),
        duns:     safeStr(awardeeData.duns),
        location: {
          streetAddress:          safeStr(awardeeLoc.streetAddress),
          city:    typeof awardeeLoc.city    === 'object' ? safeStr(awardeeLoc.city?.name)                          : safeStr(awardeeLoc.city),
          state:   typeof awardeeLoc.state   === 'object' ? safeStr(awardeeLoc.state?.name || awardeeLoc.state?.code) : safeStr(awardeeLoc.state),
          zipCode: safeStr(awardeeLoc.zip || awardeeLoc.zipCode),
          country: typeof awardeeLoc.country === 'object' ? safeStr(awardeeLoc.country?.name)                       : safeStr(awardeeLoc.country),
          congressionalDistrict: safeStr(awardeeLoc.congressionalDistrict),
        },
      },
    },

    performancePeriod: {
      startDate: opp.performanceStartDate ? new Date(opp.performanceStartDate) : null,
      endDate:   opp.performanceEndDate   ? new Date(opp.performanceEndDate)   : null,
    },

    pointOfContacts: contacts.map(c => ({
      type:     safeStr(c.type),
      fullName: safeStr(c.fullName || c.name || c.fullname),
      title:    safeStr(c.title),
      email:    safeStr(c.email),
      phone:    safeStr(c.phone),
      fax:      safeStr(c.fax),
    })).filter(c => c.fullName || c.email),
  };
};

// ─── Bulk page fetcher ────────────────────────────────────────────────────────
const fetchPage = async (_apiKey, postedFrom, postedTo, limit, offset, rdlFrom = null) => {
  let paramStr =
    `&postedFrom=${postedFrom}&postedTo=${postedTo}` +
    `&limit=${limit}&offset=${offset}&active=Yes`;
  if (rdlFrom) paramStr += `&rdlfrom=${rdlFrom}`; // only return records with deadline >= rdlFrom

  const resp = await samGetWithRotation(
    key => `${SAM_API_URL}?api_key=${key}${paramStr}`,
    { timeout: 60000, headers: { Accept: 'application/json' } }
  );

  const data = resp.data;
  if (!data || data.error || data.message) {
    throw new Error(data?.error || data?.message || 'Unknown SAM.gov error');
  }

  return data.opportunitiesData || data.opportunities || [];
};

// Retry wrapper — on 429 reads Retry-After header and waits, up to maxRetries times.
const fetchPageWithRetry = async (apiKey, postedFrom, postedTo, limit, offset, maxRetries = 4, rdlFrom = null) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchPage(apiKey, postedFrom, postedTo, limit, offset, rdlFrom);
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
const upsertOpp = async (doc) => {
  const { sourceId, description, ...rest } = doc;
  const isUrlDesc = description && description.startsWith('http') && description.includes('api.sam.gov');

  await Opportunity.findOneAndUpdate(
    { sourceId },
    {
      // Never overwrite a saved text description with a raw URL from SAM.gov.
      // If description is real text → always save it.
      // If description is a URL → only write it on brand-new inserts.
      $set: isUrlDesc ? rest : { ...rest, description },
      $setOnInsert: {
        fetchSource: 'bulk',
        ...(isUrlDesc ? { description } : {}),
      },
    },
    { upsert: true }
  );
};

// ─── Main bulk download ───────────────────────────────────────────────────────
export const runNightlyBulkDownload = async () => {
  if (!process.env.SAM_API_KEY) {
    console.error('❌ SAM_API_KEY missing — bulk download skipped');
    return { fetched: 0, saved: 0, skipped: 0, pages: 0 };
  }

  const from180 = new Date();
  from180.setDate(from180.getDate() - 180);
  from180.setHours(0, 0, 0, 0);

  const today      = new Date();
  const postedFrom = fmtDate(from180);
  const postedTo   = fmtDate(today);
  const rdlFrom    = fmtDate(today); // only active contracts (deadline >= today)
  const pageSize   = 1000;

  console.log('\n' + '═'.repeat(70));
  console.log('🌙 BULK DOWNLOAD  (SAM.gov → Global Opportunity Store)');
  console.log(`   Range  : ${postedFrom} → ${postedTo}  (posted in last 180 days)`);
  console.log(`   Filter : active only (deadline >= ${rdlFrom})`);
  console.log(`   Page   : ${pageSize} records/request (SAM.gov max)`);
  console.log('═'.repeat(70));

  let offset  = 0;
  let pages   = 0;
  let fetched = 0;
  let saved   = 0;
  let skipped = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const opps = await fetchPageWithRetry(null, postedFrom, postedTo, pageSize, offset, 4, rdlFrom);
      pages++;
      console.log(`  📄 Page ${pages} (offset=${offset}): ${opps.length} records`);

      for (const raw of opps) {
        const doc = transformOpp(raw);
        if (!doc) { skipped++; continue; }
        try {
          await upsertOpp(doc);
          saved++;
        } catch (err) {
          if (err.code === 11000) { skipped++; }
          else { console.error(`  ⚠️  Save error (${doc.sourceId}): ${err.message}`); skipped++; }
        }
      }

      fetched += opps.length;
      if (opps.length >= pageSize) {
        offset += pageSize;
        await new Promise(r => setTimeout(r, 8000));
      } else {
        hasMore = false;
      }
    } catch (err) {
      console.error(`  ❌ Page ${pages + 1} error: ${err.message}`);
      if (err.response?.status === 429) {
        console.error('  💤  Quota exhausted — bulk download will resume at next scheduled run');
      }
      hasMore = false;
    }
  }

  const totalInStore = await Opportunity.countDocuments();
  console.log('\n📊 Bulk Download Summary:');
  console.log(`   Pages   : ${pages} | Fetched: ${fetched} | Saved: ${saved} | Skipped: ${skipped}`);
  console.log(`   Total in DB: ${totalInStore}`);
  console.log('═'.repeat(70) + '\n');

  return { fetched, saved, skipped, pages, totalInStore };
};

// ─── Resolve all unresolved descriptions in the DB ───────────────────────────
// Queries for records whose description is still a SAM.gov URL, resolves them
// in batches of 1500 (2 keys × 1000/day minus buffer). Runs after every bulk
// download so ALL records eventually have real text — not just the first 200.
// No artificial limit — processes every active record with an unresolved description.
// Stops naturally when SAM.gov quota is exhausted (all keys return 429).
// Unfinished records are picked up on the next nightly run.
export const resolveAllPendingDescriptions = async () => {
  console.log('\n📝 Resolving ALL unresolved descriptions for active contracts...');

  const pending = await Opportunity.find({
    description: { $regex: /^https?:\/\/.*api\.sam\.gov/ },
    source: 'sam',
    dueDate: { $gt: new Date() },
  })
    .sort({ dueDate: 1 }) // soonest deadline first — most urgent contracts get text first
    .select('_id sourceId description')
    .lean();

  console.log(`   Found ${pending.length} active records with unresolved descriptions`);
  if (pending.length === 0) return 0;

  let resolved = 0;
  for (const rec of pending) {
    try {
      const text = await resolveDescription(null, rec.description);
      if (text && !text.startsWith('http')) {
        await Opportunity.updateOne({ _id: rec._id }, { $set: { description: text } });
        resolved++;
      }
    } catch (err) {
      if (err.response?.status === 429) {
        console.error(`  💤 All API keys quota exhausted — stopped after ${resolved} descriptions. Remaining will complete next night.`);
        break;
      }
      console.warn(`  ⚠️  Failed (${rec.sourceId}): ${err.message}`);
    }
    if (resolved > 0 && resolved % 100 === 0) {
      console.log(`  📝 Progress: ${resolved}/${pending.length}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`   ✅ Descriptions resolved: ${resolved}/${pending.length}`);
  return resolved;
};

// ─── Resolve resource links (PDFs/attachments) for all active records ─────────
// Queries for active records that have no resource links yet, fetches them from
// SAM.gov, and saves permanently. Runs after every nightly bulk download.
// No artificial limit — processes every active record that has no resource links yet.
// Stops naturally when SAM.gov quota is exhausted (all keys return 429).
// Unfinished records are picked up on the next nightly run.
export const resolveAllPendingResourceLinks = async () => {
  console.log('\n📎 Resolving resource links (PDFs/attachments) for ALL active contracts...');

  const pending = await Opportunity.find({
    resourceLinks: { $size: 0 },
    noticeId:      { $exists: true, $ne: '' },
    source:        'sam',
    dueDate:       { $gt: new Date() },
  })
    .sort({ dueDate: 1 }) // soonest deadline first
    .select('_id noticeId sourceId')
    .lean();

  console.log(`   Found ${pending.length} active records with no resource links checked yet`);
  if (pending.length === 0) return 0;

  let checked = 0;
  let withFiles = 0;
  for (const rec of pending) {
    try {
      const links = await fetchSAMResourceLinks(null, rec.noticeId);
      await Opportunity.updateOne({ _id: rec._id }, { $set: { resourceLinks: links } });
      checked++;
      if (links.length > 0) withFiles++;
    } catch (err) {
      if (err.response?.status === 429) {
        console.error(`  💤 All API keys quota exhausted — stopped after ${checked} resource checks. Remaining will complete next night.`);
        break;
      }
      console.warn(`  ⚠️  Resource links failed (${rec.noticeId?.slice(0,8)}...): ${err.message}`);
    }
    if (checked > 0 && checked % 100 === 0) {
      console.log(`  📎 Progress: ${checked}/${pending.length} checked, ${withFiles} had files`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`   ✅ Resource links: checked ${checked}/${pending.length}, ${withFiles} had attachments`);
  return withFiles;
};

// ─── Test bulk: exactly 10 records at a given offset — 1 API call per click ──
export const runBulkTest = async (offset = 0) => {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) return { fetched: 0, saved: 0, offset, message: 'SAM_API_KEY not set' };

  const from180 = new Date();
  from180.setDate(from180.getDate() - 180);
  const postedFrom = fmtDate(from180);
  const postedTo   = fmtDate(new Date());

  console.log(`\n🧪 TEST BULK — 10 records at offset ${offset} (1 API call)`);

  let saved = 0;
  try {
    const opps = await fetchPageWithRetry(apiKey, postedFrom, postedTo, 10, offset);
    for (const raw of opps) {
      const doc = transformOpp(raw);
      if (!doc) continue;
      // Resolve description URL — only 10 records so quota cost is acceptable
      doc.description = await resolveDescription(apiKey, doc.description);
      try { await upsertOpp(doc); saved++; } catch {}
    }
    console.log(`🧪 Test bulk done — offset ${offset}, fetched ${opps.length}, saved ${saved}`);
    return { fetched: opps.length, saved, offset, message: `Test bulk: ${saved} records saved (offset ${offset})` };
  } catch (err) {
    console.error('🧪 Test bulk error:', err.message);
    return { fetched: 0, saved: 0, offset, message: `Error: ${err.message}` };
  }
};

// ─── Stats export (used by admin dashboard) ───────────────────────────────────
export const bulkStats = {
  lastRunAt:    null,
  lastRunCount: 0,
  lastRunPages: 0,
  isRunning:    false,
};

// Full nightly pipeline — three steps in sequence:
//   1. Bulk fetch    : download ALL active SAM.gov records, save every field
//   2. Descriptions  : resolve URL → real text for EVERY active record (no cap)
//   3. Resource links: fetch PDFs/attachments for EVERY active record with none yet (no cap)
//
// No artificial limits — quota is the only natural stop.
// When ALL API keys return 429, each step breaks and logs how many were completed.
// Unfinished records are picked up automatically on the next nightly run.
// Add more SAM_API_KEY_N keys in .env to increase nightly throughput.
export const triggerBulkDownload = async () => {
  if (bulkStats.isRunning) {
    console.log('⏳ Bulk download already in progress — skipping');
    return null;
  }

  bulkStats.isRunning = true;
  try {
    // Step 1: download all active records from SAM.gov
    const result = await runNightlyBulkDownload();
    bulkStats.lastRunAt    = new Date();
    bulkStats.lastRunCount = result.saved;
    bulkStats.lastRunPages = result.pages;

    // Step 2: resolve descriptions (URL → full text) for ALL active records
    await resolveAllPendingDescriptions();

    // Step 3: fetch PDFs/attachments for ALL active records that have none yet
    await resolveAllPendingResourceLinks();

    return result;
  } finally {
    bulkStats.isRunning = false;
  }
};
