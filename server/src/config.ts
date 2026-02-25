import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export type AiProvider = 'openai' | 'anthropic' | 'groq';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  etherscanApiKey: process.env.ETHERSCAN_API_KEY || '',
  dbPath: path.resolve(__dirname, '../../data.db'),

  // AI provider selection
  aiProvider: (process.env.AI_PROVIDER || 'openai') as AiProvider,

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  // Anthropic
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',

  // Groq
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

  // Report branding
  reportCompanyName: process.env.REPORT_COMPANY_NAME || 'Cripto IR',
  reportLogoUrl: process.env.REPORT_LOGO_URL || null,

  // ChainAbuse
  chainabuseApiKey: process.env.CHAINABUSE_API_KEY ?? '',
};
