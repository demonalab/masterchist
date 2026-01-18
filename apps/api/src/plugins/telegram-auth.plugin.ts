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
  // Dev mode bypass - create mock user
  if (config.NODE_ENV === 'development' && !request.headers['x-telegram-init-data']) {
    request.telegramUser = { id: 123456789, first_name: 'Dev', username: 'devuser' };
    request.dbUserId = await upsertUser(request.telegramUser);
    return;
  }

  const initData = request.headers['x-telegram-init-data'];
  if (typeof initData !== 'string') {
    return reply.unauthorized('Missing Telegram initData');
  }

  const validated = validateInitData(initData, config.BOT_TOKEN);
  if (!validated) {
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
