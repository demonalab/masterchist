import { InlineKeyboard, Keyboard } from 'grammy';
import { TimeSlotAvailability } from './api-client';
import { config } from './config';

// Persistent reply keyboard (bottom menu)
export const persistentMenuKeyboard = new Keyboard()
  .text('🧹 Химчистка (самообслуживание)').row()
  .text('👔 Проф. химчистка').text('🏠 Клининг').row()
  .text('📋 Мои заказы').text('❓ Помощь').row()
  .text('🏠 Главное меню')
  .resized()
  .persistent();

// Get keyboard based on user role
export function getMenuKeyboard(telegramId?: number): Keyboard {
  const isAdmin = telegramId && String(telegramId) === config.ADMIN_TELEGRAM_ID;
  
  if (isAdmin) {
    return new Keyboard()
      .text('🧹 Химчистка (самообслуживание)').row()
      .text('👔 Проф. химчистка').text('🏠 Клининг').row()
      .text('📋 Мои заказы').text('❓ Помощь').row()
      .text('👨‍💼 Админка').text('🏠 Главное меню')
      .resized()
      .persistent();
  }
  
  return persistentMenuKeyboard;
}

// Admin reply keyboard (regular admin)
export const adminMenuKeyboard = new Keyboard()
  .text('📋 Новые заказы').text('📊 Все заказы').row()
  .text('📈 Статистика').text('📥 Экспорт').row()
  .text('👤 Выйти из админки')
  .resized()
  .persistent();

// Super admin reply keyboard
export const superAdminMenuKeyboard = new Keyboard()
  .text('📋 Новые заказы').text('📊 Все заказы').row()
  .text('📈 Статистика').text('📥 Экспорт').row()
  .text('👥 Управление админами').row()
  .text('👤 Выйти из админки')
  .resized()
  .persistent();

// Export period keyboard
export const exportPeriodKeyboard = new InlineKeyboard()
  .text('📅 Сегодня', 'export:day')
  .text('📆 Неделя', 'export:week')
  .row()
  .text('🗓 Месяц', 'export:month')
  .text('📊 Всё время', 'export:all')
  .row()
  .text('« Назад', 'admin:menu');

// Admin management keyboard
export const adminManageKeyboard = new InlineKeyboard()
  .text('➕ Добавить админа', 'admin:add_admin')
  .row()
  .text('📋 Список админов', 'admin:list_admins')
  .row()
  .text('« Назад', 'admin:menu');

export function buildAdminOrderKeyboard(bookingId: string, isSuperAdmin: boolean): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text('✅ Подтвердить', `admin:confirm:${bookingId}`)
    .text('❌ Отклонить', `admin:reject:${bookingId}`);
  
  if (isSuperAdmin) {
    kb.row().text('🗑 Удалить заказ', `admin:delete:${bookingId}`);
  }
  
  kb.row().text('« Назад к заказам', 'admin:new_orders');
  return kb;
}

export function buildAllOrdersItemKeyboard(bookingId: string, isSuperAdmin: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (isSuperAdmin) {
    kb.text('🗑 Удалить', `admin:delete:${bookingId}`);
  }
  return kb;
}

export function buildAdminListKeyboard(admins: Array<{ telegramId: string; name: string | null }>): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const admin of admins) {
    kb.text(`❌ ${admin.name || admin.telegramId}`, `admin:remove:${admin.telegramId}`).row();
  }
  kb.text('« Назад', 'admin:manage');
  return kb;
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
