import { MaxApi, MaxUpdate, InlineButton } from './max-api';
import { config } from './config';

const api = new MaxApi();

const persistentMenu: InlineButton[][] = [
  [{ type: 'callback', text: '🧹 Химчистка (самообслуживание)', payload: 'service:self_cleaning' }],
  [
    { type: 'callback', text: '👔 Проф. химчистка', payload: 'service:pro_cleaning' },
    { type: 'callback', text: '🏠 Клининг', payload: 'service:cleaning' },
  ],
  [
    { type: 'callback', text: '📋 Мои заказы', payload: 'my_orders' },
    { type: 'callback', text: '❓ Помощь', payload: 'help' },
  ],
  [{ type: 'callback', text: '🏠 Главное меню', payload: 'main_menu' }],
];

const cityKeyboard: InlineButton[][] = [
  [{ type: 'callback', text: 'Ростов-на-Дону', payload: 'city:ROSTOV_NA_DONU' }],
  [{ type: 'callback', text: 'Батайск', payload: 'city:BATAYSK' }],
  [{ type: 'callback', text: 'Ставрополь', payload: 'city:STAVROPOL' }],
  [{ type: 'callback', text: '« Назад', payload: 'main_menu' }],
];

async function handleStart(chatId: number) {
  const welcomeText = `👋 <b>Добро пожаловать в МастерЧист!</b>

<b>Сервис аренды наборов для химчистки.</b>

Выберите услугу 👇`;

  await api.sendMessage(chatId, welcomeText, persistentMenu);
}

async function handleSelfCleaning(chatId: number) {
  const promoText = `🧹 <b>Химчистка самообслуживания</b>

💰 <b>АКЦИЯ: 1500 ₽ за сутки</b>
🎁 Сушилка и химия в подарок!

📍 Выберите город:`;

  await api.sendMessage(chatId, promoText, cityKeyboard);
}

async function handleProCleaning(chatId: number) {
  const text = `👔 <b>Профессиональная химчистка</b>

Опишите загрязнения и отправьте фото.
Мастер свяжется с вами для оценки.`;

  await api.sendMessage(chatId, text, [[{ type: 'callback', text: '« Назад', payload: 'main_menu' }]]);
}

async function handleCleaning(chatId: number) {
  const text = `🏠 <b>Клининг</b>

Услуга в разработке.`;

  await api.sendMessage(chatId, text, [[{ type: 'callback', text: '« Назад', payload: 'main_menu' }]]);
}

async function handleHelp(chatId: number) {
  const text = `❓ <b>Помощь</b>

🧹 <b>Химчистка самообслуживания</b> — аренда набора для чистки мебели

👔 <b>Проф. химчистка</b> — мастер приедет и почистит

🏠 <b>Клининг</b> — уборка помещений

📞 Контакт: @MasterChist_support`;

  await api.sendMessage(chatId, text, [[{ type: 'callback', text: '« Назад', payload: 'main_menu' }]]);
}

async function handleMyOrders(chatId: number) {
  const text = `📋 У вас пока нет заказов.`;
  await api.sendMessage(chatId, text, [[{ type: 'callback', text: '« Назад', payload: 'main_menu' }]]);
}

async function handleUpdate(update: MaxUpdate) {
  try {
    if (update.update_type === 'message_created' && update.message) {
      const chatId = update.message.recipient.chat_id;
      const text = update.message.body.text?.toLowerCase() || '';

      if (text === '/start' || text === 'start' || text === 'начать') {
        await handleStart(chatId);
      }
    }

    if (update.update_type === 'message_callback' && update.callback) {
      const chatId = update.callback.message?.recipient.chat_id;
      if (!chatId) return;

      await api.answerCallback(update.callback.callback_id);

      const payload = update.callback.payload;

      switch (payload) {
        case 'main_menu':
          await handleStart(chatId);
          break;
        case 'service:self_cleaning':
          await handleSelfCleaning(chatId);
          break;
        case 'service:pro_cleaning':
          await handleProCleaning(chatId);
          break;
        case 'service:cleaning':
          await handleCleaning(chatId);
          break;
        case 'help':
          await handleHelp(chatId);
          break;
        case 'my_orders':
          await handleMyOrders(chatId);
          break;
        default:
          if (payload.startsWith('city:')) {
            const city = payload.replace('city:', '');
            await api.sendMessage(chatId, `📅 Вы выбрали: ${city}\n\nДля продолжения бронирования используйте Telegram-бота или мини-приложение.`, 
              [[{ type: 'callback', text: '« Назад', payload: 'main_menu' }]]);
          }
      }
    }
  } catch (err) {
    console.error('Error handling update:', err);
  }
}

async function startPolling() {
  console.log('MAX Bot starting with long polling...');
  
  const me = await api.getMe();
  console.log(`Bot info: ${me.name} (@${me.username})`);

  let marker: number | undefined;

  while (true) {
    try {
      const result = await api.getUpdates(marker, 30);
      console.log(`Got ${result.updates?.length || 0} updates, marker: ${result.marker}`);
      
      if (result.updates && result.updates.length > 0) {
        for (const update of result.updates) {
          console.log('Update:', JSON.stringify(update));
          await handleUpdate(update);
        }
      }
      
      if (result.marker) {
        marker = result.marker;
      }
    } catch (err) {
      console.error('Polling error:', err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

startPolling().catch(console.error);
