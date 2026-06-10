// backend/services/prospectFetchService.js
//
// Two-phase design — survives server restarts:
//
//   Phase 1 (fast, ~minutes): Collect from USASpending + FPDS + SAM.gov.
//     Every company is upserted to the Prospect collection immediately.
//     SAM entities already include email/phone from POC — saved right away.
//     USASpending/FPDS companies are saved with enrichmentAttempted=false.
//
//   Phase 2 (slow, hours, DB-checkpointed): Enrich.
//     Queries DB for { enrichmentAttempted: false }.
//     For each: try website discovery → contact scraping → SBA → CAGE.
//     Updates the record; marks enrichmentAttempted=true whether found or not.
//     Companies with nothing found after all methods are deleted.
//     Restart-safe: just re-query for enrichmentAttempted=false to resume.

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import Prospect from '../models/Prospect.js';
import { findWebsite, enrichContacts, validateWebsite } from './contactEnrichmentService.js';
import { samFetch, hasQuota } from './samRateLimiter.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Shared sync state ─────────────────────────────────────────────────────────
export const prospectSyncState = {
  isRunning:          false,
  phase:              'idle',   // idle | phase1_usa | phase1_fpds | phase1_sam | phase2 | done
  phase1Done:         false,
  phase1Saved:        0,        // companies saved in Phase 1
  phase2Total:        0,        // companies queued for enrichment
  phase2Progress:     0,
  phase2Saved:        0,
  phase2Deleted:      0,
  percentComplete:    0,
  startedAt:          null,
  lastError:          null,
};

// ── Upsert helper (called in Phase 1) ────────────────────────────────────────
const upsertProspect = async (doc) => {
  const filter = doc.uei      ? { uei:      doc.uei }
    : doc.cageCode ? { cageCode: doc.cageCode }
    : { companyName: doc.companyName };

  await Prospect.findOneAndUpdate(filter, { $set: doc }, {
    upsert: true, new: true, setDefaultsOnInsert: true,
  });
};

const safeName = v => {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object') return (v['#text'] || v['_'] || '').toString().trim();
  return String(v).trim();
};

// ── Phase 1a: USASpending.gov ──────────────────────────────────────────────────
const USA_SEARCH = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';

const phase1_USASpending = async () => {
  prospectSyncState.phase = 'phase1_usa';
  let page = 1, saved = 0;
  console.log('\n📊 Phase 1a — USASpending: fetching all contract recipients…');

  while (true) {
    if (!prospectSyncState.isRunning) break;
    let data;
    try {
      const body = {
        filters: {
          award_type_codes: ['A','B','C','D'],
          time_period: [{
            start_date: new Date(Date.now() - 5 * 365 * 86400000).toISOString().slice(0,10),
            end_date:   new Date().toISOString().slice(0,10),
          }],
        },
        fields: [
          'Recipient Name','recipient_uei','Award Amount','naics_code','naics_description',
          'Place of Performance State Code','Place of Performance City Name',
          'cage_code','awarding_agency_name','award_type','Action Date',
        ],
        limit: 100, page, sort: 'Award Amount', order: 'desc',
      };
      const res = await axios.post(USA_SEARCH, body, { timeout: 45000 });
      data = res.data;
    } catch (err) { console.warn(`  USASpending p${page}: ${err.message}`); break; }

    const results = data?.results || [];
    if (!results.length) break;

    for (const r of results) {
      const name = (r['Recipient Name'] || '').trim();
      const uei  = (r['recipient_uei']  || '').trim();
      const cage = (r['cage_code']      || '').trim();
      if (!name && !uei) continue;

      const amount   = r['Award Amount'] || 0;
      const priority = amount >= 1_000_000 ? 'high' : amount >= 100_000 ? 'medium' : 'low';

      try {
        await upsertProspect({
          companyName:        name || 'Unknown',
          uei:                uei  || undefined,
          cageCode:           cage || undefined,
          naicsCode:          (r['naics_code'] || '').toString() || undefined,
          naicsDescription:   r['naics_description'] || undefined,
          state:              r['Place of Performance State Code'] || undefined,
          city:               r['Place of Performance City Name']  || undefined,
          totalAwardAmount:   amount,
          totalContractsWon:  1,
          agenciesWorkedWith: [r['awarding_agency_name']].filter(Boolean),
          contractTypes:      [r['award_type']].filter(Boolean),
          lastContractDate:   r['Action Date'] ? new Date(r['Action Date']) : undefined,
          priority,
          dataSource:         ['usaspending'],
          enrichmentAttempted: false,
        });
        saved++;
      } catch { /* duplicate / write error — skip */ }
    }

    prospectSyncState.phase1Saved = saved;
    const total      = data?.page_metadata?.total || 0;
    const totalPages = total ? Math.ceil(total / 100) : null;
    const pct        = totalPages ? Math.round((page / totalPages) * 33) : 0;
    prospectSyncState.percentComplete = pct;

    if (page % 10 === 0) {
      console.log(`  USASpending p${page}${totalPages ? '/'+totalPages : ''}: ${saved.toLocaleString()} saved to DB`);
    }
    if (results.length < 100 || (totalPages && page >= totalPages)) break;
    page++;
    await sleep(500);
  }
  console.log(`✅ USASpending done: ${page} pages, ${saved.toLocaleString()} companies saved`);
};

