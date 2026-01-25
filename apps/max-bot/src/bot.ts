import { Bot, Keyboard } from '@maxhub/max-bot-api';
import { config } from './config';

let botInstance: Bot | null = null;

export function getBotInstance(): Bot | null {
  return botInstance;
}

export async function sendMessageToUser(userId: string, text: string) {
  try {
    const res = await fetch(`${config.MAX_API_URL}/messages?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': config.BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, format: 'html' }),
    });
    if (!res.ok) {
      console.error('Failed to send message:', await res.text());
    }
  } catch (err) {
    console.error('Failed to send message to user:', err);
  }
}

// Deep link to open Mini App inside MAX
const WEBAPP_DEEPLINK = 'https://max.ru/MasterChist_bot?startapp';

function welcomeKeyboard() {
  return Keyboard.inlineKeyboard([
    [Keyboard.button.link('🚀 Открыть приложение', WEBAPP_DEEPLINK)],
  ]);
}

export function createBot() {
  const bot = new Bot(config.BOT_TOKEN);
  botInstance = bot;

  bot.command('start', async (ctx) => {
    const welcomeText = `👋 Добро пожаловать в МастерЧист!

🧹 Сервис аренды наборов для химчистки мебели

Что мы предлагаем:
• Химчистка самообслуживания — аренда набора на сутки
• Профессиональная химчистка — мастер приедет к вам

💰 Акция: 1500 ₽/сутки
🎁 Сушка мебели и химия в подарок!

📱 Нажмите кнопку ниже, чтобы открыть приложение:`;

    await ctx.reply(welcomeText, { attachments: [welcomeKeyboard()] });
  });

  bot.on('message_created', async (ctx) => {
    const message = ctx.message as any;
    const text = message?.body?.text || '';
    if (text.startsWith('/')) return;
    await ctx.reply('👋 Для оформления заказа нажмите кнопку ниже:', { attachments: [welcomeKeyboard()] });
  });

  bot.on('message_callback', async (ctx) => {
    await ctx.reply('📱 Нажмите кнопку "Открыть приложение":', { attachments: [welcomeKeyboard()] });
  });

  return bot;
}