import { Bot, Context, Keyboard } from '@maxhub/max-bot-api';
import { config } from './config';
import { ApiClient } from './api-client';
import { getState, setState, resetState, updateStateData, setStep, ConversationStep } from './state';

// Store bot instance for sending notifications
let botInstance: Bot | null = null;

export function getBotInstance(): Bot | null {
  return botInstance;
}

// Send message to user via MAX API (direct HTTP call)
async function sendMessageToUser(userId: string, text: string) {
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

// Notify admin about payment proof with booking details and buttons
async function notifyAdminAboutPayment(bookingId: string, userId: number, photoUrl?: string) {
  if (!config.ADMIN_USER_ID) return;
  try {
    // Get booking details
    const api = new ApiClient(Number(config.ADMIN_USER_ID));
    const bookingResult = await api.getBookingDetails(bookingId);
    
    let message = `💰 <b>Получен чек предоплаты!</b>\n\n`;
    
    if (bookingResult.ok && bookingResult.data) {
      const b = bookingResult.data;
      const date = b.scheduledDate || '—';
      const time = b.timeSlot ? `${b.timeSlot.startTime} - ${b.timeSlot.endTime}` : '';
      const kit = b.kitNumber ? `🧹 Набор №${b.kitNumber}` : '';
      const addr = b.address ? `📍 ${b.address.addressLine}\n📞 ${b.address.contactPhone}\n👤 ${b.address.contactName}` : '';
      
      message += `📋 ID: <code>${bookingId}</code>\n`;
      message += `📅 ${date} ${time}\n`;
      if (kit) message += `${kit}\n`;
      if (addr) message += `${addr}\n`;
    } else {
      message += `📋 Booking ID: <code>${bookingId}</code>\n👤 От пользователя: ${userId}\n`;
    }

    // Send message with inline keyboard via MAX API
    const keyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '✅ Подтвердить', payload: `admin:confirm:${bookingId}` },
            { type: 'callback', text: '❌ Отклонить', payload: `admin:reject:${bookingId}` },
          ],
          [{ type: 'callback', text: '🗑 Удалить', payload: `admin:delete:${bookingId}` }],
        ],
      },
    };

    const res = await fetch(`${config.MAX_API_URL}/messages?user_id=${config.ADMIN_USER_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': config.BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text: message, 
        format: 'html',
        attachments: [keyboard],
      }),
    });
    
    if (!res.ok) {
      console.error('Failed to send admin notification:', await res.text());
    }
    
    // Send payment proof photo separately
    if (photoUrl) {
      try {
        await fetch(`${config.MAX_API_URL}/messages?user_id=${config.ADMIN_USER_ID}`, {
          method: 'POST',
          headers: {
            'Authorization': config.BOT_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: '📸 Фото чека:',
            attachments: [{
              type: 'image',
              payload: { url: photoUrl },
            }],
          }),
        });
      } catch (err) {
        console.error('Failed to send payment proof photo:', err);
      }
    }
  } catch (err) {
    console.error('Failed to notify admin:', err);
  }
}

const CITIES = {
  ROSTOV_NA_DONU: 'Ростов-на-Дону',
  BATAYSK: 'Батайск',
  STAVROPOL: 'Ставрополь',
};

const STATUS_LABELS: Record<string, string> = {
  new: '🆕 Новый',
  awaiting_prepayment: '💳 Ожидает оплаты',
  prepaid: '✅ Оплачен',
  confirmed: '✅ Подтверждён',
  cancelled: '❌ Отменён',
};

function getDaysWithOffset(offset: number = 0) {
  const days = [];
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  
  const startDay = 1 + (offset * 7);
  for (let i = startDay; i < startDay + 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const date = d.toISOString().split('T')[0];
    const display = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
    days.push({ date, display });
  }
  return days;
}

function mainMenuKeyboard(showAdmin = false) {
  const rows = [
    [Keyboard.button.callback('🏠 Главное меню', 'back:main')],
    [Keyboard.button.callback('🧹 Химчистка самообслуживания', 'service:self_cleaning')],
    [
      Keyboard.button.callback('👔 Проф. химчистка', 'service:pro_cleaning'),
      Keyboard.button.callback('🏠 Клининг', 'service:cleaning'),
    ],
    [
      Keyboard.button.callback('📋 Мои заказы', 'my_orders'),
      Keyboard.button.callback('❓ Помощь', 'help'),
    ],
  ];
  
  if (showAdmin) {
    rows.push([Keyboard.button.callback('👨‍💼 Админка', 'admin:menu')]);
  }
  
  return Keyboard.inlineKeyboard(rows);
}

// Check if user is admin
async function isUserAdmin(userId: number): Promise<boolean> {
  const api = new ApiClient(userId);
  const result = await api.getAdminRole();
  return result.ok;
}

function cityKeyboard() {
  return Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🏙 Ростов-на-Дону', 'city:ROSTOV_NA_DONU')],
    [Keyboard.button.callback('🏙 Батайск', 'city:BATAYSK')],
    [Keyboard.button.callback('🏙 Ставрополь', 'city:STAVROPOL')],
    [Keyboard.button.callback('« Назад', 'back:main')],
  ]);
}

function dateKeyboard(dates: { date: string; display: string }[], weekOffset: number = 0) {
  const rows: any[][] = [];
  for (let i = 0; i < dates.length; i += 2) {
    const row = [Keyboard.button.callback(`📅 ${dates[i].display}`, `date:${dates[i].date}`)];
    if (dates[i + 1]) {
      row.push(Keyboard.button.callback(`📅 ${dates[i + 1].display}`, `date:${dates[i + 1].date}`));
    }
    rows.push(row);
  }
  // Pagination buttons
  const navRow = [];
  if (weekOffset > 0) {
    navRow.push(Keyboard.button.callback('« Пред. неделя', `week:${weekOffset - 1}`));
  }
  if (weekOffset < 3) { // Max 4 weeks ahead
    navRow.push(Keyboard.button.callback('След. неделя »', `week:${weekOffset + 1}`));
  }
  if (navRow.length > 0) {
    rows.push(navRow);
  }
  rows.push([Keyboard.button.callback('« Назад', 'back:city')]);
  return Keyboard.inlineKeyboard(rows);
}

function timeSlotsKeyboard(slots: { slotId: string; startTime: string; endTime: string; availableKits: number; availableKitNumber?: number }[]) {
  const rows = slots.map(slot => {
    const kitInfo = slot.availableKitNumber ? ` (набор №${slot.availableKitNumber})` : '';
    return [
      Keyboard.button.callback(
        `✅ ${slot.startTime} - ${slot.endTime}${kitInfo}`,
        `slot:${slot.slotId}:${slot.startTime}-${slot.endTime}`
      ),
    ];
  });
  rows.push([Keyboard.button.callback('« Выбрать другую дату', 'back:date')]);
  return Keyboard.inlineKeyboard(rows);
}

function cancelKeyboard() {
  return Keyboard.inlineKeyboard([
    [Keyboard.button.callback('❌ Отмена', 'cancel')],
  ]);
}

function confirmKeyboard() {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('✅ Подтвердить', 'confirm'),
      Keyboard.button.callback('❌ Отмена', 'cancel'),
    ],
  ]);
}

function backKeyboard() {
  return Keyboard.inlineKeyboard([
    [Keyboard.button.callback('« В меню', 'back:main')],
  ]);
}

// Admin keyboards
function adminMenuKeyboard() {
  return Keyboard.inlineKeyboard([
    [Keyboard.button.callback('📋 Новые заказы', 'admin:new_orders')],
    [Keyboard.button.callback('📊 Все заказы', 'admin:all_orders')],
    [Keyboard.button.callback('📈 Статистика', 'admin:stats')],
    [Keyboard.button.callback('« В меню', 'back:main')],
  ]);
}

function adminOrderKeyboard(bookingId: string) {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('✅ Подтвердить', `admin:confirm:${bookingId}`),
      Keyboard.button.callback('❌ Отклонить', `admin:reject:${bookingId}`),
    ],
    [Keyboard.button.callback('🗑 Удалить', `admin:delete:${bookingId}`)],
  ]);
}

export function createBot() {
  const bot = new Bot(config.BOT_TOKEN);
  botInstance = bot; // Store for notifications

  // /start command
  bot.command('start', async (ctx) => {
    const userId = (ctx as any).user?.user_id || 0;
    resetState(userId);
    
    const showAdmin = await isUserAdmin(userId);
    
    // Send welcome message with menu (GIF sent separately)
    await ctx.reply(
      `👋 <b>Добро пожаловать в МастерЧист!</b>\n\n<b>Сервис аренды наборов для химчистки.</b>\n\nВыберите услугу 👇`,
      { attachments: [mainMenuKeyboard(showAdmin)], format: 'html' }
    );
    
    // Send welcome GIF separately via direct API call
    try {
      await fetch(`${config.MAX_API_URL}/messages?user_id=${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': config.BOT_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attachments: [{
            type: 'image',
            payload: { url: 'https://masterchist.ru/welcome.gif' },
          }],
        }),
      });
    } catch (err) {
      console.error('Failed to send welcome GIF:', err);
    }
  });

  // /admin command
  bot.command('admin', async (ctx) => {
    const userId = (ctx as any).user?.user_id || 0;
    const api = new ApiClient(userId);
    const roleResult = await api.getAdminRole();
    
    if (!roleResult.ok) {
      await ctx.reply('❌ У вас нет доступа к админ-панели.');
      return;
    }
    
    await ctx.reply(
      `👨‍💼 <b>Админ-панель</b>\n\nВыберите действие:`,
      { attachments: [adminMenuKeyboard()], format: 'html' }
    );
  });

  // Handle text messages and photos
  bot.on('message_created', async (ctx) => {
    const userId = (ctx as any).user?.user_id || 0;
    const message = ctx.message as any;
    const text = message?.body?.text || '';
    const attachments = message?.body?.attachments || [];
    
    const state = getState(userId);
    
    // Check for photo attachment
    const photoAttachment = attachments.find((a: any) => a.type === 'image');
    if (photoAttachment) {
      // If in pro_cleaning:photo step - handle as pollution photo
      if (state.step === 'pro_cleaning:photo') {
        const photoUrl = photoAttachment.payload?.url || photoAttachment.url || '';
        updateStateData(userId, { photoUrl });
        await createProCleaningBooking(ctx, userId, photoUrl);
        return;
      }
      // Otherwise handle as payment proof
      await handlePhotoUpload(ctx, userId, photoAttachment);
      return;
    }
    
    if (text.startsWith('/')) return; // Skip commands
    
    if (state.step === 'idle') {
      // Show menu for any text
      resetState(userId);
      await ctx.reply(
        `👋 <b>Добро пожаловать в МастерЧист!</b>\n\nВыберите услугу 👇`,
        { attachments: [mainMenuKeyboard()], format: 'html' }
      );
      return;
    }

    // Handle text input based on conversation step
    await handleTextInput(ctx, userId, text, state.step);
  });

  // Handle callbacks
  bot.on('message_callback', async (ctx) => {
    const userId = (ctx as any).user?.user_id || 0;
    const payload = ctx.callback?.payload || '';
    
    console.log(`Callback: user=${userId}, payload=${payload}`);

    if (payload === 'back:main' || payload === 'main_menu') {
      resetState(userId);
      const showAdmin = await isUserAdmin(userId);
      await ctx.reply(
        `👋 <b>МастерЧист</b>\n\nВыберите услугу 👇`,
        { attachments: [mainMenuKeyboard(showAdmin)], format: 'html' }
      );
    }
    else if (payload === 'admin:menu') {
      const showAdmin = await isUserAdmin(userId);
      if (!showAdmin) {
        await ctx.reply('❌ У вас нет доступа к админ-панели.');
        return;
      }
      await ctx.reply(
        `👨‍💼 <b>Админ-панель</b>\n\nВыберите действие:`,
        { attachments: [adminMenuKeyboard()], format: 'html' }
      );
    }
    else if (payload === 'service:self_cleaning') {
      setState(userId, { step: 'self_cleaning:city', data: { serviceCode: 'self_cleaning' } });
      
      // Track conversation start
      const api = new ApiClient(userId);
      api.trackConversationStart('self_cleaning').catch(console.error);

      await ctx.reply(
        `🧹 <b>Химчистка самообслуживания</b>\n\n💰 <b>АКЦИЯ: 1500 ₽ за сутки</b>\n🎁 Сушилка и химия в подарок!\n\n📍 Выберите город:`,
        { attachments: [cityKeyboard()], format: 'html' }
      );
    }
    else if (payload === 'service:pro_cleaning') {
      setState(userId, { step: 'pro_cleaning:city', data: { serviceCode: 'pro_cleaning' } });
      
      const api = new ApiClient(userId);
      api.trackConversationStart('pro_cleaning').catch(console.error);

      await ctx.reply(
        `👔 <b>Профессиональная химчистка</b>\n\nМастер приедет и профессионально почистит мебель, ковры или другие изделия.\n\n📍 Выберите город:`,
        { attachments: [cityKeyboard()], format: 'html' }
      );
    }
    else if (payload === 'service:cleaning') {
      await ctx.reply(
        `🏠 <b>Клининг</b>\n\nУслуга в разработке. Скоро будет доступна!`,
        { attachments: [backKeyboard()], format: 'html' }
      );
    }
    else if (payload === 'help') {
      await ctx.reply(
        `❓ <b>Помощь</b>\n\n🧹 <b>Химчистка самообслуживания</b> — аренда набора для чистки мебели на дому\n\n👔 <b>Проф. химчистка</b> — мастер приедет и профессионально почистит\n\n🏠 <b>Клининг</b> — уборка помещений (скоро)\n\n📞 Контакт: @MasterChist_support`,
        { attachments: [backKeyboard()], format: 'html' }
      );
    }
    else if (payload === 'my_orders') {
      const api = new ApiClient(userId);
      const result = await api.getUserBookings();

      if (!result.ok || result.data.length === 0) {
        await ctx.reply('📋 У вас пока нет заказов.', { attachments: [backKeyboard()] });
        return;
      }

      let text = '📋 <b>Ваши заказы:</b>\n\n';
      for (const booking of result.data) {
        const status = STATUS_LABELS[booking.status] || booking.status;
        text += `📦 <code>${booking.id.slice(0, 8)}</code>\n   ${status}\n   📅 ${booking.scheduledDate || 'Не указана'}\n\n`;
      }

      await ctx.reply(text, { attachments: [backKeyboard()], format: 'html' });
    }
    else if (payload.startsWith('city:')) {
      const city = payload.replace('city:', '');
      const cityName = CITIES[city as keyof typeof CITIES] || city;
      const state = getState(userId);
      
      updateStateData(userId, { city, cityName });

      // Handle self_cleaning flow (including after bot restart when state is idle)
      if (state.step === 'self_cleaning:city' || state.step === 'idle' || !state.step) {
        // Set serviceCode if not set (after bot restart)
        if (!state.data.serviceCode) {
          updateStateData(userId, { serviceCode: 'self_cleaning' });
        }
        setStep(userId, 'self_cleaning:date');
        updateStateData(userId, { weekOffset: 0 });
        const dates = getDaysWithOffset(0);
        await ctx.reply(
          `📅 <b>Выберите дату:</b>\n\n🏙 Город: ${cityName}`,
          { attachments: [dateKeyboard(dates, 0)], format: 'html' }
        );
      } else if (state.step === 'pro_cleaning:city') {
        setStep(userId, 'pro_cleaning:address');
        await ctx.reply(
          `🏠 <b>Введите адрес</b> (улица, дом, квартира):\n\n🏙 Город: ${cityName}`,
          { attachments: [cancelKeyboard()], format: 'html' }
        );
      }
    }
    else if (payload.startsWith('date:')) {
      const date = payload.replace('date:', '');
      const state = getState(userId);
      
      const d = new Date(date);
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
      const displayDate = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
      
      updateStateData(userId, { date, displayDate });
      setStep(userId, 'self_cleaning:time');

      const api = new ApiClient(userId);
      const result = await api.getAvailability(state.data.city!, date);

      if (!result.ok || result.data.length === 0) {
        const weekOffset = state.data.weekOffset || 0;
        await ctx.reply(
          '❌ Нет доступных слотов на эту дату. Выберите другую.',
          { attachments: [dateKeyboard(getDaysWithOffset(weekOffset), weekOffset)] }
        );
        return;
      }

      await ctx.reply(
        `🕐 <b>Выберите время:</b>\n\n🏙 ${state.data.cityName}\n📅 ${displayDate}`,
        { attachments: [timeSlotsKeyboard(result.data)], format: 'html' }
      );
    }
    else if (payload.startsWith('slot:')) {
      // Format: slot:slotId:HH:MM-HH:MM - need to handle colons in time
      const firstColon = payload.indexOf(':');
      const secondColon = payload.indexOf(':', firstColon + 1);
      const slotId = payload.substring(firstColon + 1, secondColon);
      const timeDisplay = payload.substring(secondColon + 1); // "08:00-09:00"
      
      updateStateData(userId, { timeSlotId: slotId, timeSlotDisplay: timeDisplay });
      setStep(userId, 'self_cleaning:address');
      
      const state = getState(userId);
      await ctx.reply(
        `🏠 <b>Введите адрес доставки</b> (улица, дом, квартира):\n\n🏙 ${state.data.cityName}\n📅 ${state.data.displayDate}\n🕐 ${timeDisplay}`,
        { attachments: [cancelKeyboard()], format: 'html' }
      );
    }
    else if (payload === 'confirm') {
      await handleConfirm(ctx, userId);
    }
    else if (payload === 'cancel') {
      resetState(userId);
      await ctx.reply('❌ Отменено.', { attachments: [mainMenuKeyboard()] });
    }
    else if (payload === 'back:city') {
      const state = getState(userId);
      if (state.data.serviceCode === 'self_cleaning') {
        setStep(userId, 'self_cleaning:city');
      } else {
        setStep(userId, 'pro_cleaning:city');
      }
      await ctx.reply('📍 Выберите город:', { attachments: [cityKeyboard()] });
    }
    else if (payload === 'back:date') {
      setStep(userId, 'self_cleaning:date');
      const state = getState(userId);
      const weekOffset = state.data.weekOffset || 0;
      await ctx.reply(
        `📅 <b>Выберите дату:</b>\n\n🏙 Город: ${state.data.cityName}`,
        { attachments: [dateKeyboard(getDaysWithOffset(weekOffset), weekOffset)], format: 'html' }
      );
    }
    else if (payload.startsWith('week:')) {
      const weekOffset = parseInt(payload.replace('week:', ''), 10);
      updateStateData(userId, { weekOffset });
      const state = getState(userId);
      const dates = getDaysWithOffset(weekOffset);
      await ctx.reply(
        `📅 <b>Выберите дату:</b>\n\n🏙 Город: ${state.data.cityName}`,
        { attachments: [dateKeyboard(dates, weekOffset)], format: 'html' }
      );
    }
    // Admin callbacks
    else if (payload === 'admin:new_orders') {
      await handleAdminNewOrders(ctx, userId);
    }
    else if (payload === 'admin:all_orders') {
      await handleAdminAllOrders(ctx, userId);
    }
    else if (payload === 'admin:stats') {
      await handleAdminStats(ctx, userId);
    }
    else if (payload.startsWith('admin:confirm:')) {
      const bookingId = payload.replace('admin:confirm:', '');
      await handleAdminConfirm(ctx, userId, bookingId);
    }
    else if (payload.startsWith('admin:reject:')) {
      const bookingId = payload.replace('admin:reject:', '');
      await handleAdminReject(ctx, userId, bookingId);
    }
    else if (payload.startsWith('admin:delete:')) {
      const bookingId = payload.replace('admin:delete:', '');
      await handleAdminDelete(ctx, userId, bookingId);
    }
  });

  return bot;
}

