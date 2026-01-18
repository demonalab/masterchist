import { Bot, session, BotError, GrammyError, HttpError } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { BotContext, SessionData } from './types';
import { config } from './config';
import { handleStart, handleProCleaning, handleCleaning, handleBackToMain, handleCancel, handleMyOrders } from './handlers';
import { selfCleaningConversation } from './conversations/self-cleaning';
import { proCleaningConversation } from './conversations/pro-cleaning';
import { handlePaymentProof, setBotInstance } from './handlers/payment-proof';
import { handleAdminConfirm, handleAdminReject } from './handlers/admin';

function createInitialSessionData(): SessionData {
  return {
    draft: {},
  };
}

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.BOT_TOKEN);

  setBotInstance(bot);

  bot.use(
    session({
      initial: createInitialSessionData,
      getSessionKey: (ctx) => {
        const chatId = ctx.chat?.id ?? ctx.from?.id;
        if (!chatId) return undefined;
        return String(chatId);
      },
    })
  );

  bot.use(conversations());
  bot.use(createConversation(selfCleaningConversation));
  bot.use(createConversation(proCleaningConversation));

  bot.command('start', handleStart);

  bot.callbackQuery('service:self_cleaning', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('selfCleaningConversation');
  });

  bot.callbackQuery('service:pro_cleaning', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('proCleaningConversation');
  });
  bot.callbackQuery('service:cleaning', handleCleaning);

  bot.callbackQuery('back:main', handleBackToMain);
  bot.callbackQuery('cancel', handleCancel);

  bot.callbackQuery(/^city:/, async (ctx) => {
    await ctx.answerCallbackQuery('Используйте /start для начала');
  });

  bot.callbackQuery(/^slot:/, async (ctx) => {
    await ctx.answerCallbackQuery('Используйте /start для начала');
  });

  bot.on('message:photo', handlePaymentProof);
  bot.on('message:document', handlePaymentProof);

  bot.callbackQuery(/^admin:confirm:/, handleAdminConfirm);
  bot.callbackQuery(/^admin:reject:/, handleAdminReject);

  // Text button handlers (persistent keyboard)
  bot.hears('🧹 Химчистка (самообслуживание)', async (ctx) => {
    await ctx.conversation.enter('selfCleaningConversation');
  });

  bot.hears('👔 Проф. химчистка', async (ctx) => {
    await ctx.conversation.enter('proCleaningConversation');
  });

  bot.hears('🏠 Клининг', handleCleaning);

  bot.hears('📋 Мои заказы', handleMyOrders);

  bot.hears('🏠 Главное меню', handleStart);

  bot.hears('❓ Помощь', async (ctx) => {
    await ctx.reply(
      `❓ <b>Помощь</b>

🧹 <b>Химчистка самообслуживания</b> — аренда набора для чистки мебели

👔 <b>Проф. химчистка</b> — мастер приедет и почистит

🏠 <b>Клининг</b> — уборка помещений

📞 Контакт: @MasterChist_support`,
      { parse_mode: 'HTML' }
    );
  });

  // Admin commands
  bot.command('admin', async (ctx) => {
    if (String(ctx.from?.id) !== config.ADMIN_TELEGRAM_ID) {
      return;
    }
    await ctx.reply(
      `👨‍💼 <b>Админ-панель</b>

/orders — список заказов
/stats — статистика`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('orders', async (ctx) => {
    if (String(ctx.from?.id) !== config.ADMIN_TELEGRAM_ID) {
      return;
    }
    await ctx.reply('📋 Для просмотра заказов используйте веб-панель: https://xn--80akjnwedee1c.xn--p1ai/admin');
  });

  bot.catch((err: BotError<BotContext>) => {
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
