export const opportunities = [
  {
    id: 1,
    title: "Cloud Infrastructure Services",
    agency: "Department of Defense",
    budget: "$2.5M - $5M",
    deadline: "2024-12-15",
    description: "Seeking cloud infrastructure providers for secure data storage and processing.",
    naics: "541519",
    setAside: "8(a)",
    matchScore: 92
  },
  {
    id: 2,
    title: "Cybersecurity Assessment",
    agency: "Department of Homeland Security",
    budget: "$750K - $1.2M",
    deadline: "2024-12-20",
    description: "Comprehensive cybersecurity assessment for critical infrastructure.",
    naics: "541611",
    setAside: "SDVOSB",
    matchScore: 78
  },
  {
    id: 3,
    title: "IT Modernization Services",
    agency: "GSA",
    budget: "$3M - $7M",
    deadline: "2024-12-10",
    description: "Legacy system modernization and cloud migration services.",
    naics: "541512",
    setAside: "WOSB",
    matchScore: 88
  },
  {
    id: 4,
    title: "Data Analytics Platform",
    agency: "Department of Treasury",
    budget: "$1.5M - $2M",
    deadline: "2024-12-18",
    description: "AI-powered data analytics platform for financial oversight.",
    naics: "541715",
    setAside: "HUBZone",
    matchScore: 65
  }
];

export const alerts = [
  {
    id: 1,
    title: "New: Cloud Infrastructure Services",
    type: "new",
    message: "High-match opportunity (92%) in your preferred NAICS",
    createdAt: "2024-11-28"
  },
  {
    id: 2,
    title: "Deadline Approaching: IT Modernization",
    type: "deadline",
    message: "Ends in 3 days - $3M+ opportunity",
    createdAt: "2024-11-27"
  },
  {
    id: 3,
    title: "High Match: Cybersecurity Assessment",
    type: "match",
    message: "78% match with your past performance",
    createdAt: "2024-11-26"
  }
];

export const userStats = {
  totalOpportunities: 47,
  savedOpportunities: 12,
  activeAlerts: 8,
  subscriptionPlan: "Basic",
  paymentStatus: "Active Plan"
};