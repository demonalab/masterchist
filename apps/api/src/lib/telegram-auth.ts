import crypto from 'node:crypto';
import { z } from 'zod';

const telegramUserSchema = z.object({
  id: z.number(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});

export type TelegramUser = z.infer<typeof telegramUserSchema>;

export interface ValidatedInitData {
  user: TelegramUser;
  authDate: number;
  hash: string;
  raw: string;
}

export function validateInitData(initData: string, botToken: string): ValidatedInitData | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) return null;

    const userParam = params.get('user');
    if (!userParam) return null;

    const userResult = telegramUserSchema.safeParse(JSON.parse(userParam));
    if (!userResult.success) return null;

    const authDateParam = params.get('auth_date');
    if (!authDateParam) return null;

    return {
      user: userResult.data,
      authDate: parseInt(authDateParam, 10),
      hash,
      raw: initData,
    };
  } catch {
    return null;
  }
}

export function isInitDataExpired(authDate: number, maxAgeSeconds = 86400): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - authDate > maxAgeSeconds;
}
