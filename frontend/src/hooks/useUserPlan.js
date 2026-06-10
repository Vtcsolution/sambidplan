import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export function useUserPlan() {
  const [plan, setPlan] = useState(
    () => localStorage.getItem('userPlan') || sessionStorage.getItem('userPlan') || 'free'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.getProfile()
      .then(res => {
        if (res.data.success) {
          const serverPlan = res.data.data?.plan;
          if (serverPlan) {
            setPlan(serverPlan);
            localStorage.setItem('userPlan', serverPlan);
            sessionStorage.setItem('userPlan', serverPlan);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { plan, loading };
}
