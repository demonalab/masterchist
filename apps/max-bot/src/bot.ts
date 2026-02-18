import { Bot, Keyboard } from '@maxhub/max-bot-api';
import { config } from './config';
import path from 'path';
import fs from 'fs';

const LOGO_GIF_PATH = path.join(__dirname, '../assets/logo.gif');

let botInstance: Bot | null = null;
let cachedImageToken: string | null = null;

// Manual upload to MAX API (library doesn't work for GIF)
async function uploadGifToMax(): Promise<string | null> {
  try {
    // Step 1: Get upload URL
    const uploadUrlRes = await fetch('https://platform-api.max.ru/uploads?type=image', {
      method: 'POST',
      headers: { 'Authorization': config.BOT_TOKEN },
    });
    const uploadUrlData = await uploadUrlRes.json() as { url?: string };
    console.log('MAX upload URL response:', JSON.stringify(uploadUrlData));
    
    if (!uploadUrlData.url) {
      console.error('No upload URL received');
      return null;
    }
    
    // Step 2: Upload the file
    const fileBuffer = fs.readFileSync(LOGO_GIF_PATH);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'image/gif' });
    formData.append('data', blob, 'logo.gif');
    
    const uploadRes = await fetch(uploadUrlData.url, {
      method: 'POST',
      body: formData,
    });
    const uploadResult = await uploadRes.json() as { photos?: Record<string, { token: string }> };
    console.log('MAX file upload response:', JSON.stringify(uploadResult));
    
    // Extract token from photos object
    if (uploadResult.photos) {
      const photoIds = Object.keys(uploadResult.photos);
      const firstPhotoId = photoIds[0];
      if (firstPhotoId && uploadResult.photos[firstPhotoId]) {
        const token = uploadResult.photos[firstPhotoId].token;
        console.log('MAX image token extracted:', token?.substring(0, 30) + '...');
        return token;
      }
    }
    return null;
  } catch (err) {
    console.error('uploadGifToMax error:', err);
    return null;
  }
}

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

// Deep link to open Mini App inside MAX (using bot ID)
const WEBAPP_DEEPLINK = 'https://max.ru/id616485389776_bot?startapp';

function welcomeKeyboard() {
  return Keyboard.inlineKeyboard([
    [Keyboard.button.link('🚀 Открыть приложение', WEBAPP_DEEPLINK)],
  ]);
}