async function handleTextInput(ctx: Context, userId: number, text: string, step: ConversationStep) {
  const state = getState(userId);

  switch (step) {
    case 'self_cleaning:address':
    case 'pro_cleaning:address':
      updateStateData(userId, { address: text });
      parseAddress(userId, text);
      setStep(userId, step === 'self_cleaning:address' ? 'self_cleaning:name' : 'pro_cleaning:name');
      await ctx.reply('👤 <b>Введите ваше имя:</b>', { attachments: [cancelKeyboard()], format: 'html' });
      break;

    case 'self_cleaning:name':
    case 'pro_cleaning:name':
      updateStateData(userId, { contactName: text });
      setStep(userId, step === 'self_cleaning:name' ? 'self_cleaning:phone' : 'pro_cleaning:phone');
      await ctx.reply('📞 <b>Введите номер телефона:</b>', { attachments: [cancelKeyboard()], format: 'html' });
      break;

    case 'self_cleaning:phone':
      updateStateData(userId, { contactPhone: text });
      setStep(userId, 'self_cleaning:confirm');
      await showConfirmation(ctx, userId);
      break;

    case 'pro_cleaning:phone':
      updateStateData(userId, { contactPhone: text });
      setStep(userId, 'pro_cleaning:description');
      await ctx.reply('📝 <b>Опишите загрязнения</b> (что нужно почистить, тип пятен и т.д.):', { attachments: [cancelKeyboard()], format: 'html' });
      break;

    case 'pro_cleaning:description':
      updateStateData(userId, { description: text });
      setStep(userId, 'pro_cleaning:photo');
      await ctx.reply('📸 <b>Отправьте фото загрязнений</b> (jpg, png):\n\n<i>Или напишите "пропустить" чтобы продолжить без фото</i>', { attachments: [cancelKeyboard()], format: 'html' });
      break;

    case 'pro_cleaning:photo':
      // User typed text instead of sending photo - skip photo step
      if (text.toLowerCase().includes('пропуст')) {
        await createProCleaningBooking(ctx, userId);
      } else {
        await ctx.reply('📸 Отправьте фото или напишите "пропустить"', { attachments: [cancelKeyboard()] });
      }
      break;
  }
}

