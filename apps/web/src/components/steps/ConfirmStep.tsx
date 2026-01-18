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

  return (
    <div className="screen">
      <h1 className="screen-title">Подтверждение</h1>

      <div className="card mb-4">
        <h2 className="font-medium mb-3">Детали заказа</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-tg-hint">Услуга</span>
            <span>Химчистка самообслуживания</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Город</span>
            <span>{draft.cityName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Дата</span>
            <span>{draft.scheduledDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Время</span>
            <span>{draft.timeSlotLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Адрес</span>
            <span>{addressLine}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Контакт</span>
            <span>{draft.contactName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Телефон</span>
            <span>{draft.contactPhone}</span>
          </div>
        </div>
      </div>

      <div className="card mb-4 bg-yellow-50 border border-yellow-200">
        <div className="flex gap-2">
          <span>💰</span>
          <div>
            <div className="font-medium">Предоплата 500 ₽</div>
            <div className="text-sm text-tg-hint">
              После создания заказа потребуется предоплата
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 flex flex-col gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Создаю заказ...
            </span>
          ) : (
            'Подтвердить заказ'
          )}
        </button>
        <button onClick={handleBack} disabled={loading} className="btn-secondary">
          ← Назад
        </button>
      </div>
    </div>
  );
}