// ── Phase 1b: FPDS.gov ─────────────────────────────────────────────────────────
const FPDS_ATOM  = 'https://www.fpds.gov/ezsearch/FEEDS/ATOM';
const fpdsParser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: '@_',
  removeNSPrefix: true, isArray: n => n === 'entry',
});

const phase1_FPDS = async () => {
  prospectSyncState.phase = 'phase1_fpds';
  let offset = 0, saved = 0;
  const PAGE = 10;
  console.log('\n📋 Phase 1b — FPDS.gov: fetching all contract vendors…');

  while (true) {
    if (!prospectSyncState.isRunning) break;
    let entries = [];
    try {
      const res = await axios.get(FPDS_ATOM, {
        params: { q: 'CONTRACT', START: offset, FEEDTYPE: 'ATOM', INDEXPAGE: 1 },
        timeout: 45000, responseType: 'text',
        headers: { Accept: 'application/atom+xml, text/xml, */*' },
      });
      const feed = fpdsParser.parse(res.data);
      entries = feed?.feed?.entry || [];
    } catch (err) { console.warn(`  FPDS offset ${offset}: ${err.message}`); break; }
    if (!entries.length) break;

    for (const entry of entries) {
      const content = entry?.content;
      const award   = content?.award     || content;
      const vendor  = award?.vendor      || {};
      const va      = vendor?.vendorAddress || {};
      const amounts = award?.amounts     || {};
      const prodSvc = award?.productOrServiceInformation || {};

      const name = safeName(vendor?.vendorName);
      const cage = safeName(vendor?.cageCode);
      if (!name && !cage) continue;

      const amount   = parseFloat(safeName(amounts?.totalObligatedAmount) || '0');
      const priority = amount >= 1_000_000 ? 'high' : amount >= 100_000 ? 'medium' : 'low';

      try {
        await upsertProspect({
          companyName:        name || cage || 'Unknown',
          cageCode:           cage || undefined,
          naicsCode:          safeName(prodSvc?.NAICSCode || prodSvc?.naicsCode) || undefined,
          state:              safeName(va?.State || va?.stateOrProvinceCode) || undefined,
          city:               safeName(va?.city) || undefined,
          totalAwardAmount:   amount,
          totalContractsWon:  1,
          priority,
          dataSource:         ['fpds'],
          enrichmentAttempted: false,
        });
        saved++;
      } catch { /* skip */ }
    }

    prospectSyncState.phase1Saved = (prospectSyncState.phase1Saved || 0) + 0; // keep running total
    if (offset % 1000 === 0) console.log(`  FPDS offset ${offset}: ${saved.toLocaleString()} saved`);
    if (entries.length < PAGE) break;
    offset += PAGE;
    await sleep(500);
  }
  console.log(`✅ FPDS done: offset ${offset}, ${saved.toLocaleString()} companies saved`);
};

// ── Phase 1c: SAM.gov entities ────────────────────────────────────────────────
const SAM_ENTITY_URL = 'https://api.sam.gov/entity-information/v3/entities';
const SAM_API_KEY    = process.env.SAM_API_KEY;

