import { InlineKeyboard } from 'grammy';
import { TimeSlotAvailability } from './api-client';

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
    const label = `${icon} ${slot.startTime} - ${slot.endTime}`;
    const data = slot.available ? `slot:${slot.timeSlotId}:${slot.startTime}-${slot.endTime}` : 'slot:unavailable';
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
