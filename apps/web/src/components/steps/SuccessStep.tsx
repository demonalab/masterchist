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
        <div className="card-premium text-center p-8">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-400">Ошибка: данные бронирования не найдены</p>
        </div>
      </div>
    );
  }

  const formattedDate = booking.scheduledDate 
    ? new Date(booking.scheduledDate).toLocaleDateString('ru', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      })
    : '';

  return (
    <div className="screen">
      {/* Success animation */}
      <div className="text-center mb-8 animate-scale-in">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg mb-6">
          <span className="text-5xl">✓</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Заказ создан!</h1>
        <p className="text-gray-400">ID: <span className="text-purple-400">{booking.id.slice(0, 8)}</span></p>
      </div>

      {/* Order details */}
      <div className="card-premium mb-4 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="icon-circle">
            <span>📦</span>
          </div>
          <div className="font-semibold text-white">Детали заказа</div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Набор</span>
            <span className="badge">#{booking.kitNumber}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Дата</span>
            <span className="text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Время</span>
            <span className="text-white">{booking.timeSlot.startTime} - {booking.timeSlot.endTime}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-400">Адрес</span>
            <span className="text-white text-right">{booking.address.addressLine}</span>
          </div>
        </div>
      </div>

      {/* Payment instruction */}
      <div className="card bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30 mb-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400">
            <span className="text-xl">💳</span>
          </div>
          <div>
            <div className="font-semibold text-blue-400">Инструкция по предоплате</div>
            <div className="text-sm text-gray-400">Для подтверждения заказа</div>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-2xl p-4 mb-4">
          <div className="text-2xl font-bold gradient-text-gold text-center mb-2">500 ₽</div>
          <div className="text-xs text-gray-500 text-center">Сумма предоплаты</div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <span className="text-green-400">💚</span>
            <div>
              <div className="text-gray-400 text-xs">Сбербанк</div>
              <div className="text-white font-mono">1234 5678 9012 3456</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <span className="text-purple-400">⚡</span>
            <div>
              <div className="text-gray-400 text-xs">СБП</div>
              <div className="text-white font-mono">+7 (999) 123-45-67</div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <span>📸</span>
            <span>После оплаты отправьте фото чека боту</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-auto pt-4 flex flex-col gap-3">
        <button onClick={handleClose} className="btn-primary">
          <span className="flex items-center justify-center gap-2">
            <span>✓</span>
            Закрыть
          </span>
        </button>
        <button onClick={handleNewBooking} className="btn-outline">
          Создать ещё заказ
        </button>
      </div>
    </div>
  );
}
