import { Bot } from 'grammy';
import { BotContext } from '../types';
import { ApiClient } from '../api-client';
import { backToMainKeyboard, mainMenuKeyboard } from '../keyboards';
import { config } from '../config';
import { notifyAdminAboutPayment } from './admin';

let botInstance: Bot<BotContext> | null = null;

export function setBotInstance(bot: Bot<BotContext>): void {
  botInstance = bot;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export async function handlePaymentProof(ctx: BotContext) {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('❌ Ошибка: не удалось определить пользователя.');
    return;
  }

  // Find pending booking from API - only handle as payment proof if status is AWAITING_PREPAYMENT
  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);
  const pendingResult = await api.getPendingBooking();
  
  // Only process as payment proof if there's a booking awaiting prepayment
  if (!pendingResult.ok || !pendingResult.data || pendingResult.data.status !== 'awaiting_prepayment') {
    // Not a payment proof - ignore silently (might be photo for pro cleaning description)
    return;
  }

  const bookingId = pendingResult.data.id;

  let fileId: string | undefined;
  let fileName = 'receipt';
  let mimeType = 'image/jpeg';

  if (ctx.message?.photo) {
    const photos = ctx.message.photo;
    const largestPhoto = photos[photos.length - 1];
    fileId = largestPhoto?.file_id;
    mimeType = 'image/jpeg';
    fileName = 'receipt.jpg';
  } else if (ctx.message?.document) {
    const doc = ctx.message.document;
    fileId = doc.file_id;
    mimeType = doc.mime_type ?? 'application/octet-stream';
    fileName = doc.file_name ?? 'receipt';
  }

  if (!fileId) {
    await ctx.reply('❌ Не удалось получить файл. Попробуйте ещё раз.');
    return;
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    await ctx.reply(
      '❌ Неподдерживаемый формат файла.\n\nРазрешены: JPEG, PNG, WebP, PDF'
    );
    return;
  }

  await ctx.reply('⏳ Загружаю чек...');

  try {
    const file = await ctx.api.getFile(fileId);
    const filePath = file.file_path;

    if (!filePath) {
      await ctx.reply('❌ Не удалось получить файл от Telegram.');
      return;
    }

    const fileUrl = `https://api.telegram.org/file/bot${config.BOT_TOKEN}/${filePath}`;
    const fileResponse = await fetch(fileUrl);

    if (!fileResponse.ok) {
      await ctx.reply('❌ Ошибка загрузки файла от Telegram.');
      return;
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const result = await api.uploadPaymentProof(bookingId, fileBuffer, fileName, mimeType);

    if (!result.ok) {
      let errorMsg: string;

      switch (result.status) {
        case 400:
          errorMsg = `❌ ${result.error}`;
          break;
        case 403:
          errorMsg = '❌ Нет доступа к этому бронированию.';
          break;
        case 404:
          errorMsg = '❌ Бронирование не найдено.';
          ctx.session.pendingBookingId = undefined;
          break;
        default:
          errorMsg = result.status >= 500
            ? '⚠️ Сервер временно недоступен. Попробуйте позже.'
            : `❌ Ошибка: ${result.error}`;
      }

      await ctx.reply(errorMsg, { reply_markup: backToMainKeyboard });
      return;
    }

    ctx.session.pendingBookingId = undefined;

    await ctx.reply(
      `✅ <b>Чек получен!</b>

Ваше бронирование переведено в статус "Оплачено".
Ожидайте подтверждения от администратора.

Мы свяжемся с вами для уточнения деталей доставки.

Спасибо! 🙏`,
      { parse_mode: 'HTML', reply_markup: mainMenuKeyboard }
    );

    if (botInstance) {
      const bookingResult = await api.getBooking(bookingId);
      if (bookingResult.ok) {
        await notifyAdminAboutPayment(botInstance, bookingResult.data, fileId);
      }
    }
  } catch (err) {
    console.error('Payment proof upload error:', err);
    await ctx.reply('❌ Произошла ошибка. Попробуйте позже.', {
      reply_markup: backToMainKeyboard,
    });
  }
}
