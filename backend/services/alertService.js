// backend/services/alertService.js
import Alert from '../models/Alert.js';
import AlertNotification from '../models/AlertNotification.js';
import Opportunity from '../models/Opportunity.js';
import User from '../models/User.js';

// Calculate match score for alert
const calculateAlertMatchScore = (opportunity, alert) => {
  let score = 0;
  const reasons = [];
  
  // NAICS Code Match (0-40 points)
  if (alert.naicsCodes && alert.naicsCodes.includes(opportunity.naicsCode)) {
    score += 40;
    reasons.push('✓ NAICS code matches your alert criteria');
  } else if (alert.naicsCodes && alert.naicsCodes.length > 0) {
    score += 5;
    reasons.push('✗ NAICS code does not match alert criteria');
  }
  
  // Keyword Match (0-20 points)
  if (alert.keywords && alert.keywords.length > 0) {
    const title = opportunity.title?.toLowerCase() || '';
    const desc = opportunity.description?.toLowerCase() || '';
    let keywordMatches = 0;
    
    for (const keyword of alert.keywords) {
      const kw = keyword.toLowerCase();
      if (title.includes(kw) || desc.includes(kw)) {
        keywordMatches++;
      }
    }
    
    const keywordScore = Math.min(20, (keywordMatches / alert.keywords.length) * 20);
    score += keywordScore;
    if (keywordScore > 0) {
      reasons.push(`✓ ${keywordMatches}/${alert.keywords.length} keywords matched`);
    }
  }
  
  // Agency Match (0-10 points)
  if (alert.agencies && alert.agencies.length > 0) {
    const agencyMatch = alert.agencies.some(a => 
      opportunity.agency?.toLowerCase().includes(a.toLowerCase())
    );
    if (agencyMatch) {
      score += 10;
      reasons.push('✓ Agency matches your alert criteria');
    }
  }
  
  // Value Range (0-15 points)
  if (opportunity.estimatedValue) {
    let valueInRange = true;
    if (alert.minValue && opportunity.estimatedValue < alert.minValue) {
      valueInRange = false;
    }
    if (alert.maxValue && opportunity.estimatedValue > alert.maxValue) {
      valueInRange = false;
    }
    if (valueInRange) {
      score += 15;
      reasons.push('✓ Contract value within your preferred range');
    }
  }
  
  // Time Sensitivity (0-15 points)
  if (opportunity.dueDate) {
    const daysLeft = Math.ceil((new Date(opportunity.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 14) {
      score += 15;
      reasons.push(`✓ ${daysLeft} days remaining`);
    } else if (daysLeft > 7) {
      score += 10;
      reasons.push(`⚠️ ${daysLeft} days remaining`);
    } else if (daysLeft > 0) {
      score += 5;
      reasons.push(`❗ Only ${daysLeft} days left`);
    }
  }
  
  return { score: Math.min(100, score), reasons };
};

// Check new opportunities against user alerts
export const checkNewOpportunitiesForAlerts = async (newOpportunities) => {
  console.log(`🔔 Checking ${newOpportunities.length} new opportunities against user alerts...`);
  
  const notifications = [];
  
  for (const opportunity of newOpportunities) {
    // Find all active alerts that match this opportunity
    const alerts = await Alert.find({ isActive: true });
    
    for (const alert of alerts) {
      const { score, reasons } = calculateAlertMatchScore(opportunity, alert);
      
      // Only create notification if match score meets threshold
      if (score >= alert.matchScore) {
        // Check if already notified for this opportunity
        const existing = await AlertNotification.findOne({
          alert: alert._id,
          opportunity: opportunity._id
        });
        
        if (!existing) {
          const notification = await AlertNotification.create({
            user: alert.user,
            alert: alert._id,
            opportunity: opportunity._id,
            matchScore: score,
            matchReasons: reasons
          });
          
          notifications.push(notification);
          console.log(`📢 Alert notification created for user ${alert.user} - ${score}% match`);
        }
      }
    }
  }
  
  console.log(`✅ Created ${notifications.length} alert notifications`);
  return notifications;
};

// Get user's alert notifications
export const getUserAlertNotifications = async (userId, limit = 50, page = 1) => {
  const skip = (page - 1) * limit;
  
  const notifications = await AlertNotification.find({ user: userId })
    .populate('opportunity')
    .populate('alert')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await AlertNotification.countDocuments({ user: userId });
  
  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await AlertNotification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true },
    { new: true }
  );
  return notification;
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId) => {
  await AlertNotification.updateMany(
    { user: userId, isRead: false },
    { isRead: true }
  );
  return true;
};

// Get unread count for user
export const getUnreadNotificationCount = async (userId) => {
  return await AlertNotification.countDocuments({ user: userId, isRead: false });
};

// Create or update alert
export const createOrUpdateAlert = async (alertData, userId) => {
  const { id, name, naicsCodes, keywords, agencies, minValue, maxValue, matchScore, frequency } = alertData;
  
  const alertDataToSave = {
    user: userId,
    name,
    naicsCodes: naicsCodes || [],
    keywords: keywords || [],
    agencies: agencies || [],
    minValue: minValue || 0,
    maxValue: maxValue || null,
    matchScore: matchScore || 50,
    frequency: frequency || 'realtime',
    isActive: true
  };
  
  let alert;
  if (id) {
    alert = await Alert.findOneAndUpdate(
      { _id: id, user: userId },
      alertDataToSave,
      { new: true }
    );
  } else {
    alert = await Alert.create(alertDataToSave);
  }
  
  return alert;
};

// Get user's alerts
export const getUserAlerts = async (userId) => {
  return await Alert.find({ user: userId }).sort({ createdAt: -1 });
};

// Delete alert
export const deleteAlert = async (alertId, userId) => {
  await Alert.findOneAndDelete({ _id: alertId, user: userId });
  // Also delete associated notifications
  await AlertNotification.deleteMany({ alert: alertId });
  return true;
};

// Toggle alert status
export const toggleAlertStatus = async (alertId, userId) => {
  const alert = await Alert.findOne({ _id: alertId, user: userId });
  if (alert) {
    alert.isActive = !alert.isActive;
    await alert.save();
  }
  return alert;
};