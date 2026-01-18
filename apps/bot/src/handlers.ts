import { InputFile } from 'grammy';
import * as path from 'path';
import { BotContext } from './types';
import { mainMenuKeyboard, backToMainKeyboard, persistentMenuKeyboard } from './keyboards';

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

Выберите услугу:`,
      parse_mode: 'HTML',
      reply_markup: mainMenuKeyboard,
    });
  } catch (err) {
    console.error('Failed to send welcome animation, trying image:', err);
    try {
      const imagePath = path.join(__dirname, '../assets/welcome.png');
      await ctx.replyWithPhoto(new InputFile(imagePath), {
        caption: `<b>Сервис аренды наборов для химчистки.</b>

Выберите услугу:`,
        parse_mode: 'HTML',
        reply_markup: mainMenuKeyboard,
      });
    } catch (imageErr) {
      console.error('Failed to send welcome image:', imageErr);
      // Fallback to text
      await ctx.reply(
        `<b>Сервис аренды наборов для химчистки.</b>

Выберите услугу:`,
        { parse_mode: 'HTML', reply_markup: mainMenuKeyboard }
      );
    }
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
