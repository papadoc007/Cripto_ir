import { useParams, Link } from 'react-router-dom';
import SyncProgress from '../components/SyncProgress';
import FirstFunderCard from '../components/FirstFunderCard';
import CashflowChart from '../components/CashflowChart';
import TimelineChart from '../components/TimelineChart';
import CounterpartyTable from '../components/CounterpartyTable';
import TokenTable from '../components/TokenTable';
import TransactionTable from '../components/TransactionTable';
import FlowGraph from '../components/FlowGraph';
import HeuristicFlags from '../components/HeuristicFlags';
import ChatPanel from '../components/ChatPanel';
import { useSSE } from '../hooks/useSSE';

const styles = {
  container: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  address: {
    fontFamily: 'monospace',
    fontSize: '1.1rem',
    color: '#c0c0ff',
    background: 'rgba(30, 30, 60, 0.6)',
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: '1px solid rgba(100, 120, 255, 0.2)',
  },
  reportLink: {
    padding: '0.5rem 1.5rem',
    background: '#6c63ff',
    color: '#fff',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'rgba(20, 20, 50, 0.7)',
    borderRadius: 12,
    padding: '1.5rem',
    border: '1px solid rgba(100, 120, 255, 0.15)',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#aaa',
    marginBottom: '1rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
};

export default function DashboardPage() {
  const { address } = useParams<{ address: string }>();
  const { events, done } = useSSE(address ?? null);

  if (!address) return <div>No address specified</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.address}>{address}</div>
        <Link to={`/report/${address}`} style={styles.reportLink}>Generate Report</Link>
      </div>

      {!done && <SyncProgress events={events} />}

      <div style={styles.grid}>
        {/* First Funder - prominent position */}
        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.cardTitle}>First Funder</h3>
          <FirstFunderCard address={address} />
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Monthly Cashflow</h3>
          <CashflowChart address={address} />
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Activity Timeline</h3>
          <TimelineChart address={address} />
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Top Counterparties</h3>
          <CounterpartyTable address={address} />
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Token Exposure</h3>
          <TokenTable address={address} />
        </div>

        {/* Full Transaction Table - full width */}
        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.cardTitle}>Transaction History</h3>
          <TransactionTable address={address} />
        </div>

        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.cardTitle}>Transfer Graph</h3>
          <FlowGraph address={address} />
        </div>

        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.cardTitle}>Suspicious Activity Flags</h3>
          <HeuristicFlags address={address} />
        </div>

        <div style={{ ...styles.card, ...styles.fullWidth }}>
          <h3 style={styles.cardTitle}>AI Investigation Chat</h3>
          <ChatPanel address={address} />
        </div>
      </div>
    </div>
  );
}
