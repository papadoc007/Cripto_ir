import { config, type AiProvider } from '../config.js';
import { logger } from './logger.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LlmOptions {
  messages: ChatMessage[];
  temperature?: number;
  jsonMode?: boolean;
}

export async function llmChat(options: LlmOptions): Promise<string> {
  const provider = config.aiProvider;
  logger.debug(`LLM call via ${provider}`);

  switch (provider) {
    case 'anthropic':
      return callAnthropic(options);
    case 'groq':
      return callGroq(options);
    case 'openai':
    default:
      return callOpenAI(options);
  }
}

// ---- OpenAI (and OpenAI-compatible) ----

async function callOpenAI(options: LlmOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: config.openaiModel,
    messages: options.messages,
    temperature: options.temperature ?? 0,
  };
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

// ---- Anthropic ----

async function callAnthropic(options: LlmOptions): Promise<string> {
  // Anthropic uses a different format: system is separate, no "system" role in messages
  const systemMsg = options.messages.find(m => m.role === 'system');
  const chatMessages = options.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: config.anthropicModel,
    max_tokens: 4096,
    messages: chatMessages,
    temperature: options.temperature ?? 0,
  };
  if (systemMsg) {
    body.system = systemMsg.content;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as { content: { type: string; text: string }[] };
  return data.content[0].text;
}

// ---- Groq ----

async function callGroq(options: LlmOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: config.groqModel,
    messages: options.messages,
    temperature: options.temperature ?? 0,
  };
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.groqApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}
