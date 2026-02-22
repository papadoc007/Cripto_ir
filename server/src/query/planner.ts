import { getRegistryDescription } from '../analytics/registry.js';
import { QueryPlanSchema, type QueryPlanType } from './schemas.js';
import { llmChat } from '../utils/llm.js';
import { logger } from '../utils/logger.js';

export async function createQueryPlan(question: string, address: string): Promise<QueryPlanType> {
  const systemPrompt = `You are a blockchain analytics query planner. Given a user question about an Ethereum address, output a JSON plan that calls the available analytics functions.

Available functions:
${getRegistryDescription()}

Rules:
- Output ONLY valid JSON matching this schema: { "steps": [{ "function": "name", "params": { ... } }] }
- The "address" param is always required and will be: ${address}
- Max 5 steps per plan
- Only use functions from the list above
- No free-text, no explanation, only JSON`;

  const content = await llmChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    temperature: 0,
    jsonMode: true,
  });

  logger.debug('LLM plan response:', content);

  // Extract JSON from response (handle cases where LLM wraps in markdown)
  let jsonStr = content.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  return QueryPlanSchema.parse(parsed);
}
