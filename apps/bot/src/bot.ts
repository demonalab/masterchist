import { Bot, InlineKeyboard, BotError, GrammyError, HttpError, Context, Keyboard, InputFile } from 'grammy';
import { config } from './config';
import { setBotInstance } from './handlers/payment-proof';
import { handleAdminConfirm, handleAdminReject } from './handlers/admin';
import path from 'path';

const WEBAPP_URL = 'https://xn--80akjnwedee1c.xn--p1ai';
const LOGO_VIDEO_PATH = path.join(__dirname, '../assets/logo.mp4');

function welcomeKeyboard() {
  return new InlineKeyboard()
    .webApp('🚀 Открыть приложение', WEBAPP_URL);
}

const WELCOME_TEXT = `👋 Добро пожаловать в МастерЧист!

🧹 Сервис химчистки мебели

Что мы предлагаем:
• Химчистка самообслуживания — оборудование на сутки
• Профессиональная химчистка — мастер приедет к вам

💰 Акция: 1500 ₽/сутки
🎁 Сушка мебели и химия в подарок!

📱 Нажмите кнопку ниже, чтобы открыть приложение:`;

export function createBot(): Bot<Context> {
  const bot = new Bot<Context>(config.BOT_TOKEN);

  setBotInstance(bot);

  // Welcome message on /start - first remove old keyboard, then show video with inline keyboard
  bot.command('start', async (ctx) => {
    // Remove old reply keyboard
    await ctx.reply('👋', {
      reply_markup: { remove_keyboard: true },
    });
    // Send looped video with welcome message
    await ctx.replyWithAnimation(new InputFile(LOGO_VIDEO_PATH), {
      caption: WELCOME_TEXT,
      reply_markup: welcomeKeyboard(),
    });
  });

  // Admin notification callbacks (for confirming/rejecting bookings)
  bot.callbackQuery(/^admin:confirm:/, handleAdminConfirm);
  bot.callbackQuery(/^admin:reject:/, handleAdminReject);

  // Any other message - redirect to Mini App
  bot.on('message', async (ctx) => {
    await ctx.reply('📱 Для оформления заказа нажмите кнопку ниже:', {
      reply_markup: welcomeKeyboard(),
    });
  });

  // Any callback query - redirect to Mini App
  bot.on('callback_query', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('📱 Нажмите кнопку "Открыть приложение":', {
      reply_markup: welcomeKeyboard(),
    });
  });

  bot.catch((err: BotError<Context>) => {
    const ctx = err.ctx;
    const e = err.error;

    console.error(`Error while handling update ${ctx.update.update_id}:`);

    if (e instanceof GrammyError) {
      console.error('Error in request:', e.description);
    } else if (e instanceof HttpError) {
      console.error('Could not contact Telegram:', e);
    } else {
      console.error('Unknown error:', e);
    }
  });

  return bot;
}
