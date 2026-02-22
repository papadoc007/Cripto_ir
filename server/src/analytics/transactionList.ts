import { getDb } from '../db/connection.js';
import type { TransactionRow } from '@cripto-ir/shared';
import { weiToEthNumber, tokenToDecimalNumber, isStablecoin } from '../utils/ethPrice.js';

interface ListOptions {
  offset?: number;
  limit?: number;
  direction?: 'in' | 'out' | 'self' | 'all';
  sort?: 'asc' | 'desc';
}

export function getTransactionList(
  address: string,
  ethPrice: number,
  opts: ListOptions = {}
): { rows: TransactionRow[]; total: number } {
  const db = getDb();
  const addr = address.toLowerCase();
  const { offset = 0, limit = 100, direction = 'all', sort = 'desc' } = opts;

  // Build where clause
  let dirFilter = '';
  const params: unknown[] = [addr];
  if (direction !== 'all') {
    dirFilter = ' AND at2.direction = ?';
    params.push(direction);
  }

  // Count total
  const countRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM address_transactions at2 WHERE at2.address = ?${dirFilter}
  `).get(...params) as { cnt: number };

  // Fetch ETH transactions
  const orderDir = sort === 'asc' ? 'ASC' : 'DESC';
  const txParams = [...params, limit, offset];
  const ethTxs = db.prepare(`
    SELECT
      t.hash, t.timestamp, t.from_address, t.to_address, t.value,
      t.block_number, at2.direction
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ?${dirFilter}
    ORDER BY t.timestamp ${orderDir}
    LIMIT ? OFFSET ?
  `).all(...txParams) as {
    hash: string; timestamp: number; from_address: string; to_address: string;
    value: string; block_number: number; direction: 'in' | 'out' | 'self';
  }[];

  // Compute running balance for ETH
  // Get all txs sorted ascending for balance calc
  const allForBalance = db.prepare(`
    SELECT t.value, at2.direction, t.timestamp
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ?
    ORDER BY t.timestamp ASC, t.block_number ASC
  `).all(addr) as { value: string; direction: string; timestamp: number }[];

  // Build balance map: timestamp -> running ETH balance
  const balanceByHash = new Map<string, bigint>();
  let runningBalance = 0n;
  const allTxsSorted = db.prepare(`
    SELECT t.hash, t.value, at2.direction, t.timestamp
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ?
    ORDER BY t.timestamp ASC, t.block_number ASC
  `).all(addr) as { hash: string; value: string; direction: string; timestamp: number }[];

  for (const tx of allTxsSorted) {
    const val = BigInt(tx.value || '0');
    if (tx.direction === 'in') {
      runningBalance += val;
    } else if (tx.direction === 'out') {
      runningBalance -= val;
    }
    balanceByHash.set(tx.hash, runningBalance);
  }

  // Map results
  const rows: TransactionRow[] = ethTxs.map(tx => {
    const counterparty = tx.direction === 'out' ? tx.to_address : tx.from_address;
    const labelRow = db.prepare('SELECT label FROM addresses WHERE address = ?').get(counterparty) as { label: string | null } | undefined;
    const valEth = weiToEthNumber(tx.value);
    const balanceAfter = balanceByHash.get(tx.hash) ?? 0n;

    return {
      hash: tx.hash,
      timestamp: tx.timestamp,
      counterparty,
      counterparty_label: labelRow?.label ?? null,
      direction: tx.direction,
      value: tx.value,
      value_eth: Math.round(valEth * 10000) / 10000,
      value_usd: Math.round(valEth * ethPrice * 100) / 100,
      asset: 'ETH',
      asset_contract: null,
      balance_after: balanceAfter.toString(),
      balance_after_eth: Math.round(weiToEthNumber(balanceAfter.toString()) * 10000) / 10000,
    };
  });

  return { rows, total: countRow.cnt };
}

export function getFullTransactionList(
  address: string,
  ethPrice: number,
  opts: ListOptions = {}
): { rows: TransactionRow[]; total: number } {
  const db = getDb();
  const addr = address.toLowerCase();
  const { offset = 0, limit = 100, direction = 'all', sort = 'desc' } = opts;
  const orderDir = sort === 'asc' ? 'ASC' : 'DESC';

  // Get ETH transactions
  const ethResult = getTransactionList(address, ethPrice, opts);

  // Get token transfers for the same page
  let dirFilter = '';
  const tokenParams: unknown[] = [addr];
  if (direction !== 'all') {
    dirFilter = ' AND att.direction = ?';
    tokenParams.push(direction);
  }

  const tokenTxs = db.prepare(`
    SELECT
      tt.hash, tt.timestamp, tt.from_address, tt.to_address, tt.value,
      tt.token_symbol, tt.token_decimal, tt.contract_address, tt.token_name,
      att.direction
    FROM token_transfers tt
    JOIN address_token_transfers att ON tt.id = att.token_transfer_id
    WHERE att.address = ?${dirFilter}
    ORDER BY tt.timestamp ${orderDir}
    LIMIT ? OFFSET ?
  `).all(...tokenParams, limit, offset) as {
    hash: string; timestamp: number; from_address: string; to_address: string;
    value: string; token_symbol: string; token_decimal: number;
    contract_address: string; token_name: string; direction: 'in' | 'out' | 'self';
  }[];

  const tokenRows: TransactionRow[] = tokenTxs.map(tx => {
    const counterparty = tx.direction === 'out' ? tx.to_address : tx.from_address;
    const labelRow = db.prepare('SELECT label FROM addresses WHERE address = ?').get(counterparty) as { label: string | null } | undefined;
    const amount = tokenToDecimalNumber(tx.value, tx.token_decimal);
    const usdValue = isStablecoin(tx.token_symbol) ? amount : 0;

    return {
      hash: tx.hash,
      timestamp: tx.timestamp,
      counterparty,
      counterparty_label: labelRow?.label ?? null,
      direction: tx.direction,
      value: tx.value,
      value_eth: amount,
      value_usd: Math.round(usdValue * 10000) / 10000,
      asset: tx.token_symbol || tx.token_name || 'ERC20',
      asset_contract: tx.contract_address,
      balance_after: '0',
      balance_after_eth: 0,
    };
  });

  // Merge and sort
  const allRows = [...ethResult.rows, ...tokenRows].sort((a, b) =>
    sort === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
  ).slice(0, limit);

  const tokenCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM address_token_transfers WHERE address = ?
  `).get(addr) as { cnt: number };

  return { rows: allRows, total: ethResult.total + tokenCount.cnt };
}
