import { getDb } from '../db/connection.js';
import type { GraphData, GraphNode, GraphLink } from '@cripto-ir/shared';

export function getTransferGraph(
  address: string,
  hops = 1,
  limit = 10,
  firstFunderAddress?: string,
  sortBy: 'tx_count' | 'volume' = 'tx_count'
): GraphData {
  const db = getDb();
  const addr = address.toLowerCase();
  const funderAddr = firstFunderAddress?.toLowerCase();
  const nodes = new Map<string, GraphNode>();
  const linkMap = new Map<string, GraphLink>();

  nodes.set(addr, { id: addr, label: getLabel(addr), is_investigated: true });

  // Fetch all direct transactions (from+to+value) in one pass to avoid N queries
  const directLinks = db.prepare(`
    SELECT
      t.from_address,
      t.to_address,
      t.value,
      COUNT(*) OVER (PARTITION BY t.from_address, t.to_address) as tx_count
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ?
  `).all(addr) as { from_address: string; to_address: string; value: string; tx_count: number }[];

  // Aggregate per counterparty: tx_count + total volume (BigInt)
  const cpTxCount  = new Map<string, number>();
  const cpVolume   = new Map<string, bigint>();
  // also keep raw link rows grouped by from->to for link building
  const linkRows   = new Map<string, { from: string; to: string; value: string; tx_count: number }[]>();

  for (const row of directLinks) {
    const cp = row.from_address === addr ? row.to_address : row.from_address;
    if (cp === addr) continue;
    cpTxCount.set(cp, (cpTxCount.get(cp) ?? 0) + 1);
    cpVolume.set(cp, (cpVolume.get(cp) ?? 0n) + BigInt(row.value || '0'));
    const key = `${row.from_address}->${row.to_address}`;
    if (!linkRows.has(key)) linkRows.set(key, []);
    linkRows.get(key)!.push({ from: row.from_address, to: row.to_address, value: row.value, tx_count: row.tx_count });
  }

  // Sort counterparties by chosen metric
  const sortedCounterparties = [...cpTxCount.keys()].sort((a, b) => {
    if (sortBy === 'volume') {
      const va = cpVolume.get(a) ?? 0n;
      const vb = cpVolume.get(b) ?? 0n;
      return vb > va ? 1 : vb < va ? -1 : 0;
    }
    return (cpTxCount.get(b) ?? 0) - (cpTxCount.get(a) ?? 0);
  });

  // Determine which counterparties to include:
  // - Always include the first funder if known
  // - Then fill up to `limit` with top counterparties (limit=0 means all)
  const included = new Set<string>();
  if (funderAddr && funderAddr !== addr) {
    included.add(funderAddr);
  }
  for (const cp of sortedCounterparties) {
    if (limit > 0 && included.size >= limit) break;
    included.add(cp);
  }

  // Add nodes and links only for included counterparties, using pre-aggregated data
  for (const [key, rows] of linkRows.entries()) {
    const { from, to } = rows[0];
    const cp = from === addr ? to : from;
    if (!included.has(cp)) continue;

    if (!nodes.has(from)) {
      nodes.set(from, {
        id: from,
        label: getLabel(from),
        is_investigated: false,
        is_first_funder: from === funderAddr,
        tx_count: cpTxCount.get(from),
      });
    }
    if (!nodes.has(to)) {
      nodes.set(to, {
        id: to,
        label: getLabel(to),
        is_investigated: false,
        is_first_funder: to === funderAddr,
        tx_count: cpTxCount.get(to),
      });
    }

    if (!linkMap.has(key)) {
      const volume = rows.reduce((sum, r) => sum + BigInt(r.value || '0'), 0n).toString();
      linkMap.set(key, {
        source: from,
        target: to,
        value: volume,
        tx_count: rows.length,
      });
    }
  }

  // Mark the first funder node properly even if no direct link was found
  if (funderAddr && funderAddr !== addr && !nodes.has(funderAddr)) {
    nodes.set(funderAddr, {
      id: funderAddr,
      label: getLabel(funderAddr),
      is_investigated: false,
      is_first_funder: true,
    });
  }

  // 2-hop: counterparties of counterparties
  if (hops >= 2) {
    const hop1Addresses = [...nodes.keys()].filter(a => a !== addr);
    for (const hop1Addr of hop1Addresses) {
      const hop2Links = db.prepare(`
        SELECT
          t.from_address,
          t.to_address,
          COUNT(*) as tx_count
        FROM transactions t
        JOIN address_transactions at2 ON t.hash = at2.hash
        WHERE at2.address = ?
        GROUP BY t.from_address, t.to_address
        LIMIT 10
      `).all(hop1Addr) as { from_address: string; to_address: string; tx_count: number }[];

      for (const link of hop2Links) {
        if (!nodes.has(link.from_address)) {
          nodes.set(link.from_address, {
            id: link.from_address,
            label: getLabel(link.from_address),
            is_investigated: false,
            is_first_funder: link.from_address === funderAddr,
          });
        }
        if (!nodes.has(link.to_address)) {
          nodes.set(link.to_address, {
            id: link.to_address,
            label: getLabel(link.to_address),
            is_investigated: false,
            is_first_funder: link.to_address === funderAddr,
          });
        }
        const key = `${link.from_address}->${link.to_address}`;
        if (!linkMap.has(key)) {
          const txs = db.prepare(`
            SELECT value FROM transactions WHERE from_address = ? AND to_address = ?
          `).all(link.from_address, link.to_address) as { value: string }[];
          const volume = txs.reduce((sum, tx) => sum + BigInt(tx.value || '0'), 0n).toString();
          linkMap.set(key, { source: link.from_address, target: link.to_address, value: volume, tx_count: link.tx_count });
        }
      }
    }
  }

  return {
    nodes: [...nodes.values()],
    links: [...linkMap.values()],
  };
}

function getLabel(address: string): string | null {
  const row = getDb().prepare('SELECT label FROM addresses WHERE address = ?').get(address) as { label: string | null } | undefined;
  return row?.label ?? null;
}