function parseAddress(userId: number, address: string) {
  const parts = address.split(',').map(p => p.trim());
  updateStateData(userId, {
    street: parts[0] || address,
    house: parts[1] || '1',
    apartment: parts[2],
  });
}

async function showConfirmation(ctx: Context, userId: number) {
  const state = getState(userId);
  const d = state.data;

  await ctx.reply(
    `📋 <b>Проверьте данные бронирования:</b>\n\n🏙 Город: ${d.cityName}\n📅 Дата: ${d.displayDate}\n🕐 Время: ${d.timeSlotDisplay}\n📍 Адрес: ${d.address}\n👤 Имя: ${d.contactName}\n📞 Телефон: ${d.contactPhone}\n\n💰 Стоимость: <b>1500 ₽</b>\n💳 Предоплата: <b>500 ₽</b>`,
    { attachments: [confirmKeyboard()], format: 'html' }
  );
}

async function handleConfirm(ctx: Context, userId: number) {
  const state = getState(userId);

  if (state.step === 'self_cleaning:confirm') {
    await createSelfCleaningBooking(ctx, userId);
  }
}

async function createSelfCleaningBooking(ctx: Context, userId: number) {
  const state = getState(userId);
  const d = state.data;

  await ctx.reply('⏳ Создаю бронирование...');

  const api = new ApiClient(userId);
  const result = await api.createBooking({
    serviceCode: 'self_cleaning',
    city: d.city!,
    scheduledDate: d.date!,
    timeSlotId: d.timeSlotId!,
    address: {
      city: d.cityName!,
      street: d.street!,
      house: d.house!,
      apartment: d.apartment,
    },
    contact: {
      name: d.contactName!,
      phone: d.contactPhone!,
    },
  });

  if (!result.ok) {
    await ctx.reply(`❌ Ошибка: ${result.error}`, { attachments: [backKeyboard()] });
    resetState(userId);
    return;
  }

  await api.trackConversationComplete('self_cleaning');

  const booking = result.data;
  await ctx.reply(
    `✅ <b>Бронирование создано!</b>\n\n📋 ID: <code>${booking.id}</code>\n🧹 Набор: #${booking.kitNumber}\n📅 Дата: ${d.displayDate}\n🕐 Время: ${booking.timeSlot.startTime} - ${booking.timeSlot.endTime}\n📍 Адрес: ${booking.address.addressLine}\n\n💳 <b>Для подтверждения внесите предоплату 500₽</b>\n\nРеквизиты:\n• Сбербанк: 1234 5678 9012 3456\n• СБП: +7 (999) 123-45-67\n\n📸 <b>После оплаты отправьте фото чека в этот чат!</b>`,
    { format: 'html' }
  );
  resetState(userId);
}

