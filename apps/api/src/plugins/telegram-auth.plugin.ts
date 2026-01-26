import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { prisma } from '@himchistka/db';
import { validateInitData, isInitDataExpired, TelegramUser } from '../lib/telegram-auth';
import { config } from '../config';

const JWT_SECRET = config.JWT_SECRET;

declare module 'fastify' {
  interface FastifyRequest {
    telegramUser?: TelegramUser;
    dbUserId?: string;
  }
}

async function upsertUser(tgUser: TelegramUser, isMax: boolean = false): Promise<string> {
  if (isMax) {
    // MAX user - use maxId field to avoid conflicts with Telegram IDs
    const existing = await prisma.user.findFirst({
      where: { maxId: String(tgUser.id) },
      select: { id: true },
    });
    
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: tgUser.first_name ?? null,
        },
      });
      return existing.id;
    }
    
    // Check if there's a Telegram user with same ID (user may have both TG and MAX with same numeric ID)
    // In this case, add maxId to existing user instead of creating new one
    const telegramUser = await prisma.user.findFirst({
      where: { telegramId: String(tgUser.id) },
      select: { id: true, maxId: true },
    });
    
    if (telegramUser && !telegramUser.maxId) {
      // Link MAX to existing Telegram user
      await prisma.user.update({
        where: { id: telegramUser.id },
        data: { maxId: String(tgUser.id) },
      });
      console.log(`Linked MAX ID ${tgUser.id} to existing Telegram user ${telegramUser.id}`);
      return telegramUser.id;
    }
    
    const user = await prisma.user.create({
      data: {
        maxId: String(tgUser.id),
        firstName: tgUser.first_name ?? null,
      },
      select: { id: true },
    });
    return user.id;
  }
  
  // Telegram user - use telegramId
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
  const initDataHeader = request.headers['x-telegram-init-data'] as string | undefined;
  console.log(`Auth hook: initData length=${initDataHeader?.length || 0}, hasAuthHeader=${!!request.headers.authorization}`);
  
  // JWT Authorization header - for phone-authenticated users (MAX)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      if (decoded?.userId) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, firstName: true, username: true, telegramId: true, maxId: true },
        });
        if (user) {
          request.dbUserId = user.id;
          // Use telegramId or maxId for admin checks (whichever exists)
          const numericId = user.telegramId ? Number(user.telegramId) : (user.maxId ? Number(user.maxId) : 0);
          request.telegramUser = { id: numericId, first_name: user.firstName || 'User', username: user.username || undefined };
          return;
        }
      }
    } catch (err) {
      // Token invalid, continue to other auth methods
    }
  }

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
    request.dbUserId = await upsertUser(maxUser, true); // isMax = true
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

  // Try MAX initData format (has ip field or chat with type DIALOG - MAX specific)
  const params = new URLSearchParams(initData);
  const chatParam = params.get('chat');
  const hasMaxChat = chatParam && chatParam.includes('"type"') && chatParam.includes('DIALOG');
  const isMaxFormat = params.has('ip') || hasMaxChat || params.has('query_id');
  
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
        request.dbUserId = await upsertUser(user, true); // isMax = true
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

  console.log(`Telegram auth: user.id=${validated.user.id}, first_name=${validated.user.first_name}`);
  request.telegramUser = validated.user;
  request.dbUserId = await upsertUser(validated.user);
  console.log(`Telegram auth: dbUserId=${request.dbUserId}`);
};

const telegramAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('telegramAuthHook', telegramAuthHook);
};

export default fp(telegramAuthPlugin, { name: 'telegram-auth' });
