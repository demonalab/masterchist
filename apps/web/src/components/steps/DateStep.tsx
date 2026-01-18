'use client';

import { useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';

export function DateStep() {
  const { updateDraft, setStep } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleBack = () => {
    setStep('city');
  };

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      date: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('ru', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('ru', { month: 'short' }),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    };
  });

  const handleSelect = (date: string) => {
    setSelectedDate(date);
    setError('');
  };

  const handleContinue = () => {
    if (!selectedDate) {
      setError('Выберите дату');
      return;
    }
    updateDraft({ scheduledDate: selectedDate });
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
        <h1 className="screen-title">Выберите дату</h1>
        <p className="screen-subtitle">Когда вам удобно получить набор?</p>
      </div>

      {/* Date Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {dates.map((d, index) => (
          <button
            key={d.date}
            onClick={() => handleSelect(d.date)}
            className={`card-premium text-center py-4 animate-scale-in
              ${selectedDate === d.date ? 'ring-2 ring-purple-500 bg-purple-500/20' : ''}
              ${d.isWeekend ? 'border-amber-500/30' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`text-xs uppercase tracking-wide mb-1 ${d.isWeekend ? 'text-amber-400' : 'text-gray-500'}`}>
              {d.day}
            </div>
            <div className="text-2xl font-bold text-white">{d.dayNum}</div>
            <div className="text-xs text-gray-400">{d.month}</div>
          </button>
        ))}
      </div>

      {error && (
        <div className="card bg-red-500/10 border-red-500/30 text-red-400 text-center mb-4">
          {error}
        </div>
      )}

      {/* Selected date info */}
      {selectedDate && (
        <div className="card mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="icon-circle-gold">
              <span>📅</span>
            </div>
            <div>
              <div className="text-sm text-gray-400">Выбранная дата</div>
              <div className="font-semibold text-white">
                {new Date(selectedDate).toLocaleDateString('ru', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue button */}
      <div className="mt-auto pt-4">
        <button
          onClick={handleContinue}
          disabled={!selectedDate}
          className="btn-primary"
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}
