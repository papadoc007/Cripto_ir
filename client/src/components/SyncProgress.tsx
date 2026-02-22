interface SyncEvent {
  txType: string;
  status: string;
  recordsFetched: number;
  currentBlock: number;
  latestBlock: number;
  message: string;
}

const styles = {
  container: {
    marginBottom: '2rem',
    padding: '1rem 1.5rem',
    background: 'rgba(20, 20, 50, 0.7)',
    borderRadius: 12,
    border: '1px solid rgba(100, 120, 255, 0.15)',
  },
  title: {
    fontSize: '0.9rem',
    color: '#888',
    marginBottom: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  dot: (status: string) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: status === 'done' ? '#4caf50' : status === 'error' ? '#f44336' : '#ff9800',
    flexShrink: 0,
  }),
  label: {
    fontWeight: 600,
    color: '#c0c0ff',
    width: 70,
    fontSize: '0.9rem',
  },
  message: {
    color: '#999',
    fontSize: '0.85rem',
    flex: 1,
  },
  bar: {
    width: 120,
    height: 6,
    background: 'rgba(100, 120, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  barFill: (pct: number) => ({
    width: `${pct}%`,
    height: '100%',
    background: '#6c63ff',
    borderRadius: 3,
    transition: 'width 0.3s',
  }),
};

export default function SyncProgress({ events }: { events: SyncEvent[] }) {
  // Get latest event per tx type
  const latest = new Map<string, SyncEvent>();
  for (const e of events) {
    if (e.txType) latest.set(e.txType, e);
  }

  if (latest.size === 0) return null;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Sync Progress</h3>
      {['normal', 'erc20', 'internal'].map(type => {
        const e = latest.get(type);
        if (!e) return null;
        const pct = e.latestBlock > 0 ? Math.min(100, (e.currentBlock / e.latestBlock) * 100) : 0;
        return (
          <div key={type} style={styles.item}>
            <div style={styles.dot(e.status)} />
            <span style={styles.label}>{type}</span>
            <div style={styles.bar}><div style={styles.barFill(pct)} /></div>
            <span style={styles.message}>{e.message}</span>
          </div>
        );
      })}
    </div>
  );
}