async function createProCleaningBooking(ctx: Context, userId: number, photoUrl?: string) {
  const state = getState(userId);
  const d = state.data;

  await ctx.reply('⏳ Создаю заявку...');

  const api = new ApiClient(userId);
  const result = await api.createBooking({
    serviceCode: 'pro_cleaning',
    city: d.city!,
    address: {
      city: d.cityName!,
      street: d.street!,
      house: d.house!,
      apartment: d.apartment,
    },
    contact: {
      name: d.contactName!,
      phone: d.contactPhone!,
    },
    proCleaningDetails: d.description,
  });

  if (!result.ok) {
    await ctx.reply(`❌ Ошибка: ${result.error}`, { attachments: [backKeyboard()] });
    resetState(userId);
    return;
  }

  await api.trackConversationComplete('pro_cleaning');

  await ctx.reply(
    `✅ <b>Заявка создана!</b>\n\n📋 ID: <code>${result.data.id}</code>\n🏙 Город: ${d.cityName}\n📍 Адрес: ${d.address}\n👤 Имя: ${d.contactName}\n📞 Телефон: ${d.contactPhone}\n\nМастер свяжется с вами для оценки стоимости и согласования времени.\n\nСпасибо! 🙏`,
    { attachments: [mainMenuKeyboard()], format: 'html' }
  );
  resetState(userId);
}

