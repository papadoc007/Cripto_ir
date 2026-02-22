import { useState, useEffect, useCallback } from 'react';

interface SyncProgress {
  address: string;
  txType: string;
  status: string;
  recordsFetched: number;
  currentBlock: number;
  latestBlock: number;
  message: string;
}

export function useSSE(address: string | null) {
  const [events, setEvents] = useState<SyncProgress[]>([]);
  const [connected, setConnected] = useState(false);
  const [done, setDone] = useState(false);

  const reset = useCallback(() => {
    setEvents([]);
    setDone(false);
  }, []);

  useEffect(() => {
    if (!address) return;

    const es = new EventSource(`/api/sync/progress/${address}`);
    setConnected(true);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as SyncProgress;
        setEvents(prev => [...prev, data]);

        if (data.status === 'done' && data.txType === 'internal') {
          setDone(true);
        }
        if (data.status === 'error') {
          // Keep going, errors are per-type
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [address]);

  return { events, connected, done, reset };
}
