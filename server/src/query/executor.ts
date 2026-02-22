import { getFunction } from '../analytics/registry.js';
import type { QueryPlanType } from './schemas.js';
import { logger } from '../utils/logger.js';

export interface ExecutionResult {
  stepName: string;
  data: unknown;
}

export function executePlan(plan: QueryPlanType, address: string): ExecutionResult[] {
  const results: ExecutionResult[] = [];

  for (const step of plan.steps) {
    const fn = getFunction(step.function);
    if (!fn) {
      logger.warn(`Unknown analytics function: ${step.function}`);
      results.push({ stepName: step.function, data: { error: `Unknown function: ${step.function}` } });
      continue;
    }

    const params = { ...step.params, address };
    const data = fn.handler(address, params);
    results.push({ stepName: step.function, data });
  }

  return results;
}