async function handlePhotoUpload(ctx: Context, userId: number, photoAttachment: any) {
  const api = new ApiClient(userId);
  
  // Check for pending booking awaiting payment
  const pendingResult = await api.getPendingBooking();
  
  if (!pendingResult.ok || !pendingResult.data) {
    // No pending booking - just acknowledge photo silently or show help
    await ctx.reply(
      '📷 Фото получено.\n\nЕсли это чек оплаты - сначала создайте бронирование.',
      { attachments: [backKeyboard()] }
    );
    return;
  }

  // Accept payment proof for new or awaiting_prepayment status
  const validStatuses = ['new', 'awaiting_prepayment'];
  if (!validStatuses.includes(pendingResult.data.status)) {
    await ctx.reply(
      `📷 Фото получено.\n\nВаше бронирование уже в статусе: ${STATUS_LABELS[pendingResult.data.status] || pendingResult.data.status}`,
      { attachments: [backKeyboard()] }
    );
    return;
  }

  const bookingId = pendingResult.data.id;
  
  // Get photo URL from attachment
  const photoUrl = photoAttachment.payload?.url || photoAttachment.url || '';
  console.log('Photo attachment:', JSON.stringify(photoAttachment));

  if (!photoUrl) {
    await ctx.reply('❌ Не удалось получить фото. Попробуйте ещё раз.');
    return;
  }

  await ctx.reply('⏳ Загружаю чек...');

  const result = await api.uploadPaymentProof(bookingId, photoUrl);

  if (!result.ok) {
    await ctx.reply(`❌ Ошибка: ${result.error}`, { attachments: [backKeyboard()] });
    return;
  }

  await ctx.reply(
    `✅ <b>Чек получен!</b>\n\nВаше бронирование переведено в статус "Оплачено".\nОжидайте подтверждения от администратора.\n\nМы свяжемся с вами для уточнения деталей доставки.\n\nСпасибо! 🙏`,
    { format: 'html' }
  );

  // Notify admin about new payment with photo
  await notifyAdminAboutPayment(bookingId, userId, photoUrl);
}

