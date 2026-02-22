import { getDb } from '../db/connection.js';
import type { TimelineData } from '@cripto-ir/shared';

export function getTimeline(address: string, granularity: 'day' | 'week' | 'month' = 'month'): TimelineData[] {
  const db = getDb();
  const addr = address.toLowerCase();

  let formatStr: string;
  switch (granularity) {
    case 'day': formatStr = '%Y-%m-%d'; break;
    case 'week': formatStr = '%Y-W%W'; break;
    case 'month': formatStr = '%Y-%m'; break;
  }

  const rows = db.prepare(`
    SELECT
      strftime('${formatStr}', datetime(t.timestamp, 'unixepoch')) as period,
      COUNT(*) as tx_count,
      COUNT(DISTINCT CASE WHEN t.from_address = ? THEN t.to_address ELSE t.from_address END) as unique_counterparties
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ?
    GROUP BY period
    ORDER BY period
  `).all(addr, addr) as { period: string; tx_count: number; unique_counterparties: number }[];

  return rows.map(row => {
    // Compute volume with BigInt
    const txValues = db.prepare(`
      SELECT t.value FROM transactions t
      JOIN address_transactions at2 ON t.hash = at2.hash
      WHERE at2.address = ? AND strftime('${formatStr}', datetime(t.timestamp, 'unixepoch')) = ?
    `).all(addr, row.period) as { value: string }[];

    const volume = txValues.reduce((sum, tx) => sum + BigInt(tx.value || '0'), 0n).toString();

    return {
      period: row.period,
      tx_count: row.tx_count,
      unique_counterparties: row.unique_counterparties,
      volume,
    };
  });
}
