import { Bot, Context, InlineKeyboard } from 'grammy';
import { ApiClient } from '../api-client';
import { config } from '../config';
import { notifyAdminAboutPayment } from './admin';

const WEBAPP_URL = 'https://xn--80akjnwedee1c.xn--p1ai';

function welcomeKeyboard() {
  return new InlineKeyboard().webApp('🚀 Открыть приложение', WEBAPP_URL);
}

export let botInstance: Bot<Context> | null = null;

export function setBotInstance(bot: Bot<Context>): void {
  botInstance = bot;
}

// Payment proof handling is now done via Mini App
// This handler just redirects users to the app
export async function handlePaymentProof(ctx: Context) {
  // Redirect to Mini App for any photo/document
  await ctx.reply('📱 Для загрузки чека используйте приложение:', {
    reply_markup: welcomeKeyboard(),
  });
}
