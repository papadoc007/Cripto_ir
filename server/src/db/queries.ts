import { getDb } from './connection.js';
import type { Address, SyncState, Transaction, TokenTransfer, InternalTransaction, TxType, SyncStatus } from '@cripto-ir/shared';

// ---- Addresses ----

export function upsertAddress(address: string, label?: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO addresses (address, label) VALUES (?, ?)
    ON CONFLICT(address) DO UPDATE SET label = COALESCE(excluded.label, addresses.label)
  `).run(address.toLowerCase(), label ?? null);
}

export function getAddress(address: string): Address | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM addresses WHERE address = ?').get(address.toLowerCase()) as Address | undefined;
}

export function listAddresses(): Address[] {
  const db = getDb();
  return db.prepare('SELECT * FROM addresses ORDER BY created_at DESC').all() as Address[];
}

export function updateAddressTimestamps(address: string): void {
  const db = getDb();
  const addr = address.toLowerCase();
  db.prepare(`
    UPDATE addresses SET
      first_seen_at = (
        SELECT MIN(timestamp) FROM transactions t
        JOIN address_transactions at2 ON t.hash = at2.hash
        WHERE at2.address = ?
      ),
      last_seen_at = (
        SELECT MAX(timestamp) FROM transactions t
        JOIN address_transactions at2 ON t.hash = at2.hash
        WHERE at2.address = ?
      )
    WHERE address = ?
  `).run(addr, addr, addr);
}

// ---- Sync State ----

export function getSyncState(address: string, txType: TxType): SyncState | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM sync_state WHERE address = ? AND tx_type = ?')
    .get(address.toLowerCase(), txType) as SyncState | undefined;
}

export function getAllSyncStates(address: string): SyncState[] {
  const db = getDb();
  return db.prepare('SELECT * FROM sync_state WHERE address = ?')
    .all(address.toLowerCase()) as SyncState[];
}

export function upsertSyncState(address: string, txType: TxType, lastBlock: number, status: SyncStatus, errorMessage?: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO sync_state (address, tx_type, last_block, last_synced_at, status, error_message)
    VALUES (?, ?, ?, datetime('now'), ?, ?)
    ON CONFLICT(address, tx_type) DO UPDATE SET
      last_block = excluded.last_block,
      last_synced_at = excluded.last_synced_at,
      status = excluded.status,
      error_message = excluded.error_message
  `).run(address.toLowerCase(), txType, lastBlock, status, errorMessage ?? null);
}

// ---- Transactions ----

export function insertTransactions(address: string, txs: Transaction[]): number {
  const db = getDb();
  const addr = address.toLowerCase();
  let inserted = 0;

  const insertTx = db.prepare(`
    INSERT OR IGNORE INTO transactions (hash, block_number, timestamp, from_address, to_address, value, gas, gas_price, gas_used, is_error, method_id, nonce, input)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJunction = db.prepare(`
    INSERT OR IGNORE INTO address_transactions (address, hash, direction)
    VALUES (?, ?, ?)
  `);

  const batchInsert = db.transaction((txs: Transaction[]) => {
    for (const tx of txs) {
      const from = tx.from_address.toLowerCase();
      const to = tx.to_address.toLowerCase();
      insertTx.run(tx.hash, tx.block_number, tx.timestamp, from, to, tx.value, tx.gas, tx.gas_price, tx.gas_used, tx.is_error, tx.method_id, tx.nonce, tx.input);

      let direction: 'in' | 'out' | 'self';
      if (from === addr && to === addr) direction = 'self';
      else if (from === addr) direction = 'out';
      else direction = 'in';

      insertJunction.run(addr, tx.hash, direction);
      inserted++;
    }
  });

  batchInsert(txs);
  return inserted;
}

export function insertTokenTransfers(address: string, transfers: TokenTransfer[]): number {
  const db = getDb();
  const addr = address.toLowerCase();
  let inserted = 0;

  const insertTT = db.prepare(`
    INSERT OR IGNORE INTO token_transfers (hash, log_index, block_number, timestamp, from_address, to_address, contract_address, token_name, token_symbol, token_decimal, value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJunction = db.prepare(`
    INSERT OR IGNORE INTO address_token_transfers (address, token_transfer_id, direction)
    VALUES (?, ?, ?)
  `);

  const getId = db.prepare(`SELECT id FROM token_transfers WHERE hash = ? AND log_index = ?`);

  const batchInsert = db.transaction((transfers: TokenTransfer[]) => {
    for (const tt of transfers) {
      const from = tt.from_address.toLowerCase();
      const to = tt.to_address.toLowerCase();
      insertTT.run(tt.hash, tt.log_index, tt.block_number, tt.timestamp, from, to, tt.contract_address.toLowerCase(), tt.token_name, tt.token_symbol, tt.token_decimal, tt.value);

      const row = getId.get(tt.hash, tt.log_index) as { id: number } | undefined;
      if (row) {
        let direction: 'in' | 'out' | 'self';
        if (from === addr && to === addr) direction = 'self';
        else if (from === addr) direction = 'out';
        else direction = 'in';
        insertJunction.run(addr, row.id, direction);
      }
      inserted++;
    }
  });

  batchInsert(transfers);
  return inserted;
}

export function insertInternalTransactions(address: string, txs: InternalTransaction[]): number {
  const db = getDb();
  const addr = address.toLowerCase();
  let inserted = 0;

  const insertIT = db.prepare(`
    INSERT OR IGNORE INTO internal_transactions (hash, trace_id, block_number, timestamp, from_address, to_address, value, type, is_error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJunction = db.prepare(`
    INSERT OR IGNORE INTO address_internal_txs (address, internal_tx_id, direction)
    VALUES (?, ?, ?)
  `);

  const getId = db.prepare(`SELECT id FROM internal_transactions WHERE hash = ? AND trace_id = ?`);

  const batchInsert = db.transaction((txs: InternalTransaction[]) => {
    for (const tx of txs) {
      const from = tx.from_address.toLowerCase();
      const to = tx.to_address.toLowerCase();
      insertIT.run(tx.hash, tx.trace_id, tx.block_number, tx.timestamp, from, to, tx.value, tx.type, tx.is_error);

      const row = getId.get(tx.hash, tx.trace_id) as { id: number } | undefined;
      if (row) {
        let direction: 'in' | 'out' | 'self';
        if (from === addr && to === addr) direction = 'self';
        else if (from === addr) direction = 'out';
        else direction = 'in';
        insertJunction.run(addr, row.id, direction);
      }
      inserted++;
    }
  });

  batchInsert(txs);
  return inserted;
}

export function getTransactionCount(address: string): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM address_transactions WHERE address = ?')
    .get(address.toLowerCase()) as { count: number };
  return row.count;
}
