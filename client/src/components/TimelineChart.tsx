import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTimeline } from '../hooks/useAnalytics';

export default function TimelineChart({ address }: { address: string }) {
  const { data, loading, error } = useTimeline(address);

  if (loading) return <div style={{ color: '#888', padding: '2rem' }}>Loading timeline...</div>;
  if (error) return <div style={{ color: '#f44336' }}>Error: {error}</div>;
  if (!data || (data as unknown[]).length === 0) return <div style={{ color: '#888' }}>No timeline data</div>;

  const chartData = (data as { period: string; tx_count: number; unique_counterparties: number }[]).map(d => ({
    period: d.period,
    transactions: d.tx_count,
    counterparties: d.unique_counterparties,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,120,255,0.1)" />
        <XAxis dataKey="period" stroke="#888" fontSize={12} />
        <YAxis stroke="#888" fontSize={12} />
        <Tooltip
          contentStyle={{ background: '#1a1a3e', border: '1px solid #333', borderRadius: 8 }}
          labelStyle={{ color: '#aaa' }}
        />
        <Area type="monotone" dataKey="transactions" stroke="#6c63ff" fill="rgba(108,99,255,0.3)" name="Transactions" />
        <Area type="monotone" dataKey="counterparties" stroke="#ff9800" fill="rgba(255,152,0,0.2)" name="Counterparties" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
