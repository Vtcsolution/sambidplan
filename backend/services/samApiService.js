// backend/services/samApiService.js
import Opportunity from '../models/Opportunity.js';

// Working SAM.gov API endpoint
const SAM_API_URL = 'https://api.sam.gov/opportunities/v2/search';

/**
 * Helper function to safely extract string value from object or string
 */
const safeString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.code || value.name || value.description || '';
  }
  return String(value);
};

/**
 * Format date as MM/dd/yyyy (SAM.gov required format)
 */
const formatDate = (date) => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

/**
 * Build correct SAM.gov URL from opportunity data
 */
const buildSamUrl = (opp) => {
  // Try multiple possible ID fields
  let identifier = safeString(opp.solicitationNumber);
  if (!identifier) identifier = safeString(opp.noticeId);
  if (!identifier) identifier = safeString(opp.opportunityId);
  
  // Only return URL if we have a real identifier (not sample)
  if (identifier && !identifier.includes('SAMPLE') && identifier !== 'undefined') {
    return `https://sam.gov/opp/${identifier}/view`;
  }
  return null;
};

/**
 * Fetch opportunities from SAM.gov API
 */
export const fetchSAMOpportunities = async (naicsCode = null, limit = 50) => {
  try {
    const apiKey = process.env.SAM_API_KEY;
    
    if (!apiKey) {
      console.error('❌ SAM.gov API key not found in .env file');
      return [];
    }

    console.log('🔑 Using SAM.gov API Key:', apiKey.substring(0, 15) + '...');

    // Calculate date range (last 30 days)
    const postedFrom = new Date();
    postedFrom.setDate(postedFrom.getDate() - 30);
    
    // Build request URL with parameters
    let url = `${SAM_API_URL}?api_key=${apiKey}`;
    url += `&postedFrom=${formatDate(postedFrom)}`;
    url += `&postedTo=${formatDate(new Date())}`;
    url += `&limit=${Math.min(limit, 100)}`;
    url += `&offset=0`;
    
    // Add NAICS filter if provided
    if (naicsCode && naicsCode.length === 6) {
      url += `&naicsCode=${naicsCode}`;
    }
    
    console.log('📡 Fetching SAM.gov opportunities...');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ SAM.gov API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.opportunitiesData || data.opportunitiesData.length === 0) {
      console.log('⚠️ No opportunities found from SAM.gov');
      return [];
    }
    
    console.log(`✅ Found ${data.opportunitiesData.length} opportunities from SAM.gov`);
    
    // Transform SAM.gov data to our Opportunity model format
    const opportunities = [];
    
    for (const opp of data.opportunitiesData) {
      try {
        // Extract agency from multiple possible fields
        let agencyValue = 'Unknown Agency';
        if (opp.departmentOrAgency) {
          agencyValue = safeString(opp.departmentOrAgency);
        } else if (opp.department) {
          agencyValue = safeString(opp.department);
        } else if (opp.subtier) {
          agencyValue = safeString(opp.subtier);
        }
        
        // Extract NAICS code
        let naicsValue = naicsCode || '000000';
        if (opp.naicsCode) {
          naicsValue = safeString(opp.naicsCode);
        } else if (opp.naicsCodes && opp.naicsCodes.length > 0) {
          naicsValue = safeString(opp.naicsCodes[0]);
        }
        
        // Extract set aside
        let setAsideValue = '';
        if (opp.typeOfSetAside) {
          setAsideValue = safeString(opp.typeOfSetAside);
        } else if (opp.setAside) {
          setAsideValue = safeString(opp.setAside);
        }
        
        const opportunity = {
          source: 'sam',
          sourceId: safeString(opp.solicitationNumber) || safeString(opp.noticeId) || `sam_${Date.now()}_${Math.random()}`,
          title: safeString(opp.title) || 'Untitled Opportunity',
          description: (safeString(opp.description) || 'No description available').substring(0, 5000),
          agency: agencyValue,
          estimatedValue: opp.estimatedTotalValue || null,
          postedDate: opp.postedDate ? new Date(opp.postedDate) : new Date(),
          dueDate: opp.responseDeadLine ? new Date(opp.responseDeadLine) : null,
          naicsCode: naicsValue,
          pscCode: safeString(opp.pscCode) || '',
          setAside: setAsideValue,
          placeOfPerformance: {
            city: safeString(opp.placeOfPerformance?.city),
            state: safeString(opp.placeOfPerformance?.state),
            zipCode: safeString(opp.placeOfPerformance?.zipCode)
          },
          contactInfo: {
            name: safeString(opp.pointOfContact?.name),
            email: safeString(opp.pointOfContact?.email),
            phone: safeString(opp.pointOfContact?.phone)
          },
          url: buildSamUrl(opp),  // ← FIXED: Using the proper URL builder
          lastFetched: new Date()
        };
        
        opportunities.push(opportunity);
      } catch (itemError) {
        console.error('Error processing opportunity:', itemError.message);
      }
    }
    
    console.log(`📝 Processed ${opportunities.length} opportunities for saving`);
    
    // Save to database
    let savedCount = 0;
    for (const opp of opportunities) {
      if (opp.sourceId && !opp.sourceId.includes('undefined')) {
        try {
          const result = await Opportunity.findOneAndUpdate(
            { sourceId: opp.sourceId, source: 'sam' },
            opp,
            { upsert: true, new: true }
          );
          if (result) savedCount++;
        } catch (saveError) {
          console.error(`Error saving opportunity ${opp.sourceId}:`, saveError.message);
        }
      }
    }
    
    console.log(`💾 Successfully saved ${savedCount} opportunities to database`);
    return opportunities;
    
  } catch (error) {
    console.error('❌ SAM.gov API Error:', error.message);
    return [];
  }
};

/**
 * Search opportunities by keyword
 */
export const searchSAMOpportunities = async (keyword, limit = 20) => {
  try {
    const apiKey = process.env.SAM_API_KEY;
    
    if (!apiKey) {
      console.error('❌ SAM.gov API key not found');
      return [];
    }
    
    const postedFrom = new Date();
    postedFrom.setDate(postedFrom.getDate() - 30);
    
    let url = `${SAM_API_URL}?api_key=${apiKey}`;
    url += `&keyword=${encodeURIComponent(keyword)}`;
    url += `&limit=${Math.min(limit, 100)}`;
    url += `&postedFrom=${formatDate(postedFrom)}`;
    url += `&postedTo=${formatDate(new Date())}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ SAM.gov search error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.opportunitiesData) {
      return [];
    }
    
    return data.opportunitiesData.map(opp => ({
      id: safeString(opp.solicitationNumber) || safeString(opp.noticeId),
      title: safeString(opp.title),
      agency: safeString(opp.departmentOrAgency) || safeString(opp.department),
      deadline: opp.responseDeadLine,
      url: `https://sam.gov/opp/${safeString(opp.solicitationNumber)}/view`
    }));
    
  } catch (error) {
    console.error('SAM.gov search error:', error);
    return [];
  }
};