import { ETHERSCAN_MAX_RESULTS, DEFAULT_BLOCK_CHUNK } from '@cripto-ir/shared';
import { etherscanCall } from './client.js';
import { logger } from '../utils/logger.js';

interface PaginatorOptions {
  module: string;
  action: string;
  address: string;
  startBlock: number;
  endBlock: number;
  onProgress?: (records: number, currentBlock: number) => void;
}

export async function paginatedFetch(opts: PaginatorOptions): Promise<Record<string, unknown>[]> {
  const allRecords: Record<string, unknown>[] = [];
  const chunks = buildChunks(opts.startBlock, opts.endBlock, DEFAULT_BLOCK_CHUNK);

  for (const [chunkStart, chunkEnd] of chunks) {
    const records = await fetchChunk(opts, chunkStart, chunkEnd);
    allRecords.push(...records);
    opts.onProgress?.(allRecords.length, chunkEnd);
  }

  return allRecords;
}

function buildChunks(start: number, end: number, size: number): [number, number][] {
  const chunks: [number, number][] = [];
  let current = start;
  while (current <= end) {
    const chunkEnd = Math.min(current + size - 1, end);
    chunks.push([current, chunkEnd]);
    current = chunkEnd + 1;
  }
  return chunks;
}

async function fetchChunk(
  opts: PaginatorOptions,
  startBlock: number,
  endBlock: number
): Promise<Record<string, unknown>[]> {
  const results = await etherscanCall({
    module: opts.module,
    action: opts.action,
    address: opts.address,
    startblock: startBlock.toString(),
    endblock: endBlock.toString(),
    sort: 'asc',
  });

  if (results.length < ETHERSCAN_MAX_RESULTS) {
    return trimLastBlock(results);
  }

  // Binary split when we hit the 10k limit
  logger.info(`Hit 10k limit for blocks ${startBlock}-${endBlock}, splitting...`);
  const mid = Math.floor((startBlock + endBlock) / 2);
  if (mid === startBlock) {
    // Can't split further, return what we have
    return results;
  }

  const left = await fetchChunk(opts, startBlock, mid);
  const right = await fetchChunk(opts, mid + 1, endBlock);
  return [...left, ...right];
}

function trimLastBlock(records: Record<string, unknown>[]): Record<string, unknown>[] {
  if (records.length === 0) return records;
  // Keep all records — dedup is handled at insert via UNIQUE constraints
  return records;
}
