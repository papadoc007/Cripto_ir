import { useParams, Link } from 'react-router-dom';
import SyncProgress from '../components/SyncProgress';
import PortfolioSnapshot from '../components/PortfolioSnapshot';
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

// ── Panel component with corner bracket decorations ──────────────────────────
function Panel({
  children,
  label,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`panel ${className}`}
      style={{ padding: '1.25rem 1.4rem', ...style }}
    >
      {/* Bottom corners */}
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 14, height: 14, borderLeft: '2px solid var(--amber-dim)', borderBottom: '2px solid var(--amber-dim)' }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRight: '2px solid var(--amber-dim)', borderBottom: '2px solid var(--amber-dim)' }} />

      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <div style={{ width: 3, height: 12, background: 'var(--amber)', opacity: 0.7, borderRadius: 1 }} />
        <span className="card-title">{label}</span>
      </div>

      {children}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { address } = useParams<{ address: string }>();
  const { events, done } = useSSE(address ?? null);

  if (!address) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
      NO ADDRESS SPECIFIED
    </div>
  );

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '1.5rem 1.75rem' }}>

      {/* ── Top bar ── */}
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>

        {/* Address display */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(13,17,32,0.9)',
          border: '1px solid rgba(240,165,0,0.14)',
          borderRadius: 3,
          padding: '0.55rem 1rem',
          flex: '1 1 auto',
          minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <div className="pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: done ? 'var(--teal)' : 'var(--amber)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.14em', color: done ? 'var(--teal)' : 'var(--amber)', textTransform: 'uppercase' }}>
              {done ? 'synced' : 'syncing'}
            </span>
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            color: 'var(--mono)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '0.04em',
          }}>
            {address}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
          <a
            href={`https://etherscan.io/address/${address}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              color: 'var(--text-dim)',
              border: '1px solid rgba(255,255,255,0.07)',
              padding: '0.5rem 0.9rem',
              borderRadius: 3,
              textDecoration: 'none',
              textTransform: 'uppercase',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
          >
            Etherscan ↗
          </a>
          <Link
            to={`/report/${address}`}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              color: 'var(--bg)',
              background: 'var(--amber)',
              padding: '0.5rem 1.1rem',
              borderRadius: 3,
              textDecoration: 'none',
              fontWeight: 600,
              textTransform: 'uppercase',
              transition: 'opacity 0.18s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
          >
            Generate Report
          </Link>
        </div>
      </div>

      {/* Sync progress */}
      {!done && (
        <div className="fade-in delay-1" style={{ marginBottom: '1.25rem' }}>
          <SyncProgress events={events} />
        </div>
      )}

      {/* ── Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem' }}>

        {/* Portfolio Snapshot — top, full width */}
        <div className="fade-in delay-1" style={{ gridColumn: '1 / -1' }}>
          <Panel label="Portfolio Snapshot">
            <PortfolioSnapshot address={address} />
          </Panel>
        </div>

        {/* First Funder — full width */}
        <div className="fade-in delay-2" style={{ gridColumn: '1 / -1' }}>
          <Panel label="First Funder">
            <FirstFunderCard address={address} />
          </Panel>
        </div>

        {/* Cashflow — 8 cols */}
        <div className="fade-in delay-2" style={{ gridColumn: 'span 8' }}>
          <Panel label="Monthly Cashflow">
            <CashflowChart address={address} />
          </Panel>
        </div>

        {/* Timeline — 4 cols */}
        <div className="fade-in delay-2" style={{ gridColumn: 'span 4' }}>
          <Panel label="Activity Timeline">
            <TimelineChart address={address} />
          </Panel>
        </div>

        {/* Counterparties — 6 cols */}
        <div className="fade-in delay-3" style={{ gridColumn: 'span 6' }}>
          <Panel label="Top Counterparties">
            <CounterpartyTable address={address} />
          </Panel>
        </div>

        {/* Tokens — 6 cols */}
        <div className="fade-in delay-3" style={{ gridColumn: 'span 6' }}>
          <Panel label="Token Exposure">
            <TokenTable address={address} />
          </Panel>
        </div>

        {/* Heuristic Flags — full width */}
        <div className="fade-in delay-4" style={{ gridColumn: '1 / -1' }}>
          <Panel label="Suspicious Activity Flags">
            <HeuristicFlags address={address} />
          </Panel>
        </div>

        {/* Transfer Graph — full width */}
        <div className="fade-in delay-5" style={{ gridColumn: '1 / -1' }}>
          <Panel label="Transfer Graph">
            <FlowGraph address={address} />
          </Panel>
        </div>

        {/* Transaction History — full width */}
        <div className="fade-in delay-6" style={{ gridColumn: '1 / -1' }}>
          <Panel label="Transaction History">
            <TransactionTable address={address} />
          </Panel>
        </div>

        {/* AI Chat — full width */}
        <div className="fade-in delay-7" style={{ gridColumn: '1 / -1' }}>
          <Panel label="AI Investigation Chat">
            <ChatPanel address={address} />
          </Panel>
        </div>

      </div>

      {/* Footer spacing */}
      <div style={{ height: '3rem' }} />
    </div>
  );
}
