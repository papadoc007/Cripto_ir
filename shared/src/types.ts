export interface Address {
  address: string;
  label: string | null;
  first_seen_at: number | null;
  last_seen_at: number | null;
  created_at: string;
}

export interface SyncState {
  address: string;
  tx_type: TxType;
  last_block: number;
  last_synced_at: string | null;
  status: SyncStatus;
  error_message: string | null;
}

export type TxType = 'normal' | 'erc20' | 'internal';
export type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

export interface Transaction {
  hash: string;
  block_number: number;
  timestamp: number;
  from_address: string;
  to_address: string;
  value: string; // wei as string
  gas: string;
  gas_price: string;
  gas_used: string;
  is_error: number;
  method_id: string;
  nonce: number;
  input: string;
}

export interface AddressTransaction {
  address: string;
  hash: string;
  direction: 'in' | 'out' | 'self';
}

export interface TokenTransfer {
  id?: number;
  hash: string;
  log_index: number;
  block_number: number;
  timestamp: number;
  from_address: string;
  to_address: string;
  contract_address: string;
  token_name: string;
  token_symbol: string;
  token_decimal: number;
  value: string;
}

export interface InternalTransaction {
  id?: number;
  hash: string;
  trace_id: string;
  block_number: number;
  timestamp: number;
  from_address: string;
  to_address: string;
  value: string;
  type: string;
  is_error: number;
}

export interface SyncProgress {
  address: string;
  txType: TxType;
  status: SyncStatus;
  recordsFetched: number;
  currentBlock: number;
  latestBlock: number;
  message: string;
}

export interface CashflowData {
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

export interface CounterpartyData {
  address: string;
  label: string | null;
  tx_count: number;
  total_in: string;
  total_out: string;
  first_seen: number;
  last_seen: number;
}

export interface TimelineData {
  period: string;
  tx_count: number;
  unique_counterparties: number;
  volume: string;
}

export interface TokenExposure {
  contract_address: string;
  token_name: string;
  token_symbol: string;
  transfer_count: number;
  total_in: string;
  total_out: string;
}

export interface GraphNode {
  id: string;
  label: string | null;
  is_investigated: boolean;
  is_first_funder?: boolean;
  tx_count?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value: string;
  tx_count: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface HeuristicFlag {
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  details: Record<string, unknown>;
}

export interface QueryPlan {
  steps: QueryStep[];
}

export interface QueryStep {
  function: string;
  params: Record<string, unknown>;
}

export interface QueryResult {
  plan: QueryPlan;
  results: Record<string, unknown>[];
  narrative: string;
}

export interface PortfolioAsset {
  asset_name: string;
  asset_symbol: string;
  contract_address: string | null;
  amount: string;        // human-readable decimal string
  usd_value: number;
  is_suspicious: boolean;
  suspicious_reason?: string;
}

export interface PortfolioSnapshot {
  assets: PortfolioAsset[];
  snapshot_date: string;
  total_usd: number;
  suspicious_count: number;
}
