import { Conversation } from '@grammyjs/conversations';
import { BotContext } from '../types';
import {
  cityKeyboard,
  mockTimeSlotsKeyboard,
  cancelKeyboard,
  confirmKeyboard,
  backToMainKeyboard,
} from '../keyboards';

export async function selfCleaningConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext
) {
  // Step 1: City selection
  await ctx.reply('📍 Выберите город:', { reply_markup: cityKeyboard });

  const cityCtx = await conversation.waitForCallbackQuery(/^city:|^back:main$/);
  await cityCtx.answerCallbackQuery();

  if (cityCtx.callbackQuery.data === 'back:main') {
    return;
  }

  const city = cityCtx.callbackQuery.data.replace('city:', '');
  ctx.session.step = 'awaiting_date';

  // Step 2: Date input
  await ctx.reply('📅 Введите дату (ГГГГ-ММ-ДД):', { reply_markup: cancelKeyboard });

  const dateCtx = await conversation.waitFor('message:text');
  const dateText = dateCtx.message.text.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    await ctx.reply('❌ Неверный формат даты.', { reply_markup: backToMainKeyboard });
    return;
  }

  ctx.session.step = 'awaiting_slot';

  // Step 3: Time slot selection (mock data)
  await ctx.reply('🕐 Выберите время:', { reply_markup: mockTimeSlotsKeyboard });

  const slotCtx = await conversation.waitForCallbackQuery(/^slot:|^back:date$/);
  await slotCtx.answerCallbackQuery();

  if (slotCtx.callbackQuery.data === 'back:date') {
    return;
  }

  if (slotCtx.callbackQuery.data === 'slot:unavailable') {
    await ctx.reply('❌ Этот слот недоступен.', { reply_markup: backToMainKeyboard });
    return;
  }

  ctx.session.step = 'awaiting_address';

  // Step 4: Address input
  await ctx.reply('🏠 Введите адрес (улица, дом, квартира):', { reply_markup: cancelKeyboard });

  const addressCtx = await conversation.waitFor('message:text');
  const address = addressCtx.message.text.trim();

  ctx.session.step = 'awaiting_contact_name';

  // Step 5: Contact name
  await ctx.reply('👤 Введите ваше имя:', { reply_markup: cancelKeyboard });

  const nameCtx = await conversation.waitFor('message:text');
  const contactName = nameCtx.message.text.trim();

  ctx.session.step = 'awaiting_contact_phone';

  // Step 6: Contact phone
  await ctx.reply('📞 Введите номер телефона:', { reply_markup: cancelKeyboard });

  const phoneCtx = await conversation.waitFor('message:text');
  const contactPhone = phoneCtx.message.text.trim();

  ctx.session.step = 'awaiting_confirmation';

  // Step 7: Confirmation
  await ctx.reply(
    `📋 <b>Проверьте данные:</b>

🏙 Город: ${city}
📅 Дата: ${dateText}
📍 Адрес: ${address}
👤 Имя: ${contactName}
📞 Телефон: ${contactPhone}

Всё верно?`,
    { parse_mode: 'HTML', reply_markup: confirmKeyboard }
  );

  const confirmCtx = await conversation.waitForCallbackQuery(/^confirm:/);
  await confirmCtx.answerCallbackQuery();

  if (confirmCtx.callbackQuery.data === 'confirm:no') {
    await ctx.reply('❌ Бронирование отменено.', { reply_markup: backToMainKeyboard });
    ctx.session.step = 'idle';
    return;
  }

  // Step 8: Success (skeleton - no API call)
  ctx.session.step = 'idle';

  await ctx.reply(
    `✅ <b>Данные приняты!</b>

⚠️ Это каркас бота. Бронирование НЕ создано.
В production здесь будет вызов API.`,
    { parse_mode: 'HTML', reply_markup: backToMainKeyboard }
  );
}
