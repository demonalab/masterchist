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

const WEBAPP_URL = 'https://xn--80akjkwedee1c.xn--p1ai';

function welcomeKeyboard() {
  return Keyboard.inlineKeyboard([
    [Keyboard.button.link('Otkryt prilozhenie', WEBAPP_URL)],
  ]);
}

export function createBot() {
  const bot = new Bot(config.BOT_TOKEN);
  botInstance = bot;

  bot.command('start', async (ctx) => {
    const welcomeText = `Dobro pozhalovat v MasterChist!

Servis arendy naborov dlya himchistki mebeli

Chem my pomogem:
- Himchistka samoobsluzhivaniya - arenda nabora na sutki
- Prof. himchistka - master priedet k vam

Akciya: 1500 rub/sutki

Zkmite knopku nishe chtoby otkryt prilozhenie:`;

    await ctx.reply(welcomeText, { attachments: [welcomeKeyboard()] });
  });

  bot.on('message_created', async (ctx) => {
    const message = ctx.message as any;
    const text = message?.body?.text || '';
    if (text.startsWith('/')) return;
    await ctx.reply('Dlya oformleniya zakaza nazhmite knopku nishe:', { attachments: [welcomeKeyboard()] });
  });

  bot.on('message_callback', async (ctx) => {
    await ctx.reply('Nazhmite knopku Otkryt prilozhenie:', { attachments: [welcomeKeyboard()] });
  });

  return bot;
}