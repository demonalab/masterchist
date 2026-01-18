import { InlineButton } from './max-api';

export const mainMenuKeyboard: InlineButton[][] = [
  [{ type: 'callback', text: '🏠 Главное меню', payload: 'main_menu' }],
  [
    { type: 'callback', text: '🧹 Химчистка (самообслуживание)', payload: 'service:self_cleaning' },
    { type: 'callback', text: '👔 Проф. химчистка', payload: 'service:pro_cleaning' },
  ],
  [
    { type: 'callback', text: '🏠 Клининг', payload: 'service:cleaning' },
    { type: 'callback', text: '📋 Мои заказы', payload: 'my_orders' },
  ],
  [{ type: 'callback', text: '❓ Помощь', payload: 'help' }],
];

export const cityKeyboard: InlineButton[][] = [
  [{ type: 'callback', text: 'Ростов-на-Дону', payload: 'city:ROSTOV_NA_DONU' }],
  [{ type: 'callback', text: 'Батайск', payload: 'city:BATAYSK' }],
  [{ type: 'callback', text: 'Ставрополь', payload: 'city:STAVROPOL' }],
  [{ type: 'callback', text: '« Назад', payload: 'back:main' }],
];

export const cancelKeyboard: InlineButton[][] = [
  [{ type: 'callback', text: '❌ Отмена', payload: 'cancel' }],
];

export const backKeyboard: InlineButton[][] = [
  [{ type: 'callback', text: '« Назад', payload: 'back:main' }],
];

export const confirmKeyboard: InlineButton[][] = [
  [
    { type: 'callback', text: '✅ Подтвердить', payload: 'confirm' },
    { type: 'callback', text: '❌ Отмена', payload: 'cancel' },
  ],
];

export function buildDateKeyboard(dates: { date: string; display: string }[]): InlineButton[][] {
  const buttons: InlineButton[][] = [];
  for (let i = 0; i < dates.length; i += 2) {
    const row: InlineButton[] = [
      { type: 'callback', text: dates[i].display, payload: `date:${dates[i].date}` },
    ];
    if (dates[i + 1]) {
      row.push({ type: 'callback', text: dates[i + 1].display, payload: `date:${dates[i + 1].date}` });
    }
    buttons.push(row);
  }
  buttons.push([{ type: 'callback', text: '« Назад', payload: 'back:city' }]);
  return buttons;
}

export function buildTimeSlotsKeyboard(slots: { slotId: string; startTime: string; endTime: string; availableKits: number }[]): InlineButton[][] {
  const buttons: InlineButton[][] = [];
  for (const slot of slots) {
    if (slot.availableKits > 0) {
      buttons.push([{
        type: 'callback',
        text: `${slot.startTime} - ${slot.endTime} (${slot.availableKits} набор${slot.availableKits > 1 ? 'а' : ''})`,
        payload: `slot:${slot.slotId}:${slot.startTime}-${slot.endTime}`,
      }]);
    }
  }
  buttons.push([{ type: 'callback', text: '« Назад', payload: 'back:date' }]);
  return buttons;
}

export const CITY_NAMES: Record<string, string> = {
  ROSTOV_NA_DONU: 'Ростов-на-Дону',
  BATAYSK: 'Батайск',
  STAVROPOL: 'Ставрополь',
};

export const STATUS_LABELS: Record<string, string> = {
  new: '🆕 Новый',
  awaiting_prepayment: '💳 Ожидает оплаты',
  prepaid: '✅ Оплачен',
  confirmed: '✅ Подтверждён',
  cancelled: '❌ Отменён',
};
