import { useState, useEffect, useCallback } from 'react';
import { paymentAPI } from '../services/api';

let _cache = null;
let _pending = null;
let _fetchedAt = 0;
const CACHE_TTL = 60_000;

export function invalidatePlanCache() {
  _cache = null;
  _pending = null;
  _fetchedAt = 0;
}

export function usePlans() {
  const [plans, setPlans] = useState(_cache || []);
  const [loading, setLoading] = useState(!_cache);

  const fetchPlans = useCallback(() => {
    const now = Date.now();
    if (_cache && now - _fetchedAt < CACHE_TTL) {
      setPlans(_cache);
      setLoading(false);
      return;
    }
    if (!_pending) {
      _pending = paymentAPI.getPlans()
        .then(res => { _cache = res.data?.data || []; _fetchedAt = Date.now(); return _cache; })
        .catch(() => [])
        .finally(() => { _pending = null; });
    }
    _pending.then(data => { setPlans(data); setLoading(false); });
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const getMonthly = (planName) => {
    const p = plans.find(p => p.name?.toLowerCase() === planName?.toLowerCase());
    return p?.priceMonthly ?? null;
  };

  const getYearly = (planName) => {
    const p = plans.find(p => p.name?.toLowerCase() === planName?.toLowerCase());
    return p?.priceYearly ?? null;
  };

  const refresh = useCallback(() => {
    invalidatePlanCache();
    fetchPlans();
  }, [fetchPlans]);

  return { plans, loading, getMonthly, getYearly, refresh };
}
