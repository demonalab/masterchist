import { prisma } from '@himchistka/db';
import { config } from '../config';

function formatDateRu(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

interface NotifyUserOptions {
  userId: string;
  message: string;
  parseMode?: 'HTML' | 'Markdown';
}

export async function notifyUserAllChannels(options: NotifyUserOptions): Promise<void> {
  const { userId, message, parseMode = 'HTML' } = options;

  try {
    // Get user with all linked accounts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, telegramId: true, maxId: true, phone: true },
    });

    if (!user) return;

    const telegramIds: string[] = [];
    const maxIds: string[] = [];

    // Add current user's IDs
    if (user.telegramId) telegramIds.push(user.telegramId);
    if (user.maxId) maxIds.push(user.maxId);

    // If user has phone, find all linked accounts
    if (user.phone) {
      const linkedUsers = await prisma.user.findMany({
        where: { phone: user.phone, id: { not: userId } },
        select: { telegramId: true, maxId: true },
      });

      for (const linked of linkedUsers) {
        if (linked.telegramId && !telegramIds.includes(linked.telegramId)) {
          telegramIds.push(linked.telegramId);
        }
        if (linked.maxId && !maxIds.includes(linked.maxId)) {
          maxIds.push(linked.maxId);
        }
      }
    }

    // Send to Telegram
    if (config.BOT_TOKEN && telegramIds.length > 0) {
      for (const chatId of telegramIds) {
        try {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: parseMode,
            }),
          });
        } catch (err) {
          console.error(`Failed to send Telegram notification to ${chatId}:`, err);
        }
      }
    }

    // Send to MAX
    console.log(`MAX notification check: token=${!!config.MAX_BOT_TOKEN}, maxIds=${maxIds.join(',')}`);
    if (config.MAX_BOT_TOKEN && maxIds.length > 0) {
      for (const chatId of maxIds) {
        try {
          const maxRes = await fetch(`https://platform-api.max.ru/messages?user_id=${chatId}`, {
            method: 'POST',
            headers: { 
              'Authorization': config.MAX_BOT_TOKEN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: message,
              format: parseMode === 'HTML' ? 'html' : 'text',
            }),
          });
          const maxResText = await maxRes.text();
          console.log(`MAX notification to ${chatId}: status=${maxRes.status}, response=${maxResText}`);
        } catch (err) {
          console.error(`Failed to send MAX notification to ${chatId}:`, err);
        }
      }
    }

    console.log(`User notifications sent: TG=${telegramIds.join(',')}, MAX=${maxIds.join(',')}`);
  } catch (err) {
    console.error('Failed to notify user:', err);
  }
}

const INSTRUCTION_VIDEO_URL = 'https://xn--80akjnwedee1c.xn--p1ai/instruction.mp4';

export async function sendVideoInstruction(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, telegramId: true, maxId: true, phone: true },
    });

    if (!user) return;

    const telegramIds: string[] = [];
    const maxIds: string[] = [];

    if (user.telegramId) telegramIds.push(user.telegramId);
    if (user.maxId) maxIds.push(user.maxId);

    if (user.phone) {
      const linkedUsers = await prisma.user.findMany({
        where: { phone: user.phone, id: { not: userId } },
        select: { telegramId: true, maxId: true },
      });
      for (const linked of linkedUsers) {
        if (linked.telegramId && !telegramIds.includes(linked.telegramId)) {
          telegramIds.push(linked.telegramId);
        }
        if (linked.maxId && !maxIds.includes(linked.maxId)) {
          maxIds.push(linked.maxId);
        }
      }
    }

    const caption = '📹 <b>Видеоинструкция</b>\n\nКак пользоваться аппаратом для химчистки и химией. Сохраните это видео!';

    // Send video to Telegram
    if (config.BOT_TOKEN && telegramIds.length > 0) {
      for (const chatId of telegramIds) {
        try {
          await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/sendVideo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              video: INSTRUCTION_VIDEO_URL,
              caption,
              parse_mode: 'HTML',
            }),
          });
          console.log(`Video instruction sent to Telegram ${chatId}`);
        } catch (err) {
          console.error(`Failed to send video to Telegram ${chatId}:`, err);
        }
      }
    }

    // Send video link to MAX (as text with link since MAX video upload is complex)
    if (config.MAX_BOT_TOKEN && maxIds.length > 0) {
      const maxMessage = `📹 Видеоинструкция\n\nКак пользоваться аппаратом для химчистки и химией.\n\n▶️ Смотреть: ${INSTRUCTION_VIDEO_URL}`;
      for (const chatId of maxIds) {
        try {
          await fetch(`https://platform-api.max.ru/messages?user_id=${chatId}`, {
            method: 'POST',
            headers: {
              'Authorization': config.MAX_BOT_TOKEN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: maxMessage }),
          });
          console.log(`Video instruction sent to MAX ${chatId}`);
        } catch (err) {
          console.error(`Failed to send video to MAX ${chatId}:`, err);
        }
      }
    }

    console.log(`Video instruction sent: TG=${telegramIds.join(',')}, MAX=${maxIds.join(',')}`);
  } catch (err) {
    console.error('Failed to send video instruction:', err);
  }
}

export async function notifyBookingStatusChange(
  bookingId: string,
  newStatus: string,
  statusMessage: string
): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        scheduledDate: true,
        cleaningKit: { select: { number: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
        service: { select: { title: true } },
      },
    });

    if (!booking) return;

    const date = booking.scheduledDate
      ? formatDateRu(booking.scheduledDate)
      : '—';

    const message = `${statusMessage}

📋 Заказ: <code>${booking.id.slice(0, 8).toUpperCase()}</code>
🧹 ${booking.service?.title ?? 'Химчистка'}
📅 ${date}
🕐 ${booking.timeSlot?.startTime ?? '—'} - ${booking.timeSlot?.endTime ?? '—'}`;

    await notifyUserAllChannels({
      userId: booking.userId,
      message,
    });
  } catch (err) {
    console.error('Failed to notify about booking status change:', err);
  }
}
