import { getDb } from '../db/connection.js';
import { getEthBalance } from '../etherscan/client.js';
import { weiToEthNumber, tokenToDecimalNumber, isStablecoin } from '../utils/ethPrice.js';
import type { PortfolioAsset, PortfolioSnapshot } from '@cripto-ir/shared';

// ── Suspicious token detection ────────────────────────────────────────────────
const URL_PATTERN    = /\.(com|net|org|io|finance|xyz|app|pro|vip|top|co|cc|me|us|info)\b/i;
const PHISH_PATTERN  = /claim|reward|airdrop|bonus|free\s|win\b|prize|staked|pooled|voucher|refund/i;
const DUST_AMOUNTS   = new Set(['1', '2', '10', '100']);   // classic dust attack amounts

function detectSuspicious(name: string, symbol: string, amount: string): { flag: boolean; reason: string } {
  const combined = `${name} ${symbol}`;
  if (URL_PATTERN.test(combined))   return { flag: true, reason: 'Token name contains a URL — likely phishing dust' };
  if (PHISH_PATTERN.test(combined)) return { flag: true, reason: 'Token name suggests a phishing scam' };
  if (DUST_AMOUNTS.has(amount) && name && name.length > 10)
    return { flag: true, reason: 'Suspicious round amount — possible dust attack' };
  return { flag: false, reason: '' };
}

// ── Main function ─────────────────────────────────────────────────────────────
export async function getPortfolio(address: string, ethPrice: number): Promise<PortfolioSnapshot> {
  const db   = getDb();
  const addr = address.toLowerCase();

  // ── ETH balance (live from Etherscan) ─────────────────────────────────────
  const ethBalanceWei = await getEthBalance(addr);
  const ethBalance    = weiToEthNumber(ethBalanceWei);

  // ── Token net balances (computed from stored transfers) ───────────────────
  // Fetch all token transfer rows for this address with direction
  const rows = db.prepare(`
    SELECT
      tt.contract_address,
      tt.token_name,
      tt.token_symbol,
      tt.token_decimal,
      tt.value,
      att.direction
    FROM token_transfers tt
    JOIN address_token_transfers att ON tt.id = att.token_transfer_id
    WHERE att.address = ?
  `).all(addr) as {
    contract_address: string;
    token_name: string;
    token_symbol: string;
    token_decimal: number;
    value: string;
    direction: string;
  }[];

  // Aggregate per contract using BigInt (no overflow risk)
  interface TokenEntry {
    name: string; symbol: string; decimal: number;
    inflow: bigint; outflow: bigint;
  }
  const contractMap = new Map<string, TokenEntry>();

  for (const row of rows) {
    const key = row.contract_address;
    if (!contractMap.has(key)) {
      contractMap.set(key, {
        name: row.token_name || '',
        symbol: row.token_symbol || '',
        decimal: row.token_decimal ?? 18,
        inflow: 0n,
        outflow: 0n,
      });
    }
    const entry = contractMap.get(key)!;
    // Use later name/symbol if earlier one was empty
    if (!entry.name && row.token_name)     entry.name   = row.token_name;
    if (!entry.symbol && row.token_symbol) entry.symbol = row.token_symbol;

    const val = BigInt(row.value || '0');
    if (row.direction === 'in')  entry.inflow  += val;
    else if (row.direction === 'out') entry.outflow += val;
  }

  const assets: PortfolioAsset[] = [];

  // ── ETH entry ──────────────────────────────────────────────────────────────
  assets.push({
    asset_name: 'Ether',
    asset_symbol: 'ETH',
    contract_address: null,
    amount: ethBalance.toLocaleString('en-US', { maximumFractionDigits: 6, minimumFractionDigits: 0 }),
    usd_value: Math.round(ethBalance * ethPrice * 100) / 100,
    is_suspicious: false,
  });

  // ── Token entries ──────────────────────────────────────────────────────────
  for (const [contract, data] of contractMap.entries()) {
    const net = data.inflow - data.outflow;
    // Skip fully-spent tokens
    if (net <= 0n) continue;

    const amount    = tokenToDecimalNumber(net.toString(), data.decimal);
    const amountStr = amount.toLocaleString('en-US', { maximumFractionDigits: 6 });
    const usdValue  = isStablecoin(data.symbol) ? Math.round(amount * 100) / 100 : 0;
    const { flag, reason } = detectSuspicious(data.name, data.symbol, amountStr);

    assets.push({
      asset_name:       data.name  || '—',
      asset_symbol:     data.symbol || '—',
      contract_address: contract,
      amount:           amountStr,
      usd_value:        usdValue,
      is_suspicious:    flag,
      suspicious_reason: flag ? reason : undefined,
    });
  }

  // ── Sort: ETH first, then legit by USD desc, then suspicious at bottom ─────
  assets.sort((a, b) => {
    if (!a.contract_address && b.contract_address) return -1;  // ETH first
    if (!b.contract_address && a.contract_address) return 1;
    if (a.is_suspicious && !b.is_suspicious) return 1;         // suspicious last
    if (b.is_suspicious && !a.is_suspicious) return -1;
    return b.usd_value - a.usd_value;                          // highest USD first
  });

  const total_usd       = assets.filter(a => !a.is_suspicious).reduce((s, a) => s + a.usd_value, 0);
  const suspicious_count = assets.filter(a => a.is_suspicious).length;

  return {
    assets,
    snapshot_date: new Date().toISOString(),
    total_usd: Math.round(total_usd * 100) / 100,
    suspicious_count,
  };
}
