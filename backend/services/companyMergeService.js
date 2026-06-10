// backend/services/companyMergeService.js
//
// Smart deduplication upsert for the SamCompany collection.
//
// Lookup priority:
//   1. UEI (ueiSAM)
//   2. CAGE code
//   3. Exact legalBusinessName + state  (case-insensitive)
//
// Every caller passes sourceName so we can track which platforms found each company.
// Priority is recomputed after every update: high = 3+ sources, medium = 2, low = 1.

import SamCompany from '../models/SamCompany.js';

const SOURCE_NAMES = ['sam', 'usaspending', 'fpds', 'sba'];

// Recompute priority based on how many distinct sources list this company
const calcPriority = (sources = []) => {
  const unique = new Set(sources.map(s => s.name)).size;
  if (unique >= 3) return 'high';
  if (unique === 2) return 'medium';
  return 'low';
};

// Merge a new source entry into the sources array (upsert by name)
const mergeSources = (existing = [], sourceName) => {
  const idx = existing.findIndex(s => s.name === sourceName);
  const entry = { name: sourceName, lastFetchedAt: new Date() };
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.push(entry);
  }
  return existing;
};

/**
 * upsertCompany(data, sourceName)
 *
 * data shape (all fields optional except at least one of ueiSAM / cageCode / legalBusinessName):
 * {
 *   ueiSAM, cageCode, legalBusinessName, dbaName,
 *   physicalAddress: { addressLine1, city, stateOrProvinceCode, zipCode, countryCode },
 *   naicsCodes: [{ code, description, isPrimary }],
 *   primaryNaics,
 *   contactEmail, allEmails, contactPhone, allPhones, contactName, website,
 *   entityType, businessTypes, sbaBusinessTypes,
 *   registrationStatus,
 *   totalContractsWon, totalAwardAmount,
 * }
 *
 * Returns: { doc, isNew }
 */
