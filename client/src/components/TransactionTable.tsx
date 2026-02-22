import { useState } from 'react';
import { useTransactions } from '../hooks/useAnalytics';
import type { TransactionRow } from '../api/client';

const fmtUsd = (n: number) => n === 0 ? '-' : '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtAmount = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4 });

const styles = {
  controls: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  filterBtn: (active: boolean) => ({
    padding: '0.3rem 0.75rem',
    borderRadius: 6,
    border: 'none',
    background: active ? '#6c63ff' : 'rgba(100, 120, 255, 0.15)',
    color: active ? '#fff' : '#999',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
  }),
  info: {
    marginLeft: 'auto',
    color: '#888',
    fontSize: '0.8rem',
  },
  tableWrap: {
    overflowX: 'auto' as const,
    maxHeight: 500,
    overflowY: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.82rem',
    minWidth: 1000,
  },
  th: {
    position: 'sticky' as const,
    top: 0,
    textAlign: 'left' as const,
    padding: '0.5rem 0.6rem',
    color: '#888',
    background: 'rgba(15, 15, 40, 0.95)',
    borderBottom: '1px solid rgba(100,120,255,0.25)',
    fontWeight: 600,
    fontSize: '0.72rem',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '0.45rem 0.6rem',
    borderBottom: '1px solid rgba(100,120,255,0.08)',
    color: '#ccc',
    whiteSpace: 'nowrap' as const,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: '0.78rem',
    color: '#c0c0ff',
  },
  dirIn: {
    color: '#4caf50',
    fontWeight: 600,
  },
  dirOut: {
    color: '#f44336',
    fontWeight: 600,
  },
  dirSelf: {
    color: '#ff9800',
    fontWeight: 600,
  },
  pager: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
    alignItems: 'center',
  },
  pageBtn: {
    padding: '0.35rem 1rem',
    borderRadius: 6,
    border: '1px solid rgba(100, 120, 255, 0.25)',
    background: 'rgba(30, 30, 60, 0.6)',
    color: '#c0c0ff',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  link: {
    color: '#6c63ff',
    textDecoration: 'none',
  },
  assetBadge: {
    display: 'inline-block',
    padding: '0.1rem 0.4rem',
    borderRadius: 4,
    fontSize: '0.72rem',
    fontWeight: 600,
    background: 'rgba(100, 120, 255, 0.15)',
    color: '#a0a0ff',
  },
};

const PAGE_SIZE = 50;

export default function TransactionTable({ address }: { address: string }) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<'all' | 'in' | 'out'>('all');
  const { data, loading, error } = useTransactions(address, page * PAGE_SIZE, PAGE_SIZE, direction, 'desc');

  if (loading) return <div style={{ color: '#888', padding: '2rem' }}>Loading transactions...</div>;
  if (error) return <div style={{ color: '#f44336' }}>Error: {error}</div>;
  if (!data || data.rows.length === 0) return <div style={{ color: '#888' }}>No transactions</div>;

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <div>
      <div style={styles.controls}>
        <button style={styles.filterBtn(direction === 'all')} onClick={() => { setDirection('all'); setPage(0); }}>All</button>
        <button style={styles.filterBtn(direction === 'in')} onClick={() => { setDirection('in'); setPage(0); }}>Inflow</button>
        <button style={styles.filterBtn(direction === 'out')} onClick={() => { setDirection('out'); setPage(0); }}>Outflow</button>
        <span style={styles.info}>{data.total.toLocaleString()} transactions</span>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Timestamp</th>
              <th style={styles.th}>Txn Hash</th>
              <th style={styles.th}>Counterparty</th>
              <th style={styles.th}>Direction</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Amount USD</th>
              <th style={styles.th}>Asset</th>
              <th style={styles.th}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((tx: TransactionRow, i: number) => (
              <tr key={`${tx.hash}-${i}`}>
                <td style={styles.td}>
                  {new Date(tx.timestamp * 1000).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td style={{ ...styles.td, ...styles.mono }}>
                  <a
                    href={`https://etherscan.io/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-4)}
                  </a>
                </td>
                <td style={{ ...styles.td, ...styles.mono }}>
                  <a
                    href={`https://etherscan.io/address/${tx.counterparty}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                    title={tx.counterparty}
                  >
                    {tx.counterparty_label || `${tx.counterparty.slice(0, 8)}...${tx.counterparty.slice(-4)}`}
                  </a>
                </td>
                <td style={{
                  ...styles.td,
                  ...(tx.direction === 'in' ? styles.dirIn : tx.direction === 'out' ? styles.dirOut : styles.dirSelf),
                }}>
                  {tx.direction === 'in' ? 'IN' : tx.direction === 'out' ? 'OUT' : 'SELF'}
                </td>
                <td style={styles.td}>
                  {tx.direction === 'in' ? '+' : tx.direction === 'out' ? '-' : ''}{fmtAmount(tx.value_eth)}
                </td>
                <td style={styles.td}>
                  {fmtUsd(tx.value_usd)}
                </td>
                <td style={styles.td}>
                  <span style={styles.assetBadge}>{tx.asset}</span>
                </td>
                <td style={styles.td}>
                  {tx.asset === 'ETH' ? `${fmtAmount(tx.balance_after_eth)} ETH` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={styles.pager}>
          <button
            style={styles.pageBtn}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Prev
          </button>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            style={styles.pageBtn}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
