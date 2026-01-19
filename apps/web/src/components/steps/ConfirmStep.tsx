'use client';

import { useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { useTelegram } from '@/lib/telegram-provider';
import { api } from '@/lib/api';

export function ConfirmStep() {
  const { draft, setStep, setBooking, setError } = useBookingStore();
  const { initData, webApp } = useTelegram();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (
      !draft.serviceCode ||
      !draft.city ||
      !draft.cityName ||
      !draft.scheduledDate ||
      !draft.timeSlotId ||
      !draft.street ||
      !draft.house ||
      !draft.contactName ||
      !draft.contactPhone
    ) {
      setError('Не все данные заполнены');
      return;
    }

    setLoading(true);
    api.setInitData(initData);

    const result = await api.createBooking({
      serviceCode: draft.serviceCode,
      city: draft.city,
      scheduledDate: draft.scheduledDate,
      timeSlotId: draft.timeSlotId,
      address: {
        city: draft.cityName,
        street: draft.street,
        house: draft.house,
        apartment: draft.apartment,
      },
      contact: {
        name: draft.contactName,
        phone: draft.contactPhone,
      },
    });

    setLoading(false);

    if (!result.ok) {
      if (result.status === 409) {
        webApp?.showAlert('Слот уже занят. Выберите другое время.');
        setStep('time');
      } else {
        setError(result.error);
      }
      return;
    }

    webApp?.HapticFeedback?.notificationOccurred('success');
    setBooking(result.data);
    setStep('success');
  };

  const handleBack = () => {
    setStep('address');
  };

  const addressLine = [draft.street, draft.house, draft.apartment]
    .filter(Boolean)
    .join(', ');

  const formattedDate = draft.scheduledDate 
    ? new Date(draft.scheduledDate).toLocaleDateString('ru', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      })
    : '';

  return (
    <div className="screen">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <span>←</span>
          <span>Назад</span>
        </button>
        <h1 className="screen-title">Подтверждение</h1>
        <p className="screen-subtitle">Проверьте данные заказа</p>
      </div>

      {/* Order details */}
      <div className="card-premium mb-4 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="icon-circle">
            <span>📋</span>
          </div>
          <div className="font-semibold text-white">Детали заказа</div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Услуга</span>
            <span className="text-white font-medium">Химчистка самообслуживания</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Город</span>
            <span className="text-white">{draft.cityName}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Дата</span>
            <span className="text-white">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Время</span>
            <span className="text-white">{draft.timeSlotLabel}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Адрес</span>
            <span className="text-white text-right">{addressLine}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Контакт</span>
            <span className="text-white">{draft.contactName}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-400">Телефон</span>
            <span className="text-white">{draft.contactPhone}</span>
          </div>
        </div>
      </div>

      {/* Payment info */}
      <div className="card bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 mb-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="flex gap-3">
          <div className="icon-circle-gold">
            <span>💰</span>
          </div>
          <div>
            <div className="font-semibold text-amber-400">Стоимость: 1500 ₽ за сутки</div>
            <div className="text-sm text-green-400 mt-1">
              🎁 Сушилка и химия в подарок!
            </div>
          </div>
        </div>
      </div>

      {/* Confirm button */}
      <div className="mt-auto pt-4">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Создаю заказ...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>✓</span>
              Подтвердить заказ
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
