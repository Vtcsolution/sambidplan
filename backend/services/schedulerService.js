// backend/services/schedulerService.js
import cron from 'node-cron';
import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';
import Alert from '../models/Alert.js';
import AlertNotification from '../models/AlertNotification.js';
import { fetchSAMOpportunities } from './samApiService.js';

// CONFIGURATION - Adjust these values
const FETCH_INTERVAL_MINUTES = 5;  // Fetch every 5 minutes (can be 1, 2, 5, 10, 15, 30)
const MAX_NAICS_PER_USER = 3;       // Limit NAICS codes per user to avoid rate limits
const BATCH_DELAY_SECONDS = 2;      // Delay between users

// Calculate match score for opportunity against user profile
const calculateMatchScore = (opportunity, user) => {
  let score = 0;
  const reasons = [];
  
  // NAICS Code Match (0-50 points)
  if (user.naicsCodes && user.naicsCodes.includes(opportunity.naicsCode)) {
    score += 50;
    reasons.push('✓ Your NAICS code matches this opportunity');
  } else if (user.naicsCodes && user.naicsCodes.length > 0) {
    score += 5;
    reasons.push('✗ NAICS code mismatch');
  } else {
    score += 10;
    reasons.push('⚠️ No NAICS codes configured');
  }
  
  // Set-Aside Status (0-20 points)
  if (opportunity.setAside) {
    if (opportunity.setAside.toLowerCase().includes('small business')) {
      score += 20;
      reasons.push('✓ Small business set-aside');
    } else if (opportunity.setAside.toLowerCase().includes('sba')) {
      score += 15;
      reasons.push('✓ SBA program');
    } else {
      score += 5;
      reasons.push('⚠️ Check set-aside');
    }
  }
  
  // Time Sensitivity (0-20 points)
  if (opportunity.dueDate) {
    const dueDate = new Date(opportunity.dueDate);
    const now = new Date();
    if (dueDate > now) {
      const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      if (daysLeft > 30) {
        score += 20;
        reasons.push(`✓ ${daysLeft} days to prepare`);
      } else if (daysLeft > 14) {
        score += 15;
        reasons.push(`⚠️ ${daysLeft} days left`);
      } else if (daysLeft > 7) {
        score += 10;
        reasons.push(`⚠️ Only ${daysLeft} days left`);
      } else if (daysLeft > 0) {
        score += 5;
        reasons.push(`❗ Due in ${daysLeft} days`);
      }
    } else {
      score += 15;
      reasons.push('📊 Past award - use for market research');
    }
  }
  
  // Contract Value (0-10 points)
  if (opportunity.estimatedValue) {
    if (opportunity.estimatedValue < 100000) {
      score += 10;
      reasons.push('✓ Ideal size (<$100k)');
    } else if (opportunity.estimatedValue < 500000) {
      score += 7;
      reasons.push('✓ Manageable size ($100k-$500k)');
    } else {
      score += 3;
      reasons.push('⚠️ Large contract');
    }
  }
  
  return { score: Math.min(100, score), reasons };
};

// Check if opportunity matches any alert
const checkAlertMatches = (opportunity, alert) => {
  let matchCount = 0;
  const totalConditions = [];
  
  if (alert.naicsCodes && alert.naicsCodes.length > 0) {
    totalConditions.push('naics');
    if (alert.naicsCodes.includes(opportunity.naicsCode)) {
      matchCount++;
    }
  }
  
  if (alert.keywords && alert.keywords.length > 0) {
    totalConditions.push('keywords');
    const title = opportunity.title?.toLowerCase() || '';
    const desc = opportunity.description?.toLowerCase() || '';
    const keywordMatch = alert.keywords.some(kw => 
      title.includes(kw.toLowerCase()) || desc.includes(kw.toLowerCase())
    );
    if (keywordMatch) matchCount++;
  }
  
  if (alert.agencies && alert.agencies.length > 0) {
    totalConditions.push('agencies');
    const agencyMatch = alert.agencies.some(a => 
      opportunity.agency?.toLowerCase().includes(a.toLowerCase())
    );
    if (agencyMatch) matchCount++;
  }
  
  if (alert.minValue > 0 || alert.maxValue) {
    totalConditions.push('value');
    const value = opportunity.estimatedValue || 0;
    const meetsMin = alert.minValue === 0 || value >= alert.minValue;
    const meetsMax = !alert.maxValue || value <= alert.maxValue;
    if (meetsMin && meetsMax) matchCount++;
  }
  
  const matchPercentage = totalConditions.length > 0 
    ? (matchCount / totalConditions.length) * 100 
    : 100;
  
  return {
    isMatch: matchPercentage >= (alert.matchScore || 50),
    matchScore: Math.round(matchPercentage),
    details: { matchCount, totalConditions }
  };
};

