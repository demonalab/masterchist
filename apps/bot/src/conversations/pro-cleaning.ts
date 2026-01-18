import type { Conversation } from '@grammyjs/conversations';
import type { BotContext } from '../types';
import { mainMenuKeyboard, cancelKeyboard, cityKeyboard } from '../keyboards';
import { config } from '../config';
import { botInstance } from '../handlers/payment-proof';

const CITY_NAMES: Record<string, string> = {
  ROSTOV_NA_DONU: 'Ростов-на-Дону',
  BATAYSK: 'Батайск',
  STAVROPOL: 'Ставрополь',
};

export async function proCleaningConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext
) {
  // Reset draft
  ctx.session.draft = {};

  await ctx.reply(
    `👔 <b>Профессиональная химчистка</b>

Мастер приедет к вам и профессионально почистит мебель, ковры или другие изделия.`,
    { parse_mode: 'HTML' }
  );

  // Step 1: City selection
  await ctx.reply('📍 Выберите город:', { reply_markup: cityKeyboard });

  const cityCtx = await conversation.waitForCallbackQuery(/^city:|^back:main$/);
  await cityCtx.answerCallbackQuery();

  if (cityCtx.callbackQuery.data === 'back:main') {
    return;
  }

  const city = cityCtx.callbackQuery.data.replace('city:', '');
  const cityName = CITY_NAMES[city] ?? city;

  // Step 2: Address input
  await ctx.reply('🏠 Введите адрес (улица, дом, квартира):', { reply_markup: cancelKeyboard });

  const addressCtx = await conversation.waitFor('message:text');
  const address = addressCtx.message.text.trim();

  // Step 3: Contact name
  await ctx.reply('👤 Введите ваше имя:', { reply_markup: cancelKeyboard });

  const nameCtx = await conversation.waitFor('message:text');
  const contactName = nameCtx.message.text.trim();

  // Step 4: Contact phone
  await ctx.reply('📞 Введите номер телефона:', { reply_markup: cancelKeyboard });

  const phoneCtx = await conversation.waitFor('message:text');
  const contactPhone = phoneCtx.message.text.trim();

  // Step 5: Description
  await ctx.reply('📝 Опишите загрязнения (что нужно почистить, тип пятен и т.д.):', { reply_markup: cancelKeyboard });

  const descriptionCtx = await conversation.waitFor('message:text');
  const description = descriptionCtx.message.text.trim();

  // Step 6: Photo/Video/Document
  await ctx.reply('📸 Отправьте фото или видео загрязнений (jpg, png, mp4, mov и др.):', { reply_markup: cancelKeyboard });

  const mediaCtx = await conversation.wait();
  const photos = mediaCtx.message?.photo;
  const video = mediaCtx.message?.video;
  const document = mediaCtx.message?.document;

  const caption = `👔 <b>Заявка на проф. химчистку</b>

🏙 Город: ${cityName}
📍 Адрес: ${address}
👤 Имя: ${contactName}
📞 Телефон: ${contactPhone}
🆔 Telegram ID: ${ctx.from?.id}

📝 <b>Описание:</b>
${description}`;

  // Send to admin based on media type
  if (config.ADMIN_TELEGRAM_ID && botInstance) {
    try {
      if (photos && photos.length > 0) {
        const largestPhoto = photos[photos.length - 1];
        if (largestPhoto) {
          await botInstance.api.sendPhoto(config.ADMIN_TELEGRAM_ID, largestPhoto.file_id, {
            caption,
            parse_mode: 'HTML',
          });
        }
      } else if (video) {
        await botInstance.api.sendVideo(config.ADMIN_TELEGRAM_ID, video.file_id, {
          caption,
          parse_mode: 'HTML',
        });
      } else if (document) {
        await botInstance.api.sendDocument(config.ADMIN_TELEGRAM_ID, document.file_id, {
          caption,
          parse_mode: 'HTML',
        });
      } else {
        // No media - just send text
        await botInstance.api.sendMessage(config.ADMIN_TELEGRAM_ID, caption, {
          parse_mode: 'HTML',
        });
      }
    } catch (err) {
      console.error('Failed to send pro cleaning request to admin:', err);
    }
  }

  await ctx.reply(
    `✅ <b>Заявка отправлена!</b>

🏙 Город: ${cityName}
📍 Адрес: ${address}
👤 Имя: ${contactName}
📞 Телефон: ${contactPhone}

Мастер свяжется с вами для оценки стоимости и согласования времени.

Спасибо! 🙏`,
    { parse_mode: 'HTML', reply_markup: mainMenuKeyboard }
  );
}
