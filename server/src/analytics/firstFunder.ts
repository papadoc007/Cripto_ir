import { getDb } from '../db/connection.js';
import type { FirstFunder } from '@cripto-ir/shared';
import { weiToEthNumber } from '../utils/ethPrice.js';

export function getFirstFunder(address: string): FirstFunder | null {
  const db = getDb();
  const addr = address.toLowerCase();

  // Find the earliest incoming ETH transaction with value > 0
  const row = db.prepare(`
    SELECT t.hash, t.timestamp, t.from_address, t.value, t.block_number
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ? AND at2.direction = 'in' AND CAST(t.value AS REAL) > 0
    ORDER BY t.timestamp ASC, t.block_number ASC
    LIMIT 1
  `).get(addr) as { hash: string; timestamp: number; from_address: string; value: string; block_number: number } | undefined;

  if (!row) {
    // Try internal transactions
    const intRow = db.prepare(`
      SELECT it.hash, it.timestamp, it.from_address, it.value, it.block_number
      FROM internal_transactions it
      JOIN address_internal_txs ait ON it.id = ait.internal_tx_id
      WHERE ait.address = ? AND ait.direction = 'in' AND CAST(it.value AS REAL) > 0
      ORDER BY it.timestamp ASC, it.block_number ASC
      LIMIT 1
    `).get(addr) as { hash: string; timestamp: number; from_address: string; value: string; block_number: number } | undefined;

    if (!intRow) return null;

    const labelRow = db.prepare('SELECT label FROM addresses WHERE address = ?').get(intRow.from_address) as { label: string | null } | undefined;
    return {
      funder_address: intRow.from_address,
      funder_label: labelRow?.label ?? null,
      tx_hash: intRow.hash,
      timestamp: intRow.timestamp,
      value: intRow.value,
      value_eth: weiToEthNumber(intRow.value),
      block_number: intRow.block_number,
    };
  }

  const labelRow = db.prepare('SELECT label FROM addresses WHERE address = ?').get(row.from_address) as { label: string | null } | undefined;
  return {
    funder_address: row.from_address,
    funder_label: labelRow?.label ?? null,
    tx_hash: row.hash,
    timestamp: row.timestamp,
    value: row.value,
    value_eth: weiToEthNumber(row.value),
    block_number: row.block_number,
  };
}
