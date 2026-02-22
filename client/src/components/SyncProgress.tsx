interface SyncEvent {
  txType: string;
  status: string;
  recordsFetched: number;
  currentBlock: number;
  latestBlock: number;
  message: string;
}

const TYPE_LABELS: Record<string, string> = { normal: 'ETH Txs', erc20: 'ERC-20', internal: 'Internal' };

export default function SyncProgress({ events }: { events: SyncEvent[] }) {
  const latest = new Map<string, SyncEvent>();
  for (const e of events) { if (e.txType) latest.set(e.txType, e); }
  if (latest.size === 0) return null;

  return (
    <div style={{
      padding: '0.85rem 1.1rem',
      background: 'rgba(11,14,25,0.9)',
      border: '1px solid rgba(240,165,0,0.12)',
      borderRadius: 3,
      display: 'flex',
      alignItems: 'center',
      gap: '2rem',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--amber)', textTransform: 'uppercase', flexShrink: 0 }}>
        Syncing
      </span>

      {['normal', 'erc20', 'internal'].map(type => {
        const e = latest.get(type);
        const pct = e && e.latestBlock > 0 ? Math.min(100, (e.currentBlock / e.latestBlock) * 100) : 0;
        const statusColor = !e ? 'var(--text-dim)' : e.status === 'done' ? 'var(--teal)' : e.status === 'error' ? 'var(--red)' : 'var(--amber)';

        return (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-mid)', width: 52 }}>
              {TYPE_LABELS[type]}
            </span>
            <div style={{ width: 90, height: 3, background: 'rgba(240,165,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: statusColor, borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
            {e && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                {e.recordsFetched.toLocaleString()} records
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
