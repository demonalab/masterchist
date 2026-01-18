import { Bot, InlineKeyboard } from 'grammy';
import { BotContext } from '../types';
import { ApiClient, BookingDetails } from '../api-client';
import { config } from '../config';
import { mainMenuKeyboard } from '../keyboards';

export function isAdmin(telegramId: number): boolean {
  if (!config.ADMIN_TELEGRAM_ID) return false;
  return String(telegramId) === config.ADMIN_TELEGRAM_ID;
}

export function buildAdminBookingKeyboard(bookingId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Подтвердить', `admin:confirm:${bookingId}`)
    .text('❌ Отклонить', `admin:reject:${bookingId}`);
}

export function formatAdminNotification(booking: BookingDetails): string {
  const date = booking.scheduledDate
    ? new Date(booking.scheduledDate).toISOString().split('T')[0]
    : '—';

  return `💰 <b>Получен чек предоплаты</b>

📋 Booking ID: <code>${booking.id}</code>
📅 Дата: ${date}
🕐 Время: ${booking.timeSlot?.startTime ?? '—'} - ${booking.timeSlot?.endTime ?? '—'}
🧹 Набор: #${booking.cleaningKit?.number ?? '—'}

👤 Клиент: ${booking.address?.contactName ?? '—'}
📞 Телефон: ${booking.address?.contactPhone ?? '—'}
📍 Адрес: ${booking.address?.addressLine ?? '—'}

Статус: ⏳ Ожидает подтверждения`;
}

export async function notifyAdminAboutPayment(
  bot: Bot<BotContext>,
  booking: BookingDetails
): Promise<void> {
  if (!config.ADMIN_TELEGRAM_ID) {
    console.log('ADMIN_TELEGRAM_ID not set, skipping admin notification');
    return;
  }

  try {
    await bot.api.sendMessage(
      config.ADMIN_TELEGRAM_ID,
      formatAdminNotification(booking),
      {
        parse_mode: 'HTML',
        reply_markup: buildAdminBookingKeyboard(booking.id),
      }
    );
  } catch (err) {
    console.error('Failed to notify admin:', err);
  }
}

export async function handleAdminConfirm(ctx: BotContext): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !isAdmin(telegramId)) {
    await ctx.answerCallbackQuery('Нет доступа');
    return;
  }

  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const bookingId = data.replace('admin:confirm:', '');

  await ctx.answerCallbackQuery('Подтверждаю...');

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.confirmBooking(bookingId);

  if (!result.ok) {
    await ctx.editMessageText(
      `❌ Ошибка подтверждения:\n${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  await ctx.editMessageText(
    `✅ <b>Бронирование подтверждено</b>\n\nID: <code>${bookingId}</code>\nСтатус: confirmed`,
    { parse_mode: 'HTML' }
  );

  try {
    await ctx.api.sendMessage(
      result.data.userTelegramId,
      `✅ <b>Оплата подтверждена!</b>

Ваш заказ принят в работу.
Набор будет доставлен в указанное время.

Спасибо, что выбрали нас! 🙏`,
      { parse_mode: 'HTML', reply_markup: mainMenuKeyboard }
    );
  } catch (err) {
    console.error('Failed to notify user about confirmation:', err);
  }
}

export async function handleAdminReject(ctx: BotContext): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !isAdmin(telegramId)) {
    await ctx.answerCallbackQuery('Нет доступа');
    return;
  }

  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const bookingId = data.replace('admin:reject:', '');

  await ctx.answerCallbackQuery('Отклоняю...');

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const result = await api.rejectBooking(bookingId);

  if (!result.ok) {
    await ctx.editMessageText(
      `❌ Ошибка отклонения:\n${result.error}`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  await ctx.editMessageText(
    `❌ <b>Бронирование отклонено</b>\n\nID: <code>${bookingId}</code>\nСтатус: cancelled\nСлот освобождён`,
    { parse_mode: 'HTML' }
  );

  try {
    await ctx.api.sendMessage(
      result.data.userTelegramId,
      `❌ <b>Оплата отклонена</b>

К сожалению, мы не смогли подтвердить вашу оплату.
Слот освобождён для других клиентов.

Если это ошибка, свяжитесь с нами или создайте новое бронирование.`,
      { parse_mode: 'HTML', reply_markup: mainMenuKeyboard }
    );
  } catch (err) {
    console.error('Failed to notify user about rejection:', err);
  }
}
