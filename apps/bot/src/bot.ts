import { Bot, session, BotError, GrammyError, HttpError } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { BotContext, SessionData } from './types';
import { config } from './config';
import { handleStart, handleProCleaning, handleCleaning, handleBackToMain, handleCancel } from './handlers';
import { selfCleaningConversation } from './conversations/self-cleaning';

function createInitialSessionData(): SessionData {
  return {
    step: 'idle',
  };
}

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.BOT_TOKEN);

  bot.use(
    session({
      initial: createInitialSessionData,
    })
  );

  bot.use(conversations());
  bot.use(createConversation(selfCleaningConversation));

  bot.command('start', handleStart);

  bot.callbackQuery('service:self_cleaning', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('selfCleaningConversation');
  });

  bot.callbackQuery('service:pro_cleaning', handleProCleaning);
  bot.callbackQuery('service:cleaning', handleCleaning);

  bot.callbackQuery('back:main', handleBackToMain);
  bot.callbackQuery('cancel', handleCancel);

  bot.callbackQuery(/^city:/, async (ctx) => {
    await ctx.answerCallbackQuery('Используйте /start для начала');
  });

  bot.callbackQuery(/^slot:/, async (ctx) => {
    await ctx.answerCallbackQuery('Используйте /start для начала');
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
