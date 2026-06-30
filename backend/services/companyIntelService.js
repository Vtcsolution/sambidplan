// backend/services/companyIntelService.js
// Fetches real company performance data from USASpending + SAM.gov entity data

import Company from '../models/Company.js';
import SamCompany from '../models/SamCompany.js';

// ── Fetch a company's real past wins from USASpending ─────────────────────────
export const fetchCompanyWins = async (companyName, naicsCodes = [], limit = 20) => {
  if (!companyName) return { wins: [], totalWins: 0, totalValue: 0 };

  try {
    const filters = {
      award_type_codes: ['A', 'B', 'C', 'D'],
      recipient_search_text: [companyName],
      time_period: [{
        start_date: new Date(Date.now() - 5 * 365 * 86400000).toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
      }],
    };
    if (naicsCodes.length) filters.naics_codes = naicsCodes;

    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters,
        fields: ['Award ID', 'Description', 'Award Amount', 'Awarding Agency', 'Recipient Name', 'Start Date', 'End Date', 'naics_code', 'Place of Performance State Code', 'Place of Performance City Name'],
        page: 1,
        limit: Math.min(limit, 50),
        sort: 'Award Amount',
        order: 'desc',
      }),
    });

    if (!response.ok) return { wins: [], totalWins: 0, totalValue: 0 };
    const data = await response.json();

    const wins = (data.results || []).map(a => ({
      awardId:     a['Award ID'] || '',
      description: a['Description'] || '',
      amount:      a['Award Amount'] || 0,
      agency:      a['Awarding Agency'] || '',
      recipient:   a['Recipient Name'] || '',
      startDate:   a['Start Date'] || '',
      endDate:     a['End Date'] || '',
      naicsCode:   a['naics_code'] || '',
      location:    [a['Place of Performance City Name'], a['Place of Performance State Code']].filter(Boolean).join(', '),
    }));

    const totalValue = wins.reduce((s, w) => s + w.amount, 0);
    return {
      wins,
      totalWins: data.page_metadata?.total || wins.length,
      totalValue,
      averageValue: wins.length ? Math.round(totalValue / wins.length) : 0,
    };
  } catch (err) {
    console.error('fetchCompanyWins error:', err.message);
    return { wins: [], totalWins: 0, totalValue: 0 };
  }
};

// ── Build full company intelligence profile for AI context ────────────────────
export const buildCompanyProfile = async (user) => {
  const lines = [];

  // 1. Basic user profile
  lines.push(`Company Name: ${user.businessName || user.name || 'Not set'}`);
  lines.push(`Business Type: ${user.businessType || 'Small Business'}`);
  lines.push(`NAICS Codes: ${user.naicsCodes?.join(', ') || 'None'}`);

  // 2. Try to get Company workspace data (has UEI, CAGE, certifications)
  let company = null;
  try {
    company = await Company.findOne({ owner: user._id }).lean();
  } catch (e) { /* no company workspace */ }

  if (company) {
    if (company.uei) lines.push(`UEI: ${company.uei}${company.ueiVerified ? ' (SAM.gov Verified)' : ' (Unverified)'}`);
    if (company.cage) lines.push(`CAGE Code: ${company.cage}`);
    if (company.website) lines.push(`Website: ${company.website}`);
    if (company.phone) lines.push(`Phone: ${company.phone}`);
    const addr = company.address;
    if (addr?.city) lines.push(`Location: ${[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}`);
    if (company.certifications?.length) {
      lines.push(`Certifications: ${company.certifications.map(c => c.name || c.type).join(', ')}`);
    }
    if (company.capabilities) lines.push(`Capabilities: ${company.capabilities.substring(0, 500)}`);
    if (company.naicsCodes?.length) lines.push(`Company NAICS: ${company.naicsCodes.join(', ')}`);

    // UEI verified data from SAM.gov
    if (company.ueiVerified && company.ueiData) {
      const d = company.ueiData;
      if (d.legalBusinessName) lines.push(`Legal Name (SAM.gov): ${d.legalBusinessName}`);
      if (d.registrationStatus) lines.push(`SAM Registration: ${d.registrationStatus}`);
      if (d.expirationDate) lines.push(`SAM Expiration: ${d.expirationDate}`);
      if (d.entityType) lines.push(`Entity Type: ${d.entityType}`);
    }
  }

  // 3. Try to get enriched data from SamCompany collection
  let samData = null;
  if (company?.uei) {
    try {
      samData = await SamCompany.findOne({ ueiSAM: company.uei }).lean();
    } catch (e) { /* no SAM data */ }
  }

  if (samData) {
    if (samData.businessTypes?.length) lines.push(`Business Types (SAM.gov): ${samData.businessTypes.join(', ')}`);
    if (samData.sbaBusinessTypes?.length) lines.push(`SBA Designations: ${samData.sbaBusinessTypes.join(', ')}`);
    if (samData.entityStructure) lines.push(`Entity Structure: ${samData.entityStructure}`);
    if (samData.naicsCodes?.length) {
      lines.push(`All NAICS (SAM.gov): ${samData.naicsCodes.map(n => `${n.code}${n.isPrimary ? ' (Primary)' : ''}`).join(', ')}`);
    }
  }

  // 4. Fetch real past wins from USASpending
  const companyName = company?.name || user.businessName;
  const naics = company?.naicsCodes?.length ? company.naicsCodes : (user.naicsCodes || []);
  let winsData = { wins: [], totalWins: 0, totalValue: 0 };

  if (companyName && companyName.length > 2) {
    winsData = await fetchCompanyWins(companyName, naics, 10);
  }

  if (winsData.wins.length > 0) {
    lines.push(`\nPAST CONTRACT WINS (FROM USASPENDING.GOV — LAST 5 YEARS):`);
    lines.push(`Total Contracts Won: ${winsData.totalWins}`);
    lines.push(`Total Award Value: $${winsData.totalValue.toLocaleString()}`);
    lines.push(`Average Award: $${winsData.averageValue.toLocaleString()}`);
    lines.push('');
    winsData.wins.slice(0, 10).forEach((w, i) => {
      lines.push(`  ${i + 1}. $${w.amount.toLocaleString()} — ${w.agency} — ${w.startDate || ''} to ${w.endDate || ''}`);
      if (w.description) lines.push(`     ${w.description.substring(0, 120)}`);
      if (w.naicsCode) lines.push(`     NAICS: ${w.naicsCode} | Location: ${w.location || 'N/A'}`);
    });
  } else {
    lines.push(`\nPAST CONTRACT WINS: No federal contract award history found on USASpending.gov for "${companyName}".`);
  }

  return {
    profileText: lines.join('\n'),
    company,
    samData,
    winsData,
  };
};
