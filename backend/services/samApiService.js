// backend/services/samApiService.js
import axios from 'axios';
import Opportunity from '../models/Opportunity.js';
import { samFetch } from './samRateLimiter.js';

const SAM_API_URL = 'https://api.sam.gov/opportunities/v2/search';

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
  // Best: use the uiLink provided by the API (contains correct noticeId)
  if (opp.uiLink) {
    const link = safeString(opp.uiLink);
    if (link.includes('sam.gov')) return link;
    if (link) return `https://sam.gov${link.startsWith('/') ? '' : '/'}${link}`;
  }
  // Fallback: build a search URL that auto-searches by solicitation number
  const sol = safeString(opp.solicitationNumber) || safeString(opp.noticeId);
  if (sol && !sol.includes('SAMPLE')) {
    return `https://sam.gov/search/?index=opp&q=${encodeURIComponent(sol)}&is_active=true&sort=-relevance`;
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

// Fetch real description text when the API returns a URL instead of text
const fetchDescription = async (apiKey, descriptionOrUrl) => {
  const desc = safeString(descriptionOrUrl);
  if (!desc) return 'No description available';

  // If it's a URL (SAM.gov returns description link for long descriptions)
  if (desc.startsWith('http') && desc.includes('api.sam.gov')) {
    try {
      const separator = desc.includes('?') ? '&' : '?';
      const url = `${desc}${separator}api_key=${apiKey}`;
      const res = await axios.get(url, { timeout: 15000, headers: { Accept: 'application/json, text/plain, text/html, */*' } });
      if (typeof res.data === 'string') return res.data.substring(0, 15000);
      if (res.data?.description) return safeString(res.data.description).substring(0, 15000);
      if (res.data?.content) return safeString(res.data.content).substring(0, 15000);
      return JSON.stringify(res.data).substring(0, 15000);
    } catch (e) {
      console.error('  Description fetch failed:', e.message);
      return desc;
    }
  }
  return desc.substring(0, 15000);
};

// Fetch attachments/resource links for an opportunity
const fetchResourceLinks = async (apiKey, noticeId) => {
  if (!noticeId) return [];
  try {
    const url = `https://api.sam.gov/opportunities/v1/resources?api_key=${apiKey}&noticeid=${noticeId}&postedFrom=01/01/2020`;
    const res = await axios.get(url, { timeout: 10000, headers: { Accept: 'application/json' } });
    const files = res.data?.resources || res.data?.attachments || res.data || [];
    if (!Array.isArray(files)) return [];
    return files.map(f => ({
      name: f.name || f.fileName || f.title || 'Document',
      url: f.downloadUrl || f.resourceUrl || f.url || f.uri || '',
      size: f.size || f.fileSize || '',
      type: f.type || f.mimeType || '',
    })).filter(f => f.url || f.name);
  } catch {
    return [];
  }
};

// Parse fullParentPathName which uses dot separators: "DEPT OF DEFENSE.DEPT OF THE NAVY.NAVAL SEA SYSTEMS COMMAND"
const parseAgencyChain = (opp) => {
  const full = safeString(opp.fullParentPathName);
  if (full) {
    const parts = full.split('.');
    return {
      agency: full.replace(/\./g, ' > '),
      department: parts[0]?.trim() || '',
      subTier: parts[1]?.trim() || '',
      office: parts[2]?.trim() || safeString(opp.office) || '',
    };
  }
  return {
    agency: safeString(opp.departmentOrAgency) || safeString(opp.department) || 'Federal Agency',
    department: safeString(opp.department) || '',
    subTier: safeString(opp.subTier) || '',
    office: safeString(opp.office) || '',
  };
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

        // Fetch the REAL description text (SAM API often returns a URL instead of text)
        const rawDesc = safeString(opp.description);
        let fullDescription;
        if (rawDesc.startsWith('http') && rawDesc.includes('api.sam.gov')) {
          fullDescription = await fetchDescription(apiKey, rawDesc);
        } else {
          fullDescription = rawDesc || 'No description available';
        }

        // Parse agency chain from fullParentPathName (uses dots: "DEPT OF DEFENSE.DEPT OF THE NAVY.OFFICE")
        const agencyInfo = parseAgencyChain(opp);

        // Extract place of performance with full details
        const pop = opp.placeOfPerformance || {};
        const popCity = typeof pop.city === 'object' ? (pop.city?.name || '') : safeString(pop.city);
        const popState = typeof pop.state === 'object' ? (pop.state?.name || pop.state?.code || '') : safeString(pop.state);
        const popCountry = typeof pop.country === 'object' ? (pop.country?.name || '') : safeString(pop.country);

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

        // Fetch resource links/attachments (if noticeId available)
        const noticeId = safeString(opp.noticeId);
        let resourceLinks = (opp.resourceLinks || []).map(r => ({
          url:  typeof r === 'string' ? r : (r.url || r.uri || ''),
          name: typeof r === 'string' ? r.split('/').pop() : (r.name || r.text || r.title || 'Document'),
        })).filter(r => r.url);

        // If no resource links from the search response, try fetching from resources API
        if (resourceLinks.length === 0 && noticeId) {
          const fetched = await fetchResourceLinks(apiKey, noticeId);
          if (fetched.length > 0) resourceLinks = fetched;
        }

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
            city: popCity,
            state: popState,
            zipCode: safeString(pop.zip || pop.zipCode),
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
          noticeType: mapNoticeType(opp.type),
          archiveDate: opp.archiveDate ? new Date(opp.archiveDate) : null,
          archiveType: safeString(opp.archiveType),
          modifiedDate: opp.modifiedDate ? new Date(opp.modifiedDate) : null,
          department: agencyInfo.department,
          subTier: agencyInfo.subTier,
          office: agencyInfo.office,
          officeAddress: {
            city: safeString(offAddr.city),
            state: safeString(offAddr.state),
            zipCode: safeString(offAddr.zipcode || offAddr.zipCode),
            country: safeString(offAddr.countryCode || offAddr.country)
          },
          naicsDescription: safeString(opp.naicsDescription),
          pscDescription: safeString(opp.pscDescription) || safeString(opp.classificationDescription),
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

// Bulk fetch for multiple NAICS codes — used by the master-fetch scheduler phase.
// Each code is fetched sequentially with a delay to respect SAM.gov rate limits.
export const fetchSAMOpportunitiesBulk = async (naicsCodes = [], limitPerCode = 100, delayMs = 2000) => {
  const results = [];
  for (const code of naicsCodes) {
    const opps = await fetchSAMOpportunities(code, limitPerCode);
    results.push(...opps);
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