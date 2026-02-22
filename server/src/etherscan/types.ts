import { z } from 'zod';

export const EtherscanResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  result: z.union([z.array(z.record(z.unknown())), z.string()]),
});

export const EtherscanTxSchema = z.object({
  hash: z.string(),
  blockNumber: z.string(),
  timeStamp: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  gas: z.string(),
  gasPrice: z.string(),
  gasUsed: z.string(),
  isError: z.string(),
  methodId: z.string().optional().default(''),
  nonce: z.string(),
  input: z.string().optional().default(''),
});

export const EtherscanTokenTxSchema = z.object({
  hash: z.string(),
  blockNumber: z.string(),
  timeStamp: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  contractAddress: z.string(),
  tokenName: z.string().optional().default(''),
  tokenSymbol: z.string().optional().default(''),
  tokenDecimal: z.string().optional().default('18'),
  logIndex: z.string().optional().default('0'),
});

export const EtherscanInternalTxSchema = z.object({
  hash: z.string(),
  blockNumber: z.string(),
  timeStamp: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  type: z.string().optional().default(''),
  isError: z.string().optional().default('0'),
  traceId: z.string().optional().default('0'),
});

export type EtherscanTx = z.infer<typeof EtherscanTxSchema>;
export type EtherscanTokenTx = z.infer<typeof EtherscanTokenTxSchema>;
export type EtherscanInternalTx = z.infer<typeof EtherscanInternalTxSchema>;
