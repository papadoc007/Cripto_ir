import { logger } from './logger.js';

// Known stablecoins (USDT, USDC, DAI, BUSD, TUSD, FRAX, etc.)
const STABLECOIN_SYMBOLS = new Set(['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'USDP', 'GUSD', 'LUSD', 'sUSD', 'USDD', 'cUSD']);

let cachedEthPrice: { price: number; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getEthUsdPrice(): Promise<number> {
  if (cachedEthPrice && Date.now() - cachedEthPrice.fetchedAt < CACHE_TTL) {
    return cachedEthPrice.price;
  }

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    if (res.ok) {
      const data = await res.json() as { ethereum: { usd: number } };
      cachedEthPrice = { price: data.ethereum.usd, fetchedAt: Date.now() };
      return data.ethereum.usd;
    }
  } catch (e) {
    logger.warn('Failed to fetch ETH price from CoinGecko, using fallback');
  }

  // Fallback
  return cachedEthPrice?.price ?? 2500;
}

export function isStablecoin(symbol: string): boolean {
  return STABLECOIN_SYMBOLS.has(symbol.toUpperCase());
}

export function weiToEthNumber(wei: string): number {
  if (!wei || wei === '0') return 0;
  return Number(BigInt(wei)) / 1e18;
}

export function tokenToDecimalNumber(value: string, decimals: number): number {
  if (!value || value === '0') return 0;
  return Number(BigInt(value)) / Math.pow(10, decimals);
}
