import { SamApi } from '@lineai/gov-deals';
import { fetchUSAspendingOpportunities } from './usaspendingApiService.js';

/**
 * Validate if NAICS code is valid (6 digits, not all zeros)
 */
const isValidNAICSCode = (naicsCode) => {
  if (!naicsCode) return false;
  const codeStr = naicsCode.toString().trim();
  return /^\d{6}$/.test(codeStr) && codeStr !== '000000';
};

/**
 * Fetch opportunities from ALL sources
 */
export const fetchAllOpportunities = async (naicsCodes = [], limit = 50) => {
  console.log('📡 Fetching opportunities from ALL sources...');
  console.log('📋 NAICS codes:', naicsCodes);
  
  let allOpportunities = [];
  
  // SOURCE 1: USAspending - REAL PAST AWARDED CONTRACTS
  if (naicsCodes && naicsCodes.length > 0) {
    console.log('\n📊 Fetching REAL past awards from USAspending.gov...');
    for (const code of naicsCodes.slice(0, 2)) {
      if (!isValidNAICSCode(code)) {
        console.log(`⚠️ Skipping invalid NAICS code: ${code}`);
        continue;
      }
      
      try {
        const usaspendingOpps = await fetchUSAspendingOpportunities(code, 30);
        if (usaspendingOpps && usaspendingOpps.length > 0) {
          const marked = usaspendingOpps.map(opp => ({
            ...opp,
            dataType: 'historical_award',
            sourceLabel: 'Real Past Award (USAspending)',
            matchScore: 65
          }));
          allOpportunities.push(...marked);
          console.log(`✅ USAspending: ${marked.length} REAL past awards for NAICS ${code}`);
        } else {
          console.log(`⚠️ No USAspending awards found for NAICS ${code}`);
        }
      } catch (error) {
        console.error(`❌ USAspending error for ${code}:`, error.message);
      }
    }
  }
  
  // SOURCE 2: @lineai/gov-deals (Historical SAM.gov data)
  console.log('\n📡 Fetching from GovDeals (SAM.gov historical data)...');
  try {
    const api = new SamApi();
    const searchParams = {
      limit: Math.min(limit, 100),
      sortBy: 'postedDate',
      sortOrder: 'desc'
    };
    
    if (naicsCodes && naicsCodes.length > 0) {
      const validCodes = naicsCodes.filter(code => isValidNAICSCode(code));
      if (validCodes.length > 0) {
        searchParams.naicsCodes = validCodes.slice(0, 3);
      }
    }
    
    const results = await api.opportunities.search(searchParams);
    
    if (results && results.length > 0) {
      const transformed = results.map(opp => ({
        source: 'sam',
        sourceId: opp.opportunityId || opp.noticeId || `sam_${Date.now()}_${Math.random()}`,
        title: opp.title || 'Untitled Opportunity',
        description: opp.description || 'No description available',
        agency: opp.departmentOrAgency || opp.agencyName || 'U.S. Federal Government',
        estimatedValue: opp.estimatedTotalValue || opp.estimatedValue || null,
        postedDate: opp.postedDate ? new Date(opp.postedDate) : new Date(),
        dueDate: opp.responseDeadLine ? new Date(opp.responseDeadLine) : null,
        naicsCode: opp.naicsCode || (naicsCodes && naicsCodes[0]) || '000000',
        pscCode: opp.pscCode || '',
        setAside: opp.typeOfSetAside || opp.setAside || '',
        placeOfPerformance: {
          city: opp.placeOfPerformance?.cityName || '',
          state: opp.placeOfPerformance?.stateCode || '',
          zipCode: opp.placeOfPerformance?.zipCode || ''
        },
        contactInfo: {
          name: opp.pointOfContact?.fullname || '',
          email: opp.pointOfContact?.email || '',
          phone: opp.pointOfContact?.phone || ''
        },
        url: `https://sam.gov/opp/${opp.opportunityId || opp.noticeId}/view`,
        extractedKeywords: [],
        aiSummary: null,
        lastFetched: new Date(),
        dataType: opp.responseDeadLine && new Date(opp.responseDeadLine) > new Date() ? 'live_opportunity' : 'historical_opportunity',
        sourceLabel: opp.responseDeadLine && new Date(opp.responseDeadLine) > new Date() ? 'Live (SAM.gov)' : 'Historical (SAM.gov)'
      }));
      
      allOpportunities.push(...transformed);
      console.log(`✅ GovDeals: ${transformed.length} opportunities`);
    } else {
      console.log('⚠️ No opportunities found from GovDeals');
    }
  } catch (error) {
    console.error('❌ GovDeals error:', error.message);
  }
  
  // Remove duplicates by sourceId
  const unique = [];
  const seen = new Set();
  for (const opp of allOpportunities) {
    if (opp.sourceId && !seen.has(opp.sourceId)) {
      seen.add(opp.sourceId);
      unique.push(opp);
    }
  }
  
  console.log(`\n📊 TOTAL: ${unique.length} unique opportunities from all sources`);
  console.log(`   - USAspending (REAL past awards): ${unique.filter(o => o.source === 'usaspending').length}`);
  console.log(`   - SAM.gov (historical): ${unique.filter(o => o.source === 'sam').length}`);
  
  return unique;
};

