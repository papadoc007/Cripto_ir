import { useCounterparties } from '../hooks/useAnalytics';

function weiToEth(wei: string): string {
  const val = Number(BigInt(wei || '0')) / 1e18;
  return val.toFixed(4);
}

const styles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.85rem',
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.5rem 0.75rem',
    color: '#888',
    borderBottom: '1px solid rgba(100,120,255,0.2)',
    fontWeight: 600,
    fontSize: '0.8rem',
    textTransform: 'uppercase' as const,
  },
  td: {
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid rgba(100,120,255,0.08)',
    color: '#ccc',
  },
  mono: {
    fontFamily: 'monospace',
    color: '#c0c0ff',
    fontSize: '0.8rem',
  },
};

export default function CounterpartyTable({ address }: { address: string }) {
  const { data, loading, error } = useCounterparties(address);

  if (loading) return <div style={{ color: '#888', padding: '2rem' }}>Loading counterparties...</div>;
  if (error) return <div style={{ color: '#f44336' }}>Error: {error}</div>;
  if (!data || (data as unknown[]).length === 0) return <div style={{ color: '#888' }}>No counterparty data</div>;

  const rows = data as { address: string; tx_count: number; total_in: string; total_out: string; first_seen: number; last_seen: number }[];

  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Address</th>
            <th style={styles.th}>Txns</th>
            <th style={styles.th}>Inflow (ETH)</th>
            <th style={styles.th}>Outflow (ETH)</th>
            <th style={styles.th}>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 25).map((row, i) => (
            <tr key={i}>
              <td style={{ ...styles.td, ...styles.mono }}>{row.address.slice(0, 10)}...</td>
              <td style={styles.td}>{row.tx_count}</td>
              <td style={styles.td}>{weiToEth(row.total_in)}</td>
              <td style={styles.td}>{weiToEth(row.total_out)}</td>
              <td style={styles.td}>{new Date(row.last_seen * 1000).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
