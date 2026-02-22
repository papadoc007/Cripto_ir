import { getDb } from '../db/connection.js';
import type { GraphData, GraphNode, GraphLink } from '@cripto-ir/shared';

export function getTransferGraph(
  address: string,
  hops = 1,
  limit = 10,
  firstFunderAddress?: string
): GraphData {
  const db = getDb();
  const addr = address.toLowerCase();
  const funderAddr = firstFunderAddress?.toLowerCase();
  const nodes = new Map<string, GraphNode>();
  const linkMap = new Map<string, GraphLink>();

  nodes.set(addr, { id: addr, label: getLabel(addr), is_investigated: true });

  // Get all direct counterparties with tx counts, sorted by tx_count desc
  const directLinks = db.prepare(`
    SELECT
      t.from_address,
      t.to_address,
      COUNT(*) as tx_count
    FROM transactions t
    JOIN address_transactions at2 ON t.hash = at2.hash
    WHERE at2.address = ?
    GROUP BY t.from_address, t.to_address
  `).all(addr) as { from_address: string; to_address: string; tx_count: number }[];

  // Build a map of counterparty -> total tx count, excluding self-loops
  const counterpartyTxMap = new Map<string, number>();
  for (const link of directLinks) {
    const cp = link.from_address === addr ? link.to_address : link.from_address;
    if (cp === addr) continue;
    counterpartyTxMap.set(cp, (counterpartyTxMap.get(cp) ?? 0) + link.tx_count);
  }

  // Sort counterparties by tx_count desc
  const sortedCounterparties = [...counterpartyTxMap.entries()]
    .sort((a, b) => b[1] - a[1]);

  // Determine which counterparties to include:
  // - Always include the first funder if known
  // - Then fill up to `limit` with top counterparties (limit=0 means all)
  const included = new Set<string>();
  if (funderAddr && funderAddr !== addr) {
    included.add(funderAddr);
  }
  for (const [cp] of sortedCounterparties) {
    if (limit > 0 && included.size >= limit) break;
    included.add(cp);
  }

  // Now add nodes and links only for included counterparties
  for (const link of directLinks) {
    const cp = link.from_address === addr ? link.to_address : link.from_address;
    if (!included.has(cp)) continue;

    // Add nodes
    if (!nodes.has(link.from_address)) {
      nodes.set(link.from_address, {
        id: link.from_address,
        label: getLabel(link.from_address),
        is_investigated: false,
        is_first_funder: link.from_address === funderAddr,
        tx_count: counterpartyTxMap.get(link.from_address),
      });
    }
    if (!nodes.has(link.to_address)) {
      nodes.set(link.to_address, {
        id: link.to_address,
        label: getLabel(link.to_address),
        is_investigated: false,
        is_first_funder: link.to_address === funderAddr,
        tx_count: counterpartyTxMap.get(link.to_address),
      });
    }

    // Add link (aggregate volume using BigInt in JS)
    const key = `${link.from_address}->${link.to_address}`;
    if (!linkMap.has(key)) {
      const txs = db.prepare(`
        SELECT value FROM transactions WHERE from_address = ? AND to_address = ?
      `).all(link.from_address, link.to_address) as { value: string }[];
      const volume = txs.reduce((sum, tx) => sum + BigInt(tx.value || '0'), 0n).toString();
      linkMap.set(key, {
        source: link.from_address,
        target: link.to_address,
        value: volume,
        tx_count: link.tx_count,
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
