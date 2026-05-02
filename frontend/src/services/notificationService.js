// frontend/src/services/notificationService.js
import { adminAPI } from './api';

let pollingInterval = null;
let listeners = [];

// Start polling for notifications (every 10 seconds)
export const startNotificationPolling = (callback) => {
  listeners.push(callback);
  
  if (!pollingInterval) {
    pollingInterval = setInterval(async () => {
      try {
        const response = await adminAPI.getNotifications({ limit: 50 });
        if (response.data.success) {
          listeners.forEach(listener => listener(response.data.data));
        }
      } catch (error) {
        console.error('Error polling notifications:', error);
      }
    }, 10000); // Poll every 10 seconds
  }
};

// Stop polling
export const stopNotificationPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    listeners = [];
  }
};

// Mark notification as read
export const markAsRead = async (id) => {
  try {
    await adminAPI.markNotificationAsRead(id);
    return true;
  } catch (error) {
    console.error('Error marking as read:', error);
    return false;
  }
};

// Delete notification
export const deleteNotification = async (id) => {
  try {
    await adminAPI.deleteNotification(id);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

// Get unread count
export const getUnreadCount = async () => {
  try {
    const response = await adminAPI.getUnreadNotificationsCount();
    return response.data.data.count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};