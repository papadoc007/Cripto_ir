import { getDb } from './connection.js';

export function initSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS addresses (
      address TEXT PRIMARY KEY,
      label TEXT,
      first_seen_at INTEGER,
      last_seen_at INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      address TEXT NOT NULL,
      tx_type TEXT NOT NULL CHECK(tx_type IN ('normal', 'erc20', 'internal')),
      last_block INTEGER NOT NULL DEFAULT 0,
      last_synced_at TEXT,
      status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'syncing', 'done', 'error')),
      error_message TEXT,
      PRIMARY KEY (address, tx_type),
      FOREIGN KEY (address) REFERENCES addresses(address)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      hash TEXT PRIMARY KEY,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      value TEXT NOT NULL,
      gas TEXT NOT NULL,
      gas_price TEXT NOT NULL,
      gas_used TEXT NOT NULL,
      is_error INTEGER NOT NULL DEFAULT 0,
      method_id TEXT,
      nonce INTEGER NOT NULL,
      input TEXT
    );

    CREATE TABLE IF NOT EXISTS address_transactions (
      address TEXT NOT NULL,
      hash TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('in', 'out', 'self')),
      PRIMARY KEY (address, hash),
      FOREIGN KEY (address) REFERENCES addresses(address),
      FOREIGN KEY (hash) REFERENCES transactions(hash)
    );

    CREATE TABLE IF NOT EXISTS token_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      contract_address TEXT NOT NULL,
      token_name TEXT,
      token_symbol TEXT,
      token_decimal INTEGER NOT NULL DEFAULT 18,
      value TEXT NOT NULL,
      UNIQUE(hash, log_index)
    );

    CREATE TABLE IF NOT EXISTS address_token_transfers (
      address TEXT NOT NULL,
      token_transfer_id INTEGER NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('in', 'out', 'self')),
      PRIMARY KEY (address, token_transfer_id),
      FOREIGN KEY (address) REFERENCES addresses(address),
      FOREIGN KEY (token_transfer_id) REFERENCES token_transfers(id)
    );

    CREATE TABLE IF NOT EXISTS internal_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      trace_id TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      value TEXT NOT NULL,
      type TEXT,
      is_error INTEGER NOT NULL DEFAULT 0,
      UNIQUE(hash, trace_id)
    );

    CREATE TABLE IF NOT EXISTS address_internal_txs (
      address TEXT NOT NULL,
      internal_tx_id INTEGER NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('in', 'out', 'self')),
      PRIMARY KEY (address, internal_tx_id),
      FOREIGN KEY (address) REFERENCES addresses(address),
      FOREIGN KEY (internal_tx_id) REFERENCES internal_transactions(id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_address);
    CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_address);
    CREATE INDEX IF NOT EXISTS idx_addr_tx_address ON address_transactions(address);

    CREATE INDEX IF NOT EXISTS idx_tt_timestamp ON token_transfers(timestamp);
    CREATE INDEX IF NOT EXISTS idx_tt_from ON token_transfers(from_address);
    CREATE INDEX IF NOT EXISTS idx_tt_to ON token_transfers(to_address);
    CREATE INDEX IF NOT EXISTS idx_att_address ON address_token_transfers(address);

    CREATE INDEX IF NOT EXISTS idx_it_timestamp ON internal_transactions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_it_from ON internal_transactions(from_address);
    CREATE INDEX IF NOT EXISTS idx_it_to ON internal_transactions(to_address);
    CREATE INDEX IF NOT EXISTS idx_ait_address ON address_internal_txs(address);
  `);
}
