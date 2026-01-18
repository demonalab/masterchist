import { Bot, session, BotError, GrammyError, HttpError } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { BotContext, SessionData } from './types';
import { config } from './config';
import { 
  handleStart, handleProCleaning, handleCleaning, handleBackToMain, handleCancel, handleMyOrders, 
  handleAdminMenu, handleAdminNewOrders, handleAdminAllOrders, handleAdminStats,
  handleAdminExport, handleExportPeriod, handleAdminManage, handleListAdmins,
  handleAddAdminPrompt, handleAddAdmin, handleRemoveAdmin, handleDeleteBooking
} from './handlers';
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
    await ctx.conversation.exit();
    await ctx.conversation.enter('selfCleaningConversation');
  });

  bot.hears('👔 Проф. химчистка', async (ctx) => {
    await ctx.conversation.exit();
    await ctx.conversation.enter('proCleaningConversation');
  });

  bot.hears('🏠 Клининг', async (ctx) => {
    await ctx.conversation.exit();
    await handleCleaning(ctx);
  });

  bot.hears('📋 Мои заказы', async (ctx) => {
    await ctx.conversation.exit();
    await handleMyOrders(ctx);
  });

  bot.hears('🏠 Главное меню', async (ctx) => {
    await ctx.conversation.exit();
    await handleStart(ctx);
  });

  bot.hears('❓ Помощь', async (ctx) => {
    await ctx.conversation.exit();
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
  bot.command('admin', handleAdminMenu);
  bot.hears('👨‍💼 Админка', handleAdminMenu);

  // Admin text buttons
  bot.hears('📋 Новые заказы', handleAdminNewOrders);
  bot.hears('📊 Все заказы', handleAdminAllOrders);
  bot.hears('📈 Статистика', handleAdminStats);
  bot.hears('📥 Экспорт', handleAdminExport);
  bot.hears('👥 Управление админами', handleAdminManage);
  bot.hears('👤 Выйти из админки', handleStart);

  // Admin inline callbacks
  bot.callbackQuery('admin:menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAdminMenu(ctx);
  });
  bot.callbackQuery('admin:new_orders', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAdminNewOrders(ctx);
  });
  bot.callbackQuery('admin:all_orders', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAdminAllOrders(ctx);
  });
  bot.callbackQuery('admin:stats', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAdminStats(ctx);
  });

  // Export callbacks
  bot.callbackQuery(/^export:(.+)$/, async (ctx) => {
    const period = ctx.match?.[1] ?? 'all';
    await handleExportPeriod(ctx, period);
  });

  // Admin management callbacks
  bot.callbackQuery('admin:manage', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAdminManage(ctx);
  });
  bot.callbackQuery('admin:add_admin', handleAddAdminPrompt);
  bot.callbackQuery('admin:list_admins', handleListAdmins);
  bot.callbackQuery(/^admin:remove:(.+)$/, async (ctx) => {
    const adminId = ctx.match?.[1];
    if (adminId) await handleRemoveAdmin(ctx, adminId);
  });

  // Delete booking callback (super admin)
  bot.callbackQuery(/^admin:delete:(.+)$/, async (ctx) => {
    const bookingId = ctx.match?.[1];
    if (bookingId) await handleDeleteBooking(ctx, bookingId);
  });

  // Handle text input for adding admin
  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.awaitingAdminId && /^\d+$/.test(ctx.message.text)) {
      await handleAddAdmin(ctx, ctx.message.text);
      return;
    }
    await next();
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
