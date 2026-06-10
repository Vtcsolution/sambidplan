import UserNotification from '../models/UserNotification.js';

/**
 * Create a user-facing in-app notification.
 * Fire-and-forget safe — always returns a promise, never throws.
 */
export const createUserNotification = async (userId, type, title, message = '', link = '') => {
  try {
    await UserNotification.create({ user: userId, type, title, message, link });
  } catch (err) {
    console.error('createUserNotification error:', err.message);
  }
};
