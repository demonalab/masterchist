import { BotContext } from './types';
import { mainMenuKeyboard, backToMainKeyboard } from './keyboards';

export async function handleStart(ctx: BotContext) {
  ctx.session.step = 'idle';

  await ctx.reply(
    `👋 <b>Добро пожаловать!</b>

Сервис аренды наборов для химчистки.

Выберите услугу:`,
    { parse_mode: 'HTML', reply_markup: mainMenuKeyboard }
  );
}

export async function handleProCleaning(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `👔 <b>Профессиональная химчистка</b>

⚠️ Каркас. В production здесь будет форма описания загрязнений.`,
    { parse_mode: 'HTML', reply_markup: backToMainKeyboard }
  );
}

export async function handleCleaning(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `🏠 <b>Клининг</b>

Услуга в разработке.`,
    { parse_mode: 'HTML', reply_markup: backToMainKeyboard }
  );
}

export async function handleBackToMain(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  ctx.session.step = 'idle';
  await ctx.reply('Выберите услугу:', { reply_markup: mainMenuKeyboard });
}

export async function handleCancel(ctx: BotContext) {
  await ctx.answerCallbackQuery('Отменено');
  ctx.session.step = 'idle';
  await ctx.reply('❌ Отменено.', { reply_markup: mainMenuKeyboard });
}