export const upsertCompany = async (data, sourceName) => {
  if (!SOURCE_NAMES.includes(sourceName)) {
    throw new Error(`Unknown sourceName: ${sourceName}`);
  }

  const uei   = data.ueiSAM?.trim()            || '';
  const cage  = data.cageCode?.trim()           || '';
  const name  = data.legalBusinessName?.trim()  || '';
  const state = data.physicalAddress?.stateOrProvinceCode?.trim()?.toUpperCase() || '';

  // ── 1. Find existing record ────────────────────────────────────────────
  let existing = null;

  const escName = name ? name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;

  if (uei) {
    existing = await SamCompany.findOne({ ueiSAM: uei });
  }
  if (!existing && cage) {
    existing = await SamCompany.findOne({ cageCode: cage });
  }
  if (!existing && escName && state) {
    existing = await SamCompany.findOne({
      legalBusinessName: { $regex: new RegExp(`^${escName}$`, 'i') },
      'physicalAddress.stateOrProvinceCode': state,
    });
  }
  // Name-only fallback — only when both UEI and CAGE are absent (e.g. USASpending records)
  // Prevents false deduplication when authoritative keys exist but differ.
  if (!existing && escName && !uei && !cage) {
    existing = await SamCompany.findOne({
      legalBusinessName: { $regex: new RegExp(`^${escName}$`, 'i') },
    });
  }

  // ── 2. Build the update payload ────────────────────────────────────────
  const updatedSources = mergeSources(existing?.sources || [], sourceName);

  // Only overwrite a field if incoming data has a non-empty value
  const set = {};
  const setIfPresent = (key, val) => { if (val !== undefined && val !== null && val !== '') set[key] = val; };

  setIfPresent('ueiSAM',            uei   || existing?.ueiSAM);
  setIfPresent('cageCode',          cage  || existing?.cageCode);
  setIfPresent('legalBusinessName', name  || existing?.legalBusinessName);
  setIfPresent('dbaName',           data.dbaName?.trim());
  setIfPresent('registrationStatus', data.registrationStatus);
  setIfPresent('contactEmail',      data.contactEmail?.trim().toLowerCase());
  setIfPresent('contactPhone',      data.contactPhone?.trim());
  setIfPresent('contactName',       data.contactName?.trim());

  // Merge allEmails — union of existing + incoming + contactEmail, lowercased + deduped
  {
    const incomingEmails = [
      ...(Array.isArray(data.allEmails) ? data.allEmails : []),
      data.contactEmail?.trim().toLowerCase() || '',
    ].map(e => e.toLowerCase()).filter(Boolean);
    if (incomingEmails.length > 0) {
      const existingSet = new Set((existing?.allEmails || []).map(e => e.toLowerCase()));
      const merged = [...(existing?.allEmails || [])];
      for (const email of incomingEmails) {
        if (!existingSet.has(email)) { merged.push(email); existingSet.add(email); }
      }
      set.allEmails = merged;
      if (!set.contactEmail && merged.length > 0) set.contactEmail = merged[0];
    }
  }

  // Merge allPhones — union of existing + incoming + contactPhone, deduped
  {
    const incomingPhones = [
      ...(Array.isArray(data.allPhones) ? data.allPhones : []),
      data.contactPhone?.trim() || '',
    ].filter(Boolean);
    if (incomingPhones.length > 0) {
      const existingSet = new Set(existing?.allPhones || []);
      const merged = [...(existing?.allPhones || [])];
      for (const phone of incomingPhones) {
        if (!existingSet.has(phone)) { merged.push(phone); existingSet.add(phone); }
      }
      set.allPhones = merged;
      if (!set.contactPhone && merged.length > 0) set.contactPhone = merged[0];
    }
  }
  setIfPresent('website',           data.website?.trim());
  setIfPresent('entityType',        data.entityType);
  setIfPresent('entityStructure',   data.entityStructure);
  setIfPresent('primaryNaics',      data.primaryNaics);
  setIfPresent('purposeOfRegistration',     data.purposeOfRegistration);
  setIfPresent('stateOfIncorporation',      data.stateOfIncorporation);
  setIfPresent('countryOfIncorporation',    data.countryOfIncorporation);
  if (data.registrationDate)           set.registrationDate           = data.registrationDate;
  if (data.lastUpdateDate)             set.lastUpdateDate             = data.lastUpdateDate;
  if (data.registrationExpirationDate) set.registrationExpirationDate = data.registrationExpirationDate;
  if (data.mailingAddress && Object.values(data.mailingAddress).some(Boolean)) {
    set.mailingAddress = { ...(existing?.mailingAddress?.toObject?.() || existing?.mailingAddress || {}), ...data.mailingAddress };
  }

  if (data.physicalAddress && Object.values(data.physicalAddress).some(Boolean)) {
    set.physicalAddress = { ...(existing?.physicalAddress?.toObject?.() || existing?.physicalAddress || {}), ...data.physicalAddress };
  }

  if (Array.isArray(data.naicsCodes) && data.naicsCodes.length > 0) {
    // Merge NAICS codes — add new ones, don't remove existing
    const existingCodes = (existing?.naicsCodes || []).map(n => n.code);
    const merged = [...(existing?.naicsCodes || [])];
    for (const n of data.naicsCodes) {
      if (!existingCodes.includes(n.code)) merged.push(n);
    }
    set.naicsCodes = merged;
  }

  if (Array.isArray(data.businessTypes) && data.businessTypes.length > 0) {
    set.businessTypes = [...new Set([...(existing?.businessTypes || []), ...data.businessTypes])];
  }

  if (Array.isArray(data.sbaBusinessTypes) && data.sbaBusinessTypes.length > 0) {
    set.sbaBusinessTypes = [...new Set([...(existing?.sbaBusinessTypes || []), ...data.sbaBusinessTypes])];
  }

  // Accumulate contract counts / amounts (add incoming delta to existing totals)
  if (data.totalContractsWon > 0) {
    set.totalContractsWon = (existing?.totalContractsWon || 0) + data.totalContractsWon;
  }
  if (data.totalAwardAmount > 0) {
    set.totalAwardAmount = (existing?.totalAwardAmount || 0) + data.totalAwardAmount;
  }

  set.sources    = updatedSources;
  set.priority   = calcPriority(updatedSources);
  set.lastFetched = new Date();

  // ── 3. Upsert ──────────────────────────────────────────────────────────
  if (existing) {
    await SamCompany.updateOne({ _id: existing._id }, { $set: set });
    return { doc: { ...existing.toObject(), ...set }, isNew: false };
  }

  // New record — need at least a UEI (generate placeholder if truly absent)
  const newUei = uei || `NOUEI-${cage || name.substring(0, 8).replace(/\s/g, '')}-${Date.now()}`;
  const doc = await SamCompany.create({
    ...set,
    ueiSAM:       newUei,
    firstSeenAt:  new Date(),
  });
  return { doc, isNew: true };
};

/**
 * getSourceBreakdown()
 * Returns counts per source, priority breakdown, and total unique companies.
 */
export const getSourceBreakdown = async () => {
  const [total, byPriority, bySamSource] = await Promise.all([
    SamCompany.countDocuments(),
    SamCompany.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    SamCompany.aggregate([
      { $unwind: '$sources' },
      { $group: { _id: '$sources.name', count: { $sum: 1 } } },
    ]),
  ]);

  const priority = { high: 0, medium: 0, low: 0 };
  byPriority.forEach(r => { if (priority[r._id] !== undefined) priority[r._id] = r.count; });

  const sources = {};
  bySamSource.forEach(r => { sources[r._id] = r.count; });

  return { total, priority, sources };
};
