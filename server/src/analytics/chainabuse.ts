import { getDb } from '../db/connection.js';
import { fetchChainAbuseReports } from '../utils/chainabuse.js';
import { config } from '../config.js';
import type { ChainAbuseReportSummary, ChainAbuseResult } from '@cripto-ir/shared';

const CACHE_TTL = 86400; // 24 hours in seconds

interface CacheRow {
  address: string;
  report_count: number;
  reports_json: string;
  fetched_at: number;
}

function getFromCache(address: string): ChainAbuseReportSummary | null {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare(
    'SELECT * FROM chainabuse_cache WHERE address = ? AND fetched_at > ?'
  ).get(address.toLowerCase(), now - CACHE_TTL) as CacheRow | undefined;

  if (!row) return null;

  const reports = JSON.parse(row.reports_json) as { scamCategory: string; createdAt: string }[];
  const categories = [...new Set(reports.map(r => r.scamCategory))];
  const latest = reports.length > 0 ? reports[0].createdAt : undefined;

  return {
    address: address.toLowerCase(),
    report_count: row.report_count,
    top_categories: categories,
    latest_report_date: latest,
    chainabuse_url: `https://www.chainabuse.com/address/${address}`,
    from_cache: true,
    cached_at: new Date(row.fetched_at * 1000).toISOString(),
  };
}

function saveToCache(address: string, reportCount: number, reports: unknown[]): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO chainabuse_cache (address, report_count, reports_json, fetched_at)
    VALUES (?, ?, ?, ?)
  `).run(address.toLowerCase(), reportCount, JSON.stringify(reports), Math.floor(Date.now() / 1000));
}

export function clearCache(address: string): void {
  const db = getDb();
  db.prepare('DELETE FROM chainabuse_cache WHERE address = ?').run(address.toLowerCase());
}

async function resolveAddress(address: string): Promise<ChainAbuseReportSummary> {
  const cached = getFromCache(address);
  if (cached) return cached;

  const reports = await fetchChainAbuseReports(address);
  saveToCache(address, reports.length, reports);

  const categories = [...new Set(reports.map(r => r.scamCategory))];
  const latest = reports.length > 0 ? reports[0].createdAt : undefined;

  return {
    address: address.toLowerCase(),
    report_count: reports.length,
    top_categories: categories,
    latest_report_date: latest,
    chainabuse_url: `https://www.chainabuse.com/address/${address}`,
    from_cache: false,
  };
}

function getTopCounterparties(address: string, limit = 10): string[] {
  const db = getDb();
  const addr = address.toLowerCase();
  const rows = db.prepare(`
    SELECT
      CASE WHEN t.from_address = ? THEN t.to_address ELSE t.from_address END as counterparty,
      COUNT(*) as tx_count
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ? AND at2.direction != 'self'
    GROUP BY counterparty
    ORDER BY tx_count DESC
    LIMIT ?
  `).all(addr, addr, limit) as { counterparty: string }[];
  return rows.map(r => r.counterparty);
}

export async function getChainAbuseData(
  mainAddress: string,
  checkCounterparties = false
): Promise<ChainAbuseResult> {
  if (!config.chainabuseApiKey) {
    return {
      api_key_missing: true,
      main: {
        address: mainAddress.toLowerCase(),
        report_count: 0,
        top_categories: [],
        chainabuse_url: `https://www.chainabuse.com/address/${mainAddress}`,
        from_cache: false,
      },
      counterparties: [],
    } as unknown as ChainAbuseResult;
  }

  const main = await resolveAddress(mainAddress);

  let counterparties: ChainAbuseReportSummary[] = [];

  if (checkCounterparties) {
    const addresses = getTopCounterparties(mainAddress, 10);
    for (const addr of addresses) {
      await new Promise(r => setTimeout(r, 500));
      const result = await resolveAddress(addr);
      if (result.report_count > 0) {
        counterparties.push(result);
      }
    }
  }

  return { main, counterparties };
}
