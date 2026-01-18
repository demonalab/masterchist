import { InputFile } from 'grammy';
import * as path from 'path';
import { BotContext } from './types';
import { mainMenuKeyboard, backToMainKeyboard, persistentMenuKeyboard } from './keyboards';
import { ApiClient } from './api-client';

export async function handleStart(ctx: BotContext) {
  ctx.session.draft = {};

  // Send persistent keyboard first
  await ctx.reply('👋 Добро пожаловать в МастерЧист!', {
    reply_markup: persistentMenuKeyboard,
  });

  try {
    const animationPath = path.join(__dirname, '../assets/welcome.gif');
    await ctx.replyWithAnimation(new InputFile(animationPath), {
      caption: `<b>Сервис аренды наборов для химчистки.</b>

Выберите услугу в меню ниже 👇`,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('Failed to send welcome animation:', err);
    await ctx.reply(
      `<b>Сервис аренды наборов для химчистки.</b>

Выберите услугу в меню ниже 👇`,
      { parse_mode: 'HTML' }
    );
  }
}

export async function handleProCleaning(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `👔 <b>Профессиональная химчистка</b>

Опишите загрязнения и отправьте фото.
Мастер свяжется с вами для оценки.`,
    { parse_mode: 'HTML', reply_markup: backToMainKeyboard }
  );
}

export async function handleCleaning(ctx: BotContext) {
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }
  await ctx.reply(
    `🏠 <b>Клининг</b>

Услуга в разработке.`,
    { parse_mode: 'HTML', reply_markup: backToMainKeyboard }
  );
}

export async function handleBackToMain(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  ctx.session.draft = {};
  await ctx.reply('Выберите услугу:', { reply_markup: mainMenuKeyboard });
}

export async function handleCancel(ctx: BotContext) {
  await ctx.answerCallbackQuery('Отменено');
  ctx.session.draft = {};
  await ctx.reply('❌ Отменено.', { reply_markup: mainMenuKeyboard });
}

const STATUS_LABELS: Record<string, string> = {
  NEW: '🆕 Новый',
  AWAITING_PREPAYMENT: '⏳ Ожидает предоплаты',
  PREPAID: '💳 Предоплачен',
  CONFIRMED: '✅ Подтверждён',
  IN_PROGRESS: '🔄 В работе',
  COMPLETED: '✔️ Завершён',
  CANCELLED: '❌ Отменён',
};

export async function handleMyOrders(ctx: BotContext) {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('❌ Не удалось определить пользователя.');
    return;
  }

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.getMyBookings();

  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке заказов. Попробуйте позже.');
    return;
  }

  const bookings = result.data;
  if (bookings.length === 0) {
    await ctx.reply('📋 У вас пока нет заказов.');
    return;
  }

  let message = '📋 <b>Ваши заказы:</b>\n\n';
  for (const b of bookings) {
    const status = STATUS_LABELS[b.status] ?? b.status;
    const date = b.scheduledDate ?? '—';
    const time = b.timeSlot ?? '';
    const kit = b.kitNumber ? `набор №${b.kitNumber}` : '';
    const service = b.service ?? '';
    
    message += `${status}\n`;
    message += `📅 ${date} ${time}\n`;
    if (kit) message += `🧹 ${kit}\n`;
    if (service) message += `📌 ${service}\n`;
    message += '\n';
  }

  await ctx.reply(message.trim(), { parse_mode: 'HTML' });
}

// Admin handlers
import { adminMenuKeyboard, buildAdminOrderKeyboard } from './keyboards';
import { config } from './config';

function isAdmin(ctx: BotContext): boolean {
  return String(ctx.from?.id) === config.ADMIN_TELEGRAM_ID;
}

export async function handleAdminMenu(ctx: BotContext) {
  if (!isAdmin(ctx)) return;

  await ctx.reply(
    `👨‍💼 <b>Админ-панель</b>

Выберите действие:`,
    { parse_mode: 'HTML', reply_markup: adminMenuKeyboard }
  );
}

export async function handleAdminNewOrders(ctx: BotContext) {
  if (!isAdmin(ctx)) return;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.getAdminBookings('new');

  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке заказов.');
    return;
  }

  const bookings = result.data;
  if (bookings.length === 0) {
    await ctx.reply('📋 Новых заказов нет.');
    return;
  }

  for (const b of bookings) {
    const date = b.scheduledDate ?? '—';
    const time = b.timeSlot ?? '';
    const kit = b.kitNumber ? `набор №${b.kitNumber}` : '';
    const user = b.user ? `${b.user.firstName} (${b.user.telegramId})` : '—';
    const addr = b.address ? `${b.address.addressLine}\n📞 ${b.address.contactPhone}` : '—';

    const message = `🆕 <b>Новый заказ</b>

👤 ${user}
📅 ${date} ${time}
${kit ? `🧹 ${kit}\n` : ''}📍 ${addr}`;

    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: buildAdminOrderKeyboard(b.id) });
  }
}

export async function handleAdminAllOrders(ctx: BotContext) {
  if (!isAdmin(ctx)) return;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.getAdminBookings();

  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке заказов.');
    return;
  }

  const bookings = result.data;
  if (bookings.length === 0) {
    await ctx.reply('📋 Заказов нет.');
    return;
  }

  let message = '📊 <b>Все заказы (последние 50):</b>\n\n';
  for (const b of bookings.slice(0, 20)) {
    const status = STATUS_LABELS[b.status] ?? b.status;
    const date = b.scheduledDate ?? '—';
    const user = b.user?.firstName ?? '—';
    message += `${status} | ${date} | ${user}\n`;
  }

  await ctx.reply(message.trim(), { parse_mode: 'HTML' });
}

export async function handleAdminStats(ctx: BotContext) {
  if (!isAdmin(ctx)) return;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.getAdminStats();

  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке статистики.');
    return;
  }

  const stats = result.data;
  const message = `📈 <b>Статистика</b>

📊 Всего заказов: ${stats.totalBookings}
🆕 Новых: ${stats.newBookings}
💳 Предоплачено: ${stats.prepaidBookings ?? 0}
✅ Подтверждено: ${stats.confirmedBookings}
❌ Отменено: ${stats.cancelledBookings}`;

  await ctx.reply(message, { parse_mode: 'HTML' });
}
