// backend/services/opportunityFetchService.js
import Opportunity from '../models/Opportunity.js';
import { fetchSAMOpportunities } from './samApiService.js';

/**
 * Fetch all opportunities from all sources
 */
export const fetchAllOpportunities = async (naicsCodes = []) => {
  console.log('🚀 Starting to fetch opportunities from SAM.gov...');
  console.log('📋 NAICS Codes:', naicsCodes);
  
  let allOpportunities = [];
  
  // Fetch from SAM.gov (primary source)
  if (naicsCodes && naicsCodes.length > 0) {
    for (const code of naicsCodes.slice(0, 3)) {
      console.log(`📡 Fetching SAM.gov opportunities for NAICS: ${code}`);
      const samOpps = await fetchSAMOpportunities(code, 50);
      allOpportunities.push(...samOpps);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } else {
    // Fetch general opportunities (no NAICS filter)
    console.log('📡 Fetching general SAM.gov opportunities');
    const samOpps = await fetchSAMOpportunities(null, 100);
    allOpportunities.push(...samOpps);
  }
  
  console.log(`✅ Total opportunities fetched: ${allOpportunities.length}`);
  
  // If no opportunities found, create sample data for testing
  if (allOpportunities.length === 0) {
    console.log('⚠️ No real opportunities found, creating sample data...');
    await createSampleOpportunities();
    return await Opportunity.find();
  }
  
  return allOpportunities;
};

/**
 * Create sample opportunities for testing when API fails
 */
export const createSampleOpportunities = async () => {
  const sampleOpportunities = [
    {
      source: 'sam',
      sourceId: 'SAMPLE_001',
      title: 'IT Support Services for Department of Veterans Affairs',
      description: 'Seeking IT support services for VA hospital network infrastructure.',
      agency: 'Department of Veterans Affairs',
      estimatedValue: 250000,
      postedDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      naicsCode: '541511',
      setAside: 'Small Business',
      url: 'https://sam.gov/opp/SAMPLE_001/view',
      lastFetched: new Date()
    },
    {
      source: 'sam',
      sourceId: 'SAMPLE_002',
      title: 'Cloud Migration Services - Department of Defense',
      description: 'Cloud infrastructure migration and management services.',
      agency: 'Department of Defense',
      estimatedValue: 750000,
      postedDate: new Date(),
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      naicsCode: '541512',
      setAside: '',
      url: 'https://sam.gov/opp/SAMPLE_002/view',
      lastFetched: new Date()
    },
    {
      source: 'sam',
      sourceId: 'SAMPLE_003',
      title: 'Cybersecurity Assessment - Small Business Set-Aside',
      description: 'Security assessment and penetration testing.',
      agency: 'Department of Homeland Security',
      estimatedValue: 150000,
      postedDate: new Date(),
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      naicsCode: '541511',
      setAside: 'Small Business',
      url: 'https://sam.gov/opp/SAMPLE_003/view',
      lastFetched: new Date()
    }
  ];
  
  for (const opp of sampleOpportunities) {
    await Opportunity.findOneAndUpdate(
      { sourceId: opp.sourceId },
      opp,
      { upsert: true, new: true }
    );
  }
  
  console.log('✅ Sample opportunities created');
};