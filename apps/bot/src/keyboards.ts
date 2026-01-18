import { InlineKeyboard, Keyboard } from 'grammy';
import { TimeSlotAvailability } from './api-client';

// Persistent reply keyboard (bottom menu)
export const persistentMenuKeyboard = new Keyboard()
  .text('🧹 Химчистка (самообслуживание)').row()
  .text('👔 Проф. химчистка').text('🏠 Клининг').row()
  .text('📋 Мои заказы').text('❓ Помощь').row()
  .text('🏠 Главное меню')
  .resized()
  .persistent();

// Admin reply keyboard
export const adminMenuKeyboard = new Keyboard()
  .text('📋 Новые заказы').text('📊 Все заказы').row()
  .text('📈 Статистика').text('👤 Выйти из админки')
  .resized()
  .persistent();

// Admin inline keyboards
export const adminMainKeyboard = new InlineKeyboard()
  .text('📋 Новые заказы', 'admin:new_orders')
  .row()
  .text('📊 Все заказы', 'admin:all_orders')
  .row()
  .text('📈 Статистика', 'admin:stats');

export function buildAdminOrderKeyboard(bookingId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Подтвердить', `admin:confirm:${bookingId}`)
    .text('❌ Отклонить', `admin:reject:${bookingId}`)
    .row()
    .text('« Назад к заказам', 'admin:new_orders');
}

const WEBAPP_URL = 'https://xn--80akjnwedee1c.xn--p1ai';

export const mainMenuKeyboard = new InlineKeyboard()
  .text('🧹 Химчистка самообслуживания', 'service:self_cleaning')
  .row()
  .text('👔 Проф. химчистка мастером', 'service:pro_cleaning')
  .row()
  .text('🏠 Клининг', 'service:cleaning');

export const cityKeyboard = new InlineKeyboard()
  .text('Ростов-на-Дону', 'city:ROSTOV_NA_DONU')
  .row()
  .text('Батайск', 'city:BATAYSK')
  .row()
  .text('Ставрополь', 'city:STAVROPOL')
  .row()
  .text('« Назад', 'back:main');

export function buildTimeSlotsKeyboard(slots: TimeSlotAvailability[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const slot of slots) {
    const icon = slot.available ? '✅' : '❌';
    const kitInfo = slot.available && slot.availableKitNumber ? ` (набор №${slot.availableKitNumber})` : '';
    const label = `${icon} ${slot.startTime} - ${slot.endTime}${kitInfo}`;
    // Use | as separator to avoid conflict with : in time format
    const timeLabel = `${slot.startTime} - ${slot.endTime}`;
    const data = slot.available ? `slot|${slot.timeSlotId}|${timeLabel}` : 'slot:unavailable';
    kb.text(label, data).row();
  }
  kb.text('« Выбрать другую дату', 'back:date');
  return kb;
}

export const confirmKeyboard = new InlineKeyboard()
  .text('✅ Подтвердить бронирование', 'confirm:yes')
  .row()
  .text('❌ Отмена', 'confirm:no');

export const cancelKeyboard = new InlineKeyboard().text('❌ Отмена', 'cancel');

export const backToMainKeyboard = new InlineKeyboard().text('« В главное меню', 'back:main');

export const retrySlotKeyboard = new InlineKeyboard()
  .text('🔄 Выбрать другой слот', 'retry:slot')
  .row()
  .text('« В главное меню', 'back:main');
