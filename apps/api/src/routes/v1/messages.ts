import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@himchistka/db';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';
import { notifyUserAllChannels } from '../../lib/user-notifications';
import { config } from '../../config';

async function notifyAdminsAboutMessage(shortId: string, senderName: string, text: string) {
  const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_ID || '').split(',').map(id => id.trim()).filter(Boolean);
  const msg = `💬 <b>Новое сообщение по заказу ${shortId}</b>\n\nОт: ${senderName}\n\n${text.substring(0, 500)}`;

  if (config.BOT_TOKEN) {
    for (const adminId of ADMIN_IDS) {
      try {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: adminId, text: msg, parse_mode: 'HTML' }),
        });
      } catch {}
    }
  }

  const MAX_ADMIN = process.env.MAX_ADMIN_USER_ID || '';
  if (config.MAX_BOT_TOKEN && MAX_ADMIN) {
    try {
      await fetch(`https://platform-api.max.ru/messages?user_id=${MAX_ADMIN}`, {
        method: 'POST',
        headers: { 'Authorization': config.MAX_BOT_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.replace(/<[^>]+>/g, '') }),
      });
    } catch {}
  }
}

async function checkIsAdmin(telegramOrMaxId: string): Promise<boolean> {
  const SUPER_ADMIN_IDS = (process.env.ADMIN_TELEGRAM_ID || '').split(',').map(id => id.trim()).filter(Boolean);
  const FALLBACK = ['8468584965', '1152185834', '1447933960', '18782420'];
  const MAX_ADMIN = process.env.MAX_ADMIN_USER_ID || '';
  const allAdmins = [...new Set([...SUPER_ADMIN_IDS, ...FALLBACK, MAX_ADMIN].filter(Boolean))];
  if (allAdmins.includes(telegramOrMaxId)) return true;
  const admin = await prisma.admin.findFirst({ where: { telegramId: telegramOrMaxId, isActive: true } });
  return !!admin;
}

const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  // === Публичный эндпоинт для ботов (без auth) ===
  fastify.post<{ Body: { telegramId?: string; maxId?: string; text: string } }>('/from-bot', async (request, reply) => {
    const { telegramId, maxId, text } = request.body || {};
    if (!text?.trim()) return reply.badRequest('Текст обязателен');
    if (!telegramId && !maxId) return reply.badRequest('telegramId или maxId обязателен');

    let user;
    if (telegramId) user = await prisma.user.findFirst({ where: { telegramId }, select: { id: true, firstName: true } });
    if (!user && maxId) user = await prisma.user.findFirst({ where: { maxId }, select: { id: true, firstName: true } });
    if (!user) return reply.notFound('Пользователь не найден');

    const booking = await prisma.booking.findFirst({
      where: { userId: user.id, status: { in: ['new', 'awaiting_prepayment', 'prepaid', 'confirmed'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!booking) return { saved: false, reason: 'no_active_booking' };

    const senderName = user.firstName || 'Клиент';
    const created = await prisma.message.create({
      data: { bookingId: booking.id, sender: 'client', senderName, text: text.trim() },
    });

    const shortId = booking.id.substring(0, 8).toUpperCase();
    notifyAdminsAboutMessage(shortId, senderName, text.trim()).catch(console.error);
    return { saved: true, messageId: created.id, bookingId: booking.id };
  });

  // === Защищённые роуты (требуют авторизацию) ===
  fastify.register(async (auth) => {
    auth.addHook('preHandler', telegramAuthHook);

    // Получить сообщения по заказу
    auth.get<{ Params: { bookingId: string } }>('/:bookingId', async (request, reply) => {
      const { bookingId } = request.params;
      const dbUserId = request.dbUserId;

      const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true } });
      if (!booking) return reply.notFound('Заказ не найден');

      const isOwner = booking.userId === dbUserId;
      const isAdmin = request.telegramUser?.id ? await checkIsAdmin(String(request.telegramUser.id)) : false;
      if (!isOwner && !isAdmin) return reply.forbidden('Нет доступа');

      const messages = await prisma.message.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' } });

      const markReadSender = isAdmin ? 'client' : 'admin';
      await prisma.message.updateMany({
        where: { bookingId, sender: markReadSender as any, isRead: false },
        data: { isRead: true },
      });

      return messages;
    });

    // Отправить сообщение по заказу
    auth.post<{ Params: { bookingId: string }; Body: { text: string } }>('/:bookingId', async (request, reply) => {
      const { bookingId } = request.params;
      const { text } = request.body || {};
      const dbUserId = request.dbUserId;

      if (!text?.trim()) return reply.badRequest('Текст сообщения обязателен');

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, userId: true, user: { select: { firstName: true } } },
      });
      if (!booking) return reply.notFound('Заказ не найден');

      const isOwner = booking.userId === dbUserId;
      const isAdmin = request.telegramUser?.id ? await checkIsAdmin(String(request.telegramUser.id)) : false;
      if (!isOwner && !isAdmin) return reply.forbidden('Нет доступа');

      const sender = isAdmin ? 'admin' : 'client';
      const senderName = isAdmin
        ? 'Администратор'
        : (request.telegramUser?.first_name || booking.user.firstName || 'Клиент');

      const message = await prisma.message.create({
        data: { bookingId, sender: sender as any, senderName, text: text.trim() },
      });

      const shortId = bookingId.substring(0, 8).toUpperCase();
      if (sender === 'admin') {
        const notifyText = `💬 <b>Сообщение по заказу ${shortId}</b>\n\n${text.trim().substring(0, 500)}`;
        notifyUserAllChannels({ userId: booking.userId, message: notifyText, parseMode: 'HTML' }).catch(console.error);
      } else {
        notifyAdminsAboutMessage(shortId, senderName, text.trim()).catch(console.error);
      }

      return message;
    });

    // Количество непрочитанных сообщений
    auth.get('/unread/count', async (request) => {
      const dbUserId = request.dbUserId;
      if (!dbUserId) return { count: 0 };

      const isAdmin = request.telegramUser?.id ? await checkIsAdmin(String(request.telegramUser.id)) : false;

      if (isAdmin) {
        const count = await prisma.message.count({ where: { sender: 'client', isRead: false } });
        return { count };
      } else {
        const count = await prisma.message.count({
          where: { sender: 'admin', isRead: false, booking: { userId: dbUserId } },
        });
        return { count };
      }
    });
  });
};

export default messagesRoutes;
