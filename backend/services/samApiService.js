// backend/services/samApiService.js
import axios from 'axios';
import Opportunity from '../models/Opportunity.js';
import { samFetch } from './samRateLimiter.js';
import { getNaicsDescription, getPscDescription } from './codeDescriptions.js';

const SAM_API_URL = 'https://api.sam.gov/opportunities/v2/search';

// All configured API keys in priority order — rotates on 429
const getSamKeys = () =>
  [process.env.SAM_API_KEY, process.env.SAM_API_KEY_2, process.env.SAM_API_KEY_3, process.env.SAM_API_KEY_4]
    .filter(Boolean);

// Makes a GET request, rotating through backup keys on 429
export const samGetWithRotation = async (buildUrl, axiosOptions = {}) => {
  const keys = getSamKeys();
  let lastErr;
  for (const key of keys) {
    try {
      return await axios.get(buildUrl(key), { timeout: 30000, ...axiosOptions });
    } catch (err) {
      if (err.response?.status === 429) {
        console.warn(`  SAM.gov 429 on key …${key.slice(-8)} — trying next key`);
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr; // all keys exhausted
};

// Helper: safe string extraction
const safeString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val.code || val.name || val.description || '';
  return String(val);
};

// Format date as MM/dd/yyyy (SAM.gov requirement)
const formatDate = (date) => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Build proper SAM.gov URL
// SAM.gov direct links use the internal noticeId (UUID), not the solicitation number.
// The API provides uiLink with the correct URL. If unavailable, use search URL.
const buildSamUrl = (opp) => {
  // Best: use the uiLink provided by the API — direct /opp/<uuid>/view URL
  if (opp.uiLink) {
    const link = safeString(opp.uiLink);
    if (link.includes('sam.gov')) return link;
    if (link) return `https://sam.gov${link.startsWith('/') ? '' : '/'}${link}`;
  }
  // Second best: build direct URL from noticeId UUID (with or without dashes)
  const nid = safeString(opp.noticeId);
  if (nid && /^[a-f0-9]{32}$/i.test(nid.replace(/-/g, ''))) {
    return `https://sam.gov/opp/${nid}/view`;
  }
  // Fallback: search by solicitation number — SAM.gov auto-shows the right result
  const sol = safeString(opp.solicitationNumber);
  if (sol && !sol.includes('SAMPLE')) {
    return `https://sam.gov/search/?index=opp&q=${encodeURIComponent(sol)}&sort=-relevance`;
  }
  return null;
};

// Map SAM.gov type codes to human-readable notice types
const NOTICE_TYPE_MAP = {
  'o': 'Solicitation',
  'p': 'Presolicitation',
  'k': 'Combined Synopsis/Solicitation',
  'r': 'Sources Sought',
  's': 'Special Notice',
  'i': 'Intent to Bundle',
  'a': 'Award Notice',
  'u': 'Justification and Authorization',
  'g': 'Sale of Surplus Property',
  'f': 'Foreign Government Standard',
};

const mapNoticeType = (type) => NOTICE_TYPE_MAP[type] || safeString(type) || '';

// Fetch real description text when the API returns a URL instead of text.
// Uses key rotation so a single exhausted key does not block the fetch.
const fetchDescription = async (_apiKey, descriptionOrUrl) => {
  const desc = safeString(descriptionOrUrl);
  if (!desc) return 'No description available';

  // If it's a URL (SAM.gov returns description link for long descriptions)
  if (desc.startsWith('http') && desc.includes('api.sam.gov')) {
    try {
      const separator = desc.includes('?') ? '&' : '?';
      // Strip any existing api_key from the URL so rotation can inject its own
      const baseUrl = desc.replace(/[&?]api_key=[^&]*/i, '');
      const res = await samGetWithRotation(
        key => `${baseUrl}${separator}api_key=${key}`,
        { headers: { Accept: 'text/plain, text/html, application/json, */*' } }
      );
      let text = '';
      if (typeof res.data === 'string') {
        text = res.data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      } else if (res.data?.description) {
        text = safeString(res.data.description);
      } else if (res.data?.content) {
        text = safeString(res.data.content);
      } else {
        text = JSON.stringify(res.data);
      }
      return (text || desc).substring(0, 15000);
    } catch (e) {
      console.error('  Description fetch failed:', e.message);
      return desc;
    }
  }
  return desc.substring(0, 15000);
};

// Flatten any deeply nested SAM.gov resource response into a flat array of file objects
const flattenSAMFiles = (data) => {
  if (!data) return [];
  // Try every known response shape SAM.gov has used across API versions
  const candidates = [
    data?.opportunityAttachmentList,          // v1 GET /resources
    data?._embedded?.opportunityAttachmentList,
    data?._embedded?.attachments,
    data?.attachments,
    data?.resources,
    data?.fileAttachments,
    data?.files,
    Array.isArray(data) ? data : null,
  ].filter(Array.isArray);

  if (candidates.length === 0) return [];
  const raw = candidates[0];
  const GENERIC_SEGS = new Set(['download', 'files', 'resources', 'v1', 'v2', 'prod']);
  return raw.map((f, idx) => {
    const url = f.downloadUrl || f.attachmentUrl || f.resourceUrl || f.fileUrl || f.url || f.uri || '';
    let name = f.name || f.fileName || f.attachmentFileName || f.title || '';
    if (!name && url) {
      try {
        const u = new URL(url);
        name = u.searchParams.get('filename') || u.searchParams.get('name') || '';
      } catch {}
      if (!name) {
        const seg = url.split('/').pop()?.split('?')[0] || '';
        if (seg && !GENERIC_SEGS.has(seg.toLowerCase()) && seg.includes('.')) name = seg;
      }
    }
    return { name: name || `Document ${idx + 1}`, url, size: f.size || f.fileSize || f.attachmentSize || '', type: f.type || f.mimeType || f.contentType || '' };
  }).filter(f => f.url || f.name);
};

// Fetch attachments/resource links for an opportunity.
// Uses key rotation and tries at most 2 endpoints (saves quota vs the old 4-try approach).
export const fetchSAMResourceLinks = async (_apiKey, noticeId) => {
  if (!noticeId) return [];
  const noDashes   = noticeId.replace(/-/g, '');
  const withDashes = noDashes.length === 32
    ? `${noDashes.slice(0,8)}-${noDashes.slice(8,12)}-${noDashes.slice(12,16)}-${noDashes.slice(16,20)}-${noDashes.slice(20)}`
    : noticeId;

  // Try no-dashes first (most common), then with-dashes as fallback — 2 calls max per record
  for (const nid of [...new Set([noDashes, withDashes])]) {
    try {
      const res = await samGetWithRotation(
        key => `https://api.sam.gov/prod/opportunities/v1/resources?api_key=${key}&noticeid=${nid}&limit=100`,
        { timeout: 15000, headers: { Accept: 'application/json' } }
      );
      const files = flattenSAMFiles(res.data);
      if (files.length > 0) return files;
    } catch (err) {
      if (err.response?.status === 429) throw err; // all keys exhausted — propagate to caller
      if (err.response?.status !== 404) {
        console.warn(`fetchSAMResourceLinks (${nid.slice(0,8)}...):`, err.message);
      }
    }
  }
  return [];
};

// Keep internal alias
const fetchResourceLinks = fetchSAMResourceLinks;

// Parse fullParentPathName which uses dot separators:
// "DEPT OF DEFENSE.DEPT OF THE NAVY.NAVSUP.NAVSUP WEAPON SYSTEMS SUPPORT.NAVSUP WSS MECHANICSBURG"
// levels: [0]=Department [1]=SubTier [2]=MajorCommand [3]=SubCommand1 [4]=SubCommand2 [5]=SubCommand3
// The actual contracting office comes from opp.office (more specific than the path)
const parseAgencyChain = (opp) => {
  // fullParentPathName can come as a plain string OR as an object {code:"097.SP",name:"DEPT OF DEFENSE.DLA"}.
  // Always prefer the human-readable NAME over the code.
  const rawFPN = opp.fullParentPathName;
  const full = typeof rawFPN === 'object' && rawFPN !== null
    ? safeString(rawFPN.name || rawFPN.description)   // extract name, NOT code
    : safeString(rawFPN);

  // SAM.gov uses different field names across agencies:
  // DoD/DLA → departmentName / subtierName / officeName
  // Others  → departmentOrAgency / subTier / office
  const officeFromApi = safeString(opp.office) || safeString(opp.officeName);

  if (full) {
    const parts = full.split('.').map(p => p.trim()).filter(Boolean);
    // SAM.gov convention: the LAST segment of fullParentPathName = the Office.
    // Exclude it from the sub-command slots so it shows under "Office" not "Sub Command N".
    const office = officeFromApi || parts[parts.length - 1] || '';
    const h = (office && parts[parts.length - 1] === office) ? parts.slice(0, -1) : parts;
    return {
      agency:       full.replace(/\./g, ' > '),
      department:   h[0] || '',
      subTier:      h[1] || '',
      majorCommand: h[2] || '',
      subCommand1:  h[3] || '',
      subCommand2:  h[4] || '',
      subCommand3:  h[5] || '',
      office,
    };
  }

  // Fallback: SAM.gov uses different field names for different agencies/systems.
  // Try every known variant before giving up.
  const dept = safeString(opp.departmentOrAgency)
    || safeString(opp.departmentName)
    || safeString(opp.department)
    || safeString(opp.agencyName)
    || '';
  const sub = safeString(opp.subTier)
    || safeString(opp.subtierName)
    || safeString(opp.subTierName)
    || '';
  const agencyStr = [dept, sub].filter(Boolean).join(' > ') || 'Federal Agency';

  return {
    agency:       agencyStr,
    department:   dept,
    subTier:      sub,
    majorCommand: '',
    subCommand1:  '',
    subCommand2:  '',
    subCommand3:  '',
    office:       officeFromApi || '',
  };
};

// ─── NAICS → keyword mapping for wrong-NAICS catch ────────────────────────────
// ~5-6% of SAM.gov postings have incorrect NAICS codes. This maps 4-digit NAICS
// families to search terms so we can find those opportunities via free-text search.
const NAICS_KEYWORDS = {
  '2381': 'foundation concrete structural steel framing carpentry masonry roofing',
  '2382': 'electrical wiring plumbing HVAC mechanical piping contractor',
  '2383': 'drywall insulation painting flooring tile finish carpentry building',
  '2389': 'site preparation excavation demolition specialty trade construction',
  '5415': 'software development cybersecurity IT systems cloud technology services',
  '5413': 'architecture engineering surveying geophysical testing laboratory',
  '5416': 'management consulting advisory human resources logistics professional',
  '5417': 'research development scientific laboratory analysis testing',
  '5611': 'administrative office staffing support personnel services',
  '5612': 'facilities management property building maintenance operations',
  '5617': 'janitorial cleaning landscaping grounds maintenance custodial',
  '5616': 'security guard surveillance protection investigation services',
  '3321': 'structural metal fabrication welding steel manufacturing',
  '3325': 'hardware tools fasteners bolts screws manufacturing',
  '3328': 'coating engraving heat treating plating metal finishing',
  '3336': 'industrial machinery engine turbine manufacturing equipment',
  '3364': 'aerospace aircraft defense parts manufacturing assembly',
  '4841': 'trucking freight general cargo transportation delivery',
  '4885': 'freight logistics transportation arrangement brokerage',
  '6211': 'physician medical doctor healthcare clinical professional services',
  '6213': 'dental optometry outpatient healthcare professional',
  '6216': 'home health nursing aide hospice care services',
  '9221': 'law enforcement police security investigation protection services',
};

// Returns keyword string for a NAICS code — checks 6→4→3-digit prefix.
export const getKeywordsForNaics = (naicsCode) => {
  const c = String(naicsCode || '');
  return NAICS_KEYWORDS[c] || NAICS_KEYWORDS[c.slice(0, 4)] || NAICS_KEYWORDS[c.slice(0, 3)] || null;
};

// ─── Single-page fetch for test mode: returns exactly `count` records at `offset` ──
// Costs exactly 1 API call. Used by the admin test buttons.
export const fetchSAMPage = async (naicsCode, count = 10, offset = 0) => {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) return { records: [], total: 0 };

  const today = formatDate(new Date());
  const postedFrom = new Date();
  postedFrom.setDate(postedFrom.getDate() - 180);

  const params = {
    postedFrom: formatDate(postedFrom),
    postedTo:   formatDate(new Date()),
    active:     'Yes',
    rdlfrom:    today,
    limit:      count,
    offset,
  };
  if (naicsCode && /^\d{6}$/.test(naicsCode)) params.naicsCode = naicsCode;

  let paramStr = '';
  for (const [k, v] of Object.entries(params)) paramStr += `&${k}=${v}`;

  try {
    console.log(`🌐 fetchSAMPage — using key rotation, ${count} records`);
    const response = await samGetWithRotation(
      key => `${SAM_API_URL}?api_key=${key}${paramStr}`,
      { timeout: 30000, headers: { Accept: 'application/json' } }
    );
    const data = response.data;
    console.log(`📥 SAM.gov response status: ${response.status}, keys: ${Object.keys(data || {}).join(', ')}, totalRecords: ${data?.totalRecords}`);
    if (!data || data.message || data.error) {
      console.error(`❌ SAM.gov error response:`, JSON.stringify(data).substring(0, 500));
      throw new Error(data?.message || data?.error || 'SAM error');
    }
    const arr = data.opportunitiesData || data.opportunities || data._embedded?.opportunities || [];
    const records = Array.isArray(arr) ? arr : [];

    // Transform and save each record
    let saved = 0;
    for (const opp of records) {
      if (!opp.title && !opp.description) continue;
      const agencyInfo = parseAgencyChain(opp);
      const pop = opp.placeOfPerformance || {};
      const rawCity = typeof pop.city === 'object' ? (pop.city?.name || '') : safeString(pop.city);
      const popCity = /^\d{3,10}$/.test(rawCity.trim()) ? '' : rawCity;
      const contacts = Array.isArray(opp.pointOfContact) ? opp.pointOfContact : (opp.pointOfContact ? [opp.pointOfContact] : []);
      const noticeId = safeString(opp.noticeId);
      const sourceId = safeString(opp.solicitationNumber) || noticeId || `sam_${Date.now()}_${Math.random()}`;
      if (!sourceId || sourceId.includes('undefined')) continue;

      const doc = {
        source: 'sam',
        title: safeString(opp.title) || 'Untitled',
        description: await fetchDescription(apiKey, opp.description),
        agency: agencyInfo.agency,
        postedDate: opp.postedDate ? new Date(opp.postedDate) : new Date(),
        dueDate: opp.responseDeadLine ? new Date(opp.responseDeadLine) : null,
        naicsCode: safeString(opp.naicsCode) || naicsCode || '000000',
        pscCode: safeString(opp.classificationCode) || '',
        setAside: safeString(opp.typeOfSetAsideDescription) || safeString(opp.typeOfSetAside) || '',
        placeOfPerformance: {
          city: popCity,
          state: typeof pop.state === 'object' ? (pop.state?.name || pop.state?.code || '') : safeString(pop.state),
          zipCode: safeString(pop.zip || pop.zipCode),
          country: typeof pop.country === 'object' ? (pop.country?.name || '') : safeString(pop.country),
        },
        contactInfo: {
          name: safeString(contacts[0]?.fullName || contacts[0]?.name || ''),
          email: safeString(contacts[0]?.email || ''),
          phone: safeString(contacts[0]?.phone || ''),
        },
        url: buildSamUrl(opp) || '#',
        noticeId,
        noticeType: mapNoticeType(opp.type),
        archiveDate: opp.archiveDate ? new Date(opp.archiveDate) : null,
        archiveType: safeString(opp.archiveType),
        department: agencyInfo.department,
        subTier: agencyInfo.subTier,
        majorCommand: agencyInfo.majorCommand,
        subCommand1: agencyInfo.subCommand1,
        subCommand2: agencyInfo.subCommand2,
        subCommand3: agencyInfo.subCommand3,
        office: agencyInfo.office,
        naicsDescription: safeString(opp.naicsDescription) || (typeof opp.naicsCode === 'object' ? safeString(opp.naicsCode?.description) : '') || getNaicsDescription(opp.naicsCode),
        pscDescription: safeString(opp.pscDescription) || safeString(opp.classificationDescription) || (typeof opp.classificationCode === 'object' ? safeString(opp.classificationCode?.description) : '') || getPscDescription(opp.classificationCode),
        pointOfContacts: contacts.map(c => ({
          type: safeString(c.type), fullName: safeString(c.fullName || c.name || c.fullname),
          email: safeString(c.email), phone: safeString(c.phone),
        })).filter(c => c.fullName || c.email),
        resourceLinks: (opp.resourceLinks || opp.links || []).map((r, idx) => ({
              name: r.name || r.fileName || `Document ${idx + 1}`,
              url:  r.url  || r.downloadUrl || r.resourceUrl || (typeof r === 'string' ? r : ''),
              size: r.size || '',
              type: r.type || '',
          })).filter(r => r.url),
        relatedNotice: safeString(opp.relatedNotice || opp.relatedNoticeId),
        estimatedValue: opp.award?.amount || null,
        award: opp.award ? {
          date:   opp.award.date   ? new Date(opp.award.date)   : null,
          amount: opp.award.amount || null,
          awardee: {
            name:     safeString(opp.award.awardee?.name),
            uei:      safeString(opp.award.awardee?.uei),
            cageCode: safeString(opp.award.awardee?.cageCode),
          },
        } : null,
        lastFetched: new Date(),
      };

      try {
        await Opportunity.findOneAndUpdate(
          { sourceId },
          { $set: doc, $setOnInsert: { fetchSource: 'api' } },
          { upsert: true }
        );
        saved++;
      } catch (e) { if (e.code !== 11000) console.error('fetchSAMPage save error:', e.message); }
    }

    return { records: records.length, saved, offset, naicsCode };
  } catch (err) {
    console.error(`❌ fetchSAMPage error — HTTP ${err.response?.status}, body: ${JSON.stringify(err.response?.data || err.message).substring(0, 500)}`);
    throw new Error(err.response?.data?.message || err.message);
  }
};

// ─── Core fetch helper: one page from SAM.gov ─────────────────────────────────
const fetchOnePage = async (apiKey, params) => {
  let url = `${SAM_API_URL}?api_key=${apiKey}`;
  for (const [k, v] of Object.entries(params)) url += `&${k}=${v}`;

  const response = await samFetch(() =>
    axios.get(url, { timeout: 45000, headers: { Accept: 'application/json' } })
  );
  const data = response.data;
  if (!data || data.message || data.error) return [];
  const arr = data.opportunitiesData || data.opportunities || data._embedded?.opportunities || [];
  return Array.isArray(arr) ? arr : [];
};

// 🔥 MAIN FETCH FUNCTION — paginates SAM.gov to get active solicitations only
export const fetchSAMOpportunities = async (naicsCode = null, limit = 200) => {
  try {
    const apiKey = process.env.SAM_API_KEY;
    if (!apiKey) {
      console.error('❌ SAM_API_KEY is missing in .env file');
      return [];
    }

    // Only pull solicitations with a future response deadline
    const today = formatDate(new Date());
    const postedFrom = new Date();
    postedFrom.setDate(postedFrom.getDate() - 180); // look back 6 months for postings

    const baseParams = {
      postedFrom: formatDate(postedFrom),
      postedTo:   formatDate(new Date()),
      active:     'Yes',
      rdlfrom:    today, // responseDeadLine must be >= today (active solicitations only)
    };
    if (naicsCode && /^\d{6}$/.test(naicsCode)) {
      baseParams.naicsCode = naicsCode;
    }

    console.log(`\n📡 Fetching SAM.gov active solicitations for NAICS ${naicsCode || 'all'}`);

    // Paginate: fetch up to `limit` records in batches of 100
    const pageSize = 100;
    const maxPages = Math.ceil(Math.min(limit, 1000) / pageSize);
    let allRaw = [];

    for (let page = 0; page < maxPages; page++) {
      const raw = await fetchOnePage(apiKey, { ...baseParams, limit: pageSize, offset: page * pageSize });
      allRaw = allRaw.concat(raw);
      if (raw.length < pageSize) break; // last page
      if (allRaw.length >= limit) break;
    }

    console.log(`✅ Found ${allRaw.length} raw active solicitations from SAM.gov`);

    if (allRaw.length === 0) {
      // Fallback: relax the rdlfrom filter — some solicitations have no responseDeadLine set
      console.log('⚠️ No results with rdlfrom filter — falling back to active=Yes only');
      allRaw = await fetchOnePage(apiKey, {
        postedFrom: baseParams.postedFrom,
        postedTo:   baseParams.postedTo,
        active:     'Yes',
        ...(naicsCode ? { naicsCode } : {}),
        limit:  pageSize,
        offset: 0,
      });
      console.log(`✅ Fallback returned ${allRaw.length} records`);
    }

    if (allRaw.length === 0) {
      console.log(`ℹ️ No opportunities found for NAICS ${naicsCode || 'any'}`);
      return [];
    }

    // Transform opportunities — fetch descriptions and attachments
    const transformed = [];

    for (const opp of allRaw) {
      try {
        if (!opp.title && !opp.description) continue;

        // Resolve description URL — SAM.gov returns a link instead of text for long descriptions
        const fullDescription = await fetchDescription(apiKey, opp.description);

        // Parse agency chain from fullParentPathName (uses dots: "DEPT OF DEFENSE.DEPT OF THE NAVY.OFFICE")
        const agencyInfo = parseAgencyChain(opp);

        // Extract place of performance with full details
        const pop = opp.placeOfPerformance || {};
        // city can be an object {name:"Jacksonville", code:"12345"} or a plain string
        const rawCity = typeof pop.city === 'object' ? (pop.city?.name || '') : safeString(pop.city);
        // reject pure-digit values (zip codes stored in city field by SAM.gov)
        const popCity = /^\d{3,10}$/.test(rawCity.trim()) ? '' : rawCity;
        const popState = typeof pop.state === 'object' ? (pop.state?.name || pop.state?.code || '') : safeString(pop.state);
        const popCountry = typeof pop.country === 'object' ? (pop.country?.name || pop.country?.code || '') : safeString(pop.country);
        const popStreet = safeString(pop.streetAddress || pop.address1 || pop.street || '');
        const popZip = safeString(pop.zip || pop.zipCode);

        // Extract award details
        const awardData = opp.award || {};
        const awardeeData = awardData.awardee || {};
        const awardeeLoc = awardeeData.location || {};

        // Extract ALL point of contacts
        const contacts = Array.isArray(opp.pointOfContact)
          ? opp.pointOfContact
          : opp.pointOfContact ? [opp.pointOfContact] : [];

        // Extract office address
        const offAddr = opp.officeAddress || {};

        const noticeId = safeString(opp.noticeId);
        const resourceLinks = (opp.resourceLinks || opp.links || []).map((r, idx) => {
          const url = typeof r === 'string' ? r : (r.url || r.uri || '');
          let name = typeof r === 'string' ? '' : (r.name || r.text || r.title || '');
          if (!name && url) {
            // Try to extract filename from query params first (?filename=Sol_140.pdf)
            try {
              const u = new URL(url);
              name = u.searchParams.get('filename') || u.searchParams.get('name') || u.searchParams.get('file') || '';
            } catch {}
            // Try last path segment (exclude generic segments like "download", "files", "resources")
            if (!name) {
              const GENERIC = new Set(['download', 'files', 'resources', 'v1', 'v2', 'prod']);
              const seg = url.split('/').pop()?.split('?')[0] || '';
              if (seg && !GENERIC.has(seg.toLowerCase()) && seg.includes('.')) name = seg;
            }
          }
          return { url, name: name || `Document ${idx + 1}`, size: '', type: '' };
        }).filter(r => r.url);

        const transformedOpp = {
          source: 'sam',
          sourceId: safeString(opp.solicitationNumber) || safeString(opp.noticeId) || `sam_${Date.now()}_${Math.random()}`,
          title: safeString(opp.title) || 'Untitled Opportunity',
          description: fullDescription.substring(0, 15000),
          agency: agencyInfo.agency,
          estimatedValue: awardData.amount || opp.estimatedTotalValue || null,
          postedDate: opp.postedDate ? new Date(opp.postedDate) : new Date(),
          dueDate: opp.responseDeadLine ? new Date(opp.responseDeadLine) : null,
          naicsCode: safeString(opp.naicsCode) || naicsCode || '000000',
          pscCode: safeString(opp.classificationCode) || safeString(opp.pscCode) || '',
          setAside: safeString(opp.typeOfSetAsideDescription) || safeString(opp.typeOfSetAside) || safeString(opp.setAside) || '',
          placeOfPerformance: {
            streetAddress: popStreet,
            city: popCity,
            state: popState,
            zipCode: popZip,
            country: popCountry,
            congressionalDistrict: safeString(pop.congressionalDistrict),
            county: safeString(pop.county)
          },
          contactInfo: {
            name: safeString(contacts[0]?.fullName || contacts[0]?.name || contacts[0]?.fullname),
            email: safeString(contacts[0]?.email),
            phone: safeString(contacts[0]?.phone)
          },
          url: buildSamUrl(opp) || '#',
          resourceLinks,
          lastFetched: new Date(),

          // Extended fields
          noticeId:   noticeId, // SAM.gov UUID — for direct links & resource fetching
          noticeType: mapNoticeType(opp.type),
          archiveDate: opp.archiveDate ? new Date(opp.archiveDate) : null,
          archiveType: safeString(opp.archiveType),
          modifiedDate: opp.modifiedDate ? new Date(opp.modifiedDate) : null,
          department:   agencyInfo.department,
          subTier:      agencyInfo.subTier,
          majorCommand: agencyInfo.majorCommand,
          subCommand1:  agencyInfo.subCommand1,
          subCommand2:  agencyInfo.subCommand2,
          subCommand3:  agencyInfo.subCommand3,
          office:       agencyInfo.office,
          relatedNotice: safeString(opp.relatedNotice || opp.relatedNoticeId),
          officeAddress: {
            streetAddress: safeString(offAddr.address1 || offAddr.streetAddress || offAddr.street),
            city: safeString(offAddr.city),
            state: safeString(offAddr.state),
            zipCode: safeString(offAddr.zipcode || offAddr.zipCode),
            country: safeString(offAddr.countryCode || offAddr.country)
          },
          naicsDescription: safeString(opp.naicsDescription) || (typeof opp.naicsCode === 'object' ? safeString(opp.naicsCode?.description) : '') || getNaicsDescription(opp.naicsCode),
          pscDescription: safeString(opp.pscDescription) || safeString(opp.classificationDescription) || (typeof opp.classificationCode === 'object' ? safeString(opp.classificationCode?.description) : '') || getPscDescription(opp.classificationCode),
          additionalInfoLink: safeString(opp.additionalInfoLink),
          organizationType: safeString(opp.organizationType),

          // Award details
          award: {
            date: awardData.date ? new Date(awardData.date) : null,
            number: safeString(awardData.number),
            amount: Number(awardData.amount) || null,
            awardee: {
              name: safeString(awardeeData.name),
              uei: safeString(awardeeData.ueiSAM || awardeeData.uei),
              cageCode: safeString(awardeeData.cageCode),
              duns: safeString(awardeeData.duns),
              location: {
                streetAddress: safeString(awardeeLoc.streetAddress),
                city: typeof awardeeLoc.city === 'object' ? safeString(awardeeLoc.city?.name) : safeString(awardeeLoc.city),
                state: typeof awardeeLoc.state === 'object' ? safeString(awardeeLoc.state?.name || awardeeLoc.state?.code) : safeString(awardeeLoc.state),
                zipCode: safeString(awardeeLoc.zip || awardeeLoc.zipCode),
                country: typeof awardeeLoc.country === 'object' ? safeString(awardeeLoc.country?.name) : safeString(awardeeLoc.country),
                congressionalDistrict: safeString(awardeeLoc.congressionalDistrict)
              }
            }
          },

          // Performance period
          performancePeriod: {
            startDate: opp.performanceStartDate ? new Date(opp.performanceStartDate) : null,
            endDate: opp.performanceEndDate ? new Date(opp.performanceEndDate) : null
          },

          // All points of contact
          pointOfContacts: contacts.map(c => ({
            type: safeString(c.type),
            fullName: safeString(c.fullName || c.name || c.fullname),
            title: safeString(c.title),
            email: safeString(c.email),
            phone: safeString(c.phone),
            fax: safeString(c.fax)
          })).filter(c => c.fullName || c.email)
        };
        transformed.push(transformedOpp);
      } catch (itemErr) {
        console.error('Error transforming opportunity:', itemErr.message);
      }
    }

    console.log(`📝 Processed ${transformed.length} opportunities for saving`);

    // Save to database — upsert by sourceId (unique key).
    // $setOnInsert ensures fetchSource:'api' is only written when inserting a brand-new
    // record; if the nightly bulk already inserted it first, 'bulk' is preserved.
    let savedCount = 0;
    for (const opp of transformed) {
      if (!opp.sourceId || opp.sourceId.includes('undefined')) continue;
      const { sourceId, ...rest } = opp;
      try {
        await Opportunity.findOneAndUpdate(
          { sourceId },
          {
            $set:         rest,
            $setOnInsert: { fetchSource: 'api' },
          },
          { upsert: true }
        );
        savedCount++;
      } catch (saveErr) {
        if (saveErr.code !== 11000) {
          console.error(`Save error for ${sourceId}:`, saveErr.message);
        }
      }
    }

    console.log(`💾 Saved ${savedCount} new/updated opportunities`);
    return transformed;

  } catch (error) {
    console.error('❌ SAM.gov API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
};

// Fetch SAM.gov opportunities by keyword search to catch wrong-NAICS postings.
// suggestedNaicsArray: the NAICS codes we're crediting these results to (stored in DB
// so distributeToUser can match them to the right contractors).
// Existing records that already have the correct NAICS from a normal fetch are skipped.
export const fetchSAMByKeyword = async (keyword, suggestedNaicsArray = [], limit = 50) => {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey || !keyword || suggestedNaicsArray.length === 0) return 0;

  const today = formatDate(new Date());
  const postedFrom = new Date();
  postedFrom.setDate(postedFrom.getDate() - 90);

  // SAM.gov v2 uses `keyword` param; limit to 5 words to keep search precise
  const trimmedKeyword = keyword.split(' ').slice(0, 5).join(' ');
  const params = {
    keyword:    encodeURIComponent(trimmedKeyword),
    postedFrom: formatDate(postedFrom),
    postedTo:   formatDate(new Date()),
    active:     'Yes',
    rdlfrom:    today,
    limit:      Math.min(limit, 100),
    offset:     0,
  };

  console.log(`\n🔍 Keyword fetch: "${trimmedKeyword}" → tags [${suggestedNaicsArray.join(', ')}]`);

  let rawOpps;
  try {
    rawOpps = await fetchOnePage(apiKey, params);
  } catch (err) {
    console.warn(`   Keyword fetch failed: ${err.message}`);
    return 0;
  }
  console.log(`   Found ${rawOpps.length} keyword results`);
  if (rawOpps.length === 0) return 0;

  let tagged = 0;
  for (const opp of rawOpps) {
    try {
      if (!opp.title && !opp.description) continue;
      const sourceId = safeString(opp.solicitationNumber) || safeString(opp.noticeId);
      if (!sourceId || sourceId.includes('undefined')) continue;

      // If this opp already has the correct NAICS, the normal NAICS fetch covers it — skip tagging.
      const realNaics = safeString(opp.naicsCode);
      if (suggestedNaicsArray.includes(realNaics)) continue;

      const agencyInfo = parseAgencyChain(opp);
      const pop    = opp.placeOfPerformance || {};
      const rawCity = typeof pop.city === 'object' ? (pop.city?.name || '') : safeString(pop.city);
      const popCity  = /^\d{3,10}$/.test(rawCity.trim()) ? '' : rawCity;
      const popState = typeof pop.state === 'object' ? (pop.state?.code || pop.state?.name || '') : safeString(pop.state);
      const contacts = Array.isArray(opp.pointOfContact) ? opp.pointOfContact : (opp.pointOfContact ? [opp.pointOfContact] : []);
      const awardData = opp.award || {};
      const offAddr  = opp.officeAddress || {};

      const coreFields = {
        source:         'sam',
        title:          safeString(opp.title) || 'Untitled Opportunity',
        description:    await fetchDescription(apiKey, opp.description),
        agency:         agencyInfo.agency,
        estimatedValue: awardData.amount || opp.estimatedTotalValue || null,
        postedDate:     opp.postedDate ? new Date(opp.postedDate) : new Date(),
        dueDate:        opp.responseDeadLine ? new Date(opp.responseDeadLine) : null,
        naicsCode:      realNaics || '000000',
        pscCode:        safeString(opp.classificationCode) || safeString(opp.pscCode) || '',
        setAside:       safeString(opp.typeOfSetAsideDescription) || safeString(opp.typeOfSetAside) || '',
        placeOfPerformance: {
          city:   popCity,
          state:  popState,
          zipCode: safeString(pop.zip || pop.zipCode),
          country: typeof pop.country === 'object' ? (pop.country?.code || '') : safeString(pop.country),
        },
        contactInfo: {
          name:  safeString(contacts[0]?.fullName || contacts[0]?.name || ''),
          email: safeString(contacts[0]?.email || ''),
          phone: safeString(contacts[0]?.phone || ''),
        },
        url:              buildSamUrl(opp) || '#',
        noticeId:         safeString(opp.noticeId),
        noticeType:       mapNoticeType(opp.type),
        lastFetched:      new Date(),
        department:       agencyInfo.department,
        subTier:          agencyInfo.subTier,
        office:           agencyInfo.office,
        naicsDescription: safeString(opp.naicsDescription) || (typeof opp.naicsCode === 'object' ? safeString(opp.naicsCode?.description) : '') || getNaicsDescription(opp.naicsCode),
        officeAddress: {
          city:    safeString(offAddr.city),
          state:   safeString(offAddr.state),
          zipCode: safeString(offAddr.zipcode || offAddr.zipCode),
          country: safeString(offAddr.countryCode || offAddr.country),
        },
      };

      await Opportunity.findOneAndUpdate(
        { sourceId },
        {
          $set:         coreFields,
          $addToSet:    { suggestedNaics: { $each: suggestedNaicsArray } },
          $setOnInsert: { fetchSource: 'keyword' },
        },
        { upsert: true }
      );
      tagged++;
    } catch (err) {
      if (err.code !== 11000) console.error('Keyword opp save error:', err.message);
    }
  }

  console.log(`   💾 Tagged ${tagged} cross-NAICS opportunities`);
  return tagged;
};

// Bulk fetch for multiple NAICS codes — used by the master-fetch scheduler phase.
// Each code is fetched sequentially with a delay to respect SAM.gov rate limits.
// After all NAICS fetches, runs keyword searches per unique 4-digit family to catch
// opportunities where the CO entered a wrong NAICS code (affects ~5-6% of postings).
export const fetchSAMOpportunitiesBulk = async (naicsCodes = [], limitPerCode = 100, delayMs = 2000) => {
  const results = [];
  const familyMap = new Map(); // 4-digit prefix → [naics codes in this run]

  for (const code of naicsCodes) {
    const opps = await fetchSAMOpportunities(code, limitPerCode);
    results.push(...opps);
    const prefix = code.slice(0, 4);
    if (!familyMap.has(prefix)) familyMap.set(prefix, []);
    familyMap.get(prefix).push(code);
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }

  // Run keyword searches for unique NAICS families (max 5 to protect quota)
  const MAX_KEYWORD_SEARCHES = 5;
  let kwCount = 0;
  for (const [, codes] of familyMap) {
    if (kwCount >= MAX_KEYWORD_SEARCHES) break;
    const keywords = getKeywordsForNaics(codes[0]);
    if (!keywords) continue;
    await fetchSAMByKeyword(keywords, codes, 50);
    kwCount++;
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }

  return results;
};

// Optional: Test function to verify API key works
export const testSAMApiConnection = async () => {
  try {
    const apiKey = process.env.SAM_API_KEY;
    if (!apiKey) return { success: false, message: 'No API key' };

    const testUrl = `${SAM_API_URL}?api_key=${apiKey}&limit=1&postedFrom=${formatDate(new Date())}&postedTo=${formatDate(new Date())}`;
    const response = await axios.get(testUrl, { timeout: 10000 });
    
    if (response.status === 200) {
      return { success: true, message: 'API key is valid', data: response.data };
    }
    return { success: false, message: `HTTP ${response.status}` };
  } catch (error) {
    return { success: false, message: error.message };
  }
};