// Admin handlers
async function handleAdminNewOrders(ctx: Context, userId: number) {
  const api = new ApiClient(userId);
  const result = await api.getAdminBookings();
  
  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке заказов.');
    return;
  }

  const pendingStatuses = ['new', 'awaiting_prepayment', 'prepaid'];
  const bookings = result.data.filter(b => pendingStatuses.includes(b.status));
  
  if (bookings.length === 0) {
    await ctx.reply('📋 Нет заказов, требующих внимания.', { attachments: [adminMenuKeyboard()] });
    return;
  }

  await ctx.reply(`📋 <b>Заказы, требующие внимания (${bookings.length}):</b>`, { format: 'html' });

  for (const b of bookings.slice(0, 5)) {
    const status = STATUS_LABELS[b.status] || b.status;
    const date = b.scheduledDate || '—';
    const time = b.timeSlot || '';
    const kit = b.kitNumber ? `🧹 Набор №${b.kitNumber}` : '';
    const user = b.user?.firstName || '—';
    const addr = b.address ? `📍 ${b.address.addressLine}\n📞 ${b.address.contactPhone}` : '';

    const message = `${status}\n\n👤 Клиент: ${user}\n📅 ${date} ${time}\n${kit ? kit + '\n' : ''}${addr}`;
    await ctx.reply(message, { attachments: [adminOrderKeyboard(b.id)] });
  }
}

