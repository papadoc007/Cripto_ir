import type { Transaction, TokenTransfer, InternalTransaction, TxType, SyncProgress } from '@cripto-ir/shared';
import { paginatedFetch } from './paginator.js';
import { getLatestBlockNumber } from './client.js';
import { EtherscanTxSchema, EtherscanTokenTxSchema, EtherscanInternalTxSchema } from './types.js';
import * as queries from '../db/queries.js';
import { logger } from '../utils/logger.js';

type ProgressCallback = (progress: SyncProgress) => void;

const TX_TYPE_CONFIG: Record<TxType, { module: string; action: string }> = {
  normal: { module: 'account', action: 'txlist' },
  erc20: { module: 'account', action: 'tokentx' },
  internal: { module: 'account', action: 'txlistinternal' },
};

export async function syncAddress(address: string, onProgress?: ProgressCallback): Promise<void> {
  const addr = address.toLowerCase();
  queries.upsertAddress(addr);

  let latestBlock: number;
  try {
    latestBlock = await getLatestBlockNumber();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to get latest block number: ${msg}`);
    onProgress?.({
      address: addr,
      txType: 'normal',
      status: 'error',
      recordsFetched: 0,
      currentBlock: 0,
      latestBlock: 0,
      message: `Error: ${msg}`,
    });
    return;
  }

  const txTypes: TxType[] = ['normal', 'erc20', 'internal'];
  for (const txType of txTypes) {
    await syncTxType(addr, txType, latestBlock, onProgress);
  }

  queries.updateAddressTimestamps(addr);
}

async function syncTxType(
  address: string,
  txType: TxType,
  latestBlock: number,
  onProgress?: ProgressCallback
): Promise<void> {
  const syncState = queries.getSyncState(address, txType);
  const startBlock = (syncState?.last_block ?? 0) + 1;

  if (startBlock > latestBlock) {
    onProgress?.({
      address,
      txType,
      status: 'done',
      recordsFetched: 0,
      currentBlock: latestBlock,
      latestBlock,
      message: `${txType}: already up to date`,
    });
    return;
  }

  queries.upsertSyncState(address, txType, startBlock, 'syncing');
  onProgress?.({
    address,
    txType,
    status: 'syncing',
    recordsFetched: 0,
    currentBlock: startBlock,
    latestBlock,
    message: `${txType}: starting sync from block ${startBlock}`,
  });

  try {
    const config = TX_TYPE_CONFIG[txType];
    const rawRecords = await paginatedFetch({
      ...config,
      address,
      startBlock,
      endBlock: latestBlock,
      onProgress: (count, block) => {
        onProgress?.({
          address,
          txType,
          status: 'syncing',
          recordsFetched: count,
          currentBlock: block,
          latestBlock,
          message: `${txType}: fetched ${count} records (block ${block})`,
        });
      },
    });

    let inserted = 0;
    if (txType === 'normal') {
      const txs = rawRecords.map(parseTransaction);
      inserted = queries.insertTransactions(address, txs);
    } else if (txType === 'erc20') {
      const transfers = rawRecords.map(parseTokenTransfer);
      inserted = queries.insertTokenTransfers(address, transfers);
    } else {
      const txs = rawRecords.map(parseInternalTransaction);
      inserted = queries.insertInternalTransactions(address, txs);
    }

    queries.upsertSyncState(address, txType, latestBlock, 'done');
    onProgress?.({
      address,
      txType,
      status: 'done',
      recordsFetched: inserted,
      currentBlock: latestBlock,
      latestBlock,
      message: `${txType}: done — ${inserted} records`,
    });

    logger.info(`Synced ${txType} for ${address}: ${inserted} records`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    queries.upsertSyncState(address, txType, startBlock, 'error', msg);
    onProgress?.({
      address,
      txType,
      status: 'error',
      recordsFetched: 0,
      currentBlock: startBlock,
      latestBlock,
      message: `${txType}: error — ${msg}`,
    });
    logger.error(`Sync error for ${txType}/${address}: ${msg}`);
  }
}

function parseTransaction(raw: Record<string, unknown>): Transaction {
  const parsed = EtherscanTxSchema.parse(raw);
  return {
    hash: parsed.hash.toLowerCase(),
    block_number: parseInt(parsed.blockNumber),
    timestamp: parseInt(parsed.timeStamp),
    from_address: parsed.from.toLowerCase(),
    to_address: (parsed.to || '').toLowerCase(),
    value: parsed.value,
    gas: parsed.gas,
    gas_price: parsed.gasPrice,
    gas_used: parsed.gasUsed,
    is_error: parseInt(parsed.isError),
    method_id: parsed.methodId,
    nonce: parseInt(parsed.nonce),
    input: parsed.input,
  };
}

function parseTokenTransfer(raw: Record<string, unknown>): TokenTransfer {
  const parsed = EtherscanTokenTxSchema.parse(raw);
  return {
    hash: parsed.hash.toLowerCase(),
    log_index: parseInt(parsed.logIndex),
    block_number: parseInt(parsed.blockNumber),
    timestamp: parseInt(parsed.timeStamp),
    from_address: parsed.from.toLowerCase(),
    to_address: parsed.to.toLowerCase(),
    contract_address: parsed.contractAddress.toLowerCase(),
    token_name: parsed.tokenName,
    token_symbol: parsed.tokenSymbol,
    token_decimal: parseInt(parsed.tokenDecimal),
    value: parsed.value,
  };
}

function parseInternalTransaction(raw: Record<string, unknown>): InternalTransaction {
  const parsed = EtherscanInternalTxSchema.parse(raw);
  return {
    hash: parsed.hash.toLowerCase(),
    trace_id: parsed.traceId,
    block_number: parseInt(parsed.blockNumber),
    timestamp: parseInt(parsed.timeStamp),
    from_address: parsed.from.toLowerCase(),
    to_address: (parsed.to || '').toLowerCase(),
    value: parsed.value,
    type: parsed.type,
    is_error: parseInt(parsed.isError),
  };
}
