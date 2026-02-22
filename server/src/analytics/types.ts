import type { CashflowData, CounterpartyData, TimelineData, TokenExposure, GraphData, HeuristicFlag } from '@cripto-ir/shared';

export type AnalyticsFunction = (address: string, params?: Record<string, unknown>) => unknown;

export interface AnalyticsDescriptor {
  name: string;
  description: string;
  params: { name: string; type: string; description: string; required: boolean }[];
  handler: AnalyticsFunction;
}

export type { CashflowData, CounterpartyData, TimelineData, TokenExposure, GraphData, HeuristicFlag };