async function sendWelcomeMessage(userId: string) {
  const welcomeText = `👋 Добро пожаловать в МастерЧист!

🧹 Сервис химчистки мебели

Что мы предлагаем:
• Химчистка самообслуживания — оборудование на сутки
• Профессиональная химчистка — мастер приедет к вам

💰 Акция: 1500 ₽/сутки
🎁 Сушка мебели и химия в подарок!

📱 Нажмите кнопку ниже, чтобы открыть приложение:`;

  try {
    const keyboard = welcomeKeyboard();
    const res = await fetch(`${config.MAX_API_URL}/messages?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': config.BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text: welcomeText, 
        format: 'html',
        attachments: [keyboard],
      }),
    });
    if (!res.ok) {
      console.error('sendWelcomeMessage failed:', await res.text());
    } else {
      console.log('sendWelcomeMessage succeeded for user:', userId);
    }
  } catch (err) {
    console.error('sendWelcomeMessage error:', err);
  }
}

export function createBot() {
  const bot = new Bot(config.BOT_TOKEN);
  botInstance = bot;

  bot.command('start', async (ctx) => {
    const welcomeText = `👋 Добро пожаловать в МастерЧист!

🧹 Сервис химчистки мебели

Что мы предлагаем:
• Химчистка самообслуживания — оборудование на сутки
• Профессиональная химчистка — мастер приедет к вам

💰 Акция: 1500 ₽/сутки
🎁 Сушка мебели и химия в подарок!

📱 Нажмите кнопку ниже, чтобы открыть приложение:`;

    // Upload GIF and send with welcome message
    try {
      if (!cachedImageToken) {
        console.log('Uploading GIF from:', LOGO_GIF_PATH);
        cachedImageToken = await uploadGifToMax();
      }
      if (cachedImageToken) {
        await ctx.reply(welcomeText, { 
          attachments: [
            { type: 'image', payload: { token: cachedImageToken } },
            welcomeKeyboard()
          ] 
        });
        console.log('ctx.reply succeeded with GIF');
      } else {
        // Send without GIF if upload failed
        await ctx.reply(welcomeText, { attachments: [welcomeKeyboard()] });
        console.log('ctx.reply succeeded without GIF');
      }
    } catch (err) {
      console.error('ctx.reply failed:', err);
      await ctx.reply(welcomeText, { attachments: [welcomeKeyboard()] });
    }
  });

  bot.command('stats', async (ctx) => {
    const message = ctx.message as any;
    const userId = message?.sender?.user_id;
    if (!userId) return;

    try {
      const res = await fetch(`${config.API_BASE_URL}/api/v1/admin/stats`, {
        headers: { 'x-max-user-id': String(userId) },
      });
      
      if (!res.ok) {
        await ctx.reply('❌ Нет доступа к статистике (только для админов)');
        return;
      }
      
      const stats = await res.json() as any;
      const statsText = `📈 Статистика

📊 Всего заказов: ${stats.totalBookings}
🆕 Новых: ${stats.newBookings}
⏳ Ожидают предоплаты: ${stats.awaitingPrepaymentBookings}
💳 Предоплачено: ${stats.prepaidBookings}
✅ Подтверждено: ${stats.confirmedBookings}
❌ Отменено: ${stats.cancelledBookings}

👥 Пользователи
📱 Всего: ${stats.totalUsers ?? 0}
💬 Telegram: ${stats.telegramUsers ?? 0}
💜 MAX: ${stats.maxUsers ?? 0}`;

      await ctx.reply(statsText);
    } catch (err) {
      console.error('Stats error:', err);
      await ctx.reply('❌ Ошибка при загрузке статистики');
    }
  });

  bot.on('message_created', async (ctx) => {
    const message = ctx.message as any;
    const text = message?.body?.text || '';
    if (text.startsWith('/')) return;

    // Сохранить сообщение клиента в чат по заказу
    const userId = message?.sender?.user_id;
    if (userId && text.trim()) {
      try {
        const res = await fetch(`${config.API_BASE_URL}/api/v1/messages/from-bot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxId: String(userId), text: text.trim() }),
        });
        const result = await res.json() as { saved?: boolean };

        if (result.saved) {
          await ctx.reply('✅ Сообщение отправлено администратору. Ответ придёт сюда.', { attachments: [welcomeKeyboard()] });
          return;
        }
      } catch (err) {
        console.error('Failed to save message from MAX bot:', err);
      }
    }

    await ctx.reply('👋 Для оформления заказа нажмите кнопку ниже:', { attachments: [welcomeKeyboard()] });
  });

  bot.on('message_callback', async (ctx) => {
    await ctx.reply('📱 Нажмите кнопку "Открыть приложение":', { attachments: [welcomeKeyboard()] });
  });

  // Handle first-time bot start (when user clicks "Start" button for the first time)
  bot.on('bot_started', async (ctx) => {
    const update = ctx.update as any;
    console.log('bot_started event received, user_id:', update?.user_id, 'chat_id:', update?.chat_id);
    
    const welcomeText = `👋 Добро пожаловать в МастерЧист!

🧹 Сервис химчистки мебели

Что мы предлагаем:
• Химчистка самообслуживания — оборудование на сутки
• Профессиональная химчистка — мастер приедет к вам

💰 Акция: 1500 ₽/сутки
🎁 Сушка мебели и химия в подарок!

📱 Нажмите кнопку ниже, чтобы открыть приложение:`;

    try {
      // Upload GIF and send with welcome message
      if (!cachedImageToken) {
        console.log('Uploading GIF from:', LOGO_GIF_PATH);
        cachedImageToken = await uploadGifToMax();
      }
      if (cachedImageToken) {
        await ctx.reply(welcomeText, { 
          attachments: [
            { type: 'image', payload: { token: cachedImageToken } },
            welcomeKeyboard()
          ] 
        });
        console.log('bot_started: ctx.reply succeeded with GIF');
      } else {
        // Send without GIF if upload failed
        await ctx.reply(welcomeText, { attachments: [welcomeKeyboard()] });
        console.log('bot_started: ctx.reply succeeded without GIF');
      }
    } catch (err) {
      console.error('bot_started: ctx.reply failed:', err);
      
      // Fallback: send message without GIF
      const userId = update?.user_id || update?.user?.user_id;
      if (userId) {
        console.log('bot_started: trying direct API send to user:', userId);
        await sendWelcomeMessage(String(userId));
      }
    }
  });

  return bot;
}