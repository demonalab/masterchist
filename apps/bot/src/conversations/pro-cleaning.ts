import type { Conversation } from '@grammyjs/conversations';
import type { BotContext } from '../types';
import { mainMenuKeyboard } from '../keyboards';
import { config } from '../config';
import { botInstance } from '../handlers/payment-proof';

export async function proCleaningConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext
) {
  await ctx.reply(
    `👔 <b>Профессиональная химчистка</b>

Опишите загрязнения (что нужно почистить, тип пятен и т.д.):`,
    { parse_mode: 'HTML' }
  );

  const descriptionCtx = await conversation.wait();
  const description = descriptionCtx.message?.text;

  if (!description) {
    await ctx.reply('❌ Пожалуйста, отправьте текстовое описание.', {
      reply_markup: mainMenuKeyboard,
    });
    return;
  }

  await ctx.reply('📸 Теперь отправьте фото загрязнений:');

  const photoCtx = await conversation.wait();
  const photos = photoCtx.message?.photo;

  if (!photos || photos.length === 0) {
    await ctx.reply('❌ Пожалуйста, отправьте фото.', {
      reply_markup: mainMenuKeyboard,
    });
    return;
  }

  const largestPhoto = photos[photos.length - 1];
  if (!largestPhoto) {
    await ctx.reply('❌ Ошибка при обработке фото.', {
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  const fileId = largestPhoto.file_id;

  // Send to admin
  if (config.ADMIN_TELEGRAM_ID && botInstance) {
    const userName = ctx.from?.first_name || 'Клиент';
    const userPhone = ctx.from?.username ? `@${ctx.from.username}` : 'не указан';

    try {
      await botInstance.api.sendPhoto(config.ADMIN_TELEGRAM_ID, fileId, {
        caption: `🧹 <b>Заявка на проф. химчистку</b>

👤 Клиент: ${userName}
📱 Контакт: ${userPhone}
🆔 Telegram ID: ${ctx.from?.id}

📝 <b>Описание:</b>
${description}`,
        parse_mode: 'HTML',
      });
    } catch (err) {
      console.error('Failed to send pro cleaning request to admin:', err);
    }
  }

  await ctx.reply(
    `✅ <b>Заявка отправлена!</b>

Мастер свяжется с вами для оценки стоимости и согласования времени.

Спасибо! 🙏`,
    { parse_mode: 'HTML', reply_markup: mainMenuKeyboard }
  );
}
