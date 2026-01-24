import { MaxApi } from './max-api';
import { ApiClient } from './api-client';
import { getState, setState, resetState, updateStateData, setStep } from './state';
import {
  mainMenuKeyboard,
  cityKeyboard,
  cancelKeyboard,
  backKeyboard,
  confirmKeyboard,
  buildDateKeyboard,
  buildTimeSlotsKeyboard,
  CITY_NAMES,
  STATUS_LABELS,
} from './keyboards';

const api = new MaxApi();

// Generate next 7 days for date selection
function getNext7Days(): { date: string; display: string }[] {
  const days = [];
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const date = d.toISOString().split('T')[0];
    const display = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
    days.push({ date, display });
  }
  return days;
}

export async function handleStart(chatId: number, userId: number) {
  try {
    console.log(`handleStart: chatId=${chatId}, userId=${userId}`);
    resetState(userId);
    
    const welcomeText = `👋 <b>Добро пожаловать в МастерЧист!</b>

<b>Сервис аренды наборов для химчистки.</b>

Выберите услугу 👇`;

    await api.sendMessage(chatId, welcomeText, mainMenuKeyboard);
    console.log('handleStart: message sent');
  } catch (err) {
    console.error('handleStart error:', err);
  }
}

export async function handleSelfCleaning(chatId: number, userId: number) {
  try {
    console.log(`handleSelfCleaning: chatId=${chatId}, userId=${userId}`);
    setState(userId, { step: 'self_cleaning:city', data: { serviceCode: 'self_cleaning' } });
    
    // Track conversation start (don't await to avoid blocking)
    const apiClient = new ApiClient(userId);
    apiClient.trackConversationStart('self_cleaning').catch(e => console.error('Track error:', e));

    const promoText = `🧹 <b>Химчистка самообслуживания</b>

💰 <b>АКЦИЯ: 1500 ₽ за сутки</b>
🎁 Сушилка и химия в подарок!

📍 Выберите город:`;

    await api.sendMessage(chatId, promoText, cityKeyboard);
    console.log('handleSelfCleaning: message sent');
  } catch (err) {
    console.error('handleSelfCleaning error:', err);
  }
}

export async function handleProCleaning(chatId: number, userId: number) {
  setState(userId, { step: 'pro_cleaning:city', data: { serviceCode: 'pro_cleaning' } });
  
  // Track conversation start
  const apiClient = new ApiClient(userId);
  await apiClient.trackConversationStart('pro_cleaning');

  const text = `👔 <b>Профессиональная химчистка</b>

Мастер приедет к вам и профессионально почистит мебель, ковры или другие изделия.

📍 Выберите город:`;

  await api.sendMessage(chatId, text, cityKeyboard);
}

export async function handleCleaning(chatId: number) {
  const text = `🏠 <b>Клининг</b>

Услуга в разработке. Скоро будет доступна!`;

  await api.sendMessage(chatId, text, backKeyboard);
}

export async function handleHelp(chatId: number) {
  const text = `❓ <b>Помощь</b>

🧹 <b>Химчистка самообслуживания</b> — аренда набора для чистки мебели на дому

👔 <b>Проф. химчистка</b> — мастер приедет и профессионально почистит

🏠 <b>Клининг</b> — уборка помещений (скоро)

📞 Контакт: @rim613`;

  await api.sendMessage(chatId, text, backKeyboard);
}

export async function handleMyOrders(chatId: number, userId: number) {
  const apiClient = new ApiClient(userId);
  const result = await apiClient.getUserBookings();

  if (!result.ok || result.data.length === 0) {
    await api.sendMessage(chatId, '📋 У вас пока нет заказов.', backKeyboard);
    return;
  }

  let text = '📋 <b>Ваши заказы:</b>\n\n';
  for (const booking of result.data) {
    const status = STATUS_LABELS[booking.status] || booking.status;
    const date = booking.scheduledDate ? booking.scheduledDate : 'Не указана';
    text += `📦 <code>${booking.id.slice(0, 8)}</code>\n`;
    text += `   ${status}\n`;
    text += `   📅 ${date}\n`;
    text += `   🧹 ${booking.service || 'Услуга'}\n\n`;
  }

  await api.sendMessage(chatId, text, backKeyboard);
}

