const BASE = '/api';

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export interface CashflowRow {
  month: string;
  inflow: string;
  outflow: string;
  netflow: string;
  inflow_eth: number;
  outflow_eth: number;
  netflow_eth: number;
  inflow_usd: number;
  outflow_usd: number;
  netflow_usd: number;
  token_inflow_usd: number;
  token_outflow_usd: number;
  total_volume_usd: number;
  tx_count_in: number;
  tx_count_out: number;
}

export interface FirstFunder {
  funder_address: string;
  funder_label: string | null;
  tx_hash: string;
  timestamp: number;
  value: string;
  value_eth: number;
  block_number: number;
}

export interface TransactionRow {
  hash: string;
  timestamp: number;
  counterparty: string;
  counterparty_label: string | null;
  direction: 'in' | 'out' | 'self';
  value: string;
  value_eth: number;
  value_usd: number;
  asset: string;
  asset_contract: string | null;
  balance_after: string;
  balance_after_eth: number;
}

export const api = {
  // Address
  syncAddress: (address: string) =>
    fetchJson<{ message: string }>('/address/sync', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),

  getAddress: (address: string) =>
    fetchJson<{ address: unknown; syncStates: unknown[]; txCount: number }>(`/address/${address}`),

  listAddresses: () =>
    fetchJson<{ address: string; label: string | null; created_at: string }[]>('/address'),

  // Analytics
  getCashflow: (address: string) =>
    fetchJson<CashflowRow[]>(`/analytics/${address}/cashflow`),

  getCounterparties: (address: string, limit = 50) =>
    fetchJson<unknown[]>(`/analytics/${address}/counterparties?limit=${limit}`),

  getTimeline: (address: string, granularity = 'month') =>
    fetchJson<unknown[]>(`/analytics/${address}/timeline?granularity=${granularity}`),

  getTokens: (address: string) =>
    fetchJson<unknown[]>(`/analytics/${address}/tokens`),

  getGraph: (address: string, hops = 1, limit: number | 'all' = 10, sortBy: 'tx_count' | 'volume' = 'tx_count') =>
    fetchJson<{ nodes: unknown[]; links: unknown[] }>(`/analytics/${address}/graph?hops=${hops}&limit=${limit}&sortBy=${sortBy}`),

  getHeuristics: (address: string) =>
    fetchJson<unknown[]>(`/analytics/${address}/heuristics`),

  getFirstFunder: (address: string) =>
    fetchJson<FirstFunder | null>(`/analytics/${address}/first-funder`),

  getTransactions: (address: string, opts: { offset?: number; limit?: number; direction?: string; sort?: string } = {}) => {
    const params = new URLSearchParams();
    if (opts.offset) params.set('offset', opts.offset.toString());
    if (opts.limit) params.set('limit', opts.limit.toString());
    if (opts.direction) params.set('direction', opts.direction);
    if (opts.sort) params.set('sort', opts.sort);
    return fetchJson<{ rows: TransactionRow[]; total: number }>(`/analytics/${address}/transactions?${params}`);
  },

  // Query
  askQuestion: (question: string, address: string) =>
    fetchJson<{ plan: unknown; results: unknown[]; narrative: string }>('/query', {
      method: 'POST',
      body: JSON.stringify({ question, address }),
    }),

  // Report
  generateReport: (
    address: string,
    format: 'html' | 'md' = 'html',
    branding: { logoUrl?: string; companyName?: string; caseRef?: string } = {}
  ) =>
    fetch(`${BASE}/report/${address}?format=${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branding),
    }).then(r => r.text()),
};
