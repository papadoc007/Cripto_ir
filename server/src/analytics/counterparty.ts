import { getDb } from '../db/connection.js';
import type { CounterpartyData } from '@cripto-ir/shared';

export function getCounterparties(address: string, limit = 50): CounterpartyData[] {
  const db = getDb();
  const addr = address.toLowerCase();

  const rows = db.prepare(`
    SELECT
      CASE WHEN t.from_address = ? THEN t.to_address ELSE t.from_address END as counterparty,
      COUNT(*) as tx_count,
      MIN(t.timestamp) as first_seen,
      MAX(t.timestamp) as last_seen
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ? AND at2.direction != 'self'
    GROUP BY counterparty
    ORDER BY tx_count DESC
    LIMIT ?
  `).all(addr, addr, limit) as { counterparty: string; tx_count: number; first_seen: number; last_seen: number }[];

  return rows.map(row => {
    const inflows = db.prepare(`
      SELECT COALESCE(SUM(CAST(value AS TEXT)), '0') as total
      FROM transactions
      WHERE from_address = ? AND to_address = ?
    `).get(row.counterparty, addr) as { total: string };

    const outflows = db.prepare(`
      SELECT COALESCE(SUM(CAST(value AS TEXT)), '0') as total
      FROM transactions
      WHERE from_address = ? AND to_address = ?
    `).get(addr, row.counterparty) as { total: string };

    // Use BigInt sum for precision
    const inTxs = db.prepare(`
      SELECT value FROM transactions WHERE from_address = ? AND to_address = ?
    `).all(row.counterparty, addr) as { value: string }[];

    const outTxs = db.prepare(`
      SELECT value FROM transactions WHERE from_address = ? AND to_address = ?
    `).all(addr, row.counterparty) as { value: string }[];

    const totalIn = inTxs.reduce((sum, tx) => sum + BigInt(tx.value || '0'), 0n).toString();
    const totalOut = outTxs.reduce((sum, tx) => sum + BigInt(tx.value || '0'), 0n).toString();

    const labelRow = db.prepare('SELECT label FROM addresses WHERE address = ?').get(row.counterparty) as { label: string | null } | undefined;

    return {
      address: row.counterparty,
      label: labelRow?.label ?? null,
      tx_count: row.tx_count,
      total_in: totalIn,
      total_out: totalOut,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
    };
  });
}