export async function handleCitySelection(chatId: number, userId: number, city: string) {
  const state = getState(userId);
  const cityName = CITY_NAMES[city] || city;
  
  updateStateData(userId, { city, cityName });

  if (state.step === 'self_cleaning:city') {
    setStep(userId, 'self_cleaning:date');
    
    const dates = getNext7Days();
    const text = `📅 Выберите дату:\n\n🏙 Город: ${cityName}`;
    await api.sendMessage(chatId, text, buildDateKeyboard(dates));
  } else if (state.step === 'pro_cleaning:city') {
    setStep(userId, 'pro_cleaning:address');
    
    const text = `🏠 Введите адрес (улица, дом, квартира):\n\n🏙 Город: ${cityName}`;
    await api.sendMessage(chatId, text, cancelKeyboard);
  }
}

export async function handleDateSelection(chatId: number, userId: number, date: string) {
  try {
    const state = getState(userId);
    console.log(`handleDateSelection: city=${state.data.city}, date=${date}`);
    
    // Format display date
    const d = new Date(date);
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const displayDate = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
    
    updateStateData(userId, { date, displayDate });
    setStep(userId, 'self_cleaning:time');

    // Get available slots
    const apiClient = new ApiClient(userId);
    const result = await apiClient.getAvailability(state.data.city!, date);
    console.log(`handleDateSelection: availability result ok=${result.ok}, data=${JSON.stringify(result.ok ? result.data.length : result.error)}`);

    if (!result.ok || result.data.length === 0) {
      await api.sendMessage(chatId, '❌ Нет доступных слотов на эту дату. Выберите другую.', buildDateKeyboard(getNext7Days()));
      return;
    }

  const slots = result.data.map(s => ({
    slotId: s.slotId,
    startTime: s.startTime,
    endTime: s.endTime,
    availableKits: s.availableKits,
  }));

  const text = `🕐 Выберите время:\n\n🏙 ${state.data.cityName}\n📅 ${displayDate}`;
  await api.sendMessage(chatId, text, buildTimeSlotsKeyboard(slots));
  } catch (err) {
    console.error('handleDateSelection error:', err);
  }
}

export async function handleSlotSelection(chatId: number, userId: number, slotId: string, timeDisplay: string) {
  updateStateData(userId, { timeSlotId: slotId, timeSlotDisplay: timeDisplay });
  setStep(userId, 'self_cleaning:address');

  const state = getState(userId);
  const text = `🏠 Введите адрес доставки (улица, дом, квартира):\n\n🏙 ${state.data.cityName}\n📅 ${state.data.displayDate}\n🕐 ${timeDisplay}`;
  await api.sendMessage(chatId, text, cancelKeyboard);
}

