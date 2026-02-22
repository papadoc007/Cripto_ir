import { useHeuristics } from '../hooks/useAnalytics';

interface Flag {
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

const severityColors = {
  high: { bg: 'rgba(244, 67, 54, 0.15)', border: '#f44336', text: '#ff8a80' },
  medium: { bg: 'rgba(255, 152, 0, 0.15)', border: '#ff9800', text: '#ffcc80' },
  low: { bg: 'rgba(76, 175, 80, 0.15)', border: '#4caf50', text: '#a5d6a7' },
};

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
  },
  card: (severity: 'low' | 'medium' | 'high') => ({
    padding: '1rem 1.25rem',
    borderRadius: 10,
    background: severityColors[severity].bg,
    border: `1px solid ${severityColors[severity].border}`,
  }),
  badge: (severity: 'low' | 'medium' | 'high') => ({
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: 4,
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    background: severityColors[severity].border,
    color: '#fff',
    marginBottom: '0.5rem',
  }),
  title: (severity: 'low' | 'medium' | 'high') => ({
    fontSize: '0.95rem',
    fontWeight: 600,
    color: severityColors[severity].text,
    marginBottom: '0.35rem',
  }),
  desc: {
    fontSize: '0.85rem',
    color: '#bbb',
    lineHeight: 1.5,
  },
};

export default function HeuristicFlags({ address }: { address: string }) {
  const { data, loading, error } = useHeuristics(address);

  if (loading) return <div style={{ color: '#888', padding: '2rem' }}>Analyzing patterns...</div>;
  if (error) return <div style={{ color: '#f44336' }}>Error: {error}</div>;

  const flags = (data || []) as Flag[];
  if (flags.length === 0) return <div style={{ color: '#4caf50', padding: '1rem' }}>No suspicious patterns detected.</div>;

  return (
    <div style={styles.grid}>
      {flags.map((flag, i) => (
        <div key={i} style={styles.card(flag.severity)}>
          <span style={styles.badge(flag.severity)}>{flag.severity}</span>
          <div style={styles.title(flag.severity)}>{flag.title}</div>
          <p style={styles.desc}>{flag.description}</p>
        </div>
      ))}
    </div>
  );
}
