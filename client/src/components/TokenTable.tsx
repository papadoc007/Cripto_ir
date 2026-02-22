import { useTokens } from '../hooks/useAnalytics';

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
};

export default function TokenTable({ address }: { address: string }) {
  const { data, loading, error } = useTokens(address);

  if (loading) return <div style={{ color: '#888', padding: '2rem' }}>Loading tokens...</div>;
  if (error) return <div style={{ color: '#f44336' }}>Error: {error}</div>;
  if (!data || (data as unknown[]).length === 0) return <div style={{ color: '#888' }}>No token data</div>;

  const rows = data as { token_name: string; token_symbol: string; contract_address: string; transfer_count: number }[];

  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Token</th>
            <th style={styles.th}>Symbol</th>
            <th style={styles.th}>Contract</th>
            <th style={styles.th}>Transfers</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 25).map((row, i) => (
            <tr key={i}>
              <td style={styles.td}>{row.token_name || 'Unknown'}</td>
              <td style={styles.td}>{row.token_symbol}</td>
              <td style={{ ...styles.td, fontFamily: 'monospace', color: '#c0c0ff', fontSize: '0.8rem' }}>
                {row.contract_address.slice(0, 10)}...
              </td>
              <td style={styles.td}>{row.transfer_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