const phase1_SAM = async () => {
  if (!SAM_API_KEY) { console.warn('⚠️  SAM_API_KEY missing — skipping SAM entity fetch'); return; }
  prospectSyncState.phase = 'phase1_sam';
  let page = 1, totalPages = null, saved = 0;
  console.log('\n🏛️  Phase 1c — SAM.gov: fetching all active registered entities…');

  while (true) {
    if (!prospectSyncState.isRunning) break;
    if (!hasQuota(1)) { console.warn('  SAM quota exhausted — stopping'); break; }

    let data;
    try {
      data = await samFetch(async () => {
        const res = await axios.get(SAM_ENTITY_URL, {
          params: {
            api_key: SAM_API_KEY,
            registrationStatus: 'A',
            purposeOfRegistrationCode: 'Z2',
            includeSections: 'entityRegistration,coreData,pointsOfContact,assertions',
            page, size: 100,
          },
          timeout: 30000,
        });
        return res.data;
      });
    } catch (err) { console.warn(`  SAM p${page}: ${err.message}`); break; }

    const entities = data?.entityData || [];
    if (!entities.length) break;

    if (!totalPages && data?.totalRecords) {
      totalPages = Math.ceil(data.totalRecords / 100);
      console.log(`  SAM.gov: ~${data.totalRecords.toLocaleString()} entities (~${totalPages} pages)`);
    }

    for (const entity of entities) {
      const reg    = entity.entityRegistration || {};
      const core   = entity.coreData           || {};
      const addr   = core.physicalAddress      || {};
      const pocs   = entity.pointsOfContact    || {};
      const govPOC = pocs.governmentBusinessPOC || {};
      const ebPOC  = pocs.electronicBusinessPOC  || {};
      const poc    = govPOC.emailAddress ? govPOC : ebPOC;

      const asserted    = entity.assertedData || {};
      const naicsRaw    = asserted.naicsCode  || [];
      const primaryNaics = naicsRaw.find(n => n.isPrimary === 'Y')?.naicsCode || naicsRaw[0]?.naicsCode || '';

      const uei  = reg.ueiSAM           || '';
      const cage = reg.cageCode          || '';
      const name = reg.legalBusinessName || core.entityInformation?.entityName || '';
      if (!uei && !cage && !name) continue;

      const rawUrl   = core.entityInformation?.entityURL || '';
      const emails   = [govPOC.emailAddress, ebPOC.emailAddress].filter(Boolean);
      const phones   = [govPOC.phoneNumber,  ebPOC.phoneNumber ].filter(Boolean);
      const hasEmail = emails.length > 0;
      const hasPhone = phones.length > 0;
      const hasWeb   = !!rawUrl;

      // SAM entities: enrichmentAttempted=true if we already have email/phone
      // Mark pending only if both email and phone are missing (still need scraping)
      const needsEnrichment = !hasEmail && !hasPhone && !hasWeb;

      try {
        await upsertProspect({
          companyName:        name || 'Unknown',
          uei:                uei  || undefined,
          cageCode:           cage || undefined,
          naicsCode:          primaryNaics || undefined,
          naicsDescription:   naicsRaw.find(n => n.naicsCode === primaryNaics)?.naicsDescription || undefined,
          state:              addr.stateOrProvinceCode || undefined,
          city:               addr.city   || undefined,
          zipCode:            addr.zipCode || undefined,
          website:            rawUrl || undefined,
          rawWebsite:         rawUrl || undefined,
          allWebsites:        rawUrl ? [rawUrl] : [],
          websiteStatus:      rawUrl ? 'unknown' : undefined,
          websiteSource:      rawUrl ? 'sam' : undefined,
          primaryEmail:       emails[0] || undefined,
          allEmails:          emails,
          emailSource:        hasEmail ? 'sam' : undefined,
          primaryPhone:       phones[0] || undefined,
          allPhones:          phones,
          phoneSource:        hasPhone ? 'sam' : undefined,
          rawPhone:           phones[0] || undefined,
          contactPersonName:  [poc.firstName, poc.lastName].filter(Boolean).join(' ') || undefined,
          contactPersonTitle: poc.title || undefined,
          emailOnly:          hasEmail && !hasPhone && !hasWeb,
          phoneOnly:          hasPhone && !hasEmail && !hasWeb,
          websiteOnly:        hasWeb   && !hasEmail && !hasPhone,
          dataSource:         ['sam'],
          enrichmentAttempted: !needsEnrichment,
        });
        saved++;
      } catch { /* skip */ }
    }

    prospectSyncState.phase1Saved = saved;
    const pct = totalPages ? Math.round(66 + (page / totalPages) * 34) : 66;
    prospectSyncState.percentComplete = pct;

    if (page % 10 === 0 || page === 1)
      console.log(`  SAM p${page}${totalPages ? '/'+totalPages : ''}: ${saved.toLocaleString()} saved`);

    if (!totalPages || page >= totalPages) break;
    page++;
  }
  console.log(`✅ SAM done: ${page} pages, ${saved.toLocaleString()} companies saved`);
};

