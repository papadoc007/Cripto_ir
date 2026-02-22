import { llmChat } from '../utils/llm.js';
import type { ExecutionResult } from './executor.js';

export async function narrateResults(question: string, results: ExecutionResult[]): Promise<string> {
  const systemPrompt = `You are a blockchain investigation analyst. Given a user question and computed analytics data, provide a clear, factual narrative.

Rules:
- Reference ONLY the data provided — never invent or assume numbers
- Use markdown formatting
- Be concise but thorough
- Convert wei values to ETH when presenting to the user (1 ETH = 10^18 wei)
- If data is empty, say so clearly`;

  const userContent = `Question: ${question}

Computed data:
${results.map(r => `### ${r.stepName}\n\`\`\`json\n${JSON.stringify(r.data, null, 2)}\n\`\`\``).join('\n\n')}`;

  return llmChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
  });
}