export async function handleTextMessage(chatId: number, userId: number, text: string) {
  const state = getState(userId);

  switch (state.step) {
    case 'self_cleaning:address':
      updateStateData(userId, { address: text });
      parseAddress(userId, text);
      setStep(userId, 'self_cleaning:name');
      await api.sendMessage(chatId, '👤 Введите ваше имя:', cancelKeyboard);
      break;

    case 'self_cleaning:name':
      updateStateData(userId, { contactName: text });
      setStep(userId, 'self_cleaning:phone');
      await api.sendMessage(chatId, '📞 Введите номер телефона:', cancelKeyboard);
      break;

    case 'self_cleaning:phone':
      updateStateData(userId, { contactPhone: text });
      setStep(userId, 'self_cleaning:confirm');
      await showSelfCleaningConfirmation(chatId, userId);
      break;

    case 'pro_cleaning:address':
      updateStateData(userId, { address: text });
      parseAddress(userId, text);
      setStep(userId, 'pro_cleaning:name');
      await api.sendMessage(chatId, '👤 Введите ваше имя:', cancelKeyboard);
      break;

    case 'pro_cleaning:name':
      updateStateData(userId, { contactName: text });
      setStep(userId, 'pro_cleaning:phone');
      await api.sendMessage(chatId, '📞 Введите номер телефона:', cancelKeyboard);
      break;

    case 'pro_cleaning:phone':
      updateStateData(userId, { contactPhone: text });
      setStep(userId, 'pro_cleaning:description');
      await api.sendMessage(chatId, '📝 Опишите загрязнения (что нужно почистить, тип пятен и т.д.):', cancelKeyboard);
      break;

    case 'pro_cleaning:description':
      updateStateData(userId, { description: text });
      await createProCleaningBooking(chatId, userId);
      break;

    default:
      // Unknown state, show main menu
      await handleStart(chatId, userId);
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

async function showSelfCleaningConfirmation(chatId: number, userId: number) {
  const state = getState(userId);
  const d = state.data;

  const text = `📋 <b>Проверьте данные бронирования:</b>

🏙 Город: ${d.cityName}
📅 Дата: ${d.displayDate}
🕐 Время: ${d.timeSlotDisplay}
📍 Адрес: ${d.address}
👤 Имя: ${d.contactName}
📞 Телефон: ${d.contactPhone}

💰 Стоимость: <b>1500 ₽</b>
💳 Предоплата: <b>500 ₽</b>`;

  await api.sendMessage(chatId, text, confirmKeyboard);
}

export async function handleConfirm(chatId: number, userId: number) {
  const state = getState(userId);

  if (state.step === 'self_cleaning:confirm') {
    await createSelfCleaningBooking(chatId, userId);
  }
}

async function createSelfCleaningBooking(chatId: number, userId: number) {
  const state = getState(userId);
  const d = state.data;

  await api.sendMessage(chatId, '⏳ Создаю бронирование...');

  const apiClient = new ApiClient(userId);
  const result = await apiClient.createBooking({
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
    await api.sendMessage(chatId, `❌ Ошибка: ${result.error}`, backKeyboard);
    resetState(userId);
    return;
  }

  // Track completion
  await apiClient.trackConversationComplete('self_cleaning');

  const booking = result.data;
  const text = `✅ <b>Бронирование создано!</b>

📋 ID: <code>${booking.id}</code>
🧹 Набор: #${booking.kitNumber}
📅 Дата: ${d.displayDate}
🕐 Время: ${booking.timeSlot.startTime} - ${booking.timeSlot.endTime}
📍 Адрес: ${booking.address.addressLine}

💳 <b>Для подтверждения внесите предоплату 500₽</b>

Реквизиты:
• Сбербанк: 1234 5678 9012 3456
• СБП: +7 (999) 123-45-67

📎 Отправьте фото чека в Telegram-бот @MasterChist_bot`;

  await api.sendMessage(chatId, text, mainMenuKeyboard);
  resetState(userId);
}

async function createProCleaningBooking(chatId: number, userId: number) {
  const state = getState(userId);
  const d = state.data;

  await api.sendMessage(chatId, '⏳ Создаю заявку...');

  const apiClient = new ApiClient(userId);
  const result = await apiClient.createBooking({
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
    await api.sendMessage(chatId, `❌ Ошибка: ${result.error}`, backKeyboard);
    resetState(userId);
    return;
  }

  // Track completion
  await apiClient.trackConversationComplete('pro_cleaning');

  const text = `✅ <b>Заявка создана!</b>

📋 ID: <code>${result.data.id}</code>
🏙 Город: ${d.cityName}
📍 Адрес: ${d.address}
👤 Имя: ${d.contactName}
📞 Телефон: ${d.contactPhone}

Мастер свяжется с вами для оценки стоимости и согласования времени.

Спасибо! 🙏`;

  await api.sendMessage(chatId, text, mainMenuKeyboard);
  resetState(userId);
}

export async function handleCancel(chatId: number, userId: number) {
  resetState(userId);
  await api.sendMessage(chatId, '❌ Отменено.', mainMenuKeyboard);
}

export async function handleBack(chatId: number, userId: number, target: string) {
  const state = getState(userId);

  switch (target) {
    case 'main':
      await handleStart(chatId, userId);
      break;
    case 'city':
      if (state.data.serviceCode === 'self_cleaning') {
        setStep(userId, 'self_cleaning:city');
        await api.sendMessage(chatId, '📍 Выберите город:', cityKeyboard);
      } else {
        setStep(userId, 'pro_cleaning:city');
        await api.sendMessage(chatId, '📍 Выберите город:', cityKeyboard);
      }
      break;
    case 'date':
      setStep(userId, 'self_cleaning:date');
      const dates = getNext7Days();
      await api.sendMessage(chatId, `📅 Выберите дату:\n\n🏙 Город: ${state.data.cityName}`, buildDateKeyboard(dates));
      break;
    default:
      await handleStart(chatId, userId);
  }
}
