import { getDb } from '../db/connection.js';
import type { TokenExposure } from '@cripto-ir/shared';

export function getTokenExposure(address: string): TokenExposure[] {
  const db = getDb();
  const addr = address.toLowerCase();

  const rows = db.prepare(`
    SELECT
      tt.contract_address,
      tt.token_name,
      tt.token_symbol,
      COUNT(*) as transfer_count
    FROM token_transfers tt
    JOIN address_token_transfers att ON tt.id = att.token_transfer_id
    WHERE att.address = ?
    GROUP BY tt.contract_address
    ORDER BY transfer_count DESC
  `).all(addr) as { contract_address: string; token_name: string; token_symbol: string; transfer_count: number }[];

  return rows.map(row => {
    const inValues = db.prepare(`
      SELECT tt.value FROM token_transfers tt
      JOIN address_token_transfers att ON tt.id = att.token_transfer_id
      WHERE att.address = ? AND tt.contract_address = ? AND att.direction = 'in'
    `).all(addr, row.contract_address) as { value: string }[];

    const outValues = db.prepare(`
      SELECT tt.value FROM token_transfers tt
      JOIN address_token_transfers att ON tt.id = att.token_transfer_id
      WHERE att.address = ? AND tt.contract_address = ? AND att.direction = 'out'
    `).all(addr, row.contract_address) as { value: string }[];

    const totalIn = inValues.reduce((sum, v) => sum + BigInt(v.value || '0'), 0n).toString();
    const totalOut = outValues.reduce((sum, v) => sum + BigInt(v.value || '0'), 0n).toString();

    return {
      contract_address: row.contract_address,
      token_name: row.token_name,
      token_symbol: row.token_symbol,
      transfer_count: row.transfer_count,
      total_in: totalIn,
      total_out: totalOut,
    };
  });
}
