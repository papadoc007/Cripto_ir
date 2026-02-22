import type { AnalyticsDescriptor } from './types.js';
import { getCashflow } from './cashflow.js';
import { getCounterparties } from './counterparty.js';
import { getTimeline } from './timeline.js';
import { getTokenExposure } from './tokens.js';
import { getTransferGraph } from './graph.js';
import { getHeuristics } from './heuristics.js';
import { getFirstFunder } from './firstFunder.js';
import { getFullTransactionList } from './transactionList.js';

const registry: AnalyticsDescriptor[] = [
  {
    name: 'cashflow',
    description: 'Get monthly ETH/token inflow, outflow, netflow with USD estimates for an address',
    params: [
      { name: 'address', type: 'string', description: 'Ethereum address', required: true },
    ],
    handler: (address) => getCashflow(address),
  },
  {
    name: 'counterparties',
    description: 'Get top counterparties by transaction count, with total inflow/outflow per counterparty',
    params: [
      { name: 'address', type: 'string', description: 'Ethereum address', required: true },
      { name: 'limit', type: 'number', description: 'Max counterparties to return (default 50)', required: false },
    ],
    handler: (address, params) => getCounterparties(address, (params?.limit as number) ?? 50),
  },
  {
    name: 'timeline',
    description: 'Get transaction activity over time (count, unique counterparties, volume) by day/week/month',
    params: [
      { name: 'address', type: 'string', description: 'Ethereum address', required: true },
      { name: 'granularity', type: 'string', description: 'day, week, or month (default month)', required: false },
    ],
    handler: (address, params) => getTimeline(address, (params?.granularity as 'day' | 'week' | 'month') ?? 'month'),
  },
  {
    name: 'tokens',
    description: 'Get ERC20 token exposure: tokens transferred, counts, total in/out per token',
    params: [
      { name: 'address', type: 'string', description: 'Ethereum address', required: true },
    ],
    handler: (address) => getTokenExposure(address),
  },
  {
    name: 'graph',
    description: 'Get transfer graph showing connections between addresses (1-hop or 2-hop)',
    params: [
      { name: 'address', type: 'string', description: 'Ethereum address', required: true },
      { name: 'hops', type: 'number', description: '1 or 2 hops (default 1)', required: false },
    ],
    handler: (address, params) => getTransferGraph(address, (params?.hops as number) ?? 1),
  },
  {
    name: 'heuristics',
    description: 'Run heuristic detectors for suspicious patterns (burst activity, peel chains, concentration, round amounts, rapid in/out)',
    params: [
      { name: 'address', type: 'string', description: 'Ethereum address', required: true },
    ],
    handler: (address) => getHeuristics(address),
  },
  {
    name: 'first_funder',
    description: 'Find which address first funded (sent ETH to) the investigated address, with tx hash and timestamp',
    params: [
      { name: 'address', type: 'string', description: 'Ethereum address', required: true },
    ],
    handler: (address) => getFirstFunder(address),
  },
  {
    name: 'transactions',
    description: 'Get paginated transaction list with hash, timestamp, counterparty, direction, amount, USD value, asset, balance',
    params: [
      { name: 'address', type: 'string', description: 'Ethereum address', required: true },
      { name: 'limit', type: 'number', description: 'Max rows (default 100)', required: false },
      { name: 'direction', type: 'string', description: 'in, out, self, or all (default all)', required: false },
    ],
    handler: (address, params) => getFullTransactionList(address, 2500, {
      limit: (params?.limit as number) ?? 100,
      direction: (params?.direction as 'in' | 'out' | 'self' | 'all') ?? 'all',
    }),
  },
];

export function getRegistry(): AnalyticsDescriptor[] {
  return registry;
}

export function getFunction(name: string): AnalyticsDescriptor | undefined {
  return registry.find(f => f.name === name);
}

export function getRegistryDescription(): string {
  return registry.map(f => {
    const params = f.params.map(p => `  - ${p.name} (${p.type}${p.required ? ', required' : ', optional'}): ${p.description}`).join('\n');
    return `${f.name}: ${f.description}\nParameters:\n${params}`;
  }).join('\n\n');
}
