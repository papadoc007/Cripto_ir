import { ETHERSCAN_BASE_URL } from '@cripto-ir/shared';
import { config } from '../config.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { EtherscanResponseSchema } from './types.js';

const rateLimiter = new RateLimiter(2); // free tier allows ~3/sec, keep margin

const MAX_RETRIES = 3;

export async function etherscanCall(params: Record<string, string>): Promise<Record<string, unknown>[]> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await rateLimiter.acquire();

    const url = new URL(ETHERSCAN_BASE_URL);
    url.searchParams.set('chainid', '1');
    url.searchParams.set('apikey', config.etherscanApiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    logger.debug(`Etherscan call: ${params.action} ${params.address?.slice(0, 10)}... (attempt ${attempt + 1})`);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Etherscan HTTP error: ${response.status}`);
    }

    const json = await response.json();
    const parsed = EtherscanResponseSchema.parse(json);

    if (parsed.status === '0' && parsed.message === 'No transactions found') {
      return [];
    }

    if (parsed.status === '0') {
      const errMsg = typeof parsed.result === 'string' ? parsed.result : parsed.message;
      // Retry on rate limit
      if (errMsg.toLowerCase().includes('rate limit') && attempt < MAX_RETRIES - 1) {
        logger.warn(`Rate limited, waiting 1.5s before retry...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }
      throw new Error(`Etherscan error: ${errMsg}`);
    }

    if (typeof parsed.result === 'string') {
      return [];
    }

    return parsed.result;
  }

  throw new Error('Etherscan: max retries exceeded');
}

export async function getEthBalance(address: string): Promise<string> {
  await rateLimiter.acquire();
  const url = new URL(ETHERSCAN_BASE_URL);
  url.searchParams.set('chainid', '1');
  url.searchParams.set('apikey', config.etherscanApiKey);
  url.searchParams.set('module', 'account');
  url.searchParams.set('action', 'balance');
  url.searchParams.set('address', address);
  url.searchParams.set('tag', 'latest');
  const response = await fetch(url.toString());
  if (!response.ok) return '0';
  const json = await response.json() as { status: string; result: string };
  return json.status === '1' ? (json.result || '0') : '0';
}

export async function getLatestBlockNumber(): Promise<number> {
  await rateLimiter.acquire();

  const url = new URL(ETHERSCAN_BASE_URL);
  url.searchParams.set('chainid', '1');
  url.searchParams.set('apikey', config.etherscanApiKey);
  url.searchParams.set('module', 'proxy');
  url.searchParams.set('action', 'eth_blockNumber');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Etherscan HTTP error fetching block number: ${response.status}`);
  }

  const json = await response.json() as { result?: string; error?: { message: string } };

  if (json.error) {
    throw new Error(`Etherscan error: ${json.error.message}`);
  }

  if (!json.result || json.result === '0x') {
    throw new Error('Etherscan returned empty block number — check your ETHERSCAN_API_KEY');
  }

  const blockNumber = parseInt(json.result, 16);
  if (isNaN(blockNumber)) {
    throw new Error(`Etherscan returned invalid block number: ${json.result}`);
  }

  return blockNumber;
}
