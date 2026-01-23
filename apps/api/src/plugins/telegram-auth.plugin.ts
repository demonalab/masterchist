import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { prisma } from '@himchistka/db';
import { validateInitData, isInitDataExpired, TelegramUser } from '../lib/telegram-auth';
import { config } from '../config';

declare module 'fastify' {
  interface FastifyRequest {
    telegramUser?: TelegramUser;
    dbUserId?: string;
  }
}

async function upsertUser(tgUser: TelegramUser): Promise<string> {
  const user = await prisma.user.upsert({
    where: { telegramId: String(tgUser.id) },
    update: {
      username: tgUser.username ?? null,
      firstName: tgUser.first_name ?? null,
      lastName: tgUser.last_name ?? null,
      languageCode: tgUser.language_code ?? null,
    },
    create: {
      telegramId: String(tgUser.id),
      username: tgUser.username ?? null,
      firstName: tgUser.first_name ?? null,
      lastName: tgUser.last_name ?? null,
      languageCode: tgUser.language_code ?? null,
    },
    select: { id: true },
  });
  return user.id;
}

export const telegramAuthHook = async (request: FastifyRequest, reply: FastifyReply) => {
  // Dev mode bypass - create mock user (local dev or ?dev=1 mode)
  // Use first super admin ID for dev mode to have admin access
  const devHeader = request.headers['x-dev-mode'];
  if ((config.NODE_ENV === 'development' || devHeader === '1') && !request.headers['x-telegram-init-data']) {
    const devAdminId = config.ADMIN_TELEGRAM_ID?.split(',')[0]?.trim() || '8468584965';
    request.telegramUser = { id: Number(devAdminId), first_name: 'Dev Admin', username: 'devadmin' };
    request.dbUserId = await upsertUser(request.telegramUser);
    return;
  }

  // MAX bot bypass - if maxUserId provided in body or header, use that instead of Telegram auth
  const body = request.body as any;
  const maxUserIdHeader = request.headers['x-max-user-id'];
  const maxUserId = body?.maxUserId || maxUserIdHeader;
  if (maxUserId) {
    const maxUser: TelegramUser = { id: Number(maxUserId), first_name: body?.maxUserName || 'MAX User' };
    request.telegramUser = maxUser;
    request.dbUserId = await upsertUser(maxUser);
    return;
  }

  const initData = request.headers['x-telegram-init-data'];
  if (typeof initData !== 'string') {
    return reply.unauthorized('Missing Telegram initData');
  }

  // Bot direct requests bypass - parse user from initData without signature validation
  if (initData.includes('hash=bot_direct')) {
    try {
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (userStr) {
        const user = JSON.parse(userStr) as TelegramUser;
        request.telegramUser = user;
        request.dbUserId = await upsertUser(user);
        return;
      }
    } catch (err) {
      console.error('Bot direct initData parse error:', err, 'initData:', initData);
      return reply.unauthorized('Invalid bot direct initData');
    }
  }

  // Try MAX initData format (has query_id or ip field, different signature)
  const params = new URLSearchParams(initData);
  const isMaxFormat = params.has('query_id') || (params.has('ip') && !params.has('auth_date'));
  
  if (isMaxFormat) {
    // MAX WebApp - parse user without signature validation (MAX uses different signing)
    try {
      const userStr = params.get('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        const user: TelegramUser = {
          id: userData.id,
          first_name: userData.first_name || 'MAX User',
          last_name: userData.last_name || undefined,
          username: userData.username || undefined,
          language_code: userData.language_code || undefined,
        };
        request.telegramUser = user;
        request.dbUserId = await upsertUser(user);
        return;
      }
    } catch (err) {
      console.error('MAX initData parse error:', err);
    }
    return reply.unauthorized('Invalid MAX initData');
  }

  // Standard Telegram initData validation
  const validated = validateInitData(initData, config.BOT_TOKEN);
  if (!validated) {
    console.error('InitData validation failed. initData:', initData.substring(0, 200), '... BOT_TOKEN exists:', !!config.BOT_TOKEN);
    return reply.unauthorized('Invalid Telegram initData signature');
  }

  if (isInitDataExpired(validated.authDate)) {
    return reply.unauthorized('Telegram initData expired');
  }

  request.telegramUser = validated.user;
  request.dbUserId = await upsertUser(validated.user);
};

const telegramAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('telegramAuthHook', telegramAuthHook);
};

export default fp(telegramAuthPlugin, { name: 'telegram-auth' });
