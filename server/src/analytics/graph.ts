import { getDb } from '../db/connection.js';
import type { GraphData, GraphNode, GraphLink } from '@cripto-ir/shared';

export function getTransferGraph(address: string, hops = 1): GraphData {
  const db = getDb();
  const addr = address.toLowerCase();
  const nodes = new Map<string, GraphNode>();
  const linkMap = new Map<string, GraphLink>();

  nodes.set(addr, { id: addr, label: getLabel(addr), is_investigated: true });

  // 1-hop: direct counterparties
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

  for (const link of directLinks) {
    addNode(nodes, link.from_address);
    addNode(nodes, link.to_address);

    // Compute volume
    const txs = db.prepare(`
      SELECT value FROM transactions WHERE from_address = ? AND to_address = ?
    `).all(link.from_address, link.to_address) as { value: string }[];

    const volume = txs.reduce((sum, tx) => sum + BigInt(tx.value || '0'), 0n).toString();
    const key = `${link.from_address}->${link.to_address}`;
    linkMap.set(key, {
      source: link.from_address,
      target: link.to_address,
      value: volume,
      tx_count: link.tx_count,
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
        LIMIT 20
      `).all(hop1Addr) as { from_address: string; to_address: string; tx_count: number }[];

      for (const link of hop2Links) {
        addNode(nodes, link.from_address);
        addNode(nodes, link.to_address);
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

function addNode(nodes: Map<string, GraphNode>, address: string): void {
  if (!nodes.has(address)) {
    const isInvestigated = getDb().prepare('SELECT 1 FROM addresses WHERE address = ?').get(address) != null;
    nodes.set(address, { id: address, label: getLabel(address), is_investigated: isInvestigated });
  }
}

function getLabel(address: string): string | null {
  const row = getDb().prepare('SELECT label FROM addresses WHERE address = ?').get(address) as { label: string | null } | undefined;
  return row?.label ?? null;
}