const getMatchReasons = (opportunity, user, alert) => {
  const reasons = [];
  
  if (alert.naicsCodes?.includes(opportunity.naicsCode)) {
    reasons.push(`✓ NAICS ${opportunity.naicsCode} matches your alert`);
  }
  
  if (alert.keywords?.length > 0) {
    reasons.push(`✓ Keywords match your criteria`);
  }
  
  if (alert.agencies?.length > 0 && opportunity.agency) {
    reasons.push(`✓ Agency ${opportunity.agency} matches your alert`);
  }
  
  const value = opportunity.estimatedValue;
  if (value && (alert.minValue > 0 || alert.maxValue)) {
    reasons.push(`✓ Contract value $${value.toLocaleString()} within your range`);
  }
  
  if (opportunity.setAside?.toLowerCase().includes('small business')) {
    reasons.push(`✓ Small business set-aside opportunity`);
  }
  
  return reasons;
};

// Fetch and process opportunities for a user from SAM.gov
const fetchAndProcessUserOpportunities = async (user) => {
  try {
    console.log(`🔄 Auto-fetching from SAM.gov for user: ${user.email} (${user.plan} plan)`);
    
    const naicsCodes = user.naicsCodes || [];
    if (naicsCodes.length === 0) {
      console.log(`⚠️ No NAICS codes for user ${user.email}, skipping`);
      return 0;
    }
    
    let fetchLimit = 20;
    if (user.plan === 'starter') fetchLimit = 50;
    if (user.plan === 'pro') fetchLimit = 100;
    if (user.plan === 'enterprise') fetchLimit = 200;
    
    let allOpportunities = [];
    let newMatches = 0;
    
    for (const code of naicsCodes.slice(0, MAX_NAICS_PER_USER)) {
      console.log(`📡 Auto-fetching SAM.gov for NAICS: ${code}`);
      
      try {
        const samOpps = await fetchSAMOpportunities(code, fetchLimit);
        if (samOpps && samOpps.length > 0) {
          allOpportunities.push(...samOpps);
          console.log(`✅ Got ${samOpps.length} opportunities from SAM.gov for NAICS ${code}`);
        }
      } catch (error) {
        console.error(`❌ Error fetching SAM.gov for ${code}:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_SECONDS * 1000));
    }
    
    console.log(`📊 Total opportunities fetched from SAM.gov: ${allOpportunities.length}`);
    
    if (allOpportunities.length === 0) return 0;
    
    for (const opp of allOpportunities) {
      let existing = await Opportunity.findOne({ sourceId: opp.sourceId });
      let isNew = false;
      
      if (!existing) {
        existing = new Opportunity(opp);
        await existing.save();
        isNew = true;
        console.log(`💾 New opportunity saved: ${opp.title} (${opp.sourceId})`);
      }
      
      if (isNew) {
        const alerts = await Alert.find({ user: user._id, isActive: true });
        
        for (const alert of alerts) {
          const { isMatch, matchScore } = checkAlertMatches(existing, alert);
          
          if (isMatch && matchScore >= alert.matchScore) {
            const alreadyNotified = await AlertNotification.findOne({
              user: user._id,
              alert: alert._id,
              opportunity: existing._id
            });
            
            if (!alreadyNotified) {
              await AlertNotification.create({
                user: user._id,
                alert: alert._id,
                opportunity: existing._id,
                matchScore: matchScore,
                matchReasons: getMatchReasons(existing, user, alert),
                isRead: false,
                sentAt: new Date()
              });
              newMatches++;
              console.log(`🔔 NEW ALERT MATCH for ${user.email}: "${existing.title}" - ${matchScore}% match`);
            }
          }
        }
      }
    }
    
    console.log(`✅ Processed ${allOpportunities.length} opportunities, ${newMatches} NEW matches for ${user.email}`);
    return newMatches;
    
  } catch (error) {
    console.error(`❌ Error processing user ${user.email}:`, error.message);
    return 0;
  }
};

// Main scheduler function
const runAutoFetch = async () => {
  console.log('\n' + '='.repeat(70));
  console.log(`🕐 SAM.gov REAL-TIME AUTO-FETCH (Every ${FETCH_INTERVAL_MINUTES} minutes)`);
  console.log('Time:', new Date().toISOString());
  console.log('='.repeat(70));
  
  try {
    const users = await User.find({
      naicsCodes: { $exists: true, $not: { $size: 0 } },
      $or: [
        { plan: { $in: ['starter', 'pro', 'enterprise'] } },
        { plan: 'free', dailyMatchesUsed: { $lt: 2 } },
        { plan: 'trial', dailyMatchesUsed: { $lt: 2 } }
      ]
    });
    
    console.log(`👥 Found ${users.length} active users to process`);
    
    let totalMatches = 0;
    
    for (const user of users) {
      const lastReset = new Date(user.lastMatchReset);
      const now = new Date();
      if (lastReset.toDateString() !== now.toDateString()) {
        user.dailyMatchesUsed = 0;
        user.lastMatchReset = now;
        await user.save();
        console.log(`🔄 Reset daily counter for ${user.email}`);
      }
      
      let maxMatches = 2;
      if (user.plan === 'starter') maxMatches = 50;
      if (user.plan === 'pro') maxMatches = 1000;
      if (user.plan === 'enterprise') maxMatches = 10000;
      
      if (user.dailyMatchesUsed >= maxMatches) {
        console.log(`⏸️ User ${user.email} reached daily limit (${maxMatches})`);
        continue;
      }
      
      const matches = await fetchAndProcessUserOpportunities(user);
      totalMatches += matches;
      
      if (matches > 0) {
        user.dailyMatchesUsed += matches;
        await user.save();
        console.log(`📊 ${user.email}: ${user.dailyMatchesUsed}/${maxMatches} matches used today`);
      }
      
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_SECONDS * 1000));
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`🎉 AUTO-FETCH COMPLETE!`);
    console.log(`   Total new matches: ${totalMatches}`);
    console.log(`   Next fetch in ${FETCH_INTERVAL_MINUTES} minutes`);
    console.log('='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('❌ Auto-fetch scheduler error:', error);
  }
};

// Start the scheduler
export const startScheduler = () => {
  console.log('\n🚀 Starting SAM.gov REAL-TIME Auto-Fetch Scheduler...');
  console.log(`⏱️  Fetch interval: Every ${FETCH_INTERVAL_MINUTES} minutes`);
  console.log(`📊 Max NAICS per user: ${MAX_NAICS_PER_USER}`);
  console.log(`⏸️  Batch delay: ${BATCH_DELAY_SECONDS} seconds`);
  
  // Run every X minutes (based on FETCH_INTERVAL_MINUTES)
  const cronExpression = `*/${FETCH_INTERVAL_MINUTES} * * * *`;
  cron.schedule(cronExpression, () => {
    runAutoFetch();
  });
  
  // Run on server start
  setTimeout(() => {
    console.log('📡 Running initial auto-fetch on server start...');
    runAutoFetch();
  }, 10000);
  
  console.log(`✅ Auto-fetch scheduler started (runs every ${FETCH_INTERVAL_MINUTES} minutes)`);
};

export const triggerManualFetch = async () => {
  console.log('🔧 Manual fetch triggered');
  return await runAutoFetch();
};