import { getDb } from '../db/connection.js';
import type { HeuristicFlag } from '@cripto-ir/shared';

export function getHeuristics(address: string): HeuristicFlag[] {
  const addr = address.toLowerCase();
  const flags: HeuristicFlag[] = [];

  flags.push(...detectBurstActivity(addr));
  flags.push(...detectPeelChain(addr));
  flags.push(...detectConcentration(addr));
  flags.push(...detectRoundAmounts(addr));
  flags.push(...detectRapidInOut(addr));

  return flags;
}

function detectBurstActivity(address: string): HeuristicFlag[] {
  const db = getDb();
  const flags: HeuristicFlag[] = [];

  // Detect days with >20 transactions
  const rows = db.prepare(`
    SELECT
      date(t.timestamp, 'unixepoch') as day,
      COUNT(*) as tx_count
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ?
    GROUP BY day
    HAVING tx_count > 20
    ORDER BY tx_count DESC
    LIMIT 5
  `).all(address) as { day: string; tx_count: number }[];

  if (rows.length > 0) {
    flags.push({
      type: 'burst_activity',
      severity: rows[0].tx_count > 50 ? 'high' : 'medium',
      title: 'Burst Transaction Activity',
      description: `${rows.length} day(s) with unusually high transaction volume detected.`,
      details: { days: rows },
    });
  }

  return flags;
}

function detectPeelChain(address: string): HeuristicFlag[] {
  const db = getDb();
  const flags: HeuristicFlag[] = [];

  // Detect pattern: receive large amount, send slightly less to a new address
  const outTxs = db.prepare(`
    SELECT t.to_address, t.value, t.timestamp
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ? AND at2.direction = 'out'
    ORDER BY t.timestamp
  `).all(address) as { to_address: string; value: string; timestamp: number }[];

  let peelCount = 0;
  for (let i = 1; i < outTxs.length; i++) {
    const prev = BigInt(outTxs[i - 1].value || '0');
    const curr = BigInt(outTxs[i].value || '0');
    if (prev > 0n && curr > 0n && curr < prev && curr > prev * 8n / 10n) {
      peelCount++;
    }
  }

  if (peelCount >= 3) {
    flags.push({
      type: 'peel_chain',
      severity: peelCount > 10 ? 'high' : 'medium',
      title: 'Potential Peel Chain Pattern',
      description: `${peelCount} sequential outgoing transactions with decreasing values detected. This may indicate a peel chain obfuscation technique.`,
      details: { sequential_decreasing_count: peelCount },
    });
  }

  return flags;
}

function detectConcentration(address: string): HeuristicFlag[] {
  const db = getDb();
  const flags: HeuristicFlag[] = [];

  const totalRow = db.prepare(`
    SELECT COUNT(DISTINCT CASE WHEN t.from_address = ? THEN t.to_address ELSE t.from_address END) as total_counterparties
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ? AND at2.direction != 'self'
  `).get(address, address) as { total_counterparties: number };

  const topRow = db.prepare(`
    SELECT
      CASE WHEN t.from_address = ? THEN t.to_address ELSE t.from_address END as counterparty,
      COUNT(*) as tx_count
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ? AND at2.direction != 'self'
    GROUP BY counterparty
    ORDER BY tx_count DESC
    LIMIT 1
  `).get(address, address) as { counterparty: string; tx_count: number } | undefined;

  if (topRow && totalRow.total_counterparties > 0) {
    const totalTxs = db.prepare(`
      SELECT COUNT(*) as cnt FROM address_transactions WHERE address = ?
    `).get(address) as { cnt: number };

    const concentration = topRow.tx_count / totalTxs.cnt;
    if (concentration > 0.5) {
      flags.push({
        type: 'concentration',
        severity: concentration > 0.8 ? 'high' : 'medium',
        title: 'High Counterparty Concentration',
        description: `${(concentration * 100).toFixed(1)}% of transactions involve a single counterparty (${topRow.counterparty.slice(0, 10)}...).`,
        details: { top_counterparty: topRow.counterparty, concentration_pct: concentration * 100, total_counterparties: totalRow.total_counterparties },
      });
    }
  }

  return flags;
}

function detectRoundAmounts(address: string): HeuristicFlag[] {
  const db = getDb();
  const flags: HeuristicFlag[] = [];

  const ETH = BigInt('1000000000000000000');
  const rows = db.prepare(`
    SELECT t.value FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ? AND t.value != '0'
  `).all(address) as { value: string }[];

  let roundCount = 0;
  for (const row of rows) {
    const val = BigInt(row.value);
    if (val > 0n && val % ETH === 0n) {
      roundCount++;
    }
  }

  if (rows.length > 0 && roundCount / rows.length > 0.3) {
    flags.push({
      type: 'round_amounts',
      severity: 'low',
      title: 'Frequent Round ETH Amounts',
      description: `${roundCount} of ${rows.length} transactions (${((roundCount / rows.length) * 100).toFixed(1)}%) use round ETH amounts.`,
      details: { round_count: roundCount, total_count: rows.length },
    });
  }

  return flags;
}

function detectRapidInOut(address: string): HeuristicFlag[] {
  const db = getDb();
  const flags: HeuristicFlag[] = [];

  // Detect funds received and sent within 10 minutes
  const rows = db.prepare(`
    SELECT
      t_in.hash as in_hash,
      t_out.hash as out_hash,
      t_in.timestamp as in_time,
      t_out.timestamp as out_time,
      t_in.value as in_value,
      t_out.value as out_value
    FROM transactions t_in
    JOIN address_transactions at_in ON t_in.hash = at_in.hash
    JOIN transactions t_out ON t_out.timestamp BETWEEN t_in.timestamp AND t_in.timestamp + 600
    JOIN address_transactions at_out ON t_out.hash = at_out.hash
    WHERE at_in.address = ? AND at_in.direction = 'in'
      AND at_out.address = ? AND at_out.direction = 'out'
      AND t_in.hash != t_out.hash
    LIMIT 100
  `).all(address, address) as { in_hash: string; out_hash: string; in_time: number; out_time: number }[];

  if (rows.length >= 5) {
    flags.push({
      type: 'rapid_in_out',
      severity: rows.length > 20 ? 'high' : 'medium',
      title: 'Rapid In/Out Pattern',
      description: `${rows.length} instances of funds received and forwarded within 10 minutes. May indicate pass-through or mixing behavior.`,
      details: { instance_count: rows.length },
    });
  }

  return flags;
}
