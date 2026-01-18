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
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <span>←</span>
          <span>Назад</span>
        </button>
        <h1 className="screen-title">Адрес доставки</h1>
        <p className="screen-subtitle">Куда привезти набор?</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Address section */}
        <div className="card-premium animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-circle">
              <span>📍</span>
            </div>
            <div className="font-semibold text-white">Адрес</div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Улица *</label>
              <input
                type="text"
                value={street}
                onChange={(e) => { setStreet(e.target.value); setError(''); }}
                placeholder="ул. Ленина"
                className="input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Дом *</label>
                <input
                  type="text"
                  value={house}
                  onChange={(e) => { setHouse(e.target.value); setError(''); }}
                  placeholder="15"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Квартира</label>
                <input
                  type="text"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  placeholder="42"
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact section */}
        <div className="card-premium animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-circle-gold">
              <span>👤</span>
            </div>
            <div className="font-semibold text-white">Контактные данные</div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Ваше имя *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => { setContactName(e.target.value); setError(''); }}
                placeholder="Иван"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Телефон *</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => { setContactPhone(e.target.value); setError(''); }}
                placeholder="+7 (999) 123-45-67"
                className="input"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="card bg-red-500/10 border-red-500/30 text-red-400 text-center animate-fade-in">
            {error}
          </div>
        )}
      </div>

      {/* Continue button */}
      <div className="mt-auto pt-6">
        <button onClick={handleContinue} className="btn-primary">
          Продолжить
        </button>
      </div>
    </div>
  );
}
