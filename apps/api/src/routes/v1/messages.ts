import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@himchistka/db';
import { telegramAuthHook } from '../../plugins/telegram-auth.plugin';
import { notifyUserAllChannels } from '../../lib/user-notifications';
import { config } from '../../config';

// Уведомить админов о новом сообщении от клиента
async function notifyAdminsAboutMessage(bookingId: string, shortId: string, senderName: string, text: string) {
  const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_ID || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  const message = `💬 <b>Новое сообщение по заказу ${shortId}</b>\n\nОт: ${senderName}\n\n${text.substring(0, 500)}`;

  // Telegram
  if (config.BOT_TOKEN) {
    for (const adminId of ADMIN_IDS) {
      try {
        await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: adminId, text: message, parse_mode: 'HTML' }),
        });
      } catch {}
    }
  }

  // MAX
  const MAX_ADMIN_USER_ID = process.env.MAX_ADMIN_USER_ID || '';
  if (config.MAX_BOT_TOKEN && MAX_ADMIN_USER_ID) {
    try {
      await fetch(`https://platform-api.max.ru/messages?user_id=${MAX_ADMIN_USER_ID}`, {
        method: 'POST',
        headers: { 'Authorization': config.MAX_BOT_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.replace(/<[^>]+>/g, '') }),
      });
    } catch {}
  }
}

const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', telegramAuthHook);

  // Получить сообщения по заказу
  fastify.get<{ Params: { bookingId: string } }>('/:bookingId', async (request, reply) => {
    const { bookingId } = request.params;
    const dbUserId = request.dbUserId;

    // Проверяем что пользователь — владелец заказа или админ
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true },
    });

    if (!booking) return reply.notFound('Заказ не найден');

    const isOwner = booking.userId === dbUserId;
    const isAdmin = request.telegramUser?.id
      ? await checkIsAdmin(String(request.telegramUser.id))
      : false;

    if (!isOwner && !isAdmin) {
      return reply.forbidden('Нет доступа');
    }

    const messages = await prisma.message.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });

    // Пометить сообщения как прочитанные
    const markReadSender = isAdmin ? 'client' : 'admin';
    await prisma.message.updateMany({
      where: { bookingId, sender: markReadSender as any, isRead: false },
      data: { isRead: true },
    });

    return messages;
  });

  // Отправить сообщение по заказу
  fastify.post<{ Params: { bookingId: string }; Body: { text: string } }>('/:bookingId', async (request, reply) => {
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
    const isAdmin = request.telegramUser?.id
      ? await checkIsAdmin(String(request.telegramUser.id))
      : false;

    if (!isOwner && !isAdmin) {
      return reply.forbidden('Нет доступа');
    }

    const sender = isAdmin ? 'admin' : 'client';
    const senderName = isAdmin
      ? 'Администратор'
      : (request.telegramUser?.first_name || booking.user.firstName || 'Клиент');

    const message = await prisma.message.create({
      data: {
        bookingId,
        sender: sender as any,
        senderName,
        text: text.trim(),
      },
    });

    const shortId = bookingId.substring(0, 8).toUpperCase();

    // Уведомления
    if (sender === 'admin') {
      // Админ пишет → уведомить клиента через TG/MAX
      const notifyText = `💬 <b>Сообщение по заказу ${shortId}</b>\n\n${text.trim().substring(0, 500)}`;
      notifyUserAllChannels({ userId: booking.userId, message: notifyText, parseMode: 'HTML' }).catch(console.error);
    } else {
      // Клиент пишет → уведомить админов
      notifyAdminsAboutMessage(bookingId, shortId, senderName, text.trim()).catch(console.error);
    }

    return message;
  });

  // Количество непрочитанных сообщений для пользователя
  fastify.get('/unread/count', async (request) => {
    const dbUserId = request.dbUserId;
    if (!dbUserId) return { count: 0 };

    const isAdmin = request.telegramUser?.id
      ? await checkIsAdmin(String(request.telegramUser.id))
      : false;

    if (isAdmin) {
      // Для админа — непрочитанные от клиентов
      const count = await prisma.message.count({
        where: { sender: 'client', isRead: false },
      });
      return { count };
    } else {
      // Для клиента — непрочитанные от админа по его заказам
      const count = await prisma.message.count({
        where: {
          sender: 'admin',
          isRead: false,
          booking: { userId: dbUserId },
        },
      });
      return { count };
    }
  });
};

async function checkIsAdmin(telegramOrMaxId: string): Promise<boolean> {
  const SUPER_ADMIN_IDS = (process.env.ADMIN_TELEGRAM_ID || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  const FALLBACK = ['8468584965', '1152185834', '1447933960', '18782420'];
  const MAX_ADMIN = process.env.MAX_ADMIN_USER_ID || '';

  const allAdmins = [...new Set([...SUPER_ADMIN_IDS, ...FALLBACK, MAX_ADMIN].filter(Boolean))];
  if (allAdmins.includes(telegramOrMaxId)) return true;

  const admin = await prisma.admin.findFirst({
    where: { telegramId: telegramOrMaxId, isActive: true },
  });
  return !!admin;
}

export default messagesRoutes;