async function handleAdminAllOrders(ctx: Context, userId: number) {
  const api = new ApiClient(userId);
  const result = await api.getAdminBookings();
  
  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке заказов.');
    return;
  }

  const bookings = result.data;
  if (bookings.length === 0) {
    await ctx.reply('📋 Заказов нет.', { attachments: [adminMenuKeyboard()] });
    return;
  }

  let message = `📊 <b>Все заказы (${bookings.length}):</b>\n\n`;
  for (const b of bookings.slice(0, 10)) {
    const status = STATUS_LABELS[b.status] || b.status;
    const date = b.scheduledDate || '—';
    const user = b.user?.firstName || '—';
    message += `${status} | ${date} | ${user}\n`;
  }
  
  if (bookings.length > 10) {
    message += `\n<i>...и ещё ${bookings.length - 10} заказов</i>`;
  }

  await ctx.reply(message, { attachments: [adminMenuKeyboard()], format: 'html' });
}

async function handleAdminStats(ctx: Context, userId: number) {
  const api = new ApiClient(userId);
  const result = await api.getAdminStats();
  
  if (!result.ok) {
    await ctx.reply('❌ Ошибка при загрузке статистики.');
    return;
  }

  const stats = result.data;
  const message = `📈 <b>Статистика</b>

📊 Всего заказов: ${stats.totalBookings}
🆕 Новых: ${stats.newBookings}
⏳ Ожидают предоплаты: ${stats.awaitingPrepaymentBookings}
💳 Предоплачено: ${stats.prepaidBookings}
✅ Подтверждено: ${stats.confirmedBookings}
❌ Отменено: ${stats.cancelledBookings}`;

  await ctx.reply(message, { attachments: [adminMenuKeyboard()], format: 'html' });
}

