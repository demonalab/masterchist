import { InlineKeyboard } from 'grammy';

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

export const mockTimeSlotsKeyboard = new InlineKeyboard()
  .text('✅ 07:00 - 08:00', 'slot:1')
  .row()
  .text('✅ 08:00 - 09:00', 'slot:2')
  .row()
  .text('❌ 09:00 - 10:00', 'slot:unavailable')
  .row()
  .text('« Назад', 'back:date');

export const confirmKeyboard = new InlineKeyboard()
  .text('✅ Подтвердить', 'confirm:yes')
  .row()
  .text('❌ Отмена', 'confirm:no');

export const cancelKeyboard = new InlineKeyboard().text('❌ Отмена', 'cancel');

export const backToMainKeyboard = new InlineKeyboard().text('« В главное меню', 'back:main');
