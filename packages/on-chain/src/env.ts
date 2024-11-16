import { z } from 'zod';

const envSchema = z.object({
  LOGTAIL_ACCESS_TOKEN_ON_CHAIN: z.string().optional(),
  TENDERLY_RPC_API_KEY_1: z.string().min(1),
  TENDERLY_RPC_API_KEY_2: z.string().min(1),
  TENDERLY_RPC_API_KEY_3: z.string().min(1).optional(),
  TENDERLY_RPC_API_KEY_4: z.string().min(1).optional(),
  TENDERLY_RPC_API_KEY_5: z.string().min(1).optional(),
  TENDERLY_RPC_API_KEY_6: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
