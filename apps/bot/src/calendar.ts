import { InlineKeyboard } from 'grammy';

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function buildCalendarKeyboard(year: number, month: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  
  // Header: < Month Year >
  kb.text('◀️', `cal:prev:${year}:${month}`)
    .text(`${MONTHS_RU[month]} ${year}`, 'cal:ignore')
    .text('▶️', `cal:next:${year}:${month}`)
    .row();
  
  // Days of week header
  for (const day of DAYS_RU) {
    kb.text(day, 'cal:ignore');
  }
  kb.row();
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  
  // Monday = 0, Sunday = 6
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentDay = 1;
  
  // Build calendar grid (max 6 weeks)
  for (let week = 0; week < 6; week++) {
    let hasDay = false;
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      if ((week === 0 && dayOfWeek < startDay) || currentDay > totalDays) {
        kb.text(' ', 'cal:ignore');
      } else {
        const date = new Date(year, month, currentDay);
        const isPast = date < today;
        const dayStr = currentDay.toString().padStart(2, '0');
        const monthStr = (month + 1).toString().padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;
        
        if (isPast) {
          kb.text(`${currentDay}`, 'cal:ignore');
        } else {
          kb.text(`${currentDay}`, `cal:date:${dateStr}`);
        }
        currentDay++;
        hasDay = true;
      }
    }
    kb.row();
    
    if (currentDay > totalDays) break;
  }
  
  // Cancel button
  kb.text('❌ Отмена', 'cancel');
  
  return kb;
}

export function getCurrentCalendar(): InlineKeyboard {
  const now = new Date();
  return buildCalendarKeyboard(now.getFullYear(), now.getMonth());
}

export function parseCalendarCallback(data: string): { action: string; year?: number; month?: number; date?: string } {
  const parts = data.split(':');
  const action = parts[1];
  
  if (action === 'prev' || action === 'next') {
    return {
      action,
      year: parseInt(parts[2]!, 10),
      month: parseInt(parts[3]!, 10)
    };
  }
  
  if (action === 'date') {
    return { action, date: parts[2] };
  }
  
  return { action: 'ignore' };
}