// ── Phase 2: Enrich (DB-checkpointed) ────────────────────────────────────────
const ENRICH_BATCH = 20;   // process 20 at a time
const ENRICH_CONCURRENCY = 5; // parallel enrichment workers

const phase2_Enrich = async () => {
  prospectSyncState.phase = 'phase2';

  const total = await Prospect.countDocuments({ enrichmentAttempted: false });
  prospectSyncState.phase2Total    = total;
  prospectSyncState.phase2Progress = 0;
  prospectSyncState.percentComplete = 0;

  console.log(`\n🔍 Phase 2 — Enriching ${total.toLocaleString()} companies with website + contact…`);
  if (total === 0) { console.log('  Nothing to enrich — all done!'); return; }

  let processed = 0, enriched = 0, deleted = 0;

  while (true) {
    if (!prospectSyncState.isRunning) { console.log('⏸  Enrichment paused by stop signal'); break; }

    // Always re-query: this is how we "resume" — DB state is the checkpoint
    const batch = await Prospect.find({ enrichmentAttempted: false })
      .sort({ totalAwardAmount: -1 })
      .limit(ENRICH_BATCH)
      .lean();

    if (!batch.length) break;

    // Process batch with limited parallelism
    const chunks = [];
    for (let i = 0; i < batch.length; i += ENRICH_CONCURRENCY) chunks.push(batch.slice(i, i + ENRICH_CONCURRENCY));

    for (const chunk of chunks) {
      if (!prospectSyncState.isRunning) break;
      await Promise.all(chunk.map(async (co) => {
        try {
          // ── Website discovery ─────────────────────────────────────────
          let websiteResult = null;
          if (co.website) {
            // Already has website from SAM — just validate it
            const v = await validateWebsite(co.website);
            if (v) websiteResult = { ...v, source: co.websiteSource || 'sam' };
          }
          if (!websiteResult) {
            websiteResult = await findWebsite(co);
          }

          // ── Contact discovery ─────────────────────────────────────────
          const forEnrich = { ...co, website: websiteResult?.url || co.website || null };
          const contact   = await enrichContacts(forEnrich);

          // ── Evaluate what we have ─────────────────────────────────────
          const hasWeb   = !!(websiteResult?.url || co.website);
          const hasEmail = !!contact?.primaryEmail;
          const hasPhone = !!contact?.primaryPhone;

          if (!hasWeb && !hasEmail && !hasPhone) {
            // Nothing found — delete this prospect
            await Prospect.findByIdAndDelete(co._id);
            deleted++;
            return;
          }

          // ── Build update ──────────────────────────────────────────────
          const priority = co.totalAwardAmount >= 1_000_000 ? 'high'
            : co.totalAwardAmount >= 100_000 ? 'medium' : 'low';

          await Prospect.findByIdAndUpdate(co._id, {
            $set: {
              website:           websiteResult?.url         || co.website || undefined,
              rawWebsite:        websiteResult?.rawUrl      || co.rawWebsite || undefined,
              allWebsites:       websiteResult?.url ? [websiteResult.url] : (co.allWebsites || []),
              websiteStatus:     websiteResult ? (websiteResult.valid ? 'active' : 'inactive') : (co.websiteStatus || 'unknown'),
              websiteSource:     websiteResult?.source      || co.websiteSource || undefined,
              websiteHttpStatus: websiteResult?.status      || undefined,
              primaryEmail:      contact?.primaryEmail      || co.primaryEmail || undefined,
              allEmails:         contact?.allEmails?.length ? contact.allEmails : (co.allEmails || []),
              emailSource:       contact?.emailSource       || co.emailSource || undefined,
              primaryPhone:      contact?.primaryPhone      || co.primaryPhone || undefined,
              allPhones:         contact?.allPhones?.length ? contact.allPhones : (co.allPhones || []),
              phoneSource:       contact?.phoneSource       || co.phoneSource || undefined,
              rawPhone:          contact?.rawPhone          || co.rawPhone || undefined,
              isGovEmail:        contact?.isGovEmail         ?? co.isGovEmail,
              isDisposableEmail: contact?.isDisposableEmail  ?? co.isDisposableEmail,
              contactPersonName:  contact?.contactPersonName  || co.contactPersonName || undefined,
              contactPersonTitle: contact?.contactPersonTitle || co.contactPersonTitle || undefined,
              emailOnly:   hasEmail && !hasPhone && !hasWeb,
              phoneOnly:   hasPhone && !hasEmail && !hasWeb,
              websiteOnly: hasWeb   && !hasEmail && !hasPhone,
              priority,
              enrichmentAttempted:   true,
              enrichmentAttemptedAt: new Date(),
            },
          });
          enriched++;
        } catch (err) {
          console.warn(`  Enrich error ${co.companyName}: ${err.message}`);
          // Mark as attempted so we don't keep retrying broken records
          await Prospect.findByIdAndUpdate(co._id, {
            $set: { enrichmentAttempted: true, enrichmentAttemptedAt: new Date() }
          }).catch(() => {});
        }
      }));
    }

    processed += batch.length;
    prospectSyncState.phase2Progress = processed;
    prospectSyncState.phase2Saved    = enriched;
    prospectSyncState.phase2Deleted  = deleted;
    prospectSyncState.percentComplete = total > 0 ? Math.round((processed / total) * 100) : 100;

    if (processed % 200 === 0 || processed <= ENRICH_BATCH) {
      console.log(`  Enriched ${processed.toLocaleString()}/${total.toLocaleString()} (${prospectSyncState.percentComplete}%) — found: ${enriched}, deleted: ${deleted}`);
    }
  }
  console.log(`✅ Enrichment done: ${enriched.toLocaleString()} enriched, ${deleted.toLocaleString()} deleted (no contact found)`);
};

