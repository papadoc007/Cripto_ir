import { getDb } from '../db/connection.js';
import type { CashflowData } from '@cripto-ir/shared';
import { weiToEthNumber, tokenToDecimalNumber, isStablecoin } from '../utils/ethPrice.js';

export function getCashflow(address: string, ethPrice = 2500): CashflowData[] {
  const db = getDb();
  const addr = address.toLowerCase();

  // ETH transactions grouped by month
  const ethRows = db.prepare(`
    SELECT
      strftime('%Y-%m', datetime(t.timestamp, 'unixepoch')) as month,
      t.value,
      at2.direction
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ?
    ORDER BY t.timestamp
  `).all(addr) as { month: string; value: string; direction: string }[];

  // Token transfers grouped by month
  const tokenRows = db.prepare(`
    SELECT
      strftime('%Y-%m', datetime(tt.timestamp, 'unixepoch')) as month,
      tt.value,
      tt.token_symbol,
      tt.token_decimal,
      att.direction
    FROM token_transfers tt
    JOIN address_token_transfers att ON tt.id = att.token_transfer_id
    WHERE att.address = ?
    ORDER BY tt.timestamp
  `).all(addr) as { month: string; value: string; token_symbol: string; token_decimal: number; direction: string }[];

  interface MonthEntry {
    inflow: bigint;
    outflow: bigint;
    token_inflow_usd: number;
    token_outflow_usd: number;
    tx_count_in: number;
    tx_count_out: number;
  }

  const monthlyMap = new Map<string, MonthEntry>();

  const getEntry = (month: string): MonthEntry => {
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        inflow: 0n, outflow: 0n,
        token_inflow_usd: 0, token_outflow_usd: 0,
        tx_count_in: 0, tx_count_out: 0,
      });
    }
    return monthlyMap.get(month)!;
  };

  // Process ETH transactions
  for (const row of ethRows) {
    const entry = getEntry(row.month);
    const val = BigInt(row.value || '0');
    if (row.direction === 'in') {
      entry.inflow += val;
      entry.tx_count_in++;
    } else if (row.direction === 'out') {
      entry.outflow += val;
      entry.tx_count_out++;
    }
  }

  // Process token transfers — accumulate stablecoin USD values
  for (const row of tokenRows) {
    const entry = getEntry(row.month);
    const amount = tokenToDecimalNumber(row.value, row.token_decimal);

    if (isStablecoin(row.token_symbol)) {
      // Stablecoin = USD value directly
      if (row.direction === 'in') {
        entry.token_inflow_usd += amount;
        entry.tx_count_in++;
      } else if (row.direction === 'out') {
        entry.token_outflow_usd += amount;
        entry.tx_count_out++;
      }
    }
    // Non-stablecoin ERC20 tokens not priced (no reliable free source)
  }

  const result: CashflowData[] = [];
  const sortedMonths = [...monthlyMap.keys()].sort();

  for (const month of sortedMonths) {
    const e = monthlyMap.get(month)!;
    const netflow = e.inflow - e.outflow;
    const inflowEth = weiToEthNumber(e.inflow.toString());
    const outflowEth = weiToEthNumber(e.outflow.toString());
    const netflowEth = inflowEth - outflowEth;
    const inflowUsd = inflowEth * ethPrice;
    const outflowUsd = outflowEth * ethPrice;

    result.push({
      month,
      inflow: e.inflow.toString(),
      outflow: e.outflow.toString(),
      netflow: netflow.toString(),
      inflow_eth: Math.round(inflowEth * 10000) / 10000,
      outflow_eth: Math.round(outflowEth * 10000) / 10000,
      netflow_eth: Math.round(netflowEth * 10000) / 10000,
      inflow_usd: Math.round((inflowUsd + e.token_inflow_usd) * 100) / 100,
      outflow_usd: Math.round((outflowUsd + e.token_outflow_usd) * 100) / 100,
      netflow_usd: Math.round((inflowUsd + e.token_inflow_usd - outflowUsd - e.token_outflow_usd) * 100) / 100,
      token_inflow_usd: Math.round(e.token_inflow_usd * 100) / 100,
      token_outflow_usd: Math.round(e.token_outflow_usd * 100) / 100,
      total_volume_usd: Math.round((inflowUsd + e.token_inflow_usd + outflowUsd + e.token_outflow_usd) * 100) / 100,
      tx_count_in: e.tx_count_in,
      tx_count_out: e.tx_count_out,
    });
  }

  return result;
}
