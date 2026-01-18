'use client';

import { useBookingStore } from '@/lib/booking-store';
import { useTelegram } from '@/lib/telegram-provider';

export function SuccessStep() {
  const { booking, reset } = useBookingStore();
  const { webApp } = useTelegram();

  const handleClose = () => {
    reset();
    webApp?.close();
  };

  const handleNewBooking = () => {
    reset();
  };

  if (!booking) {
    return (
      <div className="screen items-center justify-center">
        <p>Ошибка: данные бронирования не найдены</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Заказ создан!</h1>
        <p className="text-tg-hint">ID: {booking.id}</p>
      </div>

      <div className="card mb-4">
        <h2 className="font-medium mb-3">Детали заказа</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-tg-hint">Набор</span>
            <span>#{booking.kitNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Дата</span>
            <span>{booking.scheduledDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Время</span>
            <span>
              {booking.timeSlot.startTime} - {booking.timeSlot.endTime}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Адрес</span>
            <span>{booking.address.addressLine}</span>
          </div>
        </div>
      </div>

      <div className="card mb-4 bg-blue-50 border border-blue-200">
        <h2 className="font-medium mb-2">💳 Инструкция по предоплате</h2>
        <p className="text-sm mb-3">
          Для подтверждения заказа внесите предоплату <strong>500 ₽</strong>
        </p>
        <div className="text-sm space-y-1">
          <p>
            <strong>Сбербанк:</strong> 1234 5678 9012 3456
          </p>
          <p>
            <strong>СБП:</strong> +7 (999) 123-45-67
          </p>
        </div>
        <p className="text-sm mt-3 text-tg-hint">
          После оплаты отправьте фото чека боту в Telegram
        </p>
      </div>

      <div className="mt-auto pt-4 flex flex-col gap-2">
        <button onClick={handleClose} className="btn-primary">
          Закрыть
        </button>
        <button onClick={handleNewBooking} className="btn-secondary">
          Создать ещё заказ
        </button>
      </div>
    </div>
  );
}
