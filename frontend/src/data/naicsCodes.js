// Top 120 federal-contracting-relevant NAICS codes with descriptions
// Used by the onboarding NAICS search
export const NAICS_CODES = [
  // IT & Technology
  { code: '541511', label: '541511 — Custom Computer Programming Services' },
  { code: '541512', label: '541512 — Computer Systems Design Services' },
  { code: '541513', label: '541513 — Computer Facilities Management Services' },
  { code: '541519', label: '541519 — Other Computer-Related Services' },
  { code: '541715', label: '541715 — R&D in Physical, Engineering, and Life Sciences' },
  { code: '541330', label: '541330 — Engineering Services' },
  { code: '541611', label: '541611 — Administrative Management Consulting' },
  { code: '541612', label: '541612 — Human Resources Consulting Services' },
  { code: '541613', label: '541613 — Marketing Consulting Services' },
  { code: '541614', label: '541614 — Process, Physical Distribution, and Logistics Consulting' },
  { code: '541618', label: '541618 — Other Management Consulting Services' },
  { code: '541690', label: '541690 — Other Scientific and Technical Consulting Services' },
  // Cybersecurity / Defense
  { code: '541990', label: '541990 — All Other Professional, Scientific, and Technical Services' },
  { code: '561621', label: '561621 — Security Systems Services (except Locksmiths)' },
  { code: '561612', label: '561612 — Security Guards and Patrol Services' },
  // Construction
  { code: '236220', label: '236220 — Commercial and Institutional Building Construction' },
  { code: '237310', label: '237310 — Highway, Street, and Bridge Construction' },
  { code: '237110', label: '237110 — Water and Sewer Line Construction' },
  { code: '238210', label: '238210 — Electrical Contractors and Other Wiring Installation' },
  { code: '238220', label: '238220 — Plumbing, Heating, and Air-Conditioning Contractors' },
  { code: '238910', label: '238910 — Site Preparation Contractors' },
  // Healthcare / Medical
  { code: '621111', label: '621111 — Offices of Physicians (except Mental Health)' },
  { code: '622110', label: '622110 — General Medical and Surgical Hospitals' },
  { code: '621610', label: '621610 — Home Health Care Services' },
  { code: '621999', label: '621999 — All Other Miscellaneous Ambulatory Health Care Services' },
  { code: '325412', label: '325412 — Pharmaceutical Preparation Manufacturing' },
  { code: '339112', label: '339112 — Surgical and Medical Instrument Manufacturing' },
  { code: '339113', label: '339113 — Surgical Appliance and Supplies Manufacturing' },
  // Logistics / Supply Chain
  { code: '484110', label: '484110 — General Freight Trucking, Local' },
  { code: '484121', label: '484121 — General Freight Trucking, Long-Distance, TL' },
  { code: '488510', label: '488510 — Freight Transportation Arrangement' },
  { code: '493110', label: '493110 — General Warehousing and Storage' },
  { code: '561910', label: '561910 — Packaging and Labeling Services' },
  // Professional Services
  { code: '561110', label: '561110 — Office Administrative Services' },
  { code: '561210', label: '561210 — Facilities Support Services' },
  { code: '561320', label: '561320 — Temporary Staffing Services' },
  { code: '561410', label: '561410 — Document Preparation Services' },
  { code: '561499', label: '561499 — All Other Business Support Services' },
  { code: '561730', label: '561730 — Landscaping Services' },
  { code: '561740', label: '561740 — Carpet and Upholstery Cleaning Services' },
  { code: '561790', label: '561790 — Other Services to Buildings and Dwellings' },
  { code: '562111', label: '562111 — Solid Waste Collection' },
  // Education & Training
  { code: '611430', label: '611430 — Professional and Management Development Training' },
  { code: '611519', label: '611519 — Other Technical and Trade Schools' },
  { code: '611710', label: '611710 — Educational Support Services' },
  // Research & Development
  { code: '541710', label: '541710 — Physical, Engineering, and Life Sciences R&D' },
  { code: '541720', label: '541720 — Social Sciences and Humanities Research' },
  // Environmental
  { code: '562910', label: '562910 — Remediation Services' },
  { code: '562920', label: '562920 — Materials Recovery Facilities' },
  { code: '541380', label: '541380 — Testing Laboratories and Services' },
  // Manufacturing
  { code: '332710', label: '332710 — Machine Shops' },
  { code: '332721', label: '332721 — Precision Turned Product Manufacturing' },
  { code: '334111', label: '334111 — Electronic Computer Manufacturing' },
  { code: '334220', label: '334220 — Radio and TV Broadcasting Equipment Manufacturing' },
  { code: '334290', label: '334290 — Other Communications Equipment Manufacturing' },
  { code: '335929', label: '335929 — Other Communication and Energy Wire Manufacturing' },
  { code: '336411', label: '336411 — Aircraft Manufacturing' },
  { code: '336412', label: '336412 — Aircraft Engine and Engine Parts Manufacturing' },
  { code: '336419', label: '336419 — Other Aircraft Parts and Auxiliary Equipment' },
  // Finance & Accounting
  { code: '541211', label: '541211 — Offices of Certified Public Accountants' },
  { code: '541213', label: '541213 — Tax Preparation Services' },
  { code: '541219', label: '541219 — Other Accounting Services' },
  // Architecture
  { code: '541310', label: '541310 — Architectural Services' },
  { code: '541320', label: '541320 — Landscape Architecture Services' },
  { code: '541340', label: '541340 — Drafting Services' },
  { code: '541350', label: '541350 — Building Inspection Services' },
  // Media & Communications
  { code: '519130', label: '519130 — Internet Publishing and Broadcasting' },
  { code: '541820', label: '541820 — Public Relations Agencies' },
  { code: '541830', label: '541830 — Media Buying Agencies' },
  { code: '541840', label: '541840 — Media Representatives' },
  { code: '541870', label: '541870 — Advertising Material Distribution Services' },
];

export const searchNAICS = (query) => {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  return NAICS_CODES.filter(
    n => n.code.includes(q) || n.label.toLowerCase().includes(q)
  ).slice(0, 10);
};
