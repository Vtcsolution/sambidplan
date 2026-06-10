// backend/services/usaspendingApiService.js
import Opportunity from '../models/Opportunity.js';

/**
 * Fetch REAL awarded contracts from USAspending.gov API
 * No mock data - direct from source
 */
export const fetchUSAspendingOpportunities = async (naicsCode = null, limit = 50) => {
  try {
    console.log('📡 Fetching REAL data from USAspending.gov API...');
    
    // Calculate date range (last 3 years for more data)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 3);
    
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    const requestBody = {
      filters: {
        award_type_codes: ["A", "B", "C", "D"],
        time_period: [{ start_date: formatDate(startDate), end_date: formatDate(endDate) }]
      },
      fields: [
        "Award ID",
        "generated_unique_award_id",
        "Description",
        "Award Amount",
        "Awarding Agency",
        "naics_code",
        "Start Date",
        "End Date",
        "Recipient Name",
        "Place of Performance State Code",
        "Place of Performance City Name"
      ],
      page: 1,
      limit: Math.min(limit, 100),
      sort: "Award Amount",
      order: "desc"
    };
    
    // Add NAICS filter if provided
    if (naicsCode && naicsCode.length === 6) {
      requestBody.filters.naics_codes = [naicsCode];
      console.log('📋 Filtering by NAICS:', naicsCode);
    }
    
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ USAspending API error: ${response.status}`, errorText);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.log('⚠️ No real awards found from USAspending for NAICS:', naicsCode);
      return [];
    }
    
    console.log(`✅ Found ${data.results.length} REAL awards from USAspending.gov`);
    
    // Log first result for verification
    if (data.results.length > 0) {
      const first = data.results[0];
      console.log('📝 Sample real award:', {
        id: first["Award ID"],
        amount: first["Award Amount"],
        agency: first["Awarding Agency"],
        naics: first.naics_code,
        date: first["Start Date"]
      });
    }
    
    // Build a direct USAspending award page URL using generated_unique_award_id
    const buildAwardUrl = (award) => {
      const uid = award.generated_unique_award_id || award["Award ID"];
      if (uid) return `https://www.usaspending.gov/award/${encodeURIComponent(uid)}/`;
      return 'https://www.usaspending.gov/search/';
    };

    // Transform to schema
    const opportunities = data.results.map(award => ({
      source: 'usaspending',
      sourceId: award.generated_unique_award_id || award["Award ID"] || `usa_${Date.now()}_${Math.random()}`,
      title: award.Description ? award.Description.substring(0, 200) : 'Federal Contract Award',
      description: award.Description || 'No description available',
      agency: award["Awarding Agency"] || 'Federal Agency',
      estimatedValue: award["Award Amount"] || 0,
      postedDate: award["Start Date"] ? new Date(award["Start Date"]) : new Date(),
      dueDate: award["End Date"] ? new Date(award["End Date"]) : null,
      naicsCode: award.naics_code || naicsCode || '000000',
      pscCode: '',
      setAside: '',
      placeOfPerformance: {
        city: award["Place of Performance City Name"] || '',
        state: award["Place of Performance State Code"] || '',
        zipCode: ''
      },
      contactInfo: { name: award["Recipient Name"] || '', email: '', phone: '' },
      url: buildAwardUrl(award),
      extractedKeywords: [],
      aiSummary: null,
      lastFetched: new Date(),
      dataType: 'historical_award',
      sourceLabel: 'Real Past Award (USAspending)'
    }));
    
    // Save to database
    let savedCount = 0;
    for (const opp of opportunities) {
      if (opp.sourceId) {
        await Opportunity.findOneAndUpdate(
          { sourceId: opp.sourceId, source: 'usaspending' },
          opp,
          { upsert: true, new: true }
        ).catch(err => console.log('Duplicate skip:', err.message));
        savedCount++;
      }
    }
    
    console.log(`💾 Saved ${savedCount} REAL awards to database`);
    return opportunities;
    
  } catch (error) {
    console.error('❌ USAspending API Error:', error.message);
    return [];
  }
};

/**
 * Get award count summary for market research
 */
export const fetchUSAspendingAwardCount = async (naicsCode = null) => {
  try {
    console.log('📡 Fetching USAspending award count...');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 3);
    
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    const requestBody = {
      filters: {
        award_type_codes: ["A", "B", "C", "D"],
        time_period: [
          {
            start_date: formatDate(startDate),
            end_date: formatDate(endDate)
          }
        ]
      },
      group: "awarding_agency_name",
      limit: 20
    };
    
    if (naicsCode && naicsCode.length === 6) {
      requestBody.filters.naics_codes = [naicsCode];
    }
    
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award_count/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      console.error(`Award count API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Award count retrieved:', data);
    return data;
    
  } catch (error) {
    console.error('USAspending Award Count Error:', error.message);
    return null;
  }
};