async function handleAdminConfirm(ctx: Context, userId: number, bookingId: string) {
  const api = new ApiClient(userId);
  const result = await api.confirmBooking(bookingId);
  
  if (!result.ok) {
    await ctx.reply(`❌ Ошибка: ${result.error}`);
    return;
  }

  await ctx.reply(`✅ <b>Бронирование подтверждено</b>\n\nID: <code>${bookingId}</code>`, { format: 'html' });
  
  // Notify user (if they have MAX account linked via telegramId)
  if (result.data.userTelegramId) {
    await sendMessageToUser(
      result.data.userTelegramId,
      `✅ <b>Оплата подтверждена!</b>\n\nВаш заказ принят в работу.\nНабор будет доставлен в указанное время.\n\nСпасибо, что выбрали нас! 🙏`
    );
  }
}

async function handleAdminReject(ctx: Context, userId: number, bookingId: string) {
  const api = new ApiClient(userId);
  const result = await api.rejectBooking(bookingId);
  
  if (!result.ok) {
    await ctx.reply(`❌ Ошибка: ${result.error}`);
    return;
  }

  await ctx.reply(`❌ <b>Бронирование отклонено</b>\n\nID: <code>${bookingId}</code>\nСлот освобождён`, { format: 'html' });
  
  // Notify user (if they have MAX account linked via telegramId)
  if (result.data.userTelegramId) {
    await sendMessageToUser(
      result.data.userTelegramId,
      `❌ <b>Оплата отклонена</b>\n\nК сожалению, мы не смогли подтвердить вашу оплату.\nСлот освобождён для других клиентов.\n\nЕсли это ошибка, свяжитесь с нами или создайте новое бронирование.`
    );
  }
}

async function handleAdminDelete(ctx: Context, userId: number, bookingId: string) {
  const api = new ApiClient(userId);
  const result = await api.deleteBooking(bookingId);
  
  if (!result.ok) {
    await ctx.reply(`❌ Ошибка: ${result.error}`);
    return;
  }

  await ctx.reply(`🗑 <b>Бронирование удалено</b>\n\nID: <code>${bookingId}</code>`, { format: 'html' });
}
