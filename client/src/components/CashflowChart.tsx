import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useCashflow } from '../hooks/useAnalytics';
import type { CashflowRow } from '../api/client';

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtUsd = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

const styles = {
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  tab: (active: boolean) => ({
    padding: '0.35rem 0.9rem',
    borderRadius: 6,
    border: 'none',
    background: active ? '#6c63ff' : 'rgba(100, 120, 255, 0.15)',
    color: active ? '#fff' : '#999',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
  }),
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.8rem',
    marginTop: '1rem',
  },
  th: {
    textAlign: 'right' as const,
    padding: '0.4rem 0.6rem',
    color: '#888',
    borderBottom: '1px solid rgba(100,120,255,0.2)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
  },
  thLeft: {
    textAlign: 'left' as const,
    padding: '0.4rem 0.6rem',
    color: '#888',
    borderBottom: '1px solid rgba(100,120,255,0.2)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
  },
  td: {
    textAlign: 'right' as const,
    padding: '0.4rem 0.6rem',
    borderBottom: '1px solid rgba(100,120,255,0.08)',
    color: '#ccc',
  },
  tdLeft: {
    textAlign: 'left' as const,
    padding: '0.4rem 0.6rem',
    borderBottom: '1px solid rgba(100,120,255,0.08)',
    color: '#c0c0ff',
    fontFamily: 'monospace',
  },
  positive: { color: '#4caf50' },
  negative: { color: '#f44336' },
};

type ViewMode = 'eth' | 'usd' | 'table';

export default function CashflowChart({ address }: { address: string }) {
  const { data, loading, error } = useCashflow(address);
  const [view, setView] = useState<ViewMode>('usd');

  if (loading) return <div style={{ color: '#888', padding: '2rem' }}>Loading cashflow...</div>;
  if (error) return <div style={{ color: '#f44336' }}>Error: {error}</div>;
  if (!data || data.length === 0) return <div style={{ color: '#888' }}>No cashflow data</div>;

  const rows = data as CashflowRow[];

  return (
    <div>
      <div style={styles.tabs}>
        <button style={styles.tab(view === 'usd')} onClick={() => setView('usd')}>USD</button>
        <button style={styles.tab(view === 'eth')} onClick={() => setView('eth')}>ETH</button>
        <button style={styles.tab(view === 'table')} onClick={() => setView('table')}>Table</button>
      </div>

      {view === 'table' ? (
        <CashflowTable rows={rows} />
      ) : (
        <CashflowBarChart rows={rows} mode={view} />
      )}
    </div>
  );
}

function CashflowBarChart({ rows, mode }: { rows: CashflowRow[]; mode: 'eth' | 'usd' }) {
  const chartData = rows.map(d => {
    if (mode === 'usd') {
      return {
        month: d.month,
        'Inflow (USD)': d.inflow_usd,
        'Outflow (USD)': -d.outflow_usd,
        'Token In (USD)': d.token_inflow_usd,
        'Token Out (USD)': -d.token_outflow_usd,
      };
    }
    return {
      month: d.month,
      'Inflow (ETH)': d.inflow_eth,
      'Outflow (ETH)': -d.outflow_eth,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,120,255,0.1)" />
        <XAxis dataKey="month" stroke="#888" fontSize={11} />
        <YAxis stroke="#888" fontSize={11} tickFormatter={(v: number) => mode === 'usd' ? `$${(v / 1000).toFixed(0)}k` : `${v.toFixed(1)}`} />
        <Tooltip
          contentStyle={{ background: '#1a1a3e', border: '1px solid #333', borderRadius: 8 }}
          labelStyle={{ color: '#aaa' }}
          formatter={(v: number) => mode === 'usd' ? fmtUsd(Math.abs(v)) : fmt(Math.abs(v)) + ' ETH'}
        />
        <Legend />
        {mode === 'usd' ? (
          <>
            <Bar dataKey="Inflow (USD)" fill="#4caf50" stackId="in" />
            <Bar dataKey="Token In (USD)" fill="#66bb6a" stackId="in" />
            <Bar dataKey="Outflow (USD)" fill="#f44336" stackId="out" />
            <Bar dataKey="Token Out (USD)" fill="#ef5350" stackId="out" />
          </>
        ) : (
          <>
            <Bar dataKey="Inflow (ETH)" fill="#4caf50" />
            <Bar dataKey="Outflow (ETH)" fill="#f44336" />
          </>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

function CashflowTable({ rows }: { rows: CashflowRow[] }) {
  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.thLeft}>Month</th>
            <th style={styles.th}>In (ETH)</th>
            <th style={styles.th}>Out (ETH)</th>
            <th style={styles.th}>Net (ETH)</th>
            <th style={styles.th}>In (USD)</th>
            <th style={styles.th}>Out (USD)</th>
            <th style={styles.th}>Volume (USD)</th>
            <th style={styles.th}>Txns In</th>
            <th style={styles.th}>Txns Out</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={styles.tdLeft}>{r.month}</td>
              <td style={styles.td}>{fmt(r.inflow_eth)}</td>
              <td style={styles.td}>{fmt(r.outflow_eth)}</td>
              <td style={{ ...styles.td, ...(r.netflow_eth >= 0 ? styles.positive : styles.negative) }}>
                {fmt(r.netflow_eth)}
              </td>
              <td style={styles.td}>{fmtUsd(r.inflow_usd)}</td>
              <td style={styles.td}>{fmtUsd(r.outflow_usd)}</td>
              <td style={styles.td}>{fmtUsd(r.total_volume_usd)}</td>
              <td style={styles.td}>{r.tx_count_in}</td>
              <td style={styles.td}>{r.tx_count_out}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
