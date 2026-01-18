import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOT_TOKEN: z.string().min(1),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),
  ADMIN_TELEGRAM_ID: z.string().optional(),
  WEBHOOK_DOMAIN: z.string().optional(),
  WEBHOOK_PORT: z.string().optional(),
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
