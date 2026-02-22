import { useFirstFunder } from '../hooks/useAnalytics';

const styles = {
  card: {
    background: 'rgba(20, 30, 60, 0.8)',
    border: '1px solid rgba(100, 120, 255, 0.25)',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
  },
  label: {
    fontSize: '0.75rem',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.15rem',
  },
  value: {
    fontSize: '0.95rem',
    color: '#e0e0ff',
    fontFamily: 'monospace',
    wordBreak: 'break-all' as const,
  },
  highlight: {
    color: '#6c63ff',
    fontWeight: 600,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginTop: '0.75rem',
  },
  field: {
    marginBottom: '0.5rem',
  },
  ethValue: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#4caf50',
  },
  link: {
    color: '#6c63ff',
    textDecoration: 'none',
    fontSize: '0.85rem',
  },
};

export default function FirstFunderCard({ address }: { address: string }) {
  const { data, loading, error } = useFirstFunder(address);

  if (loading) return <div style={{ color: '#888', padding: '1rem' }}>Detecting first funder...</div>;
  if (error) return <div style={{ color: '#f44336' }}>Error: {error}</div>;
  if (!data) return <div style={{ color: '#888' }}>No incoming transactions found</div>;

  const date = new Date(data.timestamp * 1000);
  const timeAgo = getTimeAgo(data.timestamp);

  return (
    <div style={styles.card}>
      <div style={styles.field}>
        <div style={styles.label}>First Funded By</div>
        <div style={styles.value}>
          <span style={styles.highlight}>{data.funder_label || data.funder_address}</span>
        </div>
        {data.funder_label && (
          <div style={{ ...styles.value, fontSize: '0.8rem', color: '#999', marginTop: '0.2rem' }}>
            {data.funder_address}
          </div>
        )}
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <div style={styles.label}>Amount</div>
          <div style={styles.ethValue}>{data.value_eth.toFixed(4)} ETH</div>
        </div>
        <div style={styles.field}>
          <div style={styles.label}>Timestamp</div>
          <div style={styles.value}>{date.toLocaleString()}</div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>{timeAgo}</div>
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <div style={styles.label}>Transaction Hash</div>
          <a
            href={`https://etherscan.io/tx/${data.tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            {data.tx_hash.slice(0, 18)}...{data.tx_hash.slice(-6)}
          </a>
        </div>
        <div style={styles.field}>
          <div style={styles.label}>Block</div>
          <div style={styles.value}>{data.block_number.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days} days ago`;
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  const months = Math.floor(remainingDays / 30);
  return `${years}y ${months}m ago`;
}
