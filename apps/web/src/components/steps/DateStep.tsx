'use client';

import { useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';

export function DateStep() {
  const { updateDraft, setStep } = useBookingStore();
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const handleContinue = () => {
    if (!date) {
      setError('Выберите дату');
      return;
    }

    if (date < today) {
      setError('Дата не может быть в прошлом');
      return;
    }

    updateDraft({ scheduledDate: date });
    setStep('time');
  };

  const handleBack = () => {
    setStep('city');
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Выберите дату</h1>

      <div className="card">
        <label className="block text-sm text-tg-hint mb-2">Дата доставки</label>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setError('');
          }}
          min={today}
          className="input"
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      <div className="mt-auto pt-4 flex flex-col gap-2">
        <button
          onClick={handleContinue}
          disabled={!date}
          className="btn-primary"
        >
          Продолжить
        </button>
        <button onClick={handleBack} className="btn-secondary">
          ← Назад
        </button>
      </div>
    </div>
  );
}
