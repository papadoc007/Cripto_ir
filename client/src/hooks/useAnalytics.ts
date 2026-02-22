import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function useAnalytics<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then(result => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, deps);

  return { data, loading, error };
}

export function useCashflow(address: string) {
  return useAnalytics(() => api.getCashflow(address), [address]);
}

export function useCounterparties(address: string) {
  return useAnalytics(() => api.getCounterparties(address), [address]);
}

export function useTimeline(address: string) {
  return useAnalytics(() => api.getTimeline(address), [address]);
}

export function useTokens(address: string) {
  return useAnalytics(() => api.getTokens(address), [address]);
}

export function useGraph(address: string, hops = 1) {
  return useAnalytics(() => api.getGraph(address, hops), [address, hops]);
}

export function useHeuristics(address: string) {
  return useAnalytics(() => api.getHeuristics(address), [address]);
}

export function useFirstFunder(address: string) {
  return useAnalytics(() => api.getFirstFunder(address), [address]);
}

export function useTransactions(address: string, offset = 0, limit = 100, direction = 'all', sort = 'desc') {
  return useAnalytics(
    () => api.getTransactions(address, { offset, limit, direction, sort }),
    [address, offset, limit, direction, sort]
  );
}
