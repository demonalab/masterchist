import { Bot, session, BotError, GrammyError, HttpError } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { BotContext, SessionData } from './types';
import { config } from './config';
import { handleStart, handleProCleaning, handleCleaning, handleBackToMain, handleCancel } from './handlers';
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
