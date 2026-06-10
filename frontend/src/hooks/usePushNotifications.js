// frontend/src/hooks/usePushNotifications.js
// Manages the full browser push subscription lifecycle:
//  1. Check browser support
//  2. Register service worker
//  3. Request permission
//  4. Subscribe to push & store on backend
//  5. Unsubscribe and clean up on backend
import { useState, useEffect, useCallback } from 'react';
import { pushAPI } from '../services/api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

export function usePushNotifications() {
  const [supported,   setSupported]   = useState(false);
  const [permission,  setPermission]  = useState('default'); // 'default' | 'granted' | 'denied'
  const [subscribed,  setSubscribed]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [swReg,       setSwReg]       = useState(null);

  // Check browser support and load status on mount
  useEffect(() => {
    const init = async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setSupported(isSupported);
      if (!isSupported) return;

      setPermission(Notification.permission);

      try {
        // Register SW
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        setSwReg(reg);

        // Check if already subscribed on this device
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          // Verify with backend
          const res = await pushAPI.getStatus();
          setSubscribed(res.data.subscribed && !!existingSub);
        }
      } catch (err) {
        console.error('SW registration error:', err);
      }
    };
    init();
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported || !swReg) return;
    setLoading(true);
    setError('');
    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Notification permission denied. Please enable it in your browser settings.');
        return;
      }

      // Get VAPID public key from backend (or use env var)
      let vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        const res = await pushAPI.getVapidKey();
        vapidKey  = res.data.publicKey;
      }

      // Subscribe via PushManager
      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      // Send subscription to backend
      await pushAPI.subscribe({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
          auth:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))))
        }
      });

      setSubscribed(true);
    } catch (err) {
      console.error('Push subscribe error:', err);
      setError(err.message || 'Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  }, [supported, swReg]);

  const unsubscribe = useCallback(async () => {
    if (!swReg) return;
    setLoading(true);
    setError('');
    try {
      const existingSub = await swReg.pushManager.getSubscription();
      if (existingSub) {
        await pushAPI.unsubscribe(existingSub.endpoint);
        await existingSub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setError(err.message || 'Failed to disable push notifications');
    } finally {
      setLoading(false);
    }
  }, [swReg]);

  const sendTest = useCallback(async () => {
    try {
      const res = await pushAPI.sendTest();
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }, []);

  return { supported, permission, subscribed, loading, error, subscribe, unsubscribe, sendTest };
}
