import { config } from '../config.js';

export interface ChainAbuseReport {
  id: string;
  scamCategory: string;
  description: string;
  createdAt: string;
  trusted: boolean;
}

export interface ChainAbuseApiResponse {
  reports: ChainAbuseReport[];
  count: number;
}

export async function fetchChainAbuseReports(address: string): Promise<ChainAbuseReport[]> {
  if (!config.chainabuseApiKey) {
    throw new Error('CHAINABUSE_API_KEY not configured');
  }

  const credentials = Buffer.from(`${config.chainabuseApiKey}:`).toString('base64');
  const url = `https://api.chainabuse.com/v0/reports?address=${encodeURIComponent(address)}&chain=ETH&perPage=5`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`ChainAbuse API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as ChainAbuseApiResponse;
  return data.reports ?? [];
}
