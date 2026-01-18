'use client';

import { useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';

export function AddressStep() {
  const { draft, updateDraft, setStep } = useBookingStore();
  const [street, setStreet] = useState(draft.street || '');
  const [house, setHouse] = useState(draft.house || '');
  const [apartment, setApartment] = useState(draft.apartment || '');
  const [contactName, setContactName] = useState(draft.contactName || '');
  const [contactPhone, setContactPhone] = useState(draft.contactPhone || '');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!street.trim()) {
      setError('Введите улицу');
      return;
    }
    if (!house.trim()) {
      setError('Введите номер дома');
      return;
    }
    if (!contactName.trim()) {
      setError('Введите имя');
      return;
    }
    if (!contactPhone.trim()) {
      setError('Введите телефон');
      return;
    }

    updateDraft({
      street: street.trim(),
      house: house.trim(),
      apartment: apartment.trim() || undefined,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
    });
    setStep('confirm');
  };

  const handleBack = () => {
    setStep('time');
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Адрес и контакты</h1>

      <div className="flex flex-col gap-4">
        <div className="card">
          <label className="block text-sm text-tg-hint mb-2">Улица *</label>
          <input
            type="text"
            value={street}
            onChange={(e) => {
              setStreet(e.target.value);
              setError('');
            }}
            placeholder="ул. Ленина"
            className="input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <label className="block text-sm text-tg-hint mb-2">Дом *</label>
            <input
              type="text"
              value={house}
              onChange={(e) => {
                setHouse(e.target.value);
                setError('');
              }}
              placeholder="15"
              className="input"
            />
          </div>
          <div className="card">
            <label className="block text-sm text-tg-hint mb-2">Квартира</label>
            <input
              type="text"
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
              placeholder="42"
              className="input"
            />
          </div>
        </div>

        <div className="card">
          <label className="block text-sm text-tg-hint mb-2">Ваше имя *</label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => {
              setContactName(e.target.value);
              setError('');
            }}
            placeholder="Иван"
            className="input"
          />
        </div>

        <div className="card">
          <label className="block text-sm text-tg-hint mb-2">Телефон *</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => {
              setContactPhone(e.target.value);
              setError('');
            }}
            placeholder="+7 (999) 123-45-67"
            className="input"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      <div className="mt-auto pt-4 flex flex-col gap-2">
        <button onClick={handleContinue} className="btn-primary">
          Продолжить
        </button>
        <button onClick={handleBack} className="btn-secondary">
          ← Назад
        </button>
      </div>
    </div>
  );
}
