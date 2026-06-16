import { useState, useEffect } from 'react';
import { paymentAPI } from '../services/api';

// Module-level cache — fetched once per page load, shared across all hook consumers
let _cache = null;
let _pending = null;

export function usePlans() {
  const [plans, setPlans] = useState(_cache || []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) { setPlans(_cache); setLoading(false); return; }
    if (!_pending) {
      _pending = paymentAPI.getPlans()
        .then(res => { _cache = res.data?.data || []; return _cache; })
        .catch(() => [])
        .finally(() => { _pending = null; });
    }
    _pending.then(data => { setPlans(data); setLoading(false); });
  }, []);

  // Returns the monthly price for a plan by name, or null while loading
  const getMonthly = (planName) => {
    const p = plans.find(p => p.name?.toLowerCase() === planName?.toLowerCase());
    return p?.priceMonthly ?? null;
  };

  // Returns the yearly price for a plan by name, or null while loading
  const getYearly = (planName) => {
    const p = plans.find(p => p.name?.toLowerCase() === planName?.toLowerCase());
    return p?.priceYearly ?? null;
  };

  return { plans, loading, getMonthly, getYearly };
}
