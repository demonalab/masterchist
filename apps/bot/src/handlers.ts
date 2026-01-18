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
