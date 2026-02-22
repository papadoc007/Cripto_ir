import { z } from 'zod';

export const QueryStepSchema = z.object({
  function: z.string(),
  params: z.record(z.unknown()).default({}),
});

export const QueryPlanSchema = z.object({
  steps: z.array(QueryStepSchema).min(1).max(5),
});

export type QueryPlanType = z.infer<typeof QueryPlanSchema>;
