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
const buildSamUrl = (opp) => {
  const identifier = safeString(opp.solicitationNumber) || safeString(opp.noticeId);
  if (identifier && !identifier.includes('SAMPLE')) {
    return `https://sam.gov/opp/${identifier}/view`;
  }
  return null;
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

    // Transform opportunities
    const transformed = [];
    for (const opp of allRaw) {
      try {
        // Skip if missing essential fields
        if (!opp.title && !opp.description) continue;

        const transformedOpp = {
          source: 'sam',
          sourceId: safeString(opp.solicitationNumber) || safeString(opp.noticeId) || `sam_${Date.now()}_${Math.random()}`,
          title: safeString(opp.title) || 'Untitled Opportunity',
          description: (safeString(opp.description) || 'No description').substring(0, 5000),
          agency: safeString(opp.departmentOrAgency) || safeString(opp.department) || 'Federal Agency',
          estimatedValue: opp.estimatedTotalValue || null,
          postedDate: opp.postedDate ? new Date(opp.postedDate) : new Date(),
          dueDate: opp.responseDeadLine ? new Date(opp.responseDeadLine) : null,
          naicsCode: safeString(opp.naicsCode) || naicsCode || '000000',
          pscCode: safeString(opp.pscCode) || '',
          setAside: safeString(opp.typeOfSetAside) || safeString(opp.setAside) || '',
          placeOfPerformance: {
            city: safeString(opp.placeOfPerformance?.city),
            state: safeString(opp.placeOfPerformance?.state),
            zipCode: safeString(opp.placeOfPerformance?.zipCode)
          },
          contactInfo: {
            name: safeString(opp.pointOfContact?.name || opp.pointOfContact?.fullname),
            email: safeString(opp.pointOfContact?.email),
            phone: safeString(opp.pointOfContact?.phone)
          },
          url: buildSamUrl(opp) || '#',
          resourceLinks: (opp.resourceLinks || []).map(r => ({
            url:  typeof r === 'string' ? r : (r.url || r.uri || ''),
            name: typeof r === 'string' ? r.split('/').pop() : (r.name || r.text || r.title || 'Document'),
          })).filter(r => r.url),
          lastFetched: new Date()
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