// ── Public API ────────────────────────────────────────────────────────────────
export const startProspectSync = async ({ phase2Only = false, skipEnrich = false } = {}) => {
  if (prospectSyncState.isRunning) return { success: false, message: 'Already running' };

  Object.assign(prospectSyncState, {
    isRunning: true, startedAt: new Date().toISOString(), lastError: null,
    phase1Done: phase2Only, percentComplete: 0,
    phase1Saved: 0, phase2Total: 0, phase2Progress: 0, phase2Saved: 0, phase2Deleted: 0,
  });

  try {
    if (!phase2Only) {
      await phase1_USASpending();
      await phase1_FPDS();
      await phase1_SAM();
      prospectSyncState.phase1Done = true;
      const totalSaved = await Prospect.countDocuments();
      console.log(`\n✅ Phase 1 complete — ${totalSaved.toLocaleString()} companies in DB`);
    }
    if (!skipEnrich) {
      await phase2_Enrich();
      console.log('\n🎉 Full prospect sync complete');
    } else {
      const pending = await Prospect.countDocuments({ enrichmentAttempted: false });
      console.log(`\n✅ Collection complete — ${pending.toLocaleString()} companies pending enrichment`);
    }
    prospectSyncState.phase = 'done';
    prospectSyncState.percentComplete = 100;
    return { success: true };
  } catch (err) {
    prospectSyncState.lastError = err.message;
    console.error('Prospect sync error:', err.message);
    return { success: false, message: err.message };
  } finally {
    prospectSyncState.isRunning = false;
  }
};

// Resume = only run Phase 2 (Phase 1 already in DB)
export const resumeProspectEnrichment = async () => startProspectSync({ phase2Only: true });
export const stopProspectSync   = () => { prospectSyncState.isRunning = false; };