/**
 * Get REAL winning bid information from USAspending.gov API
 * NO MOCK DATA - returns empty array if no real data found
 */
/**
 * Get winning bid information for market research
 * Returns ALL awards with pagination
 */
export const getWinningBidAnalysis = async (naicsCode, keywords = '', page = 1, limit = 20) => {
  console.log(`🔍 Analyzing REAL winning bids for NAICS: ${naicsCode}`);
  
  // Validate NAICS code format
  if (!isValidNAICSCode(naicsCode)) {
    console.log(`⚠️ Invalid NAICS code: ${naicsCode}`);
    return {
      naicsCode,
      error: true,
      errorMessage: 'Invalid NAICS code. Please enter a valid 6-digit NAICS code (e.g., 541512).',
      totalAwards: 0,
      averageAwardValue: 0,
      totalContractValue: 0,
      topWinningAgencies: [],
      awards: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      dataSource: 'No Data',
      note: 'Valid NAICS codes are 6 digits (e.g., 541511, 541512, 541513).'
    };
  }
  
  // Fetch REAL data from USAspending.gov
  try {
    const awards = await fetchUSAspendingOpportunities(naicsCode, 500); // Fetch up to 500 awards
    
    if (!awards || awards.length === 0) {
      console.log(`⚠️ No REAL winning bid data found for NAICS: ${naicsCode}`);
      return {
        naicsCode,
        error: true,
        errorMessage: `No federal spending data found for NAICS code ${naicsCode}.`,
        totalAwards: 0,
        averageAwardValue: 0,
        totalContractValue: 0,
        topWinningAgencies: [],
        awards: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        dataSource: 'No Data Available',
        note: 'This NAICS code has no recorded federal contract awards in the USAspending database.'
      };
    }
    
    // Calculate statistics from REAL data
    const validAwards = awards.filter(a => a.estimatedValue > 0);
    
    if (validAwards.length === 0) {
      console.log(`⚠️ No valid award amounts found for NAICS: ${naicsCode}`);
      return {
        naicsCode,
        error: true,
        errorMessage: `Found awards but no valid dollar amounts for NAICS ${naicsCode}.`,
        totalAwards: awards.length,
        averageAwardValue: 0,
        totalContractValue: 0,
        topWinningAgencies: [],
        awards: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        dataSource: 'Partial Data',
        note: 'Awards found but missing dollar amounts in the data.'
      };
    }
    
    const totalValue = validAwards.reduce((sum, award) => sum + (award.estimatedValue || 0), 0);
    const averageValue = totalValue / validAwards.length;
    const topWinners = {};
    
    validAwards.forEach(award => {
      const agency = award.agency;
      if (agency && agency !== 'Unknown Agency' && agency !== 'Federal Agency') {
        topWinners[agency] = (topWinners[agency] || 0) + 1;
      }
    });
    
    const sortedWinners = Object.entries(topWinners)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // Prepare awards for display with proper formatting
    const formattedAwards = validAwards.map(award => ({
      id: award.sourceId,
      title: award.title,
      agency: award.agency,
      value: award.estimatedValue,
      date: award.postedDate,
      url: award.url
    }));
    
    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedAwards = formattedAwards.slice(startIndex, endIndex);
    const totalPages = Math.ceil(formattedAwards.length / parseInt(limit));
    
    console.log(`✅ REAL data: ${validAwards.length} awards, avg $${(averageValue/1000).toFixed(0)}K`);
    
    return {
      naicsCode,
      totalAwards: validAwards.length,
      averageAwardValue: Math.round(averageValue),
      totalContractValue: Math.round(totalValue),
      topWinningAgencies: sortedWinners.map(([name, count]) => ({ name, count })),
      awards: paginatedAwards,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: formattedAwards.length,
        pages: totalPages
      },
      dataSource: 'USAspending.gov (Real Data)',
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error fetching real winning bid data:', error.message);
    return {
      naicsCode,
      error: true,
      errorMessage: `Error fetching data from USAspending API: ${error.message}`,
      totalAwards: 0,
      averageAwardValue: 0,
      totalContractValue: 0,
      topWinningAgencies: [],
      awards: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      dataSource: 'API Error',
      note: 'Unable to fetch real data from USAspending.gov. Please try again later.'
    };
  }
};