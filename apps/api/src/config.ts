import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  BOT_TOKEN: z.string().min(1),
  MAX_BOT_TOKEN: z.string().optional(),
  ADMIN_TELEGRAM_ID: z.string().optional(),
  JWT_SECRET: z.string().default('your-secret-key-change-in-production'),
  // Payment requisites
  PAYMENT_CARD_NUMBER: z.string().default(''),
  PAYMENT_CARD_BANK: z.string().default('Сбербанк'),
  PAYMENT_CARD_HOLDER: z.string().default(''),
  PAYMENT_SBP_PHONE: z.string().default(''),
  PAYMENT_SBP_BANK: z.string().default('Сбербанк'),
  PREPAYMENT_AMOUNT: z.coerce.number().default(500),
});

export type Env = z.infer<typeof envSchema>;

export function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
