import { Conversation } from '@grammyjs/conversations';
import { InputFile } from 'grammy';
import * as path from 'path';
import { BotContext } from '../types';
import { ApiClient } from '../api-client';
import {
  cityKeyboard,
  buildTimeSlotsKeyboard,
  cancelKeyboard,
  confirmKeyboard,
  backToMainKeyboard,
  retrySlotKeyboard,
} from '../keyboards';
import { getCurrentCalendar, buildCalendarKeyboard, parseCalendarCallback } from '../calendar';
import { startConversationTracking, completeConversationTracking } from '../services/reminder';

const CITY_NAMES: Record<string, string> = {
  ROSTOV_NA_DONU: 'Ростов-на-Дону',
  BATAYSK: 'Батайск',
  STAVROPOL: 'Ставрополь',
};

export async function selfCleaningConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext
) {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('❌ Ошибка: не удалось определить пользователя.');
    return;
  }

  const api = new ApiClient(telegramId, ctx.from?.first_name, ctx.from?.username);

  // Track conversation start for reminders
  await startConversationTracking(telegramId, 'self_cleaning');

  // Reset draft
  ctx.session.draft = {};

  // Send promo image
  try {
    const promoPath = path.join(__dirname, '../../assets/IMG_20260118_212814.png');
    await ctx.replyWithPhoto(new InputFile(promoPath), {
      caption: `🧹 <b>Химчистка самообслуживания</b>

💰 <b>АКЦИЯ: 1500 ₽ за сутки</b>
🎁 Сушилка и химия в подарок!`,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('Failed to send promo image:', err);
  }

  // Step 1: City selection
  await ctx.reply('📍 Выберите город:', { reply_markup: cityKeyboard });

  const cityCtx = await conversation.waitForCallbackQuery(/^city:|^back:main$/);
  await cityCtx.answerCallbackQuery();

  if (cityCtx.callbackQuery.data === 'back:main') {
    return;
  }

  const city = cityCtx.callbackQuery.data.replace('city:', '');
  ctx.session.draft.city = city;

  // Step 2-3: Date and slot selection (with back:date support)
  let scheduledDate = '';
  let displayDate = '';
  let timeSlotId = '';
  let timeSlotLabel = '';

  dateSelection: while (true) {
    // Date selection via calendar
    await ctx.reply('📅 Выберите дату:', { reply_markup: getCurrentCalendar() });

    while (true) {
      const calCtx = await conversation.waitForCallbackQuery(/^cal:|^cancel$/);
      await calCtx.answerCallbackQuery();
      
      if (calCtx.callbackQuery.data === 'cancel') {
        await ctx.reply('❌ Отменено.', { reply_markup: backToMainKeyboard });
        return;
      }
      
      const parsed = parseCalendarCallback(calCtx.callbackQuery.data);
      
      if (parsed.action === 'ignore') {
        continue;
      }
      
      if (parsed.action === 'prev' && parsed.year && parsed.month !== undefined) {
        let newMonth = parsed.month - 1;
        let newYear = parsed.year;
        if (newMonth < 0) {
          newMonth = 11;
          newYear--;
        }
        await calCtx.editMessageReplyMarkup({ reply_markup: buildCalendarKeyboard(newYear, newMonth) });
        continue;
      }
      
      if (parsed.action === 'next' && parsed.year && parsed.month !== undefined) {
        let newMonth = parsed.month + 1;
        let newYear = parsed.year;
        if (newMonth > 11) {
          newMonth = 0;
          newYear++;
        }
        await calCtx.editMessageReplyMarkup({ reply_markup: buildCalendarKeyboard(newYear, newMonth) });
        continue;
      }
      
      if (parsed.action === 'date' && parsed.date) {
        scheduledDate = parsed.date;
        const [y, m, d] = scheduledDate.split('-');
        displayDate = `${d}.${m}.${y}`;
        await calCtx.editMessageText(`📅 Выбрана дата: ${displayDate}`);
        break;
      }
    }

    ctx.session.draft.scheduledDate = scheduledDate;

    // Fetch availability from API
    await ctx.reply('⏳ Загружаю доступные слоты...');

    const availResult = await api.getAvailability(city, scheduledDate, 'self_cleaning');

    if (!availResult.ok) {
      const errorMsg = availResult.status >= 500
        ? '⚠️ Сервер временно недоступен. Попробуйте позже.'
        : `❌ Ошибка: ${availResult.error}`;
      await ctx.reply(errorMsg, { reply_markup: backToMainKeyboard });
      return;
    }

    const slots = availResult.data;
    const availableSlots = slots.filter((s) => s.available);

    if (availableSlots.length === 0) {
      await ctx.reply('😔 На эту дату нет свободных слотов.', { reply_markup: backToMainKeyboard });
      return;
    }

    await ctx.reply('🕐 Выберите время:', { reply_markup: buildTimeSlotsKeyboard(slots) });

    const slotCtx = await conversation.waitForCallbackQuery(/^slot[|:]|^back:date$/);
    await slotCtx.answerCallbackQuery();

    if (slotCtx.callbackQuery.data === 'back:date') {
      continue dateSelection;
    }

    if (slotCtx.callbackQuery.data === 'slot:unavailable') {
      await ctx.reply('❌ Этот слот недоступен. Выберите другой.');
      continue dateSelection;
    }

    // Parse slot data: slot|uuid|HH:MM - HH:MM
    const slotParts = slotCtx.callbackQuery.data.split('|');
    timeSlotId = slotParts[1]!;
    timeSlotLabel = slotParts[2] ?? '';
    break dateSelection;
  }

  ctx.session.draft.timeSlotId = timeSlotId;
  ctx.session.draft.timeSlotLabel = timeSlotLabel;

  // Step 4: Address input
  await ctx.reply('🏠 Введите адрес (улица, дом, квартира):', { reply_markup: cancelKeyboard });

  const addressCtx = await conversation.waitFor('message:text');
  const address = addressCtx.message.text.trim();
  ctx.session.draft.address = address;

  // Step 5: Contact name
  await ctx.reply('👤 Введите ваше имя:', { reply_markup: cancelKeyboard });

  const nameCtx = await conversation.waitFor('message:text');
  const contactName = nameCtx.message.text.trim();
  ctx.session.draft.contactName = contactName;

  // Step 6: Contact phone
  await ctx.reply('📞 Введите номер телефона:', { reply_markup: cancelKeyboard });

  const phoneCtx = await conversation.waitFor('message:text');
  const contactPhone = phoneCtx.message.text.trim();
  ctx.session.draft.contactPhone = contactPhone;

  // Step 7: Confirmation
  const cityName = CITY_NAMES[city] ?? city;
  await ctx.reply(
    `📋 <b>Проверьте данные:</b>

🏙 Город: ${cityName}
📅 Дата: ${displayDate}
🕐 Время: ${timeSlotLabel}
📍 Адрес: ${address}
👤 Имя: ${contactName}
📞 Телефон: ${contactPhone}

Подтвердить бронирование?`,
    { parse_mode: 'HTML', reply_markup: confirmKeyboard }
  );

  const confirmCtx = await conversation.waitForCallbackQuery(/^confirm:/);
  await confirmCtx.answerCallbackQuery();

  if (confirmCtx.callbackQuery.data === 'confirm:no') {
    await ctx.reply('❌ Бронирование отменено.', { reply_markup: backToMainKeyboard });
    ctx.session.draft = {};
    return;
  }

  // Step 8: Create booking via API
  await ctx.reply('⏳ Создаю бронирование...');

  const addressParts = address.split(',').map((p) => p.trim());
  const street = addressParts[0] ?? address;
  const house = addressParts[1] ?? '1';
  const apartment = addressParts[2];

  const bookingResult = await api.createBooking({
    serviceCode: 'self_cleaning',
    city,
    scheduledDate,
    timeSlotId,
    address: {
      city: cityName,
      street,
      house,
      apartment,
    },
    contact: {
      name: contactName,
      phone: contactPhone,
    },
  });

  if (!bookingResult.ok) {
    if (bookingResult.status === 409) {
      await ctx.reply('⚠️ Слот уже занят. Выберите другой.', { reply_markup: retrySlotKeyboard });
    } else if (bookingResult.status >= 500) {
      await ctx.reply('⚠️ Сервер временно недоступен. Попробуйте позже.', { reply_markup: backToMainKeyboard });
    } else {
      await ctx.reply(`❌ Ошибка: ${bookingResult.error}`, { reply_markup: backToMainKeyboard });
    }
    return;
  }

  const booking = bookingResult.data;
  ctx.session.draft = {};
  ctx.session.pendingBookingId = booking.id;

  // Mark conversation as completed (no more reminders)
  await completeConversationTracking(telegramId, 'self_cleaning');

  await ctx.reply(
    `✅ <b>Бронирование создано!</b>

📋 ID: <code>${booking.id}</code>
🧹 Набор: #${booking.kitNumber}
📅 Дата: ${displayDate}
🕐 Время: ${booking.timeSlot.startTime} - ${booking.timeSlot.endTime}
📍 Адрес: ${booking.address.addressLine}

💳 <b>Для подтверждения внесите предоплату 500₽</b>

Реквизиты:
• Сбербанк: 1234 5678 9012 3456
• СБП: +7 (999) 123-45-67

📎 <b>Отправьте фото или PDF чека в этот чат.</b>`,
    { parse_mode: 'HTML' }
  );
}
